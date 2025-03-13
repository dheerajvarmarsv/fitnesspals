import { create } from 'zustand';
import { User } from '../lib/user';
import { Dimensions } from 'react-native';
import { supabase } from './supabase';
import { DEFAULT_SURVIVAL_SETTINGS, calculateSafeZoneRadius } from './survivalUtils';

const { width } = Dimensions.get('window');
const ARENA_SIZE = width * 0.9; 
const MAX_SAFE_ZONE_RADIUS = (ARENA_SIZE / 2) * 0.9;
const MIN_SAFE_ZONE_RADIUS = (ARENA_SIZE / 2) * 0.1;

export const mapParticipantToUser = (
  participant: any, 
  currentUserId: string, 
  arenaRadius: number
): User => {
  const rawDistance = participant.distance_from_center != null
    ? participant.distance_from_center
    : 1.0;

  const distanceFromCenter = Math.max(0.05, Math.min(rawDistance, 1.0));
  const angle = participant.angle != null ? participant.angle : Math.random() * 360;
  const nickname = participant.profile?.nickname || 'User';
  
  // Ensure we're getting the exact total_points value from participant data
  const pointsValue = participant.total_points !== undefined && participant.total_points !== null
    ? participant.total_points
    : 0;
  
  if (participant.user_id === currentUserId) {
    console.log('Mapping current user participant =>', {
      participantId: participant.id,
      total_points: pointsValue,
      distance_from_center: distanceFromCenter,
      map_position: participant.map_position,
      is_eliminated: participant.is_eliminated
    });
  }
  
  return {
    id: participant.id,
    name: nickname,
    angle,
    distance: arenaRadius * distanceFromCenter,
    lives: participant.lives ?? DEFAULT_SURVIVAL_SETTINGS.start_lives,
    points: pointsValue,
    daysInDanger: participant.days_in_danger || 0,
    isCurrentUser: participant.user_id === currentUserId,
    isEliminated: participant.is_eliminated || false,
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
  participantsData: any[];
  currentUserParticipant: any | null;
  challengeDetails: any | null;

  setChallenge: (challengeId: string, currentUserId: string) => Promise<void>;
  fetchParticipants: (challengeId: string, currentUserId: string) => Promise<void>;
  subscribeToParticipantChanges: (challengeId: string, currentUserId: string) => () => void;
  refreshParticipant: (updatedParticipant: any) => void;
  syncPoints: (challengeId: string, userId: string) => Promise<void>;
  moveUserTowardSafeZone: () => void;
  shrinkSafeZone: () => void;
  expandSafeZone: () => void;
  reset: () => void;
}

export const useArenaStore = create<ArenaState>((set, get) => ({
  challengeId: null,
  safeZoneRadius: (ARENA_SIZE / 2) * DEFAULT_SURVIVAL_SETTINGS.initial_safe_radius,
  users: [],
  participantsData: [],
  currentUserParticipant: null,
  challengeDetails: null,
  currentDay: 1,
  totalDays: 30,
  loading: false,

  get currentUser() {
    return get().users.find(u => u.isCurrentUser);
  },

  reset: () => {
    set({
      challengeId: null,
      safeZoneRadius: (ARENA_SIZE / 2) * DEFAULT_SURVIVAL_SETTINGS.initial_safe_radius,
      users: [],
      participantsData: [],
      currentUserParticipant: null,
      challengeDetails: null,
      currentDay: 1,
      totalDays: 30,
      loading: false,
    });
  },

  setChallenge: async (challengeId: string, currentUserId: string) => {
    set({ loading: true, challengeId });
    try {
      const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .select(`
          id,
          start_date,
          end_date,
          rules,
          survival_settings,
          challenge_type,
          created_at
        `)
        .eq('id', challengeId)
        .single();
      if (challengeError) throw challengeError;
      if (!challenge) throw new Error('Challenge not found');

      const startDate = new Date(challenge.start_date);
      let endDate: Date;
      if (challenge.end_date) {
        endDate = new Date(challenge.end_date);
      } else {
        const durationDays = challenge.rules?.duration_days || 30;
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + durationDays);
      }
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const today = new Date();
      let currentDay = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      currentDay = Math.max(1, Math.min(currentDay, totalDays));

      const survivalSettings = challenge.survival_settings 
        || challenge.rules?.survival_settings 
        || DEFAULT_SURVIVAL_SETTINGS;

      const safeZoneNormalized = calculateSafeZoneRadius(currentDay, totalDays, survivalSettings);
      const safeZoneRadius = (ARENA_SIZE / 2) * safeZoneNormalized;

      set({
        totalDays,
        currentDay,
        safeZoneRadius,
        challengeDetails: challenge,
      });

      await get().fetchParticipants(challengeId, currentUserId);

    } catch (error) {
      console.error('Error in setChallenge:', error);
      set({
        totalDays: 30,
        currentDay: 1,
        safeZoneRadius: (ARENA_SIZE / 2) * 0.9,
      });
    } finally {
      set({ loading: false });
    }
  },

  fetchParticipants: async (challengeId: string, currentUserId: string) => {
    try {
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
          map_position,
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
      if (!participants) {
        set({
          users: [],
          participantsData: [],
          currentUserParticipant: null,
        });
        return;
      }

      set({ participantsData: participants });

      const currentUserPart = participants.find(p => p.user_id === currentUserId) || null;
      set({ currentUserParticipant: currentUserPart });

      const newUsers = participants.map(p => 
        mapParticipantToUser(p, currentUserId, ARENA_SIZE / 2)
      );

      set({ users: newUsers });
    } catch (err) {
      console.error('Error fetching participants:', err);
      set({
        users: [],
        participantsData: [],
        currentUserParticipant: null,
      });
    }
  },

  subscribeToParticipantChanges: (challengeId: string, currentUserId: string) => {
    const channel = supabase
      .channel(`arena_updates_${challengeId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'challenge_participants',
        filter: `challenge_id=eq.${challengeId}`,
      }, (payload) => {
        const updatedParticipant = payload.new;
        
        set(state => {
          const updatedParticipantsData = state.participantsData.map(p => 
            p.id === updatedParticipant.id ? { ...p, ...updatedParticipant } : p
          );
          
          const isCurrentUser = updatedParticipant.user_id === currentUserId;
          const newCurrentUserParticipant = isCurrentUser ? 
            { ...updatedParticipant, profile: state.currentUserParticipant?.profile } : 
            state.currentUserParticipant;

          const updatedUsers = state.users.map(u => {
            if (u.id === updatedParticipant.id) {
              const participantWithProfile = {
                ...updatedParticipant,
                profile: updatedParticipantsData.find(p => p.id === updatedParticipant.id)?.profile
              };
              return mapParticipantToUser(participantWithProfile, currentUserId, ARENA_SIZE/2);
            }
            return u;
          });

          return {
            participantsData: updatedParticipantsData,
            users: updatedUsers,
            currentUserParticipant: newCurrentUserParticipant,
          };
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  refreshParticipant: (updatedParticipant: any) => {
    set(state => {
      const freshUser = mapParticipantToUser(
        {
          ...updatedParticipant,
          profile: state.participantsData.find(p => p.id === updatedParticipant.id)?.profile
        }, 
        updatedParticipant.user_id, 
        ARENA_SIZE / 2
      );
      
      const updatedParticipantsData = state.participantsData.map(p => 
        p.id === updatedParticipant.id ? { ...p, ...updatedParticipant } : p
      );
      
      const updatedUsers = state.users.map(u => 
        u.id === updatedParticipant.id ? freshUser : u
      );
      
      const isCurrentUserParticipant = updatedParticipant.id === state.currentUserParticipant?.id;
      
      return {
        participantsData: updatedParticipantsData,
        users: updatedUsers,
        currentUserParticipant: isCurrentUserParticipant
          ? { ...state.currentUserParticipant, ...updatedParticipant }
          : state.currentUserParticipant
      };
    });
  },

  syncPoints: async (challengeId: string, userId: string) => {
    try {
      const { data, error } = await supabase
        .from('challenge_participants')
        .select('id, total_points')
        .eq('challenge_id', challengeId)
        .eq('user_id', userId)
        .single();
        
      if (error) throw error;
      if (!data) return;
      
      console.log("Synced points:", data.total_points);
      
      set(state => {
        const updatedParticipantsData = state.participantsData.map(p => 
          p.id === data.id ? {...p, total_points: data.total_points} : p
        );
        
        const updatedUsers = state.users.map(u => {
          if (u.id === data.id) {
            return {...u, points: data.total_points};
          }
          return u;
        });
        
        const updatedCurrentUserParticipant = state.currentUserParticipant?.id === data.id
          ? {...state.currentUserParticipant, total_points: data.total_points}
          : state.currentUserParticipant;
          
        return {
          participantsData: updatedParticipantsData,
          users: updatedUsers,
          currentUserParticipant: updatedCurrentUserParticipant
        };
      });
    } catch (err) {
      console.error("Error syncing points:", err);
    }
  },

  moveUserTowardSafeZone: () => {
    set(state => {
      const { users } = state;
      const currentUserIndex = users.findIndex(u => u.isCurrentUser);
      if (currentUserIndex === -1) return state;

      const updated = [...users];
      const current = updated[currentUserIndex];
      const newDist = Math.max(0.0, current.distance * 0.9);
      updated[currentUserIndex] = { ...current, distance: newDist };
      return { users: updated };
    });
  },

  shrinkSafeZone: () => {
    set(state => ({
      safeZoneRadius: Math.max(MIN_SAFE_ZONE_RADIUS, state.safeZoneRadius * 0.9),
    }));
  },

  expandSafeZone: () => {
    set(state => ({
      safeZoneRadius: Math.min(MAX_SAFE_ZONE_RADIUS, state.safeZoneRadius * 1.1),
    }));
  },
}));