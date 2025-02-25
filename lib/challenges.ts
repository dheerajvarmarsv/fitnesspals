// lib/challenges.ts
import { supabase } from './supabase';

interface SelectedActivity {
  activityType: string;
  threshold: string;
  points: number;
  timeframe: 'day' | 'week';
}

/**
 * Insert a new challenge into `challenges` plus any related `challenge_activities`.
 */
export async function createChallengeInSupabase({
  userId,
  challengeType, // 'race', 'survival', 'streak', 'custom'
  name,
  description,
  startDate,
  endDate,
  isOpenEnded,
  selectedActivities,
}: {
  userId: string;
  challengeType: string;
  name: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
  isOpenEnded: boolean;
  selectedActivities: SelectedActivity[];
}) {
  const { data: challengeData, error: challengeError } = await supabase
    .from('challenges')
    .insert([
      {
        creator_id: userId,
        challenge_type: challengeType,
        title: name,
        description,
        start_date: startDate ? startDate.toISOString() : null,
        end_date: isOpenEnded ? null : endDate?.toISOString() || null,
        status: 'active',
      },
    ])
    .select()
    .single();

  if (challengeError) throw challengeError;
  if (!challengeData) throw new Error('Failed to insert challenge');

  const newChallengeId = challengeData.id;

  // Insert selected activities
  if (selectedActivities.length > 0) {
    const rows = selectedActivities.map((act) => ({
      challenge_id: newChallengeId,
      activity_type: act.activityType,
      threshold: act.threshold,
      points: act.points,
      timeframe: act.timeframe,
    }));

    const { error: activitiesError } = await supabase
      .from('challenge_activities')
      .insert(rows);

    if (activitiesError) throw activitiesError;
  }

  return challengeData;
}

/**
 * Fetch active challenges (status='active').
 */
export async function getActiveChallenges() {
  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

//this is the stable version