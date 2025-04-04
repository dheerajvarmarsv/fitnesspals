import { supabase } from './supabase';

/**
 * Default survival settings if not specified in the challenge
 */
export const DEFAULT_SURVIVAL_SETTINGS = {
  initial_safe_zone_radius: 1.0,
  min_safe_zone_radius: 0.1,
  max_safe_zone_radius: 1.0,
  safe_zone_shrink_rate: 0.1,
  danger_threshold: 0.8,
  max_points_per_period: 10, // Maximum points per day/week
  max_movement_per_period: 0.05, // Maximum movement per period (5% of arena)
  timeframe: 'daily',    // 'daily' or 'weekly'
};

/**
 * Calculate the safe zone radius for a given day in the challenge.
 * Returns a normalized value between 0-1 where 1 is the full arena radius.
 * 
 * Uses the formula:
 * safe_radius(d) = initial_radius - ((initial_radius - final_radius) × ((d-1)/(total_days-1)))
 */
export const calculateSafeZoneRadius = (
  currentDay: number, 
  totalDays: number, 
  settings?: any
): number => {
  // Use default settings if none provided
  const survivalSettings = settings || DEFAULT_SURVIVAL_SETTINGS;
  
  // Extract parameters
  const initialRadius = survivalSettings.initial_safe_zone_radius || 1.0;
  const finalRadius = survivalSettings.min_safe_zone_radius || 0.1;
  const timeframe = survivalSettings.timeframe || 'daily';
  
  // Ensure currentDay is at least 1 (1-based)
  const day = Math.max(1, currentDay);
  
  // For a 1-day challenge, return the final radius on day 1
  if (totalDays <= 1) return finalRadius;
  
  // For weekly timeframe, convert days to weeks
  if (timeframe === 'weekly') {
    const currentWeek = Math.ceil(day / 7);
    const totalWeeks = Math.ceil(totalDays / 7);
    
    // Don't shrink if we're still in the first week
    if (currentWeek <= 1) return initialRadius;
    
    // For last week, use final radius
    if (currentWeek >= totalWeeks) return finalRadius;
    
    // For intermediate weeks, calculate linearly
    return initialRadius - ((initialRadius - finalRadius) * ((currentWeek - 1) / (totalWeeks - 1)));
  }
  
  // For daily timeframe with standard calculation
  if (day <= 1) return initialRadius; // First day is always fully safe
  if (day >= totalDays) return finalRadius; // Last day uses final radius
  
  // Linear reduction using (day-1)/(totalDays-1) formula for day 2 onwards
  return initialRadius - ((initialRadius - finalRadius) * ((day - 1) / (totalDays - 1)));
};

/**
 * Calculate the new distance from center based on points earned
 * Returns a value between 0-1 (normalized distance)
 * 
 * For survival challenges with "no partial points" approach:
 * - Users start at the outer edge (distance_from_center = 1)
 * - When they complete activities successfully, they move toward the center
 * - If they fail to meet targets, they stay where they are
 * 
 * The movement is dynamically calculated based on:
 * - The challenge's specific time periods (daily/weekly)
 * - Current progress in the challenge (currentDay vs totalDays)
 * - The challenge's survival settings
 */
export const calculateNewDistance = (
  currentDistance: number,
  pointsEarned: number,
  maxPossiblePoints: number,
  settings?: any,
  currentDay: number = 1,
  totalDays: number = 30
): number => {
  // Use default settings if none provided
  const survivalSettings = settings || DEFAULT_SURVIVAL_SETTINGS;
  
  // No points earned = no movement (user failed to meet target)
  if (!pointsEarned || pointsEarned <= 0) return currentDistance;
  
  // Calculate base safe position: B = 1 - (d - 1) / (D - 1)
  // This represents where the safe zone is for the current day
  let baseSafePosition = 1;
  if (totalDays > 1) {
    baseSafePosition = 1 - ((currentDay - 1) / (totalDays - 1));
  }
  
  // Calculate dynamic movement factor based on challenge duration
  // Shorter challenges should have larger movements to compensate
  let durationFactor = 1;
  if (totalDays <= 7) {
    // For very short challenges, allow faster movement
    durationFactor = 2;
  } else if (totalDays <= 14) {
    // For medium length challenges
    durationFactor = 1.5;
  }
  
  // Get the movement per period from settings, scaled by duration factor
  const baseMovement = survivalSettings.max_movement_per_period || 0.05;
  const maxMovement = baseMovement * durationFactor;
  
  // Calculate the percentage of points earned relative to maximum possible
  // This provides partial credit for activity completion
  const pointsRatio = Math.min(1, pointsEarned / Math.max(1, maxPossiblePoints));
  
  // For timeframe considerations
  const timeframe = survivalSettings.timeframe || 'daily';
  let timeframeFactor = 1;
  
  // Weekly challenges should have larger movements since there are fewer opportunities
  if (timeframe === 'weekly') {
    timeframeFactor = 3; // Weekly movements are ~3x larger than daily
  }
  
  // Calculate movement amount using all factors
  const movementAmount = maxMovement * pointsRatio * timeframeFactor;
  
  // Calculate minimum movement based on challenge duration
  // Shorter challenges need larger minimum movements
  let minMovementPercent = 0.01; // 1% by default
  
  // For very short challenges (7 days or less), minimum movement is larger
  if (totalDays <= 7) {
    minMovementPercent = 0.03; // 3% for short challenges
  } else if (totalDays <= 14) {
    minMovementPercent = 0.02; // 2% for medium challenges
  }
  
  // Scale minimum movement based on weekly/daily timeframe
  if (timeframe === 'weekly') {
    minMovementPercent *= 3; // Larger minimum movement for weekly challenges
  }
  
  // Apply minimum movement to ensure changes are visible
  const effectiveMovement = Math.max(minMovementPercent, movementAmount);
  
  // Calculate new distance by moving inward (reducing distance)
  // Never go below 0 (center of arena)
  const newDistance = Math.max(0, currentDistance - effectiveMovement);
  
  // Log for debugging
  console.log('Distance calculation:', {
    currentDistance,
    pointsEarned,
    maxPossiblePoints,
    pointsRatio,
    timeframe,
    baseMovement,
    durationFactor,
    timeframeFactor,
    movementAmount,
    effectiveMovement,
    newDistance,
    currentDay,
    totalDays,
    baseSafePosition
  });
  
  return newDistance;
};

/**
 * Calculate dynamic elimination threshold based on challenge length
 * Shorter challenges need quicker elimination to maintain challenge
 */
export const calculateEliminationThreshold = (totalDays: number): number => {
  if (totalDays <= 3) {
    return 1; // 1-3 day challenges: eliminate after 1 day in danger
  } else if (totalDays <= 10) {
    return 2; // 4-10 day challenges: eliminate after 2 days in danger
  } else {
    return 3; // 11+ day challenges: standard 3 days in danger before elimination
  }
};

export interface ProcessDangerResult {
  success: boolean;
  eliminated: boolean;
  daysInDanger: number;
}

export async function processDangerStatus(
  participant: any,
  safeZoneRadius: number,
  currentDay: number,
  totalDays: number,
  settings = DEFAULT_SURVIVAL_SETTINGS
): Promise<ProcessDangerResult> {
  const distanceFromCenter = participant.distance_from_center || 1.0;
  const dangerThreshold = settings.danger_threshold || 0.8;
  const isInDanger = distanceFromCenter > (safeZoneRadius * dangerThreshold);
  
  try {
    // If in danger, they are eliminated immediately (no more lives system)
    if (isInDanger) {
      // Update participant record with elimination
      const { error: updateError } = await supabase
        .from('challenge_participants')
        .update({
          days_in_danger: 1,
          is_eliminated: true,
          elimination_date: new Date().toISOString(),
          status: 'eliminated'
        })
        .eq('id', participant.id);
      
      if (updateError) {
        console.error('Error updating participant elimination status:', updateError);
        return {
          success: false,
          eliminated: false,
          daysInDanger: 1
        };
      }
      
      return {
        success: true,
        eliminated: true,
        daysInDanger: 1
      };
    }
    
    // If not in danger, reset days in danger
    const { error: updateError } = await supabase
      .from('challenge_participants')
      .update({
        days_in_danger: 0
      })
      .eq('id', participant.id);
    
    if (updateError) {
      console.error('Error resetting participant danger days:', updateError);
      return {
        success: false,
        eliminated: false,
        daysInDanger: 0
      };
    }

    return {
      success: true,
      eliminated: false,
      daysInDanger: 0
    };
  } catch (error) {
    console.error('Error in processDangerStatus:', error instanceof Error ? error.message : String(error));
    return {
      success: false,
      eliminated: false,
      daysInDanger: participant.days_in_danger || 0
    };
  }
}

/**
 * Initialize a new participant for a survival challenge
 * 
 * @param userId - The user ID
 * @param challengeId - The challenge ID
 * @param settings - Optional survival settings
 * @param currentDay - Optional current day (for late joiners)
 * @param totalDays - Optional total days (for late joiners)
 * @returns Initialized participant data
 */
export const initializeParticipant = (
  userId: string, 
  challengeId: string,
  settings?: any,
  currentDay?: number,
  totalDays?: number
): {
  challenge_id: string,
  user_id: string,
  days_in_danger: number,
  distance_from_center: number,
  angle: number,
  is_eliminated: boolean
} => {
  // Use default settings if none provided
  const survivalSettings = settings || DEFAULT_SURVIVAL_SETTINGS;
  
  // For late joiners, calculate their starting distance
  let startDistance = 1.0;  // Default to outer edge
  
  if (currentDay && totalDays && currentDay > 1) {
    // Calculate current safe zone radius
    const safeRadius = calculateSafeZoneRadius(currentDay, totalDays, survivalSettings);
    
    // Place them just inside the safe zone (95% of current safe radius)
    startDistance = safeRadius * 0.95;
    
    // For very short challenges, ensure they're not too advantaged
    if (totalDays <= 3 && currentDay >= totalDays/2) {
      startDistance = safeRadius + ((1.0 - safeRadius) * 0.5);
    }
  }
  
  // Random angle around the circle
  const angle = Math.random() * 360;
  
  return {
    challenge_id: challengeId,
    user_id: userId,
    days_in_danger: 0,
    distance_from_center: startDistance,
    angle: angle,
    is_eliminated: false
  };
};

/**
 * Process survival updates for all active survival challenges
 * This should be run as a daily cron job or edge function
 * 
 * @param supabaseClient - Supabase client instance with admin privileges
 * @returns Object with counts of processed challenges and participants
 */
export const processDailySurvivalUpdates = async (supabaseClient: any) => {
  try {
    console.log('Starting survival updates process');
    
    // Track statistics
    const stats = {
      challengesProcessed: 0,
      participantsProcessed: 0,
      participantsInDanger: 0,
      participantsEliminated: 0,
      errors: 0
    };
    
    const today = new Date();
    
    // 1. Get all active survival challenges
    const { data: challenges, error: challengesError } = await supabaseClient
      .from('challenges')
      .select(`
        id, 
        challenge_type,
        start_date,
        end_date,
        rules,
        survival_settings
      `)
      .eq('challenge_type', 'survival')
      .eq('status', 'active');
      
    if (challengesError) {
      console.error('Error fetching survival challenges:', challengesError);
      return { error: challengesError.message, stats };
    }
    
    if (!challenges || challenges.length === 0) {
      console.log('No active survival challenges found');
      return { message: 'No active survival challenges found', stats };
    }
    
    // 2. Process each challenge
    for (const challenge of challenges) {
      try {
        console.log(`Processing challenge: ${challenge.id}`);
        
        // Get survival settings from the dedicated column or fallback to rules
        const survivalSettings = challenge.survival_settings || 
                               challenge.rules?.survival_settings || 
                               DEFAULT_SURVIVAL_SETTINGS;
                               
        // Determine timeframe (daily/weekly)
        const timeframe = survivalSettings.timeframe || 'daily';
        
        // Calculate challenge duration
        const startDate = new Date(challenge.start_date);
        const endDate = challenge.end_date ? new Date(challenge.end_date) : new Date(startDate);
        
        // Default duration if open-ended (30 days)
        if (!challenge.end_date) {
          endDate.setDate(startDate.getDate() + 30);
        }
        
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const currentDay = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Skip if challenge hasn't started or has ended
        if (currentDay <= 0) {
          console.log(`Challenge ${challenge.id} hasn't started yet`);
          continue;
        }
        
        if (currentDay > totalDays) {
          console.log(`Challenge ${challenge.id} has ended`);
          // Mark as completed if we're past the end date
          await supabaseClient
            .from('challenges')
            .update({ status: 'completed' })
            .eq('id', challenge.id);
          continue;
        }
        
        // For weekly timeframe, only process on the last day of each week
        if (timeframe === 'weekly') {
          const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
          
          // If not Sunday, skip (or choose any other day as your "end of week")
          if (dayOfWeek !== 0) {
            console.log(`Skipping weekly challenge ${challenge.id} update (not end of week)`);
            continue;
          }
        }
        
        // Calculate today's safe zone radius (or this week's if weekly)
        const safeZoneRadius = calculateSafeZoneRadius(currentDay, totalDays, survivalSettings);
        console.log(`Challenge ${challenge.id}: Safe zone radius for day ${currentDay} is ${safeZoneRadius}`);
        
        // 3. Get all active participants for this challenge
        const { data: participants, error: participantsError } = await supabaseClient
          .from('challenge_participants')
          .select(`
            id,
            user_id,
            distance_from_center,
            angle,
            days_in_danger,
            lives,
            is_eliminated,
            last_activity_date
          `)
          .eq('challenge_id', challenge.id)
          .eq('status', 'active')
          .eq('is_eliminated', false); // Only non-eliminated participants
          
        if (participantsError) {
          console.error(`Error fetching participants for challenge ${challenge.id}:`, participantsError);
          stats.errors++;
          continue;
        }
        
        if (!participants || participants.length === 0) {
          console.log(`No active participants found for challenge ${challenge.id}`);
          continue;
        }
        
        console.log(`Processing ${participants.length} participants for challenge ${challenge.id}`);
        
        // 4. Process each participant
        for (const participant of participants) {
          try {
            stats.participantsProcessed++;
            
            // Get participant's current details
            const currentDistance = participant.distance_from_center || 1.0;
            
            // Check if participant had activity in the current period
            let hasRecentActivity = false;
            
            if (participant.last_activity_date) {
              const lastActivityDate = new Date(participant.last_activity_date);
              
              if (timeframe === 'daily') {
                // For daily, check if activity was today
                hasRecentActivity = lastActivityDate.toDateString() === today.toDateString();
              } else {
                // For weekly, check if activity was this week
                const daysSinceLastActivity = Math.floor(
                  (today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
                );
                hasRecentActivity = daysSinceLastActivity < 7;
              }
            }
            
            // If no recent activity, the participant doesn't move
            // Their relative position worsens as the safe zone shrinks
            
            // Process danger status (lose lives if in danger too long)
            // Pass totalDays to use dynamic elimination threshold based on challenge length
            const dangerStatus = processDangerStatus(
              participant,
              safeZoneRadius,
              currentDay,
              totalDays,
              survivalSettings
            );
            
            // Update participant with danger status
            await supabaseClient
              .from('challenge_participants')
              .update({
                days_in_danger: dangerStatus.daysInDanger,
                lives: dangerStatus.lives,
                is_eliminated: dangerStatus.eliminated
              })
              .eq('id', participant.id);
              
            // Track stats
            if (currentDistance > safeZoneRadius) stats.participantsInDanger++;
            if (dangerStatus.eliminated) stats.participantsEliminated++;
            
            console.log(`Processed danger status for participant ${participant.id}:`, dangerStatus);
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
    
    console.log('Completed survival updates process', stats);
    return { message: 'Completed survival updates', stats };
  } catch (err) {
    console.error('Error in processDailySurvivalUpdates:', err);
    return { error: 'Internal server error', message: err.message };
  }
};

export interface ProcessDailyResult {
  participantId: string;
  success: boolean;
  eliminated: boolean;
  daysInDanger: number;
}

export async function processDailyUpdates(
  participants: any[],
  safeZoneRadius: number,
  currentDay: number,
  totalDays: number,
  survivalSettings = DEFAULT_SURVIVAL_SETTINGS
): Promise<ProcessDailyResult[]> {
  const results: ProcessDailyResult[] = [];
  
  for (const participant of participants) {
    if (participant.is_eliminated) continue;
    
    try {
      const dangerResult = await processDangerStatus(
        participant,
        safeZoneRadius,
        currentDay,
        totalDays,
        survivalSettings
      );
      
      results.push({
        participantId: participant.id,
        success: dangerResult.success,
        eliminated: dangerResult.eliminated,
        daysInDanger: dangerResult.daysInDanger
      });
    } catch (error) {
      console.error(`Error processing participant ${participant.id}:`, error instanceof Error ? error.message : String(error));
      results.push({
        participantId: participant.id,
        success: false,
        eliminated: false,
        daysInDanger: participant.days_in_danger || 0
      });
    }
  }
  
  return results;
}

export async function processSurvivalUpdates(
  challengeId: string,
  participants: any[],
  currentDay: number,
  totalDays: number,
  survivalSettings = DEFAULT_SURVIVAL_SETTINGS
) {
  const stats = {
    participantsProcessed: 0,
    participantsInDanger: 0,
    participantsEliminated: 0,
    errors: 0
  };

  try {
    // Calculate safe zone radius for current day
    const safeZoneRadius = calculateSafeZoneRadius(currentDay, totalDays, survivalSettings);
    
    // Process each participant
    for (const participant of participants) {
      if (participant.is_eliminated) {
        stats.participantsEliminated++;
        continue;
      }
      
      try {
        const currentDistance = participant.distance_from_center || 1.0;
        
        // Process danger status
        const dangerResult = await processDangerStatus(
          participant,
          safeZoneRadius,
          currentDay,
          totalDays,
          survivalSettings
        );
        
        // Update participant record with new status
        const { error: updateError } = await supabase
          .from('challenge_participants')
          .update({
            days_in_danger: dangerResult.daysInDanger,
            is_eliminated: dangerResult.eliminated,
            status: dangerResult.eliminated ? 'eliminated' : 'active'
          })
          .eq('id', participant.id);
        
        if (updateError) {
          console.error('Error updating participant status:', updateError);
          stats.errors++;
          continue;
        }
        
        // Track stats
        stats.participantsProcessed++;
        if (currentDistance > safeZoneRadius) stats.participantsInDanger++;
        if (dangerResult.eliminated) stats.participantsEliminated++;
        
        console.log(`Processed danger status for participant ${participant.id}:`, dangerResult);
      } catch (error) {
        console.error(`Error processing participant ${participant.id}:`, error instanceof Error ? error.message : String(error));
        stats.errors++;
      }
    }
    
    return {
      success: true,
      stats,
      safeZoneRadius
    };
  } catch (error) {
    console.error('Error in processSurvivalUpdates:', error instanceof Error ? error.message : String(error));
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stats
    };
  }
}