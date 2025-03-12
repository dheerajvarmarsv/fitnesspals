import { INITIAL_SAFE_ZONE, FINAL_SAFE_ZONE, DEFAULT_DISTANCE, DEFAULT_LIVES, DAYS_IN_DANGER_LIMIT } from './arenaStore';

/**
 * Default survival settings if not specified in the challenge
 */
export const DEFAULT_SURVIVAL_SETTINGS = {
  initial_safe_radius: 1.0,  // Start with full arena as safe zone
  final_safe_radius: 0.1,    // End with 10% as safe zone 
  max_points_per_period: 10, // Maximum points per day/week
  max_movement_per_period: 0.05, // Maximum movement per period (5% of arena)
  timeframe: 'daily',    // 'daily' or 'weekly'
  elimination_threshold: 3,  // Days in danger before losing a life
  start_lives: 3        // Starting lives
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
  const initialRadius = survivalSettings.initial_safe_radius || 1.0;
  const finalRadius = survivalSettings.final_safe_radius || 0.1;
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
 * Uses the formula:
 * movement = (points_earned / max_points_per_period) × max_movement_per_period
 */
export const calculateNewDistance = (
  currentDistance: number,
  pointsEarned: number,
  maxPossiblePoints: number = 10,
  settings?: any
): number => {
  // Use default settings if none provided
  const survivalSettings = settings || DEFAULT_SURVIVAL_SETTINGS;
  
  // Extract parameters
  const maxPointsPerPeriod = survivalSettings.max_points_per_period || 10;
  const maxMovementPerPeriod = survivalSettings.max_movement_per_period || 0.05;
  
  // No points earned = no movement
  if (!pointsEarned || pointsEarned <= 0) return currentDistance;
  
  // For Survival Challenge: "No Partial Points" Approach
  // If points were earned, it means the user fully met the target
  // Thus, award full movement instead of partial movement
  const movement = maxMovementPerPeriod;
  
  // Move inward (reduce distance)
  let newDistance = Math.max(0, currentDistance - movement);
  
  // Place dots exactly on the edge of the circle when at maximum distance
  // This ensures dots appear at the border of the circle when they're in danger
  if (currentDistance >= 0.99) {
    newDistance = 1.0;
  }
  
  return newDistance;
};

/**
 * Process a participant's danger status and update lives/elimination status
 * based on their distance from center and the current safe zone radius
 */
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

export const processDangerStatus = (
  participant: any,
  safeZoneRadius: number,
  settings?: any,
  totalDays?: number
): { 
  days_in_danger: number,
  lives: number,
  is_eliminated: boolean
} => {
  // Use default settings if none provided
  const survivalSettings = settings || DEFAULT_SURVIVAL_SETTINGS;
  
  // Determine elimination threshold based on challenge duration
  const timeframe = survivalSettings.timeframe || 'daily';
  // Use dynamically calculated threshold if totalDays is provided, otherwise use the settings value or default
  const eliminationThreshold = totalDays 
    ? calculateEliminationThreshold(totalDays) 
    : (survivalSettings.elimination_threshold || 3);
  
  // Get participant's current values
  const distanceFromCenter = participant.distance_from_center || 1.0;
  const isInDanger = distanceFromCenter > safeZoneRadius;
  
  // Current values
  let daysInDanger = participant.days_in_danger || 0;
  let lives = participant.lives || (survivalSettings.start_lives || 3);
  let isEliminated = participant.is_eliminated || false;
  
  // Process danger status
  if (isInDanger) {
    // Increment danger days
    daysInDanger += 1;
    
    // Check if participant loses a life
    if (daysInDanger >= eliminationThreshold) {
      lives = Math.max(0, lives - 1);
      daysInDanger = 0; // Reset danger counter after losing a life
      
      // Check if participant is eliminated
      if (lives <= 0) {
        isEliminated = true;
      }
    }
  } else {
    // Reset danger days if not in danger
    daysInDanger = 0;
  }
  
  return {
    days_in_danger: daysInDanger,
    lives,
    is_eliminated: isEliminated
  };
};

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
  lives: number,
  days_in_danger: number,
  distance_from_center: number,
  angle: number,
  is_eliminated: boolean
} => {
  // Use default settings if none provided
  const survivalSettings = settings || DEFAULT_SURVIVAL_SETTINGS;
  
  // Get starting lives from settings or use dynamic calculation based on challenge length
  const startLives = survivalSettings.start_lives || 3;
  
  // For late joiners, calculate their starting distance
  let startDistance = 1.0;  // Default to outer edge
  
  if (currentDay && totalDays && currentDay > 1) {
    // Calculate current safe zone radius
    const safeRadius = calculateSafeZoneRadius(currentDay, totalDays, survivalSettings);
    
    // Place them just inside the safe zone (95% of current safe radius)
    // This gives them a small safety buffer
    startDistance = safeRadius * 0.95;
    
    // For very short challenges, ensure they're not too advantaged
    if (totalDays <= 3 && currentDay >= totalDays/2) {
      // For very short challenges where user joins late, put them halfway between
      // safe zone and edge to give them a fighting chance but still require effort
      startDistance = safeRadius + ((1.0 - safeRadius) * 0.5);
    }
  }
  
  // Find an angle that isn't too close to existing participants
  // This would require passing in existing participants, which we'll leave for a future enhancement
  const angle = Math.random() * 360; // Random angle around the circle
  
  return {
    challenge_id: challengeId,
    user_id: userId,
    lives: startLives,
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
        survival_settings,
        rules
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
        
        // Get survival settings, using defaults if needed
        const survivalSettings = challenge.survival_settings || 
                               (challenge.rules?.survival_settings) || 
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
              survivalSettings,
              totalDays
            );
            
            // Update participant with danger status
            await supabaseClient
              .from('challenge_participants')
              .update({
                days_in_danger: dangerStatus.days_in_danger,
                lives: dangerStatus.lives,
                is_eliminated: dangerStatus.is_eliminated
              })
              .eq('id', participant.id);
              
            // Track stats
            if (currentDistance > safeZoneRadius) stats.participantsInDanger++;
            if (dangerStatus.is_eliminated) stats.participantsEliminated++;
            
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