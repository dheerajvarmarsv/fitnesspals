import { create } from 'zustand';
import { User } from '../lib/user';
import { Dimensions } from 'react-native';
import { supabase } from './supabase';
import { DEFAULT_SURVIVAL_SETTINGS, calculateSafeZoneRadius } from './survivalUtils';

const { width } = Dimensions.get('window');
const ARENA_SIZE = width * 0.9; // Visual size for the arena component
const MAX_SAFE_ZONE_RADIUS = (ARENA_SIZE / 2) * 0.9; // 90% of arena radius
const MIN_SAFE_ZONE_RADIUS = (ARENA_SIZE / 2) * 0.1; // 10% of arena radius - minimum safe zone

// Constants for arena calculations - use the values from survivalUtils

// Convert participant data from database to User objects for the arena
export const mapParticipantToUser = (
  participant: any, 
  currentUserId: string, 
  arenaRadius: number
): User => {
  // Use default starting distance from edge (1.0) if not set
  const distanceFromCenter = participant.distance_from_center !== undefined ? 
    participant.distance_from_center : 1.0;
  
  // Use random angle if not set
  const angle = participant.angle !== undefined ? 
    participant.angle : Math.random() * 360;
  
  // Ensure participants at maximum distance are exactly on the edge
  // This fixes the issue with dots not appearing on arena border
  // Also make sure the distance is never less than 0.05 to prevent dots from stacking in the center
  const adjustedDistance = distanceFromCenter >= 0.99 ? 1.0 : 
                          distanceFromCenter <= 0.05 ? 0.05 : 
                          distanceFromCenter;
                          
  // Get nickname for consistent display
  const nickname = participant.profile?.nickname || 'User';
  
  // Log participant data for debugging
  if (participant.user_id === currentUserId) {
    console.log('Converting current user data to User object:', {
      id: participant.id,
      total_points: participant.total_points,
      lives: participant.lives,
      distance: distanceFromCenter,
      is_eliminated: participant.is_eliminated
    });
  }
  
  return {
    id: participant.id,
    name: nickname,
    angle: angle,
    // Scale normalized distance (0-1) to actual pixel distance for the component
    distance: arenaRadius * adjustedDistance, 
    lives: participant.lives !== undefined ? participant.lives : DEFAULT_SURVIVAL_SETTINGS.start_lives,
    points: participant.total_points !== undefined ? participant.total_points : 0,
    daysInDanger: participant.days_in_danger || 0,
    isCurrentUser: participant.user_id === currentUserId,
    isEliminated: participant.is_eliminated || false,
    // Generate avatar URL from nickname for consistent display
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(nickname)}&background=random&color=ffffff&bold=true`,
  };
};

interface ArenaState {
  challengeId: string | null;
  safeZoneRadius: number;
  users: User[];
  currentDay: number;
  totalDays: number;
  loading: boolean;
  currentUser: User | undefined;
  setChallenge: (challengeId: string, currentUserId: string) => Promise<void>;
  fetchParticipants: (challengeId: string, currentUserId: string) => Promise<void>;
  subscribeToParticipantChanges: (challengeId: string, currentUserId: string) => () => void;
  moveUserTowardSafeZone: () => void;
  shrinkSafeZone: () => void;
  expandSafeZone: () => void;
}

export const useArenaStore = create<ArenaState>((set, get) => ({
  challengeId: null,
  safeZoneRadius: (ARENA_SIZE / 2) * DEFAULT_SURVIVAL_SETTINGS.initial_safe_radius, // Initial safe zone size
  users: [],
  currentDay: 1,
  totalDays: 30,
  loading: false,
  
  get currentUser() {
    return get().users.find(user => user.isCurrentUser);
  },
  
  // Set the active challenge and load its data
  setChallenge: async (challengeId: string, currentUserId: string) => {
    set({ loading: true, challengeId });
    
    try {
      // 1. Fetch challenge data to get start/end dates and survival_settings
      const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .select('start_date, end_date, survival_settings')
        .eq('id', challengeId)
        .single();
      
      if (challengeError) throw challengeError;
      
      // 2. Calculate challenge days and current day
      const startDate = new Date(challenge.start_date);
      const endDate = challenge.end_date ? new Date(challenge.end_date) : new Date(startDate);
      endDate.setDate(endDate.getDate() + 30); // Default 30 days if open-ended
      
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const today = new Date();
      const currentDay = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // 3. Calculate safe zone radius based on current day
      const survivalSettings = challenge.survival_settings || (challenge.rules?.survival_settings) || DEFAULT_SURVIVAL_SETTINGS;
      const safeZoneNormalized = calculateSafeZoneRadius(currentDay, totalDays, survivalSettings);
      const safeZoneRadius = (ARENA_SIZE / 2) * safeZoneNormalized;
      
      set({ 
        totalDays,
        currentDay: Math.max(1, Math.min(currentDay, totalDays)), // Clamp between 1 and totalDays
        safeZoneRadius
      });
      
      // 4. Fetch participants data
      await get().fetchParticipants(challengeId, currentUserId);
      
    } catch (error) {
      console.error("Error setting up arena:", error);
    } finally {
      set({ loading: false });
    }
  },
  
  // Fetch all participants for the current challenge
  fetchParticipants: async (challengeId: string, currentUserId: string) => {
    try {
      console.log('Fetching participants for challenge:', challengeId);
      
      // IMPORTANT: Make sure we get ALL data fields needed from the participants
      const { data: participants, error } = await supabase
        .from('challenge_participants')
        .select(`
          id,
          user_id,
          challenge_id,
          total_points,
          lives,
          days_in_danger,
          distance_from_center,
          angle,
          is_eliminated,
          last_activity_date,
          profile:profiles (
            id,
            nickname,
            avatar_url
          )
        `)
        .eq('challenge_id', challengeId);
      
      if (error) throw error;
      
      if (!participants || participants.length === 0) {
        console.log('No participants found for challenge:', challengeId);
        set({ users: [] });
        return;
      }
      
      console.log(`Found ${participants.length} participants for challenge ${challengeId}`);
      
      // Log current user data for debugging
      const currentUserData = participants.find(p => p.user_id === currentUserId);
      if (currentUserData) {
        console.log('Current user data:', {
          id: currentUserData.id,
          user_id: currentUserData.user_id,
          total_points: currentUserData.total_points,
          lives: currentUserData.lives,
          days_in_danger: currentUserData.days_in_danger,
          distance_from_center: currentUserData.distance_from_center,
          is_eliminated: currentUserData.is_eliminated,
        });
      } else {
        console.log('Current user not found in participants');
      }
      
      // Map participants to User objects
      const users = participants.map(p => 
        mapParticipantToUser(p, currentUserId, ARENA_SIZE/2)
      );
      
      // Debug log the mapped user objects
      if (users.length > 0) {
        const currentUserObj = users.find(u => u.isCurrentUser);
        if (currentUserObj) {
          console.log('Mapped current user object:', {
            id: currentUserObj.id,
            points: currentUserObj.points,
            lives: currentUserObj.lives,
            distance: currentUserObj.distance,
            isEliminated: currentUserObj.isEliminated
          });
        }
      }
      
      set({ users });
    } catch (error) {
      console.error("Error fetching participants:", error);
      // Set empty users array to prevent UI errors
      set({ users: [] });
    }
  },
  
  // Subscribe to real-time updates for the challenge participants
  subscribeToParticipantChanges: (challengeId: string, currentUserId: string) => {
    const channel = supabase
      .channel(`arena_updates_${challengeId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'challenge_participants',
        filter: `challenge_id=eq.${challengeId}`
      }, (payload) => {
        // Update the specific user that changed
        const updatedParticipant = payload.new;
        
        set(state => {
          const updatedUsers = state.users.map(user => {
            if (user.id === updatedParticipant.id) {
              return mapParticipantToUser(updatedParticipant, currentUserId, ARENA_SIZE/2);
            }
            return user;
          });
          
          return { users: updatedUsers };
        });
      })
      .subscribe();
      
    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  },
  
  // Demo functions for arena controls - these would be connected to real API calls
  moveUserTowardSafeZone: () => {
    set(state => {
      // Find the current user
      const currentUserIndex = state.users.findIndex(u => u.isCurrentUser);
      if (currentUserIndex === -1) return state;
      
      // Create a copy of the users array
      const updatedUsers = [...state.users];
      
      // Update the current user's distance (move them 10% closer to center)
      const currentUser = updatedUsers[currentUserIndex];
      const newDistance = Math.max(0, currentUser.distance * 0.9);
      
      updatedUsers[currentUserIndex] = {
        ...currentUser,
        distance: newDistance
      };
      
      return { users: updatedUsers };
    });
  },
  
  shrinkSafeZone: () => {
    // Reduce safe zone by 10%
    set(state => ({
      safeZoneRadius: Math.max(MIN_SAFE_ZONE_RADIUS, state.safeZoneRadius * 0.9)
    }));
  },
  
  expandSafeZone: () => {
    // Expand safe zone by 10%
    set(state => ({
      safeZoneRadius: Math.min(MAX_SAFE_ZONE_RADIUS, state.safeZoneRadius * 1.1)
    }));
  }
}));