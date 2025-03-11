// lib/theme.tsx
import { Platform } from 'react-native';

export const theme = {
  colors: {
    // Background gradients used on screens
    gradientBackground: ['#E6F2FF', '#BCD6FF', '#007AFF'],
    // Button gradient from left (lighter blue) to right (deeper blue)
    gradientButton: ['#4895EF', '#3A56D4'],
    primary: '#007AFF',            // Vibrant Blue for progress indicators and CTAs
    background: '#FFFFFF',         // Clean white background
    glassCardBg: '#E6F2FF',        // Light blue for cards (glassmorphic effect)
    glassBorder: 'rgba(255,255,255,0.35)',
    textPrimary: '#333333',        // Dark gray for primary text
    textSecondary: '#666666',      // Medium gray for secondary text
    error: '#EF4444',
    errorLight: '#FEE2E2',
  },
  spacing: {
    small: 8,
    medium: 16,
    large: 24,
  },
  radius: {
    card: 16,
    button: 20,
  },
  typography: {
    heading: {
      fontSize: 24,
      fontWeight: '700',
      color: '#333333',
      fontFamily: Platform.select({ ios: 'SF Pro', android: 'Roboto', default: 'Inter' }),
    },
    body: {
      fontSize: 16,
      color: '#333333',
      fontFamily: Platform.select({ ios: 'SF Pro', android: 'Roboto', default: 'Inter' }),
    },
    small: {
      fontSize: 14,
      color: '#666666',
      fontFamily: Platform.select({ ios: 'SF Pro', android: 'Roboto', default: 'Inter' }),
    },
  },
  shadows: {
    light: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
  },
  // Common card structure and styling tokens (for index and similar screens)
  card: {
    glassCard: {
      backgroundColor: '#E6F2FF', // using glassCardBg from colors
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
      borderRadius: 16, // using radius.card
      padding: 16, // using spacing.medium
      marginBottom: 16, // spacing.medium
    },
    // For Android, add shadow-based styling
    androidCard: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
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
      fontWeight: '700',
      color: '#333333', // textPrimary
      marginRight: 8,
      flex: 1,
    },
    challengeTypeBadge: {
      backgroundColor: 'rgba(74,144,226,0.1)',
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    challengeTypeText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#666666', // textSecondary
    },
    challengeMeta: {
      fontSize: 14,
      color: '#666666',
      marginBottom: 4,
    },
    // Empty State styling for when no challenges are available
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#333333',
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 15,
      color: '#666666',
      textAlign: 'center',
      lineHeight: 20,
      marginHorizontal: 8,
    },
  },
  // Specific theme adjustments for Challenge List cards
  challengeList: {
    card: {
      backgroundColor: '#FFFFFF',  // Pure white background
      borderRadius: 12,            // Slightly softer corners
      borderWidth: 1,
      borderColor: '#E5E7EB',      // Very light border for subtle separation
      padding: 16,
      marginBottom: 12,
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
        background: 'rgba(74, 144, 226, 0.1)',
        text: '#4A90E2',
      },
      survival: {
        background: 'rgba(112, 9, 183, 0.1)',
        text: '#7209B7',
      },
      // Additional challenge types can be added here
    },
    // Typography adjustments for challenge list cards (more compact)
    title: {
      fontSize: 16, // Slightly smaller and more compact
      fontWeight: '700',
      color: '#333333', // More prominent/darker title
      fontFamily: Platform.select({ ios: 'SF Pro', android: 'Roboto', default: 'Inter' }),
    },
    secondaryText: {
      fontSize: 14, // Compact look
      color: '#666666', // Softer color for secondary information
      fontFamily: Platform.select({ ios: 'SF Pro', android: 'Roboto', default: 'Inter' }),
    },
  },
};