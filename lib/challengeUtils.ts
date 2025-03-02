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
  // 1) fetch all active challenges
  const activeChallenges = await getActiveChallengesForUser(userId);
  if (!activeChallenges.length) return [];

  // 2) gather the IDs
  const challengeIds = activeChallenges.map(ch => ch.id);

  // 3) from `challenge_activities`, fetch unique activity_type
  const { data: cActs, error: actsErr } = await supabase
    .from('challenge_activities')
    .select('activity_type')
    .in('challenge_id', challengeIds);
  if (actsErr) {
    console.error('Error fetching challenge_activities:', actsErr);
    throw new Error(actsErr.message);
  }
  if (!cActs?.length) return [];

  const unique = new Set(cActs.map((row: any) => row.activity_type));
  return Array.from(unique);
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
    // fetch the newly created activity
    const { data: act, error: actErr } = await supabase
      .from('activities')
      .select('*')
      .eq('id', activityId)
      .single();
    if (actErr || !act) {
      console.error('Error fetching new activity data:', actErr);
      return;
    }

    const { activity_type, duration, distance } = act;

    // fetch all active challenges for this user
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

      for (const cAct of cActs) {
        const thresholdVal = cAct.threshold;      // numeric
        const unit = cAct.metric;                 // e.g. "hours", "km", "steps", etc.
        const points = cAct.points || 0;

        if (thresholdVal == null || !unit) continue;

        let meets = false;
        if (unit === 'hours') {
          if (duration >= thresholdVal * 60) meets = true;
        } else if (unit === 'min') {
          if (duration >= thresholdVal) meets = true;
        } else if (unit === 'km') {
          if (distance >= thresholdVal) meets = true;
        } else if (unit === 'steps') {
          // if the user logs "Steps" as an activity, we treat `duration` as step count
          if (activity_type.toLowerCase() === 'steps' && duration >= thresholdVal) meets = true;
        } else if (unit === 'count') {
          // if your "Count" means the user logs `duration` as a count
          if (activity_type.toLowerCase() === 'count' && duration >= thresholdVal) meets = true;
        }
        // etc. for "calories" if you want

        if (meets && points > 0) {
          // update total_points for the user in this challenge
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

          const currentPoints = partRow.total_points ?? 0;
          const newPoints = currentPoints + points;

          const { error: updateErr } = await supabase
            .from('challenge_participants')
            .update({ total_points: newPoints })
            .eq('id', partRow.id);

          if (updateErr) {
            console.error('Error updating participant points:', updateErr);
          } else {
            console.log(
              `Awarded ${points} point(s) to user ${userId} for challenge ${challengeId} activity ${activity_type}.`
            );
          }
        }
      }
    }
  } catch (err) {
    console.error('Error in updateChallengesWithActivity:', err);
  }
}