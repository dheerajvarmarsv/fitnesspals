// lib/challengeUtils.ts
import { supabase } from './supabase';

/**
 * Gets all challenges where the user is an "active" participant.
 * Each row includes a nested `challenges` object. We also gather participant_count via aggregator.
 */
export async function getActiveChallengesForUser(userId: string) {
  const { data, error } = await supabase
    .from('challenge_participants')
    .select(`
      challenge_id,
      status,
      challenges (
        id,
        title,
        description,
        challenge_type,
        start_date,
        end_date,
        challenge_participants(count)
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    console.error('Error fetching active challenges:', error);
    throw new Error(error.message);
  }

  // shape => [ { challenge_id, status, challenges: { id, ..., challenge_participants: [ { count } ] } }, ... ]
  // gather participant_count from that aggregator
  return (data || []).map((row: any) => {
    const c = row.challenges;
    const arr = c.challenge_participants || [];
    const participantCount = arr.length > 0 ? arr[0].count : 0;
    return {
      ...c,
      participant_count: participantCount,
    };
  });
}

/**
 * Returns all *unique* activity names from the user's active challenges.
 */
export async function getChallengeActivityTypes(userId: string): Promise<string[]> {
    try {
      // 1) fetch all active challenges
      const activeChallenges = await getActiveChallengesForUser(userId);
      if (!activeChallenges.length) return [];
  
      // 2) gather the IDs
      const challengeIds = activeChallenges.map(ch => ch.id);
  
      // 3) fetch all challenge_activities
      const { data: cActs, error: actsErr } = await supabase
        .from('challenge_activities')
        .select('activity_type')
        .in('challenge_id', challengeIds);
        
      if (actsErr) {
        console.error('Error fetching challenge_activities:', actsErr);
        throw new Error(actsErr.message);
      }
      
      if (!cActs?.length) {
        // 4) As a fallback, look for activities in the rules object
        const allActivities = new Set<string>();
        for (const challenge of activeChallenges) {
          if (challenge.rules && challenge.rules.allowed_activities) {
            challenge.rules.allowed_activities.forEach((act: string) => allActivities.add(act));
          }
        }
        if (allActivities.size > 0) {
          return Array.from(allActivities);
        }
        return [];
      }
  
      // 5) Remove duplicates
      const unique = new Set(cActs.map((row: any) => row.activity_type));
      return Array.from(unique);
    } catch (err) {
      console.error('Error getting challenge activity types:', err);
      return [];
    }
  }

/**
 * Saves a new user activity in the `activities` table.
 */
export async function saveUserActivity(
  activityData: {
    activityType: string;
    duration: number;
    distance: number;
    calories: number;
    notes: string;
  },
  userId: string
) {
  const { data, error } = await supabase
    .from('activities')
    .insert([
      {
        user_id: userId,
        activity_type: activityData.activityType,
        duration: activityData.duration,
        distance: activityData.distance,
        calories: activityData.calories,
        notes: activityData.notes,
        created_at: new Date(),
        source: 'manual',
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Error saving activity:', error);
    throw new Error(error.message);
  }
  return { success: true, data };
}

/**
 * After user logs a new activity, we award points in all relevant active challenges.
 * We compare the new activity's `activity_type`, `duration`, and `distance`
 * to each row in `challenge_activities`. If threshold is met, we update `challenge_participants.total_points`.
 */
export async function updateChallengesWithActivity(activityId: string, userId: string) {
    try {
      console.log(`Updating challenges with activity ${activityId} for user ${userId}`);
      
      // fetch the newly created activity
      const { data: activity, error: actErr } = await supabase
        .from('activities')
        .select('*')
        .eq('id', activityId)
        .single();
        
      if (actErr || !activity) {
        console.error('Error fetching new activity data:', actErr);
        return;
      }
  
      const { activity_type, duration, distance, calories, metric } = activity;
      console.log('Activity details:', { activity_type, duration, distance, calories, metric });
  
      // fetch all active challenges for this user
      const activeChallenges = await getActiveChallengesForUser(userId);
      if (!activeChallenges.length) {
        console.log('No active challenges found for user');
        return;
      }
      
      console.log(`Found ${activeChallenges.length} active challenges`);
  
      // For each challenge, check if this activity type is included
      for (const challenge of activeChallenges) {
        const challengeId = challenge.id;
        if (!challengeId) continue;
        
        console.log(`Processing challenge: ${challengeId}`);
  
        // First check the challenge_activities table
        const { data: cActs, error: cActsErr } = await supabase
          .from('challenge_activities')
          .select('*')
          .eq('challenge_id', challengeId)
          .eq('activity_type', activity_type);
  
        if (cActsErr) {
          console.error('Error fetching challenge_activities:', cActsErr);
          continue;
        }
  
        // If not found in challenge_activities, check the rules object
        let relevantActivity = null;
        if (!cActs?.length) {
          if (challenge.rules && 
              challenge.rules.allowed_activities && 
              challenge.rules.allowed_activities.includes(activity_type) &&
              challenge.rules.points_per_activity && 
              challenge.rules.points_per_activity[activity_type]) {
            
            // Create a mock activity from the rules
            relevantActivity = {
              activity_type,
              points: challenge.rules.points_per_activity[activity_type],
              metric: challenge.rules.metrics?.[activity_type] || 'time',
              target_value: 1, // Default minimum
              threshold: 1  // Default minimum
            };
            
            console.log('Found activity in rules:', relevantActivity);
          } else {
            console.log(`Activity '${activity_type}' not found in challenge ${challengeId}`);
            continue;
          }
        } else {
          relevantActivity = cActs[0];
          console.log('Found activity in challenge_activities:', relevantActivity);
        }
  
        if (!relevantActivity) continue;
  
        // Determine if the activity meets the threshold
        let meetsThreshold = false;
        const threshold = relevantActivity.target_value || relevantActivity.threshold || 1;
        const activityMetric = relevantActivity.metric || 'time';
        
        console.log('Checking threshold:', { threshold, activityMetric, metric });
        
        // Compare based on metrics
        if (activityMetric === 'time' || metric === 'time') {
          // Duration is in minutes
          if (duration >= threshold) meetsThreshold = true;
        } else if ((activityMetric === 'distance_km' || activityMetric === 'distance_miles') && 
                  distance !== null) {
          // Distance is stored in km in DB
          if (distance >= threshold) meetsThreshold = true;
        } else if (activityMetric === 'steps' && metric === 'steps') {
          // For steps, we use the duration field
          if (duration >= threshold) meetsThreshold = true;
        } else if (activityMetric === 'calories' && calories !== null) {
          // For calories
          if (calories >= threshold) meetsThreshold = true;
        } else if (activityMetric === 'count' && metric === 'count') {
          // For generic count, we use the duration field
          if (duration >= threshold) meetsThreshold = true;
        }
        
        console.log('Threshold check result:', meetsThreshold);
  
        // If threshold is met, award points
        if (meetsThreshold) {
          const points = relevantActivity.points || 1;
          
          // Get current participant row
          const { data: partRow, error: partErr } = await supabase
            .from('challenge_participants')
            .select('id, total_points')
            .eq('user_id', userId)
            .eq('challenge_id', challengeId)
            .single();
            
          if (partErr || !partRow) {
            console.error('Error fetching participant row:', partErr);
            continue;
          }
  
          const currentPoints = partRow.total_points || 0;
          const newPoints = currentPoints + points;
          
          console.log(`Updating points: ${currentPoints} + ${points} = ${newPoints}`);
  
          // Update points
          const { error: updateErr } = await supabase
            .from('challenge_participants')
            .update({ 
              total_points: newPoints,
              last_activity_date: new Date().toISOString()
            })
            .eq('id', partRow.id);
  
          if (updateErr) {
            console.error('Error updating participant points:', updateErr);
          } else {
            console.log(
              `Awarded ${points} points to user ${userId} for challenge ${challengeId} activity ${activity_type}`
            );
          }
          
          // For race challenges, also update the map_position
          if (challenge.challenge_type === 'race') {
            // Calculate the new position based on the total points
            // For simplicity, we'll use 10 points = 1 step
            const stepSize = 10;
            const newPosition = Math.floor(newPoints / stepSize);
            
            // Update the map_position
            const { error: posUpdateErr } = await supabase
              .from('challenge_participants')
              .update({ map_position: newPosition })
              .eq('id', partRow.id);
              
            if (posUpdateErr) {
              console.error('Error updating map position:', posUpdateErr);
            } else {
              console.log(`Updated map position to ${newPosition} for challenge ${challengeId}`);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error in updateChallengesWithActivity:', err);
    }
  }