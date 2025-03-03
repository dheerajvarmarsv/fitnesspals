import { supabase } from './supabase';

/**
 * Return all active challenges for the user, with participant counts.
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
  return (data || []).map((row: any) => {
    const c = row.challenges;
    const arr = c.challenge_participants || [];
    const participantCount = arr.length > 0 ? arr[0].count : 0;
    return { ...c, participant_count: participantCount };
  });
}

/**
 * Return all unique (activity_type, metric) combos from the user's active challenges.
 */
export async function getChallengeActivityTypes(userId: string): Promise<Array<{
  activityType: string;
  metrics: Array<{ metric: string; challengeId: string; challengeTitle: string }>;
}>> {
  const activeChallenges = await getActiveChallengesForUser(userId);
  if (!activeChallenges.length) return [];
  const challengeIds = activeChallenges.map(ch => ch.id);
  const activityMap = new Map();
  const { data: cActs, error: cErr } = await supabase
    .from('challenge_activities')
    .select('activity_type, metric, challenge_id')
    .in('challenge_id', challengeIds);
  if (cErr) {
    console.error('Error fetching challenge_activities:', cErr);
    throw new Error(cErr.message);
  }
  if (cActs?.length) {
    cActs.forEach(act => {
      const actType = act.activity_type;
      const metric = act.metric;
      const cId = act.challenge_id;
      const ch = activeChallenges.find(x => x.id === cId);
      if (!activityMap.has(actType)) {
        activityMap.set(actType, { activityType: actType, metrics: [] });
      }
      const entry = activityMap.get(actType);
      if (!entry.metrics.some(m => m.metric === metric && m.challengeId === cId)) {
        entry.metrics.push({ metric, challengeId: cId, challengeTitle: ch?.title || 'Unknown' });
      }
    });
  }
  // Fallback: use rules if no activities found in challenge_activities
  if (activityMap.size === 0) {
    for (const ch of activeChallenges) {
      if (ch.rules && Array.isArray(ch.rules.allowed_activities)) {
        ch.rules.allowed_activities.forEach((act: string) => {
          if (!activityMap.has(act)) {
            activityMap.set(act, { activityType: act, metrics: [] });
          }
          const entry = activityMap.get(act);
          const metric = ch.rules.metrics?.[act] || 'time';
          if (!entry.metrics.some(m => m.challengeId === ch.id && m.metric === metric)) {
            entry.metrics.push({ metric, challengeId: ch.id, challengeTitle: ch.title });
          }
        });
      }
    }
  }
  return Array.from(activityMap.values());
}

/**
 * Insert a new row into `activities` for a single metric measurement.
 * If the provided activity_type is not among the allowed ones, we use "Custom"
 * and store the original name in the notes field.
 */
export async function saveUserActivity(
  activityData: {
    activityType: string;
    duration: number;
    distance: number;
    calories: number;
    metric: string; // e.g. 'time','distance_km','distance_miles','steps','count','calories'
  },
  userId: string
) {
  const GLOBAL_TYPES = ['Workout','Steps','Sleep','Screen Time','No Sugars','High Intensity','Yoga','Count'];
  let activityType = activityData.activityType;
  let notes = '';
  // If activityType is not one of the allowed types, treat it as Custom.
  if (!GLOBAL_TYPES.includes(activityType)) {
    notes = `CustomName: ${activityType}`;
    activityType = 'Custom';
  }
  const { data, error } = await supabase
    .from('activities')
    .insert([
      {
        user_id: userId,
        activity_type: activityType,
        duration: activityData.duration,
        distance: activityData.distance,
        calories: activityData.calories,
        metric: activityData.metric,
        source: 'manual',
        created_at: new Date(),
        notes,
      },
    ])
    .select()
    .single();
  if (error) {
    console.error('Error inserting activity row:', error);
    throw new Error(error.message);
  }
  return { success: true, data };
}

/**
 * Recalculate points in all relevant challenges for the newly inserted activity.
 */
// lib/challengeUtils.ts - update the updateChallengesWithActivity function

export async function updateChallengesWithActivity(activityId: string, userId: string) {
    try {
      // Get the activity details
      const { data: activity, error: activityError } = await supabase
        .from('activities')
        .select('*')
        .eq('id', activityId)
        .single();
  
      if (activityError) throw activityError;
      if (!activity) throw new Error('Activity not found');
  
      // Get user settings to know their distance preference
      const { data: userData, error: userError } = await supabase
        .from('profile_settings')
        .select('use_kilometers')
        .eq('id', userId)
        .single();
      
      const useKilometers = userError ? true : (userData?.use_kilometers ?? true);
  
      // Get user's active challenges
      const { data: participations, error: challengesError } = await supabase
        .from('challenge_participants')
        .select(`
          id,
          challenge_id,
          total_points,
          current_streak,
          longest_streak,
          challenges(
            id,
            challenge_type,
            challenge_activities(
              activity_type,
              metric,
              threshold,
              points,
              timeframe
            )
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active');
  
      if (challengesError) throw challengesError;
      if (!participations || participations.length === 0) return;
  
      // For each challenge, check if the activity contributes points
      for (const participation of participations) {
        const challenge = participation.challenges;
        if (!challenge) continue;
  
        // Find matching activities in the challenge
        const matchingActivities = challenge.challenge_activities.filter(
          (act: any) => act.activity_type === activity.activity_type
        );
  
        if (matchingActivities.length === 0) continue;
  
        // Calculate points earned
        let pointsEarned = 0;
        for (const matchingActivity of matchingActivities) {
          let activityValue = 0;
          let thresholdValue = 0;
          
          // Parse the threshold string (e.g., "5 km", "30 min") to get the numeric value
          const thresholdMatch = matchingActivity.threshold.match(/^(\d+(\.\d+)?)/);
          if (thresholdMatch) {
            thresholdValue = parseFloat(thresholdMatch[1]);
          }
  
          // Determine the value based on metric and convert units if needed
          switch (matchingActivity.metric) {
            case 'distance_km':
            case 'distance_miles': {
              activityValue = activity.distance || 0;
              // If the challenge uses miles but we store km, convert
              if (matchingActivity.metric === 'distance_miles' && activityValue > 0) {
                thresholdValue = thresholdValue / 0.621371; // Convert miles to km for comparison
              }
              break;
            }
            case 'time': {
              // Activity duration is stored in minutes, but challenges might be in hours
              activityValue = activity.duration || 0;
              if (matchingActivity.threshold.includes('hour')) {
                thresholdValue = thresholdValue * 60; // Convert hours to minutes for comparison
              }
              break;
            }
            case 'calories':
              activityValue = activity.calories || 0;
              break;
            case 'steps':
            case 'count':
              activityValue = activity.duration || 0; // We store count in the duration field
              break;
          }
  
          // Award points if threshold is met
          if (activityValue >= thresholdValue) {
            pointsEarned += matchingActivity.points;
          }
        }
  
        // If points were earned, update the participant record
        if (pointsEarned > 0) {
          await supabase
            .from('challenge_participants')
            .update({
              total_points: participation.total_points + pointsEarned,
              last_activity_date: new Date().toISOString()
            })
            .eq('id', participation.id);
        }
      }
  
      return true;
    } catch (err) {
      console.error('Error updating challenges with activity:', err);
      return false;
    }
  }