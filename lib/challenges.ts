import { supabase } from './supabase';

export const VALID_CHALLENGE_TYPES = ['race', 'survival', 'streak', 'custom'] as const;
export type ChallengeType = typeof VALID_CHALLENGE_TYPES[number];

interface SelectedActivity {
  activityType: string;
  targetValue: number;
  metric: string; // e.g. 'steps', 'distance_km', 'distance_miles', 'time', 'calories'
  points: number;
  timeframe: 'day' | 'week';
}

interface ChallengeCreationParams {
  userId: string;
  challengeType: string;
  name: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
  isOpenEnded: boolean;
  selectedActivities: SelectedActivity[];
  isPrivate: boolean;
}

/**
 * Create a new challenge along with its activities and adds the creator as a participant.
 */
export async function createChallengeInSupabase({
  userId,
  challengeType,
  name,
  description,
  startDate,
  endDate,
  isOpenEnded,
  selectedActivities,
  isPrivate,
}: ChallengeCreationParams) {
  if (!VALID_CHALLENGE_TYPES.includes(challengeType as ChallengeType)) {
    throw new Error(
      `Invalid challenge type: ${challengeType}. Must be one of ${VALID_CHALLENGE_TYPES.join(', ')}`
    );
  }
  if (!userId) throw new Error('User ID is required');
  if (!name || name.trim().length === 0) throw new Error('Challenge name is required');

  const challengeData = {
    creator_id: userId,
    challenge_type: challengeType as ChallengeType,
    title: name.trim(),
    description: description ? description.trim() : null,
    start_date: startDate ? startDate.toISOString() : null,
    end_date: isOpenEnded ? null : (endDate ? endDate.toISOString() : null),
    status: 'active' as const,
    is_private: isPrivate,
    rules: {
      challenge_mode: challengeType,
      allowed_activities: selectedActivities.map((act) => act.activityType),
      points_per_activity: selectedActivities.reduce((acc, act) => {
        acc[act.activityType] = act.points;
        return acc;
      }, {} as Record<string, number>),
      metrics: selectedActivities.reduce((acc, act) => {
        acc[act.activityType] = act.metric;
        return acc;
      }, {} as Record<string, string>),
    },
  };

  const { data: createdChallenge, error: challengeError } = await supabase
    .from('challenges')
    .insert([challengeData])
    .select()
    .single();
  if (challengeError) throw challengeError;
  if (!createdChallenge) throw new Error('Failed to insert challenge');

  if (selectedActivities.length > 0) {
    const activityRows = selectedActivities.map((act) => ({
      challenge_id: createdChallenge.id,
      activity_type: act.activityType,
      metric: act.metric,
      target_value: act.targetValue,
      points: act.points,
      timeframe: act.timeframe,
    }));
    const { error: activitiesError } = await supabase
      .from('challenge_activities')
      .insert(activityRows);
    if (activitiesError) throw activitiesError;
  }

  const { error: participantError } = await supabase
    .from('challenge_participants')
    .insert({
      challenge_id: createdChallenge.id,
      user_id: userId,
      status: 'active',
    });
  if (participantError) throw participantError;

  return createdChallenge;
}

/**
 * Fetch active challenges for a user, optionally filtering by status.
 */
export async function getActiveChallengesForUser(
  userId: string,
  status?: 'active' | 'left'
) {
  let query = supabase
    .from('challenge_participants')
    .select(`
      id,
      challenge_id,
      status,
      left_at,
      challenges (
        id,
        title,
        description,
        challenge_type,
        start_date,
        end_date,
        is_private,
        challenge_participants (count)
      )
    `)
    .eq('user_id', userId);
  if (status) {
    query = query.eq('status', status);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map((row: any) => {
    const c = row.challenges;
    const count = c.challenge_participants?.[0]?.count || 0;
    return {
      ...c,
      participant_count: count,
      participant_id: row.id,
      participant_status: row.status,
      left_at: row.left_at,
    };
  });
}

/**
 * Mark the specified challenges as left for the given user.
 * If the user is the creator and is the only active participant in a challenge, delete the entire challenge.
 */
export async function leaveChallenges(userId: string, challengeIds: string[]) {
  if (!userId || !challengeIds.length) {
    throw new Error('User ID and challenge IDs are required');
  }
  for (const challengeId of challengeIds) {
    // Count active participants in the challenge
    const { count: activeCount, error: countError } = await supabase
      .from('challenge_participants')
      .select('id', { count: 'exact', head: true })
      .eq('challenge_id', challengeId)
      .eq('status', 'active');
    if (countError) throw countError;

    // Retrieve the challenge creator id
    const { data: challengeData, error: challengeError } = await supabase
      .from('challenges')
      .select('creator_id')
      .eq('id', challengeId)
      .single();
    if (challengeError) throw challengeError;
    const isCreator = challengeData.creator_id === userId;

    // If user is creator and is the only active participant, delete the entire challenge.
    if (isCreator && activeCount <= 1) {
      const { error: deleteError } = await supabase
        .from('challenges')
        .delete()
        .eq('id', challengeId);
      if (deleteError) throw deleteError;
    } else {
      // Otherwise, update the participant record to set status to 'left'
      const { error: updateError } = await supabase
        .from('challenge_participants')
        .update({
          status: 'left',
          left_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('challenge_id', challengeId);
      if (updateError) throw updateError;
    }
  }
  return { success: true };
}

/**
 * Check if the user can rejoin a challenge they previously left.
 */
export async function canRejoinChallenge(userId: string, challengeId: string) {
  const { data, error } = await supabase
    .from('challenge_participants')
    .select('id, status, left_at')
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .eq('status', 'left')
    .single();
  if (error) {
    if (error.code === 'PGRST116') {
      return { canRejoin: false };
    }
    throw error;
  }
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('status, end_date')
    .eq('id', challengeId)
    .single();
  if (challengeError) throw challengeError;
  const isActive = challenge.status === 'active';
  const isNotEnded = !challenge.end_date || new Date(challenge.end_date) > new Date();
  return { canRejoin: isActive && isNotEnded, participantId: data?.id };
}

/**
 * Rejoin a challenge by updating the participant's status back to active.
 */
export async function rejoinChallenge(participantId: string) {
  const { data, error } = await supabase
    .from('challenge_participants')
    .update({
      status: 'active',
      left_at: null,
      rejoined_at: new Date().toISOString(),
    })
    .eq('id', participantId)
    .select();
  if (error) throw error;
  return { success: true, data };
}