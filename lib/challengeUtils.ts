// lib/challengeUtils.ts

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

  const challengeIds = activeChallenges.map((ch) => ch.id);
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
    cActs.forEach((act) => {
      const actType = act.activity_type;
      const metric = act.metric;
      const cId = act.challenge_id;
      const ch = activeChallenges.find((x) => x.id === cId);

      if (!activityMap.has(actType)) {
        activityMap.set(actType, { activityType: actType, metrics: [] });
      }
      const entry = activityMap.get(actType);
      if (!entry.metrics.some((m: any) => m.metric === metric && m.challengeId === cId)) {
        entry.metrics.push({
          metric,
          challengeId: cId,
          challengeTitle: ch?.title || 'Unknown',
        });
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
          if (!entry.metrics.some((m: any) => m.challengeId === ch.id && m.metric === metric)) {
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
 *
 * Now supports separate columns for steps and count.
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
  const GLOBAL_TYPES = [
    'Workout',
    'Steps',
    'Sleep',
    'Screen Time',
    'No Sugars',
    'High Intensity',
    'Yoga',
    'Count',
  ];
  let activityType = activityData.activityType;
  let notes = '';

  // If activityType is not one of the allowed types, treat it as Custom.
  if (!GLOBAL_TYPES.includes(activityType)) {
    notes = `CustomName: ${activityType}`;
    activityType = 'Custom';
  }

  // Prepare the data object for insertion.
  const insertData: any = {
    user_id: userId,
    activity_type: activityType,
    source: 'manual',
    created_at: new Date().toISOString(),
    notes,
    metric: activityData.metric,
  };

  // Based on the metric, populate the appropriate column.
  switch (activityData.metric) {
    case 'time':
      // Convert hours to minutes
      insertData.duration = activityData.duration * 60;
      break;
    case 'distance_km':
      insertData.distance = activityData.distance;
      break;
    case 'distance_miles':
      // Convert miles to km
      insertData.distance = activityData.distance * 1.60934;
      break;
    case 'calories':
      insertData.calories = activityData.calories;
      break;
    case 'steps':
      // Use the new steps column. Assume the entered value is provided in activityData.duration.
      insertData.steps = activityData.duration;
      break;
    case 'count':
      // Use the new count column.
      insertData.count = activityData.duration;
      break;
    default:
      break;
  }

  const { data, error } = await supabase
    .from('activities')
    .insert([insertData])
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
 * This version uses the proper columns for each metric.
 */
export async function updateChallengesWithActivity(activityId: string, userId: string) {
  try {
    // Get the activity details.
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('*')
      .eq('id', activityId)
      .single();

    if (activityError) throw activityError;
    if (!activity) throw new Error('Activity not found');

    // Get user settings for distance preference.
    const { data: userData, error: userError } = await supabase
      .from('profile_settings')
      .select('use_kilometers')
      .eq('id', userId)
      .single();

    const useKilometers = userError ? true : userData?.use_kilometers ?? true;

    // Get user's active challenge participation records.
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
            target_value,
            points,
            timeframe
          )
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (challengesError) throw challengesError;
    if (!participations || participations.length === 0) return;

    // For each challenge participation, check if the activity qualifies for points.
    for (const participation of participations) {
      const challenge = participation.challenges;
      if (!challenge) continue;

      // Find matching challenge activities (by activity_type and metric).
      const matchingActivities = challenge.challenge_activities.filter(
        (act: any) => act.activity_type === activity.activity_type && act.metric === activity.metric
      );
      if (matchingActivities.length === 0) continue;

      let pointsEarned = 0;
      for (const matchingActivity of matchingActivities) {
        let activityValue = 0;
        let thresholdValue = matchingActivity.target_value; // numeric threshold

        // Determine the activity's value based on the metric.
        switch (matchingActivity.metric) {
          case 'distance_km':
          case 'distance_miles': {
            activityValue = activity.distance || 0;
            if (matchingActivity.metric === 'distance_miles' && activityValue > 0 && thresholdValue > 0) {
              // Convert target from miles to km for comparison
              thresholdValue = thresholdValue / 0.621371;
            }
            break;
          }
          case 'time': {
            // Duration is stored in minutes; assume challenge target is in hours.
            activityValue = activity.duration || 0;
            thresholdValue = thresholdValue * 60;
            break;
          }
          case 'calories': {
            activityValue = activity.calories || 0;
            break;
          }
          case 'steps': {
            activityValue = activity.steps || 0;
            break;
          }
          case 'count': {
            activityValue = activity.count || 0;
            break;
          }
          default: {
            activityValue = activity.duration || 0;
            break;
          }
        }

        if (activityValue >= thresholdValue) {
          pointsEarned += matchingActivity.points;
        }
      }

      if (pointsEarned > 0) {
        await supabase
          .from('challenge_participants')
          .update({
            total_points: participation.total_points + pointsEarned,
            last_activity_date: new Date().toISOString(),
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

// Helper: Get ISO week number (Monday as first day)
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}