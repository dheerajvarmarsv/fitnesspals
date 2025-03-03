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
export async function updateChallengesWithActivity(activityId: string, userId: string) {
  const { data: act, error: actErr } = await supabase
    .from('activities')
    .select('*')
    .eq('id', activityId)
    .single();
  if (actErr || !act) {
    console.error('Error fetching new activity row:', actErr);
    return;
  }
  const { activity_type, duration, distance, calories, metric } = act;
  const activeChallenges = await getActiveChallengesForUser(userId);
  if (!activeChallenges.length) return;
  for (const challenge of activeChallenges) {
    const challengeId = challenge.id;
    if (!challengeId) continue;
    const { data: cActs, error: cErr } = await supabase
      .from('challenge_activities')
      .select('*')
      .eq('challenge_id', challengeId)
      .eq('activity_type', activity_type);
    if (cErr) {
      console.error('Error fetching challenge_activities:', cErr);
      continue;
    }
    if (!cActs?.length) continue;
    for (const cAct of cActs) {
      const threshold = cAct.target_value || cAct.threshold || 1;
      const activityMetric = cAct.metric;
      const points = cAct.points || 1;
      let meets = false;
      if (activityMetric === 'time' && metric === 'time') {
        if (duration >= threshold) meets = true;
      } else if ((activityMetric === 'distance_km' || activityMetric === 'distance_miles') && metric?.includes('distance')) {
        if (distance >= threshold) meets = true;
      } else if (activityMetric === 'steps' && metric === 'steps') {
        if (duration >= threshold) meets = true;
      } else if (activityMetric === 'calories' && metric === 'calories') {
        if (calories >= threshold) meets = true;
      } else if (activityMetric === 'count' && metric === 'count') {
        if (duration >= threshold) meets = true;
      }
      if (meets) {
        const { data: pData, error: pErr } = await supabase
          .from('challenge_participants')
          .select('id,total_points')
          .eq('user_id', userId)
          .eq('challenge_id', challengeId)
          .single();
        if (pErr || !pData) {
          console.error('Error fetching participant row:', pErr);
          continue;
        }
        const newPoints = (pData.total_points || 0) + points;
        const { error: updErr } = await supabase
          .from('challenge_participants')
          .update({ total_points: newPoints, last_activity_date: new Date().toISOString() })
          .eq('id', pData.id);
        if (updErr) {
          console.error('Error updating total_points:', updErr);
        } else {
          console.log(`Awarded ${points} points to user ${userId} in challenge ${challengeId} for activity ${activity_type}`);
        }
      }
    }
  }
}