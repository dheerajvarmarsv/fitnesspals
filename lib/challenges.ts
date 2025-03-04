import { supabase } from './supabase';

export const VALID_CHALLENGE_TYPES = ['race', 'survival', 'streak', 'custom'] as const;
export type ChallengeType = typeof VALID_CHALLENGE_TYPES[number];

interface SelectedActivity {
  activityType: string;
  targetValue: number;
  metric: string; // 'steps', 'distance_km', 'distance_miles', 'time', 'calories'
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
    const errorMessage = `Invalid challenge type: ${challengeType}. Must be one of ${VALID_CHALLENGE_TYPES.join(', ')}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
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
      allowed_activities: selectedActivities.map(act => act.activityType),
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

  if (challengeError) {
    console.error('Challenge creation error:', challengeError);
    throw challengeError;
  }
  if (!createdChallenge) throw new Error('Failed to insert challenge');

  if (selectedActivities.length > 0) {
    const activityRows = selectedActivities.map(act => ({
      challenge_id: createdChallenge.id,
      activity_type: act.activityType,
      metric: act.metric,           // the unit, e.g. "steps"
      target_value: act.targetValue, // numeric value
      points: act.points,
      timeframe: act.timeframe,
    }));

    const { error: activitiesError } = await supabase
      .from('challenge_activities')
      .insert(activityRows);
    if (activitiesError) {
      console.error('Challenge activities insertion error:', activitiesError);
      throw activitiesError;
    }
  }

  const { error: participantError } = await supabase
    .from('challenge_participants')
    .insert({
      challenge_id: createdChallenge.id,
      user_id: userId,
      status: 'active',
    });
  if (participantError) {
    console.error('Error adding creator as participant:', participantError);
    throw participantError;
  }
  console.log(`Challenge created: ${createdChallenge.title} (Type: ${challengeType})`, {
    id: createdChallenge.id,
    type: createdChallenge.challenge_type,
  });
  return createdChallenge;
}

function formatThreshold(value: number, metric: string): string {
  switch (metric) {
    case 'steps':
      return `${value} steps`;
    case 'distance_km':
      return `${value} km`;
    case 'distance_miles':
      return `${value} miles`;
    case 'time':
      return `${value} hours`;
    case 'calories':
      return `${value} calories`;
    default:
      return `${value}`;
  }
}

export async function getActiveChallenges() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('challenges')
    .select(`
      *,
      challenge_activities (*),
      creator:profiles!challenges_creator_id_fkey (
        nickname,
        avatar_url
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching active challenges:', error);
    throw error;
  }
  return data || [];
}

export async function getChallengeById(challengeId: string) {
  const { data, error } = await supabase
    .from('challenges')
    .select(`
      *,
      challenge_activities (*),
      creator:profiles!challenges_creator_id_fkey (
        nickname,
        avatar_url
      )
    `)
    .eq('id', challengeId)
    .single();

  if (error) {
    console.error(`Error fetching challenge ${challengeId}:`, error);
    throw error;
  }
  return data;
}