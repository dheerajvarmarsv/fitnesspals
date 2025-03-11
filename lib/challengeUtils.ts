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
 * If the provided activity_type is not among the allowed ones, we add a note but DO NOT override the name.
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

  // If activityType is not one of the allowed types, add a note but keep the typed name
  if (!GLOBAL_TYPES.includes(activityType)) {
    notes = `CustomName: ${activityType}`;
  }

  // Prepare the data object for insertion.
  const insertData: any = {
    user_id: userId,
    activity_type: activityType,
    source: 'manual', // Default to manual for user-entered activities
    created_at: new Date().toISOString(),
    notes,
    metric: activityData.metric,
  };

  // Based on the metric, populate the appropriate column.
  switch (activityData.metric) {
    case 'time':
      // Duration is stored as minutes (if you want hours, multiply by 60)
      insertData.duration = activityData.duration;
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
      // Use the new steps column. Assume the entered value is in activityData.duration.
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
 * Calculate points threshold for challenge checkpoints
 * @param activities Selected activities for the challenge
 * @param startDate Challenge start date
 * @param endDate Challenge end date (or null if open-ended)
 * @param totalCheckpoints Total number of checkpoints on track
 * @returns Points needed per checkpoint (minimum 1)
 */
export function calculatePointsThreshold(
  activities: any[],
  startDate: Date,
  endDate: Date | null,
  totalCheckpoints: number = 100
): number {
  // For open-ended challenges, use 30 days as default
  const endDateValue = endDate || new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  // Calculate challenge duration in days
  const durationDays = Math.ceil(
    (endDateValue.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
  );
  
  // Estimate daily points from selected activities
  const dailyPoints = activities
    .filter(act => act.isSelected || act.points) // Support both formats
    .reduce((sum, act) => sum + (act.points || 0), 0);
  
  // Calculate total expected points
  const totalExpectedPoints = dailyPoints * durationDays;
  
  // Points needed per checkpoint (minimum 1)
  return Math.max(1, Math.ceil(totalExpectedPoints / totalCheckpoints));
}

/**
 * Recalculate points in all relevant challenges for activities, considering aggregation
 * by timeframe (daily/weekly) and preventing duplicate point awards.
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISOString = today.toISOString();
    const todayDate = todayISOString.split('T')[0]; // YYYY-MM-DD

    // Calculate the start of the current week (Monday)
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay() || 7; // Sunday(0)->7
    startOfWeek.setDate(today.getDate() - dayOfWeek + 1);
    const startOfWeekISOString = startOfWeek.toISOString();

    console.log('Processing activity:', {
      id: activityId,
      type: activity.activity_type,
      metric: activity.metric,
      created: activity.created_at,
    });

    // Get user's active challenge participation records.
    const { data: participations, error: challengesError } = await supabase
      .from('challenge_participants')
      .select(`
        id,
        challenge_id,
        total_points,
        map_position,
        distance_from_center,
        angle,
        lives,
        days_in_danger,
        is_eliminated,
        current_streak,
        longest_streak,
        last_awarded_day,
        last_awarded_week,
        challenges(
          id,
          challenge_type,
          rules,
          survival_settings,
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

    // For each challenge participation, check if activities meet thresholds
    for (const participation of participations) {
      const challenge = participation.challenges;
      if (!challenge) continue;

      // Find matching challenge activities
      const matchingActivities = challenge.challenge_activities.filter(
        (act: any) =>
          act.activity_type === activity.activity_type &&
          act.metric === activity.metric
      );
      if (matchingActivities.length === 0) continue;

      // Process each matching challenge activity
      for (const matchingActivity of matchingActivities) {
        const timeframe = matchingActivity.timeframe || 'day';

        // Prevent awarding points again for the same day
        if (
          timeframe === 'day' &&
          participation.last_awarded_day &&
          new Date(participation.last_awarded_day).toDateString() ===
            today.toDateString()
        ) {
          console.log('Points already awarded for today for this activity');
          continue;
        }

        // Prevent awarding points again for the same week
        if (
          timeframe === 'week' &&
          participation.last_awarded_week &&
          new Date(participation.last_awarded_week) >= startOfWeek
        ) {
          console.log('Points already awarded for this week for this activity');
          continue;
        }

        // Aggregate all activities of this type/metric for the current timeframe
        const timeframeStart =
          timeframe === 'day' ? todayISOString : startOfWeekISOString;

        const { data: timeframeActivities, error: activitiesError } =
          await supabase
            .from('activities')
            .select('*')
            .eq('user_id', userId)
            .eq('activity_type', activity.activity_type)
            .eq('metric', activity.metric)
            .gte('created_at', timeframeStart)
            .order('created_at', { ascending: false });

        if (activitiesError) {
          console.error('Error fetching timeframe activities:', activitiesError);
          continue;
        }

        // Sum all values for the timeframe
        let aggregatedValue = 0;
        for (const act of timeframeActivities || []) {
          switch (act.metric) {
            case 'distance_km':
            case 'distance_miles':
              aggregatedValue += act.distance || 0;
              break;
            case 'time':
              aggregatedValue += act.duration || 0;
              break;
            case 'calories':
              aggregatedValue += act.calories || 0;
              break;
            case 'steps':
              aggregatedValue += act.steps || 0;
              break;
            case 'count':
              aggregatedValue += act.count || 0;
              break;
            default:
              aggregatedValue += act.duration || 0;
              break;
          }
        }

        // Convert threshold for time or distance if needed
        let thresholdValue = matchingActivity.target_value;
        if (matchingActivity.metric === 'time') {
          thresholdValue = thresholdValue * 60; // Convert hours to minutes for internal calculations
        } else if (matchingActivity.metric === 'distance_miles') {
          thresholdValue = thresholdValue / 0.621371; // convert miles to km
        }

        console.log('Threshold check:', {
          activityType: matchingActivity.activity_type,
          aggregatedValue,
          thresholdValue,
          timeframe,
          points: matchingActivity.points,
        });

        // Calculate the base points that could be earned
        const pointsEarned = matchingActivity.points;
        const currentPoints = participation.total_points || 0;
        
        // Calculate points based on the aggregated value's percentage of the threshold
        const percentComplete = Math.min(1, aggregatedValue / thresholdValue);
        // Calculate actual points earned for this activity based on percentage completion
        // This ensures partial progress is properly tracked
        const earnedPointsForTimeframe = Math.max(0, Math.floor(percentComplete * pointsEarned));
        
        // Initialize cumulative points for the timeframe
        let cumulativePoints = earnedPointsForTimeframe;
        
        // Handle partial point accumulation from previous days/weeks in the same timeframe
        if (timeframe === 'day') {
          // If it's a new day and we have partial points from previous days
          if (!participation.last_awarded_day ||
              new Date(participation.last_awarded_day).toDateString() !== today.toDateString()) {
            // Add the partial points from previous days (stored in total_points)
            cumulativePoints += currentPoints;
          }
        } else if (timeframe === 'week') {
          // If it's a new week and we have partial points from previous weeks
          if (!participation.last_awarded_week || 
              new Date(participation.last_awarded_week) < startOfWeek) {
            // Add the partial points from previous weeks (stored in total_points)
            cumulativePoints += currentPoints;
          }
        }
        
        // Cap points at target_value if user exceeds the threshold
        // This implements the rule that users can't earn more than target_value per timeframe
        const targetPoints = matchingActivity.points; // Max points per timeframe
        const cappedPointsForTimeframe = Math.min(cumulativePoints, targetPoints);
        
        console.log('Activity points calculation:', {
          activityType: activity.activity_type,
          metric: activity.metric,
          aggregatedValue,
          thresholdValue, 
          percentComplete,
          earnedPointsForTimeframe,
          currentPoints,
          cumulativePoints,
          targetPoints,
          cappedPointsForTimeframe
        });
        
        // Determine if we should award points
        let newTotalPoints = currentPoints;
        
        // If there are points to award (either partial or full)
        if (earnedPointsForTimeframe > 0) {
          // If we've reached or exceeded the target, award full points for the timeframe
          if (cumulativePoints >= targetPoints) {
            newTotalPoints = cappedPointsForTimeframe;
          } 
          // Otherwise, award partial points
          else {
            newTotalPoints = cumulativePoints;
          }
          
          console.log('Before update:', {
            participationId: participation.id,
            currentPoints: participation.total_points,
            aggregatedValue,
            thresholdValue,
            earnedPointsForTimeframe,
            cumulativePoints,
            newTotalPoints,
          });

          // Update the participant record
          const updateData: any = {
            total_points: newTotalPoints,
            last_activity_date: new Date().toISOString(),
          };
          
          // Only update the last_awarded fields if we've reached or exceeded the target
          // This ensures we only mark a timeframe as "complete" when the user earns full points
          if (cumulativePoints >= targetPoints) {
            if (timeframe === 'day') {
              updateData.last_awarded_day = todayDate; // store date only
              console.log('Daily target reached, marking day as complete');
            } else if (timeframe === 'week') {
              updateData.last_awarded_week = todayDate; // store date only
              console.log('Weekly target reached, marking week as complete');
            }
          } else {
            console.log(`Partial progress for ${timeframe}: ${cumulativePoints}/${targetPoints} points`);
          }

          // For race challenges, calculate new map position
          if (challenge.challenge_type === 'race') {
            // Get points threshold from challenge rules
            const pointsThreshold = challenge.rules?.pointsPerCheckpoint || 10;
            const maxCheckpoints = challenge.rules?.totalCheckpoints || 100;
            
            // Log accumulated points and timeframe
            console.log('Calculating race position with partial points:', {
              earnedPointsForTimeframe,
              cumulativePoints,
              targetPoints,
              currentPoints,
              newTotalPoints,
              timeframe
            });
            
            // Calculate position based on cumulative points
            // For checkpoint advancement, we use the accumulated points (which may be partial)
            const checkpointsCompleted = Math.floor(newTotalPoints / pointsThreshold);
            const finalPosition = Math.min(checkpointsCompleted, maxCheckpoints - 1);
            
            // Add to update data
            updateData.map_position = finalPosition;
            
            console.log('Updating race position:', {
              oldPosition: participation.map_position,
              newPosition: finalPosition,
              pointsThreshold,
              totalPoints: newTotalPoints,
              checkpointsCompleted,
              challenge_type: challenge.challenge_type
            });
          } 
          // For survival challenges, update position in the arena
          else if (challenge.challenge_type === 'survival') {
            try {
              // Get the challenge participant's current survival state
              const { data: survivalData, error: survivalError } = await supabase
                .from('challenge_participants')
                .select('distance_from_center')
                .eq('id', participation.id)
                .single();
              
              if (survivalError) throw survivalError;
              
              // Import the calculations from survivalUtils
              const { calculateNewDistance } = await import('./survivalUtils');
              
              // Determine the maximum possible points for this activity
              const maxPossiblePoints = matchingActivity.points || 10;
              
              // Use the current distance from center (or default if not set)
              const currentDistance = survivalData?.distance_from_center || 0.8;
              
              // Get the survival settings from the challenge or use defaults
              const survivalSettings = challenge.rules?.survival_settings;
              
              // Calculate total days to determine elimination threshold if not already specified
              if (!survivalSettings?.elimination_threshold) {
                // Get start/end dates to calculate duration
                const { data: challengeDates, error: datesError } = await supabase
                  .from('challenges')
                  .select('start_date, end_date')
                  .eq('id', participation.challenge_id)
                  .single();
                  
                if (!datesError && challengeDates) {
                  const startDate = new Date(challengeDates.start_date);
                  const endDate = challengeDates.end_date ? new Date(challengeDates.end_date) : new Date(startDate);
                  
                  // Default duration if open-ended (30 days)
                  if (!challengeDates.end_date) {
                    endDate.setDate(startDate.getDate() + 30);
                  }
                  
                  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                  
                  // Determine elimination threshold based on challenge length
                  let eliminationThreshold = 3; // Default
                  
                  if (totalDays <= 3) {
                    eliminationThreshold = 1; // Ultra-short challenges
                  } else if (totalDays <= 10) {
                    eliminationThreshold = 2; // Short challenges
                  }
                  
                  // Add elimination threshold to survival settings
                  if (survivalSettings) {
                    survivalSettings.elimination_threshold = eliminationThreshold;
                  }
                }
              }
              
              // Calculate the new distance based on points earned
              const newDistance = calculateNewDistance(
                currentDistance,
                pointsEarned, 
                maxPossiblePoints, 
                survivalSettings
              );
              
              // Add to update data
              updateData.distance_from_center = newDistance;
              
              console.log('Updating survival position:', {
                oldDistance: currentDistance,
                newDistance,
                pointsEarned,
                maxPossiblePoints,
                challenge_type: challenge.challenge_type
              });
            } catch (err) {
              console.error('Error updating survival position:', err);
            }
          } else {
            console.log('Challenge is not a race or survival type:', challenge.challenge_type);
          }

          const { data: updatedParticipant, error: updateError } = await supabase
            .from('challenge_participants')
            .update(updateData)
            .eq('id', participation.id)
            .select('id, total_points, map_position, distance_from_center, lives, days_in_danger, is_eliminated, last_activity_date, last_awarded_day, last_awarded_week');

          if (updateError) {
            console.error('Error updating challenge participant:', updateError);
            continue;
          }

          console.log('Points awarded:', {
            challengeId: challenge.id,
            participantId: participation.id,
            pointsEarned,
            newTotal: newTotalPoints,
            timeframe,
            updatedRecord: updatedParticipant,
          });

          // Optionally verify the update
          const { data: verifyParticipant, error: verifyError } = await supabase
            .from('challenge_participants')
            .select('id, total_points, map_position, distance_from_center, lives, days_in_danger, is_eliminated')
            .eq('id', participation.id)
            .single();

          if (verifyError) {
            console.error('Error verifying update:', verifyError);
          }
        } else {
          console.log('No points to award, threshold not met');
        }
      }
    }

    return true;
  } catch (err) {
    console.error('Error updating challenges with activity:', err);
    return false;
  }
}

/**
 * Helper: Get ISO week number (Monday as first day).
 * (Not used in awarding logic but left here in case needed.)
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}