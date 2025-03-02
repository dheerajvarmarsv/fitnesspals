// lib/challengeUtils.ts
import { supabase } from './supabase';

/**
 * Returns all active challenges for which userId is an active participant.
 * Gathers a participant_count aggregator via `challenge_participants(count)`.
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
  // shape => [ { challenge_id, status, challenges: { ..., challenge_participants: [ { count } ] } }, ... ]
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
 * Returns all unique `activity_type` from challenge_activities for all active challenges the user is in.
 */
export async function getChallengeActivityTypes(userId: string): Promise<string[]> {
  // 1) fetch all active challenges for user
  const activeChallenges = await getActiveChallengesForUser(userId);
  if (!activeChallenges.length) return [];

  // 2) gather the challenge IDs
  const challengeIds = activeChallenges.map(ch => ch.id);

  // 3) fetch distinct activity_type from `challenge_activities`
  const { data: cActs, error: cActsErr } = await supabase
    .from('challenge_activities')
    .select('activity_type')
    .in('challenge_id', challengeIds);

  if (cActsErr) {
    console.error('Error fetching challenge_activities:', cActsErr);
    throw new Error(cActsErr.message);
  }
  if (!cActs?.length) return [];

  const uniqueSet = new Set(cActs.map((row: any) => row.activity_type));
  return Array.from(uniqueSet);
}

/**
 * Inserts a new record in `activities`.
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
    .insert([{
      user_id: userId,
      activity_type: activityData.activityType,
      duration: activityData.duration,
      distance: activityData.distance,
      calories: activityData.calories,
      notes: activityData.notes,
      created_at: new Date(),
      source: 'manual',
    }])
    .select()
    .single();

  if (error) {
    console.error('Error saving activity:', error);
    throw new Error(error.message);
  }
  return { success: true, data };
}

/**
 * After saving a new activity, recalculate points for any active challenge that includes this activity type.
 * - checks `challenge_activities` for a matching activity_type
 * - compares thresholds to the new activity’s duration/distance
 * - awards points in `challenge_participants.total_points` if threshold is met
 */
export async function updateChallengesWithActivity(activityId: string, userId: string) {
  try {
    // fetch the newly created activity
    const { data: act, error: actErr } = await supabase
      .from('activities')
      .select('*')
      .eq('id', activityId)
      .single();

    if (actErr || !act) {
      console.error('Error fetching newly inserted activity:', actErr);
      return;
    }

    const { activity_type, duration, distance } = act;

    // get the user’s active challenges
    const activeChallenges = await getActiveChallengesForUser(userId);
    if (!activeChallenges.length) return;

    // for each challenge, see if there's a matching row in `challenge_activities`
    for (const ch of activeChallenges) {
      const challengeId = ch.id;
      if (!challengeId) continue;

      const { data: cActs, error: cActsErr } = await supabase
        .from('challenge_activities')
        .select('*')
        .eq('challenge_id', challengeId)
        .eq('activity_type', activity_type);

      if (cActsErr) {
        console.error('Error fetching challenge_activities:', cActsErr);
        continue;
      }
      if (!cActs?.length) continue;

      // e.g. if threshold=30, metric='min', points=3
      for (const cAct of cActs) {
        const thresholdVal = cAct.threshold; // numeric
        const unit = cAct.metric;            // 'min','hours','km','steps','count','calories'?
        const points = cAct.points || 0;
        if (thresholdVal == null || !unit) continue;

        let meets = false;
        if (unit === 'hours') {
          // compare duration to thresholdVal * 60
          if (duration >= thresholdVal * 60) meets = true;
        } else if (unit === 'min') {
          if (duration >= thresholdVal) meets = true;
        } else if (unit === 'km') {
          if (distance >= thresholdVal) meets = true;
        } else if (unit === 'steps') {
          if (activity_type.toLowerCase() === 'steps' && duration >= thresholdVal) meets = true;
        } else if (unit === 'count') {
          // "Count" means user logs a numeric in .duration
          if (activity_type.toLowerCase() === 'count' && duration >= thresholdVal) meets = true;
        } else if (unit === 'calories') {
          // if you store .calories, you can compare act.calories >= thresholdVal
          // not implemented in your example, but you can do it if you want
        }

        if (meets && points > 0) {
          // update participant’s total_points
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

          const { error: updateErr } = await supabase
            .from('challenge_participants')
            .update({ total_points: newPoints })
            .eq('id', partRow.id);

          if (updateErr) {
            console.error('Error updating participant points:', updateErr);
          } else {
            console.log(
              `Awarded ${points} point(s) to user ${userId} in challenge ${challengeId} for activity "${activity_type}".`
            );
          }
        }
      }
    }
  } catch (err) {
    console.error('Error in updateChallengesWithActivity:', err);
  }
}