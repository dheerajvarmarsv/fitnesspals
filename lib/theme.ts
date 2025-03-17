import { Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Responsive size calculation functions
export const hp = (percentage: number) => {
  return height * (percentage / 100);
};

export const wp = (percentage: number) => {
  return width * (percentage / 100);
};

// Common theme values shared between light/dark themes
const common = {
  // Typography
  typography: {
    fontFamily: Platform.select({
      ios: 'SF Pro',
      android: 'Roboto',
      default: 'Inter',
    }),
    heading: {
      fontFamily: Platform.select({
        ios: 'SF Pro',
        android: 'sans-serif-medium',
        default: 'Inter',
      }),
      fontSize: 24,
      fontWeight: '700' as const,
    },
    body: {
      fontFamily: Platform.select({
        ios: 'SF Pro',
        android: 'sans-serif',
        default: 'Inter',
      }),
      fontSize: 16,
      fontWeight: '400' as const,
    },
    small: {
      fontFamily: Platform.select({
        ios: 'SF Pro',
        android: 'sans-serif',
        default: 'Inter',
      }),
      fontSize: 14,
      fontWeight: '400' as const,
    },
    button: {
      fontFamily: Platform.select({
        ios: 'SF Pro',
        android: 'sans-serif-medium',
        default: 'Inter',
      }),
      fontSize: 16,
      fontWeight: '600' as const,
    },
  },
  
  // Spacing
  spacing: {
    tiny: 4,
    small: 8,
    medium: 16,
    large: 24,
    extraLarge: 32,
    huge: 48,
  },
  
  // Radius for rounded corners
  radius: {
    small: 4,
    medium: 8,
    large: 12,
    card: 16,
    button: 20,
    circle: 999,
  },
  
  // Animation durations
  animation: {
    fast: 200,
    medium: 300,
    slow: 500,
  },
  
  // Elevation (shadows)
  elevation: {
    tiny: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 1,
      elevation: 1,
    },
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.15,
      shadowRadius: 5,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
  },
  
  // Gradient sets
  gradients: {
    primary: ['#4A90E2', '#5C38ED'],
    secondary: ['#F58529', '#DD2A7B', '#8134AF', '#515BD4'],
    success: ['#11998e', '#38ef7d'],
    warning: ['#F76B1C', '#FAD961'],
    danger: ['#FF416C', '#FF4B2B'],
    race: ['#FF416C', '#FF4B2B'],
    survival: ['#4776E6', '#8E54E9'],
    streak: ['#FF8008', '#FFC837'],
    custom: ['#11998e', '#38ef7d'],
  },
};

// Light theme
export const lightTheme = {
  ...common,
  
  // Colors
  colors: {
    // Base colors
    background: '#FFFFFF',
    card: '#F9FAFB',
    cardAlt: '#F5F8FF',
    
    // Text colors
    textPrimary: '#333333',
    textSecondary: '#666666',
    textTertiary: '#999999',
    textInverse: '#FFFFFF',
    
    // UI Elements
    primary: '#333333',
    secondary: '#5C38ED',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#DC2626',
    info: '#3B82F6',
    
    // Borders & Dividers
    border: '#E5E7EB',
    divider: '#F3F4F6',
    
    // Status colors
    statusOnline: '#34D399',
    statusOffline: '#F59E0B',
    
    // Banners
    warningBanner: {
      background: '#FEE2E2',
      text: '#DC2626',
    },
    
    // Gradients (start/end props)
    gradientButton: ['#DD2A7B', '#8134AF', '#515BD4'],
    gradientHeader: ['#F58529', '#DD2A7B', '#8134AF', '#515BD4'],
    
    // Activity cards
    activityCard: {
      background: '#F5F8FF',
      text: '#4A90E2',
    },
    
    // User-specific screens
    challengeCard: '#F5F8FF',
    glassCardBg: '#F5F8FF',
  },
  
  // Icon colors for common icons
  iconColors: {
    tab: {
      active: '#000000',
      inactive: '#999999',
    },
    steps: '#4A90E2',
    distance: '#50C878',
    time: '#9C6ADE',
    calories: '#F5A623',
  },
};

// Dark theme
export const darkTheme = {
  ...common,
  
  // Colors
  colors: {
    // Base colors
    background: '#121212',
    card: '#1E1E1E',
    cardAlt: '#252525',
    
    // Text colors
    textPrimary: '#F5F5F5',
    textSecondary: '#BBBBBB',
    textTertiary: '#888888',
    textInverse: '#333333',
    
    // UI Elements
    primary: '#5C9CE6',
    secondary: '#6E54ED',
    success: '#2DCE98',
    warning: '#FFB648',
    danger: '#EF4444',
    info: '#5E9BF5',
    
    // Borders & Dividers
    border: '#333333',
    divider: '#2C2C2C',
    
    // Status colors
    statusOnline: '#34D399',
    statusOffline: '#F59E0B',
    
    // Banners
    warningBanner: {
      background: '#481A1A',
      text: '#F87171',
    },
    
    // Gradients (start/end props)
    gradientButton: ['#5C9CE6', '#6E54ED'],
    gradientHeader: ['#5C9CE6', '#6E54ED'],
    
    // Activity cards
    activityCard: {
      background: '#252525',
      text: '#5C9CE6',
    },
    
    // User-specific screens
    challengeCard: '#252525',
    glassCardBg: '#252525',
  },
  
  // Icon colors for common icons
  iconColors: {
    tab: {
      active: '#5C9CE6',
      inactive: '#888888',
    },
    steps: '#5C9CE6',
    distance: '#50C878',
    time: '#9C6ADE',
    calories: '#F5A623',
  },
};

export type Theme = typeof lightTheme;

// Challenge type gradients
export const CHALLENGE_TYPE_GRADIENTS = {
  race: ['#FF416C', '#FF4B2B'],
  survival: ['#4776E6', '#8E54E9'],
  streak: ['#FF8008', '#FFC837'],
  custom: ['#11998e', '#38ef7d'],
};

// Activity colors and icons
export const ACTIVITY_COLORS: { 
  [key: string]: { light: string; primary: string; gradient: string[]; text: string }
} = {
  Workout: { light: '#E1F5FE', primary: '#2196F3', gradient: ['#2196F3', '#0D47A1'], text: '#0D47A1' },
  Steps: { light: '#E8F5E9', primary: '#4CAF50', gradient: ['#4CAF50', '#1B5E20'], text: '#1B5E20' },
  Sleep: { light: '#E0F7FA', primary: '#00BCD4', gradient: ['#00BCD4', '#006064'], text: '#006064' },
  'Screen Time': { light: '#FFF3E0', primary: '#FF9800', gradient: ['#FF9800', '#E65100'], text: '#E65100' },
  'No Sugars': { light: '#FCE4EC', primary: '#F06292', gradient: ['#F06292', '#880E4F'], text: '#880E4F' },
  'High Intensity': { light: '#FFEBEE', primary: '#F44336', gradient: ['#F44336', '#B71C1C'], text: '#B71C1C' },
  Yoga: { light: '#F3E5F5', primary: '#9C27B0', gradient: ['#9C27B0', '#4A148C'], text: '#4A148C' },
  Count: { light: '#ECEFF1', primary: '#607D8B', gradient: ['#607D8B', '#263238'], text: '#263238' },
  Walking: { light: '#F1F8E9', primary: '#8BC34A', gradient: ['#8BC34A', '#33691E'], text: '#33691E' },
  Running: { light: '#FFF8E1', primary: '#FFC107', gradient: ['#FFC107', '#FF6F00'], text: '#FF6F00' },
  Cycling: { light: '#E3F2FD', primary: '#42A5F5', gradient: ['#42A5F5', '#1565C0'], text: '#1565C0' },
  Swimming: { light: '#E1F5FE', primary: '#29B6F6', gradient: ['#29B6F6', '#01579B'], text: '#01579B' },
  Hiking: { light: '#DCEDC8', primary: '#9CCC65', gradient: ['#9CCC65', '#33691E'], text: '#33691E' },
  Meditation: { light: '#EDE7F6', primary: '#7E57C2', gradient: ['#7E57C2', '#4527A0'], text: '#4527A0' },
  'Weight Training': { light: '#EFEBE9', primary: '#8D6E63', gradient: ['#8D6E63', '#3E2723'], text: '#3E2723' },
  'Cardio Workout': { light: '#FFCDD2', primary: '#EF5350', gradient: ['#EF5350', '#B71C1C'], text: '#B71C1C' },
  Custom: { light: '#E8EAF6', primary: '#3F51B5', gradient: ['#3F51B5', '#1A237E'], text: '#1A237E' },
};

export const ACTIVITY_ICONS: { [key: string]: string } = {
  Workout: 'dumbbell',
  Steps: 'shoe-prints',
  Sleep: 'bed',
  'Screen Time': 'mobile',
  'No Sugars': 'cookie-bite',
  'High Intensity': 'fire',
  Yoga: 'pray',
  Count: 'hashtag',
  Walking: 'walking',
  Running: 'running',
  Cycling: 'biking',
  Swimming: 'swimmer',
  Hiking: 'mountain',
  Meditation: 'brain',
  'Weight Training': 'dumbbell',
  'Cardio Workout': 'heartbeat',
  Custom: 'star',
};