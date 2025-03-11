import { create } from 'zustand';
import { User } from '../lib/user';
import { Dimensions } from 'react-native';
import { supabase } from './supabase';
// Import from survivalUtils
// Use dynamic import to avoid circular dependency
let DEFAULT_SURVIVAL_SETTINGS: any = {
  initial_safe_radius: 1.0,
  final_safe_radius: 0.1,
  max_points_per_period: 10,
  max_movement_per_period: 0.05,
  timeframe: 'daily',
  elimination_threshold: 3,
  start_lives: 3
};

import { calculateSafeZoneRadius } from './survivalUtils';

const { width } = Dimensions.get('window');
const ARENA_SIZE = width * 0.9; // Visual size for the arena component
const MAX_SAFE_ZONE_RADIUS = (ARENA_SIZE / 2) * 0.9; // 90% of arena radius
const MIN_SAFE_ZONE_RADIUS = (ARENA_SIZE / 2) * 0.1; // 10% of arena radius - minimum safe zone

// Constants for arena calculations
export const DEFAULT_LIVES = DEFAULT_SURVIVAL_SETTINGS.start_lives || 3;
export const DAYS_IN_DANGER_LIMIT = DEFAULT_SURVIVAL_SETTINGS.elimination_threshold || 3;

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
  
  return {
    id: participant.id,
    name: participant.profile?.nickname || 'User',
    angle: angle,
    // Scale normalized distance (0-1) to actual pixel distance for the component
    distance: arenaRadius * adjustedDistance, 
    lives: participant.lives || DEFAULT_LIVES,
    points: participant.total_points || 0,
    daysInDanger: participant.days_in_danger || 0,
    isCurrentUser: participant.user_id === currentUserId,
    isEliminated: participant.is_eliminated || false,
    // Add avatar URL
    avatarUrl: participant.profile?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
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
      const { data: participants, error } = await supabase
        .from('challenge_participants')
        .select(`
          id,
          user_id,
          total_points,
          lives,
          days_in_danger,
          distance_from_center,
          angle,
          is_eliminated,
          profile:profiles (
            id,
            nickname,
            avatar_url
          )
        `)
        .eq('challenge_id', challengeId);
      
      if (error) throw error;
      
      // Map participants to User objects
      const users = participants.map(p => 
        mapParticipantToUser(p, currentUserId, ARENA_SIZE/2)
      );
      
      set({ users });
    } catch (error) {
      console.error("Error fetching participants:", error);
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