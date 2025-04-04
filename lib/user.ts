export interface User {
  id: string;
  name: string;
  angle: number;      // Position angle in degrees (0-360)
  distance: number;   // Distance from center (0 = center, higher = further out)
  lives: number;      // Remaining lives (0-3)
  points: number;     // Workout points accumulated
  daysInDanger: number; // Consecutive days in danger zone
  isCurrentUser: boolean;
  isEliminated: boolean;
  avatarUrl?: string;  // User's profile avatar
}