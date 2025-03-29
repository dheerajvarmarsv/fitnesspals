import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Default survival settings
const DEFAULT_SURVIVAL_SETTINGS = {
  initial_safe_radius: 1.0,
  final_safe_radius: 0.1,
  max_points_per_period: 10,
  max_movement_per_period: 0.05,
  timeframe: 'daily',
  elimination_threshold: 3,
  start_lives: 3
};

// Calculate elimination threshold based on challenge length
const calculateEliminationThreshold = (totalDays: number): number => {
  if (totalDays <= 3) return 1;
  if (totalDays <= 10) return 2;
  return 3;
};

// Process danger status for a participant
const processDangerStatus = (
  participant: any,
  safeZoneRadius: number,
  settings: any,
  totalDays: number
) => {
  const survivalSettings = settings || DEFAULT_SURVIVAL_SETTINGS;
  const distanceFromCenter = participant.distance_from_center || 1.0;
  const isInDanger = distanceFromCenter > safeZoneRadius;
  let daysInDanger = participant.days_in_danger || 0;
  let lives = participant.lives ?? survivalSettings.start_lives;
  let isEliminated = participant.is_eliminated || false;

  if (isInDanger) {
    daysInDanger += 1;
    const eliminationThreshold = calculateEliminationThreshold(totalDays);

    console.log('Danger status check:', {
      participantId: participant.id,
      daysInDanger,
      eliminationThreshold,
      lives,
      isInDanger,
      distanceFromCenter,
      safeZoneRadius
    });

    if (daysInDanger >= eliminationThreshold) {
      lives = Math.max(0, lives - 1);
      daysInDanger = 0;

      console.log('Life lost:', {
        participantId: participant.id,
        newLives: lives,
        wasInDanger: daysInDanger,
        eliminationThreshold
      });

      if (lives <= 0) {
        isEliminated = true;
        console.log('Participant eliminated:', participant.id);
      }
    }
  } else {
    daysInDanger = 0;
  }

  return { days_in_danger: daysInDanger, lives, is_eliminated: isEliminated };
};

// Calculate safe zone radius
const calculateSafeZoneRadius = (
  currentDay: number,
  totalDays: number,
  settings: any
): number => {
  const survivalSettings = settings || DEFAULT_SURVIVAL_SETTINGS;
  const initialRadius = survivalSettings.initial_safe_radius || 1.0;
  const finalRadius = survivalSettings.final_safe_radius || 0.1;
  const timeframe = survivalSettings.timeframe || 'daily';
  const day = Math.max(1, currentDay);

  if (totalDays <= 1) return finalRadius;

  if (timeframe === 'weekly') {
    const currentWeek = Math.ceil(day / 7);
    const totalWeeks = Math.ceil(totalDays / 7);
    if (currentWeek <= 1) return initialRadius;
    if (currentWeek >= totalWeeks) return finalRadius;
    return initialRadius - ((initialRadius - finalRadius) * ((currentWeek - 1) / (totalWeeks - 1)));
  }

  if (day <= 1) return initialRadius;
  if (day >= totalDays) return finalRadius;
  return initialRadius - ((initialRadius - finalRadius) * ((day - 1) / (totalDays - 1)));
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting survival updates process');
    const stats = {
      challengesProcessed: 0,
      participantsProcessed: 0,
      participantsInDanger: 0,
      participantsEliminated: 0,
      errors: 0
    };

    const today = new Date();

    // Get all active survival challenges
    const { data: challenges, error: challengesError } = await supabase
      .from('challenges')
      .select('id, challenge_type, start_date, end_date, rules, survival_settings')
      .eq('challenge_type', 'survival')
      .eq('status', 'active');

    if (challengesError) {
      throw new Error(`Error fetching challenges: ${challengesError.message}`);
    }

    if (!challenges || challenges.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active challenges found', stats }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each challenge
    for (const challenge of challenges) {
      try {
        const survivalSettings = challenge.survival_settings || 
                               challenge.rules?.survival_settings || 
                               DEFAULT_SURVIVAL_SETTINGS;

        const timeframe = survivalSettings.timeframe || 'daily';
        const startDate = new Date(challenge.start_date);
        const endDate = challenge.end_date ? new Date(challenge.end_date) : new Date(startDate);

        if (!challenge.end_date) {
          endDate.setDate(startDate.getDate() + 30);
        }

        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const currentDay = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        if (currentDay <= 0 || currentDay > totalDays) continue;

        if (timeframe === 'weekly' && today.getDay() !== 0) continue;

        const safeZoneRadius = calculateSafeZoneRadius(currentDay, totalDays, survivalSettings);

        // Get active participants
        const { data: participants, error: participantsError } = await supabase
          .from('challenge_participants')
          .select('id, user_id, distance_from_center, angle, days_in_danger, lives, is_eliminated, last_activity_date')
          .eq('challenge_id', challenge.id)
          .eq('status', 'active')
          .eq('is_eliminated', false);

        if (participantsError) {
          console.error(`Error fetching participants: ${participantsError.message}`);
          continue;
        }

        if (!participants || participants.length === 0) continue;

        // Process each participant
        for (const participant of participants) {
          try {
            stats.participantsProcessed++;
            const currentDistance = participant.distance_from_center || 1.0;

            const dangerStatus = processDangerStatus(
              participant,
              safeZoneRadius,
              survivalSettings,
              totalDays
            );

            await supabase
              .from('challenge_participants')
              .update({
                days_in_danger: dangerStatus.days_in_danger,
                lives: dangerStatus.lives,
                is_eliminated: dangerStatus.is_eliminated
              })
              .eq('id', participant.id);

            if (currentDistance > safeZoneRadius) stats.participantsInDanger++;
            if (dangerStatus.is_eliminated) stats.participantsEliminated++;

          } catch (err) {
            console.error(`Error processing participant ${participant.id}:`, err);
            stats.errors++;
          }
        }

        stats.challengesProcessed++;
      } catch (err) {
        console.error(`Error processing challenge ${challenge.id}:`, err);
        stats.errors++;
      }
    }

    return new Response(
      JSON.stringify({ message: 'Completed survival updates', stats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
}); 