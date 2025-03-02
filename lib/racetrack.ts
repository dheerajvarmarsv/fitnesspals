import { supabase } from './supabase';

/**
 * Updates a participant's position on the race track and calculates points
 * @param participantRowId The database row ID of the participant record
 * @param participantUserId The user_id of the participant
 * @param challengeId The challenge_id of the race
 * @param position The new map_position value
 * @returns Promise with the updated data or error
 */
export async function updateRacePosition(
  participantRowId: string,
  participantUserId: string,
  challengeId: string,
  position: number
) {
  try {
    // Calculate points based on position
    const pointsPerStep = 10;
    const totalPoints = position * pointsPerStep;
    
    console.log('Updating race position:', {
      participantRowId,
      participantUserId,
      challengeId,
      position,
      totalPoints
    });
    
    // Update the database
    const { data, error } = await supabase
      .from('challenge_participants')
      .update({
        map_position: position,
        total_points: totalPoints,
        last_activity_date: new Date().toISOString()
      })
      .eq('id', participantRowId)
      .eq('challenge_id', challengeId)
      .eq('user_id', participantUserId)
      .select();
      
    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }
    
    return { data, error: null };
  } catch (error) {
    console.error('Error updating race position:', error);
    return { data: null, error };
  }
}

/**
 * Setup real-time subscription for race track updates
 * @param challengeId The challenge ID to subscribe to
 * @param callback Function to call when updates occur
 * @returns Supabase subscription that can be used to remove the channel
 */
export function subscribeToRaceUpdates(challengeId: string, callback: (payload: any) => void) {
  console.log(`Setting up real-time subscription for race challenge: ${challengeId}`);
  
  const channel = supabase
    .channel(`race_track_${challengeId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'challenge_participants',
        filter: `challenge_id=eq.${challengeId}`,
      },
      (payload) => {
        console.log('Race track update received:', payload);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log(`Race track subscription status: ${status}`);
    });
    
  return channel;
}

/**
 * Get race participants with their current position
 * @param challengeId The challenge ID
 * @returns Promise with array of participants and their positions
 */
export async function getRaceParticipants(challengeId: string) {
  try {
    const { data, error } = await supabase
      .from('challenge_participants')
      .select(`
        id,
        user_id,
        status,
        total_points,
        map_position,
        profile:profiles (
          id,
          nickname,
          avatar_url
        )
      `)
      .eq('challenge_id', challengeId)
      .order('total_points', { ascending: false });
      
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching race participants:', error);
    return { data: null, error };
  }
}

/**
 * Resets a participant's position on the race track back to start (position 0)
 * @param participantRowId The database row ID of the participant record
 * @param participantUserId The user_id of the participant
 * @param challengeId The challenge_id of the race 
 * @returns Promise with the reset data or error
 */
export async function resetRacePosition(
  participantRowId: string,
  participantUserId: string,
  challengeId: string
) {
  try {
    const { data, error } = await supabase
      .from('challenge_participants')
      .update({
        map_position: 0,
        total_points: 0,
        last_activity_date: new Date().toISOString()
      })
      .eq('id', participantRowId)
      .eq('challenge_id', challengeId)
      .eq('user_id', participantUserId)
      .select();
      
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error resetting race position:', error);
    return { data: null, error };
  }
}

/**
 * Joins a participant to a race challenge
 * @param userId The user's ID
 * @param challengeId The challenge to join
 * @returns Promise with the joined data or error
 */
export async function joinRaceChallenge(userId: string, challengeId: string) {
  try {
    // Check if user is already a participant
    const { data: existingParticipant, error: checkError } = await supabase
      .from('challenge_participants')
      .select('id')
      .eq('challenge_id', challengeId)
      .eq('user_id', userId)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') throw checkError;
    
    if (existingParticipant) {
      return { data: existingParticipant, error: null, alreadyJoined: true };
    }
    
    // Add user as participant
    const { data, error } = await supabase
      .from('challenge_participants')
      .insert({
        challenge_id: challengeId,
        user_id: userId,
        status: 'active',
        map_position: 0, 
        total_points: 0,
        current_streak: 0,
        longest_streak: 0
      })
      .select();
      
    if (error) throw error;
    return { data, error: null, alreadyJoined: false };
  } catch (error) {
    console.error('Error joining race challenge:', error);
    return { data: null, error, alreadyJoined: false };
  }
}