import React, { ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  Pressable,
} from 'react-native';
import { useTheme } from '../lib/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useResponsive } from '../lib/useResponsive';

// Props for all styled components
interface BaseProps {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

// Container component
export function Container({ style, children }: BaseProps) {
  const { theme } = useTheme();
  
  return (
    <View 
      style={[
        { 
          flex: 1, 
          backgroundColor: theme.colors.background,
        },
        style
      ]}
    >
      {children}
    </View>
  );
}

// Card component
interface CardProps extends BaseProps {
  variant?: 'default' | 'glass' | 'alt';
  elevation?: 'none' | 'tiny' | 'small' | 'medium' | 'large';
}

export function Card({ 
  style, 
  children, 
  variant = 'default',
  elevation = 'small',
}: CardProps) {
  const { theme } = useTheme();
  
  const getBackgroundColor = () => {
    switch (variant) {
      case 'glass':
        return theme.colors.glassCardBg;
      case 'alt':
        return theme.colors.cardAlt;
      default:
        return theme.colors.card;
    }
  };
  
  return (
    <View 
      style={[
        { 
          backgroundColor: getBackgroundColor(),
          borderRadius: theme.radius.card,
          padding: theme.spacing.medium,
          ...(elevation !== 'none' && theme.elevation[elevation]),
        },
        style
      ]}
    >
      {children}
    </View>
  );
}

// Text component variants
interface StyledTextProps {
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
  color?: 'primary' | 'secondary' | 'tertiary' | 'inverse' | string;
}

export function Heading({ 
  style, 
  children,
  color = 'primary',
}: StyledTextProps) {
  const { theme } = useTheme();
  const { getFontSize } = useResponsive();
  
  const getColor = () => {
    switch (color) {
      case 'primary':
        return theme.colors.textPrimary;
      case 'secondary':
        return theme.colors.textSecondary;
      case 'tertiary':
        return theme.colors.textTertiary;
      case 'inverse':
        return theme.colors.textInverse;
      default:
        return color;
    }
  };
  
  return (
    <Text 
      style={[
        { 
          fontFamily: theme.typography.heading.fontFamily,
          fontSize: getFontSize(theme.typography.heading.fontSize),
          fontWeight: theme.typography.heading.fontWeight,
          color: getColor(),
        },
        style
      ]}
    >
      {children}
    </Text>
  );
}

export function BodyText({ 
  style, 
  children,
  color = 'primary', 
}: StyledTextProps) {
  const { theme } = useTheme();
  const { getFontSize } = useResponsive();
  
  const getColor = () => {
    switch (color) {
      case 'primary':
        return theme.colors.textPrimary;
      case 'secondary':
        return theme.colors.textSecondary;
      case 'tertiary':
        return theme.colors.textTertiary;
      case 'inverse':
        return theme.colors.textInverse;
      default:
        return color;
    }
  };
  
  return (
    <Text 
      style={[
        { 
          fontFamily: theme.typography.body.fontFamily,
          fontSize: getFontSize(theme.typography.body.fontSize),
          color: getColor(),
        },
        style
      ]}
    >
      {children}
    </Text>
  );
}

export function SmallText({ 
  style, 
  children,
  color = 'secondary', 
}: StyledTextProps) {
  const { theme } = useTheme();
  const { getFontSize } = useResponsive();
  
  const getColor = () => {
    switch (color) {
      case 'primary':
        return theme.colors.textPrimary;
      case 'secondary':
        return theme.colors.textSecondary;
      case 'tertiary':
        return theme.colors.textTertiary;
      case 'inverse':
        return theme.colors.textInverse;
      default:
        return color;
    }
  };
  
  return (
    <Text 
      style={[
        { 
          fontFamily: theme.typography.small.fontFamily,
          fontSize: getFontSize(theme.typography.small.fontSize),
          color: getColor(),
        },
        style
      ]}
    >
      {children}
    </Text>
  );
}

// Button component
interface ButtonProps extends BaseProps {
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  gradient?: boolean;
  disabled?: boolean;
  title?: string;
}

export function Button({ 
  style, 
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  gradient = false,
  disabled = false,
  title,
}: ButtonProps) {
  const { theme } = useTheme();
  const { getPadding, getFontSize } = useResponsive();
  
  // Get the appropriate padding based on size
  const getPaddingForSize = () => {
    switch (size) {
      case 'small':
        return {
          paddingVertical: getPadding(theme.spacing.small),
          paddingHorizontal: getPadding(theme.spacing.medium),
        };
      case 'large':
        return {
          paddingVertical: getPadding(theme.spacing.medium),
          paddingHorizontal: getPadding(theme.spacing.large),
        };
      default:
        return {
          paddingVertical: getPadding(theme.spacing.small),
          paddingHorizontal: getPadding(theme.spacing.medium),
        };
    }
  };
  
  // Get font size based on button size
  const fontSizeMap = {
    small: getFontSize(theme.typography.small.fontSize),
    medium: getFontSize(theme.typography.body.fontSize),
    large: getFontSize(theme.typography.body.fontSize * 1.1),
  };
  
  // Get styles based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: gradient ? 'transparent' : theme.colors.primary,
          borderWidth: 0,
        };
      case 'secondary':
        return {
          backgroundColor: gradient ? 'transparent' : theme.colors.secondary,
          borderWidth: 0,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.primary,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      case 'danger':
        return {
          backgroundColor: theme.colors.danger,
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: theme.colors.primary,
          borderWidth: 0,
        };
    }
  };
  
  // Get text color based on variant
  const getTextColor = () => {
    switch (variant) {
      case 'outline':
      case 'ghost':
        return theme.colors.primary;
      default:
        return theme.colors.textInverse;
    }
  };
  
  // Get gradient colors
  const getGradientColors = () => {
    switch (variant) {
      case 'primary':
        return theme.colors.gradientButton;
      case 'secondary':
        return theme.colors.gradientHeader;
      case 'danger':
        return theme.gradients.danger;
      default:
        return theme.colors.gradientButton;
    }
  };
  
  const buttonContent = (
    <>
      {title ? (
        <Text
          style={{
            color: getTextColor(),
            fontSize: fontSizeMap[size],
            fontFamily: theme.typography.button.fontFamily,
            fontWeight: theme.typography.button.fontWeight,
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
      ) : (
        children
      )}
    </>
  );
  
  // Apply opacity if disabled
  const buttonStyles = [
    {
      borderRadius: theme.radius.button,
      alignItems: 'center',
      justifyContent: 'center',
      ...getPaddingForSize(),
      ...getVariantStyles(),
    },
    disabled && { opacity: 0.5 },
    style,
  ];
  
  // Use appropriate wrapper component
  if (gradient && !disabled) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        disabled={disabled}
        style={{ borderRadius: theme.radius.button, overflow: 'hidden' }}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={buttonStyles}
        >
          {buttonContent}
        </LinearGradient>
      </TouchableOpacity>
    );
  }
  
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled}
      style={buttonStyles}
    >
      {buttonContent}
    </TouchableOpacity>
  );
}

// Divider component
interface DividerProps extends BaseProps {
  direction?: 'horizontal' | 'vertical';
  spacing?: number;
}

export function Divider({ 
  style, 
  direction = 'horizontal',
  spacing = 0,
}: DividerProps) {
  const { theme } = useTheme();
  
  return (
    <View 
      style={[
        { 
          backgroundColor: theme.colors.divider,
          ...(direction === 'horizontal' 
            ? { 
                height: 1, 
                width: '100%',
                marginVertical: spacing ? theme.spacing[spacing] || spacing : 0,
              } 
            : { 
                width: 1, 
                height: '100%',
                marginHorizontal: spacing ? theme.spacing[spacing] || spacing : 0,
              }),
        },
        style
      ]}
    />
  );
}

// Row component for horizontal layouts
export function Row({ 
  style, 
  children 
}: BaseProps) {
  return (
    <View 
      style={[
        { 
          flexDirection: 'row',
          alignItems: 'center',
        },
        style
      ]}
    >
      {children}
    </View>
  );
}

// Column component for vertical layouts
export function Column({ 
  style, 
  children 
}: BaseProps) {
  return (
    <View 
      style={[
        { 
          flexDirection: 'column',
        },
        style
      ]}
    >
      {children}
    </View>
  );
}

// Spacer component to add flexible space
interface SpacerProps extends BaseProps {
  size?: number | 'small' | 'medium' | 'large';
  direction?: 'horizontal' | 'vertical';
  flex?: boolean;
}

export function Spacer({ 
  style, 
  size = 'medium',
  direction = 'vertical',
  flex = false,
}: SpacerProps) {
  const { theme } = useTheme();
  
  const getSize = () => {
    if (typeof size === 'number') return size;
    
    switch (size) {
      case 'small':
        return theme.spacing.small;
      case 'large':
        return theme.spacing.large;
      default:
        return theme.spacing.medium;
    }
  };
  
  return (
    <View 
      style={[
        direction === 'vertical' 
          ? { height: getSize(), width: '100%' } 
          : { width: getSize(), height: '100%' },
        flex && { flex: 1 },
        style
      ]}
    />
  );
}

// Section Header - often used in lists or to separate content
interface SectionHeaderProps extends BaseProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function SectionHeader({
  style,
  title,
  subtitle,
  action,
}: SectionHeaderProps) {
  const { theme } = useTheme();
  
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.small,
        },
        style
      ]}
    >
      <View>
        <Text
          style={{
            fontSize: 18,
            fontWeight: '700',
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.heading.fontFamily,
          }}
        >
          {title}
        </Text>
        
        {subtitle && (
          <Text
            style={{
              fontSize: 14,
              color: theme.colors.textSecondary,
              marginTop: 2,
              fontFamily: theme.typography.small.fontFamily,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>
      
      {action && (
        <View>
          {action}
        </View>
      )}
    </View>
  );
}

// SafeArea wrapper that respects theme
export function ThemedSafeArea({ 
  style, 
  children 
}: BaseProps) {
  const { theme } = useTheme();
  
  return (
    <View 
      style={[
        { 
          flex: 1, 
          backgroundColor: theme.colors.background,
          // Add padding for status bar if needed
          paddingTop: Platform.OS === 'ios' ? 44 : 0,
        },
        style
      ]}
    >
      {children}
    </View>
  );
}

// Badge component
interface BadgeProps extends BaseProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
}

export function Badge({
  style,
  label,
  variant = 'primary',
}: BadgeProps) {
  const { theme } = useTheme();
  
  const getVariantColors = () => {
    switch (variant) {
      case 'success':
        return {
          bg: 'rgba(16, 185, 129, 0.1)',
          text: theme.colors.success
        };
      case 'warning':
        return {
          bg: 'rgba(245, 158, 11, 0.1)',
          text: theme.colors.warning
        };
      case 'danger':
        return {
          bg: 'rgba(220, 38, 38, 0.1)',
          text: theme.colors.danger
        };
      case 'info':
        return {
          bg: 'rgba(59, 130, 246, 0.1)',
          text: theme.colors.info
        };
      default:
        return {
          bg: 'rgba(74, 144, 226, 0.1)',
          text: theme.colors.primary
        };
    }
  };
  
  const colors = getVariantColors();
  
  return (
    <View
      style={[
        {
          backgroundColor: colors.bg,
          paddingHorizontal: theme.spacing.small,
          paddingVertical: theme.spacing.tiny,
          borderRadius: theme.radius.small,
        },
        style
      ]}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: 12,
          fontWeight: '600',
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </View>
  );
}