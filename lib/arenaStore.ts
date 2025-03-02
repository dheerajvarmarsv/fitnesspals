import { create } from 'zustand';
import { User } from '../lib/user';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const ARENA_SIZE = width * 0.9;
const MAX_SAFE_ZONE_RADIUS = (ARENA_SIZE / 2) * 0.9;
const MIN_SAFE_ZONE_RADIUS = (ARENA_SIZE / 2) * 0.3;

// Generate initial users
const generateInitialUsers = (): User[] => {
  // Current user
  const currentUser: User = {
    id: '1',
    name: 'You',
    angle: 45,
    distance: ARENA_SIZE * 0.4,
    lives: 3,
    points: 120,
    isCurrentUser: true,
    isEliminated: false,
  };
  
  // Generate other users
  const otherUsers: User[] = [];
  const userCount = 15;
  
  for (let i = 0; i < userCount; i++) {
    const angle = (360 / userCount) * i;
    const distance = ARENA_SIZE * (0.25 + Math.random() * 0.4);
    const lives = Math.floor(Math.random() * 3) + 1;
    const isEliminated = Math.random() > 0.8;
    
    otherUsers.push({
      id: (i + 2).toString(),
      name: `User ${i + 1}`,
      angle,
      distance,
      lives,
      points: Math.floor(Math.random() * 200),
      isCurrentUser: false,
      isEliminated,
    });
  }
  
  return [currentUser, ...otherUsers];
};

interface ArenaState {
  safeZoneRadius: number;
  users: User[];
  currentDay: number;
  totalDays: number;
  currentUser: User | undefined;
  moveUserTowardSafeZone: () => void;
  shrinkSafeZone: () => void;
  expandSafeZone: () => void;
  resetArena: () => void;
  eliminateUsersInDangerZone: () => void;
}

export const useArenaStore = create<ArenaState>((set, get) => ({
  safeZoneRadius: (ARENA_SIZE / 2) * 0.6,
  users: generateInitialUsers(),
  currentDay: 5,
  totalDays: 30,
  
  get currentUser() {
    return get().users.find(user => user.isCurrentUser);
  },
  
  moveUserTowardSafeZone: () => {
    set(state => {
      const updatedUsers = state.users.map(user => {
        if (user.isCurrentUser) {
          // Move user toward center by 10% of current distance
          const newDistance = Math.max(user.distance * 0.9, ARENA_SIZE * 0.1);
          
          // Reset lives if moving to safe zone
          const newLives = newDistance <= state.safeZoneRadius ? 3 : user.lives;
          
          // Add points
          const newPoints = user.points + 10;
          
          return {
            ...user,
            distance: newDistance,
            lives: newLives,
            points: newPoints,
          };
        }
        return user;
      });
      
      return { users: updatedUsers };
    });
  },
  
  shrinkSafeZone: () => {
    set(state => {
      // Shrink safe zone by 10%
      const newRadius = Math.max(state.safeZoneRadius * 0.9, MIN_SAFE_ZONE_RADIUS);
      
      // Update users in danger zone
      const updatedUsers = state.users.map(user => {
        if (!user.isEliminated && user.distance > newRadius) {
          // Reduce lives for users now in danger zone
          const newLives = Math.max(0, user.lives - 1);
          const isNowEliminated = newLives === 0;
          
          return {
            ...user,
            lives: newLives,
            isEliminated: isNowEliminated,
          };
        }
        return user;
      });
      
      return {
        safeZoneRadius: newRadius,
        users: updatedUsers,
      };
    });
  },
  
  expandSafeZone: () => {
    set(state => {
      // Expand safe zone by 10%
      const newRadius = Math.min(state.safeZoneRadius * 1.1, MAX_SAFE_ZONE_RADIUS);
      
      // Update users now in safe zone
      const updatedUsers = state.users.map(user => {
        if (!user.isEliminated && user.distance <= newRadius && user.distance > state.safeZoneRadius) {
          // Reset lives for users now in safe zone
          return {
            ...user,
            lives: 3,
          };
        }
        return user;
      });
      
      return {
        safeZoneRadius: newRadius,
        users: updatedUsers,
      };
    });
  },
  
  resetArena: () => {
    set({
      safeZoneRadius: (ARENA_SIZE / 2) * 0.6,
      users: generateInitialUsers(),
      currentDay: 1,
    });
  },
  
  eliminateUsersInDangerZone: () => {
    set(state => {
      const updatedUsers = state.users.map(user => {
        if (!user.isEliminated && user.distance > state.safeZoneRadius) {
          // Reduce lives for users in danger zone
          const newLives = Math.max(0, user.lives - 1);
          const isNowEliminated = newLives === 0;
          
          return {
            ...user,
            lives: newLives,
            isEliminated: isNowEliminated,
          };
        }
        return user;
      });
      
      return {
        users: updatedUsers,
        currentDay: state.currentDay + 1,
      };
    });
  },
}));