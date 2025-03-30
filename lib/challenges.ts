import { supabase } from './supabase';

export const VALID_CHALLENGE_TYPES = ['race', 'survival'] as const;
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
  selectedActivities: SelectedActivity[];
  isPrivate: boolean;
}

interface ChallengeRules {
  challenge_mode: string;
  allowed_activities: string[];
  points_per_activity: Record<string, number>;
  metrics: Record<string, string>;
  survival_settings?: any;
  totalCheckpoints?: number;
  pointsPerCheckpoint?: number;
  estimatedTotalPoints?: number;
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

  // Check if user already has 2 active challenges
  const { data: activeParticipations, error: participationError } = await supabase
    .from('challenge_participants')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (participationError) {
    throw new Error('Failed to check active challenges');
  }

  if (activeParticipations && activeParticipations.length >= 2) {
    throw new Error('You can only participate in 2 active challenges at a time');
  }

  // Create base rules object
  let challengeRules: ChallengeRules = {
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
  };
  
  // For survival challenges, add default survival settings
  if (challengeType === 'survival') {
    const { DEFAULT_SURVIVAL_SETTINGS } = await import('./survivalUtils');
    
    // Create survival settings without lives
    challengeRules = {
      ...challengeRules,
      survival_settings: {
        ...DEFAULT_SURVIVAL_SETTINGS
      }
    };
  };
  
  // For race challenges, add checkpoint calculations
  if (challengeType === 'race') {
    // Calculate duration in days
    // Since open-ended is no longer supported, always use endDate
    // If endDate is null for some reason, default to 30 days from start date
    const effectiveEndDate = endDate || (startDate 
      ? new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000) // Default 30 days
      : null);
    
    if (startDate) {
      // Calculate daily points potential
      const dailyPoints = selectedActivities.reduce((sum, act) => sum + act.points, 0);
      
      // Calculate duration
      const durationDays = Math.ceil(
        (effectiveEndDate!.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      
      // Get the timeframe from the first activity (all activities have the same timeframe)
      const timeframe = selectedActivities[0]?.timeframe || 'day';
      
      // Exact number of days in the challenge (based on start and end dates)
      const challengeDays = durationDays;
      
      // Set the number of checkpoints based on the timeframe and duration
      let TOTAL_CHECKPOINTS;
      if (timeframe === 'day') {
        // For daily challenges, exactly one checkpoint per day
        TOTAL_CHECKPOINTS = challengeDays;
      } else {
        // For weekly challenges, calculate exact number of weeks
        // If challenge is 10 days, it should have 2 weeks (not 1.43 weeks)
        TOTAL_CHECKPOINTS = Math.ceil(challengeDays / 7);
      }
      
      // Ensure at least 1 checkpoint
      TOTAL_CHECKPOINTS = Math.max(1, TOTAL_CHECKPOINTS);
      
      // Calculate points needed for each checkpoint
      // For daily challenges, the points per checkpoint should be the sum of all activity points
      // For weekly challenges, it should be the sum of daily points * 7
      let pointsPerCheckpoint;
      if (timeframe === 'day') {
        pointsPerCheckpoint = dailyPoints;
      } else {
        // For weekly challenges, multiply daily points by days in a week
        pointsPerCheckpoint = dailyPoints * 7;
      }
      
      // Ensure minimum point value
      pointsPerCheckpoint = Math.max(1, Math.ceil(pointsPerCheckpoint));
      
      // Calculate total expected points
      const totalExpectedPoints = pointsPerCheckpoint * TOTAL_CHECKPOINTS;
      
      // Add to rules
      challengeRules = {
        ...challengeRules,
        totalCheckpoints: TOTAL_CHECKPOINTS,
        pointsPerCheckpoint,
        estimatedTotalPoints: totalExpectedPoints,
      };
    }
  }

  // Prepare challenge data
  const challengeData: any = {
    creator_id: userId,
    challenge_type: challengeType as ChallengeType,
    title: name.trim(),
    description: description ? description.trim() : null,
    start_date: startDate ? startDate.toISOString() : null,
    end_date: endDate ? endDate.toISOString() : null,
    status: 'active' as const,
    is_private: isPrivate,
    rules: challengeRules,
  };
  
  // For survival challenges, set the survival_settings column too
  if (challengeType === 'survival' && challengeRules.survival_settings) {
    challengeData.survival_settings = challengeRules.survival_settings;
  }

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

  // Prepare participant data - add survival-specific fields if needed
  let participantData: any = {
    challenge_id: createdChallenge.id,
    user_id: userId,
    status: 'active',
  };
  
  // For survival challenges, initialize survival-specific fields
  if (challengeType === 'survival') {
    const { initializeParticipant } = await import('./survivalUtils');
    
    // Pass the challenge-specific survival settings
    const challengeSettings = challengeData.survival_settings || challengeRules.survival_settings;
    
    // Calculate days based on start/end dates if available
    let currentDay = 1;
    let totalDays = 30;
    
    if (startDate) {
      const today = new Date();
      const challengeStartDate = new Date(startDate);
      const challengeEndDate = endDate ? new Date(endDate) : new Date(challengeStartDate);
      
      // Default duration if open-ended (30 days)
      if (!endDate) {
        challengeEndDate.setDate(challengeStartDate.getDate() + 30);
      }
      
      totalDays = Math.ceil((challengeEndDate.getTime() - challengeStartDate.getTime()) / (1000 * 60 * 60 * 24));
      currentDay = Math.max(1, Math.min(Math.ceil((today.getTime() - challengeStartDate.getTime()) / (1000 * 60 * 60 * 24)), totalDays));
    }
    
    // Initialize with all the dynamic challenge parameters
    const survivalData = initializeParticipant(
      userId, 
      createdChallenge.id, 
      challengeSettings,
      currentDay,
      totalDays
    );
    
    // Merge the survival-specific fields into the participant data
    participantData = {
      ...participantData,
      days_in_danger: survivalData.days_in_danger,
      distance_from_center: survivalData.distance_from_center,
      angle: survivalData.angle,
      is_eliminated: survivalData.is_eliminated,
    };
  }
  
  const { error: participantError } = await supabase
    .from('challenge_participants')
    .insert(participantData);
  if (participantError) throw participantError;

  // Process existing activities for this challenge if it's a race or survival challenge
  // and has a start date (to determine activity timeframe)
  if ((challengeType === 'race' || challengeType === 'survival') && startDate) {
    try {
      // Import the updateChallengesWithActivity function once
      const { updateChallengesWithActivity } = await import('./challengeUtils');
      
      // Fetch recent activities that match the challenge criteria
      // Get activities from the last 30 days or from challenge start date (whichever is more recent)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Use the more recent of challenge start date or 30 days ago
      const startTimeCutoff = startDate > thirtyDaysAgo ? startDate : thirtyDaysAgo;
      
      // Create a set to track processed activity IDs and avoid duplicates
      const processedActivityIds = new Set<string>();
      
      // For each selected activity type, fetch relevant activities
      for (const activity of selectedActivities) {
        const { data: existingActivities, error: activitiesError } = await supabase
          .from('activities')
          .select('id, activity_type, metric')
          .eq('user_id', userId)
          .eq('activity_type', activity.activityType)
          .eq('metric', activity.metric)
          .gte('created_at', startTimeCutoff.toISOString())
          .order('created_at', { ascending: false });
          
        if (activitiesError) {
          console.error('Error fetching existing activities:', activitiesError);
          continue;
        }
        
        // Process each activity for the new challenge, avoiding duplicates
        if (existingActivities && existingActivities.length > 0) {
          for (const existingActivity of existingActivities) {
            // Skip if already processed
            if (processedActivityIds.has(existingActivity.id)) continue;
            
            await updateChallengesWithActivity(existingActivity.id, userId);
            processedActivityIds.add(existingActivity.id);
          }
        }
      }
    } catch (error) {
      console.error('Error processing existing activities for new challenge:', error);
      // Don't throw - still return the challenge even if activity processing fails
    }
  }

  return createdChallenge;
}

/**
 * Leave a challenge by setting the left_at timestamp and marking status as 'left'.
 * This allows users to join a new challenge after leaving one.
 */
export async function leaveChallenge(participantId: string) {
  try {
    // Get current timestamp in ISO format for consistency
    const now = new Date().toISOString();
    
    console.log(`Leaving challenge with participant ID: ${participantId}, setting left_at to: ${now}`);
    
    const { data, error } = await supabase
      .from('challenge_participants')
      .update({
        status: 'left',
        left_at: now
      })
      .eq('id', participantId)
      .select();
    
    if (error) {
      console.error('Database error when leaving challenge:', error);
      throw error;
    }
    
    console.log('Challenge left successfully, updated data:', data);
    
    return { success: true, data };
  } catch (error) {
    console.error('Error leaving challenge:', error);
    throw error;
  }
}

/**
 * Rejoin a challenge by updating the participant's status back to active
 * and setting the rejoined_at timestamp.
 */
export async function rejoinChallenge(participantId: string) {
  try {
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
  } catch (error) {
    console.error('Error rejoining challenge:', error);
    throw error;
  }
}

/**
 * Check if a user has reached the maximum number of active challenges.
 * Users can participate in at most 2 active challenges at a time.
 * Challenges with status 'left' are not counted against this limit.
 */
export async function canJoinNewChallenge(userId: string) {
  try {
    const { data, error } = await supabase
      .from('challenge_participants')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active');
    
    if (error) throw error;
    
    // User can join if they have fewer than 2 active challenges
    const canJoin = !data || data.length < 2;
    return { canJoin, activeCount: data?.length || 0 };
  } catch (error) {
    console.error('Error checking if user can join challenge:', error);
    throw error;
  }
}

/**
 * Fetch active challenges for a user, optionally filtering by status.
 * This includes challenges where the user is a participant with 'active' status
 * and challenges the user has created.
 */
export async function getActiveChallengesForUser(
  userId: string,
  status: 'active' | 'left' = 'active'
) {
  try {
    const { data: participantChallenges, error: participantError } = await supabase
      .from('challenge_participants')
      .select(`
        id,
        challenge_id,
        status,
        left_at,
        rejoined_at,
        challenge:challenges(
          *,
          participant_count:challenge_participants(count)
        )
      `)
      .eq('user_id', userId)
      .eq('status', status);
    
    if (participantError) throw participantError;
    
    // Get challenges where user is the creator
    const { data: creatorChallenges, error: creatorError } = await supabase
      .from('challenges')
      .select(`
        *,
        participant_count:challenge_participants(count)
      `)
      .eq('creator_id', userId)
      .eq('status', 'active');
    
    if (creatorError) throw creatorError;
    
    // Process participant challenges
    const participantList = (participantChallenges || []).map(row => {
      const c = row.challenge;
      // Ensure participant_count is a number
      const count = typeof c.participant_count === 'object' && c.participant_count !== null
        ? c.participant_count.count
        : (c.participant_count || 0);
      
      return {
        ...c,
        participant_count: count,
        participant_id: row.id,
        participant_status: row.status,
        left_at: row.left_at,
        rejoined_at: row.rejoined_at
      };
    });
    
    // Process creator challenges
    const creatorList = (creatorChallenges || []).map(c => {
      // Ensure participant_count is a number
      const count = typeof c.participant_count === 'object' && c.participant_count !== null
        ? c.participant_count.count
        : (c.participant_count || 0);
      
      return {
        ...c,
        participant_count: count,
        is_creator: true
      };
    });
    
    // Combine and deduplicate challenges
    // Creator's own challenges always have priority
    const allChallenges = [...creatorList];
    
    // Add participant challenges if they're not already in the list
    for (const pc of participantList) {
      if (!allChallenges.some(c => c.id === pc.id)) {
        allChallenges.push(pc);
      }
    }
    
    // Sort by created_at date, most recent first
    return allChallenges.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  } catch (error) {
    console.error('Error in getActiveChallengesForUser:', error);
    throw error;
  }
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
    if (isCreator && (activeCount || 0) <= 1) {
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