import { supabase } from './supabase';

// Defined valid challenge types to ensure type safety
export const VALID_CHALLENGE_TYPES = ['race', 'survival', 'streak', 'custom'] as const;
export type ChallengeType = typeof VALID_CHALLENGE_TYPES[number];

interface SelectedActivity {
  activityType: string;
  threshold: string;
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
}

/**
 * Insert a new challenge into `challenges` plus any related `challenge_activities`.
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
}: ChallengeCreationParams) {
  // Validate challenge type
  if (!VALID_CHALLENGE_TYPES.includes(challengeType as ChallengeType)) {
    const errorMessage = `Invalid challenge type: ${challengeType}. Must be one of ${VALID_CHALLENGE_TYPES.join(', ')}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Validate required fields
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!name || name.trim().length === 0) {
    throw new Error('Challenge name is required');
  }

  // Prepare challenge data
  const challengeData = {
    creator_id: userId,
    challenge_type: challengeType as ChallengeType,
    title: name.trim(),
    description: description ? description.trim() : null,
    start_date: startDate ? startDate.toISOString() : null,
    end_date: isOpenEnded ? null : (endDate ? endDate.toISOString() : null),
    status: 'active' as const,
    rules: {
      challenge_mode: challengeType,
      allowed_activities: selectedActivities.map(act => act.activityType),
      points_per_activity: selectedActivities.reduce((acc, act) => {
        acc[act.activityType] = act.points;
        return acc;
      }, {} as Record<string, number>),
    }
  };

  // Insert challenge
  const { data: createdChallenge, error: challengeError } = await supabase
    .from('challenges')
    .insert([challengeData])
    .select()
    .single();

  if (challengeError) {
    console.error('Challenge creation error:', challengeError);
    throw challengeError;
  }

  if (!createdChallenge) {
    throw new Error('Failed to insert challenge');
  }

  // Insert selected activities
  if (selectedActivities.length > 0) {
    const activityRows = selectedActivities.map((act) => ({
      challenge_id: createdChallenge.id,
      activity_type: act.activityType,
      threshold: act.threshold,
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

  // Log successful challenge creation
  console.log(`Challenge created: ${createdChallenge.title} (Type: ${challengeType})`, {
    id: createdChallenge.id,
    type: createdChallenge.challenge_type,
  });

  return createdChallenge;
}

/**
 * Fetch active challenges with comprehensive details
 */
export async function getActiveChallenges() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

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

  // Debug logging
  data?.forEach(challenge => {
    console.log('Active Challenge Details:', {
      id: challenge.id,
      title: challenge.title,
      challenge_type: challenge.challenge_type,
      description: challenge.description,
      start_date: challenge.start_date,
      end_date: challenge.end_date
    });
  });

  return data || [];
}

/**
 * Get a specific challenge by ID
 */
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