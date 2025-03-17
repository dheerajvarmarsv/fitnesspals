import React, { ReactNode } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../lib/ThemeContext';
import { useResponsive } from '../lib/useResponsive';

interface ThemedButtonProps {
  title?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  gradient?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
  size?: 'small' | 'medium' | 'large';
  block?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

export default function ThemedButton({
  title,
  onPress,
  style,
  textStyle,
  children,
  disabled = false,
  loading = false,
  gradient = false,
  variant = 'primary',
  size = 'medium',
  block = false,
  icon,
  iconPosition = 'left',
}: ThemedButtonProps) {
  const { theme } = useTheme();
  const { getPadding, getFontSize } = useResponsive();

  // Size styles
  const sizeStyles = {
    small: {
      paddingVertical: getPadding(theme.spacing.small),
      paddingHorizontal: getPadding(theme.spacing.medium),
      fontSize: getFontSize(14),
    },
    medium: {
      paddingVertical: getPadding(theme.spacing.small),
      paddingHorizontal: getPadding(theme.spacing.medium),
      fontSize: getFontSize(16),
    },
    large: {
      paddingVertical: getPadding(theme.spacing.medium),
      paddingHorizontal: getPadding(theme.spacing.large),
      fontSize: getFontSize(18),
    },
  };

  // Button background, text colors, and border based on variant
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: gradient ? 'transparent' : theme.colors.primary,
          textColor: '#fff',
          borderWidth: 0,
          borderColor: 'transparent',
          gradientColors: theme.colors.gradientButton,
        };
      case 'secondary':
        return {
          backgroundColor: gradient ? 'transparent' : theme.colors.secondary,
          textColor: '#fff',
          borderWidth: 0,
          borderColor: 'transparent',
          gradientColors: theme.colors.gradientHeader,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          textColor: theme.colors.primary,
          borderWidth: 1,
          borderColor: theme.colors.primary,
          gradientColors: ['transparent', 'transparent'],
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          textColor: theme.colors.primary,
          borderWidth: 0,
          borderColor: 'transparent',
          gradientColors: ['transparent', 'transparent'],
        };
      case 'danger':
        return {
          backgroundColor: gradient ? 'transparent' : theme.colors.danger,
          textColor: '#fff',
          borderWidth: 0,
          borderColor: 'transparent',
          gradientColors: theme.gradients.danger,
        };
      case 'success':
        return {
          backgroundColor: gradient ? 'transparent' : theme.colors.success,
          textColor: '#fff',
          borderWidth: 0,
          borderColor: 'transparent',
          gradientColors: theme.gradients.success,
        };
      case 'warning':
        return {
          backgroundColor: gradient ? 'transparent' : theme.colors.warning,
          textColor: '#fff',
          borderWidth: 0,
          borderColor: 'transparent',
          gradientColors: theme.gradients.warning,
        };
      default:
        return {
          backgroundColor: gradient ? 'transparent' : theme.colors.primary,
          textColor: '#fff',
          borderWidth: 0,
          borderColor: 'transparent',
          gradientColors: theme.colors.gradientButton,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyle = sizeStyles[size];

  // Combined button styles
  const buttonStyles = [
    styles.button,
    {
      backgroundColor: variantStyles.backgroundColor,
      borderWidth: variantStyles.borderWidth,
      borderColor: variantStyles.borderColor,
      borderRadius: theme.radius.button,
      paddingVertical: sizeStyle.paddingVertical,
      paddingHorizontal: sizeStyle.paddingHorizontal,
    },
    block && styles.blockButton,
    disabled && styles.disabledButton,
    style,
  ];

  // Text styles
  const buttonTextStyles = [
    styles.buttonText,
    {
      color: variantStyles.textColor,
      fontSize: sizeStyle.fontSize,
      fontFamily: theme.typography.button.fontFamily,
      fontWeight: theme.typography.button.fontWeight,
    },
    textStyle,
  ];

  // Button content with optional icon
  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator color={variantStyles.textColor} size="small" />;
    }

    // If children are provided, just use them
    if (children) {
      return children;
    }

    // Otherwise render title with optional icon
    return (
      <>
        {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
        {title && <Text style={buttonTextStyles}>{title}</Text>}
        {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
      </>
    );
  };

  // Use regular button or gradient button based on gradient prop
  if (gradient && !disabled) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.8}
        style={{ borderRadius: theme.radius.button, overflow: 'hidden' }}
      >
        <LinearGradient
          colors={variantStyles.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={buttonStyles}
        >
          <View style={styles.contentContainer}>{renderContent()}</View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={buttonStyles}
    >
      <View style={styles.contentContainer}>{renderContent()}</View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  blockButton: {
    width: '100%',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    textAlign: 'center',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});