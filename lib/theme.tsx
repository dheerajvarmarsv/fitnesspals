// lib/theme.tsx
import { Platform } from 'react-native';

export const theme = {
  colors: {
    // Background gradients used on screens
    gradientBackground: ['#F2F5FF', '#E6F2FF', '#4361EE'],
    // Button gradient from left (lighter blue) to right (deeper blue)
    gradientButton: ['#4361EE', '#3A56D4'],
    primary: '#4361EE',            // Vibrant Blue for progress indicators and CTAs
    background: '#FFFFFF',         // Clean white background
    glassCardBg: '#F2F5FF',        // Light blue for cards (glassmorphic effect)
    glassBorder: 'rgba(255,255,255,0.35)',
    textPrimary: '#000000',        // Dark gray for primary text
    textSecondary: '#6B7280',      // Medium gray for secondary text
    error: '#FF4B4B',
    errorLight: '#FEF2F2',
  },
  spacing: {
    small: 8,
    medium: 16,
    large: 24,
  },
  radius: {
    card: 12,
    button: 20,
  },
  typography: {
    heading: {
      fontSize: 24,
      fontWeight: '700',
      color: '#000000',
      fontFamily: Platform.select({ ios: 'SF Pro', android: 'Roboto', default: 'Inter' }),
    },
    body: {
      fontSize: 16,
      color: '#000000',
      fontFamily: Platform.select({ ios: 'SF Pro', android: 'Roboto', default: 'Inter' }),
    },
    small: {
      fontSize: 14,
      color: '#6B7280',
      fontFamily: Platform.select({ ios: 'SF Pro', android: 'Roboto', default: 'Inter' }),
    },
  },
  shadows: {
    light: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 6,
    },
  },
  // Common card structure and styling tokens (for index and similar screens)
  card: {
    glassCard: {
      backgroundColor: '#F2F5FF', // using glassCardBg from colors
      borderWidth: 1,
      borderColor: '#F3F4F6',
      borderRadius: 12, // using radius.card
      padding: 16, // using spacing.medium
      marginBottom: 16, // spacing.medium
    },
    // For Android, add shadow-based styling
    androidCard: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    // Challenge Card specifics (layout for challenge cards)
    challengeCard: {
      padding: 16,
    },
    challengeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8, // spacing.small
    },
    challengeTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000000', // textPrimary
      marginRight: 8,
      flex: 1,
    },
    challengeTypeBadge: {
      backgroundColor: 'rgba(67,97,238,0.1)',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    challengeTypeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#4361EE', // primary color
    },
    challengeMeta: {
      fontSize: 14,
      color: '#6B7280',
      marginBottom: 4,
    },
    // Empty State styling for when no challenges are available
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#000000',
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: '#6B7280',
      textAlign: 'center',
      lineHeight: 20,
      marginHorizontal: 8,
    },
  },
  // Specific theme adjustments for Challenge List cards
  challengeList: {
    card: {
      backgroundColor: '#F2F5FF',  // Light blue background
      borderRadius: 12,            // Slightly softer corners
      borderWidth: 0,
      padding: 16,
      marginBottom: 10,
    },
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      alignSelf: 'flex-start',
    },
    // Specific color handling for challenge types
    challengeTypes: {
      race: {
        background: 'rgba(67, 97, 238, 0.1)',
        text: '#4361EE',
      },
      survival: {
        background: 'rgba(255, 75, 75, 0.1)',
        text: '#FF4B4B',
      },
      // Additional challenge types can be added here
    },
    // Typography adjustments for challenge list cards (more compact)
    title: {
      fontSize: 16, // Slightly smaller and more compact
      fontWeight: '600',
      color: '#000000', // More prominent/darker title
      fontFamily: Platform.select({ ios: 'SF Pro', android: 'Roboto', default: 'Inter' }),
    },
    secondaryText: {
      fontSize: 14, // Compact look
      color: '#6B7280', // Softer color for secondary information
      fontFamily: Platform.select({ ios: 'SF Pro', android: 'Roboto', default: 'Inter' }),
    },
  },
  // Widget color presets for activity cards
  widgets: {
    blue: {
      background: '#4361EE',
      text: '#FFFFFF',
    },
    black: {
      background: '#000000',
      text: '#FFFFFF',
    },
    red: {
      background: '#F45B69',
      text: '#FFFFFF',
    },
    gray: {
      background: '#F2F5FF',
      text: '#000000',
    }
  },
  // Status indicators
  status: {
    success: '#4ADE80',
    warning: '#FBBF24',
    error: '#FF4B4B',
    info: '#60A5FA',
  },
  // Navigation styling
  navigation: {
    active: '#4361EE',
    inactive: '#9CA3AF',
    background: '#FFFFFF',
    border: '#F3F4F6',
  }
};