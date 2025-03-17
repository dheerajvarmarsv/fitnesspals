import { useWindowDimensions } from 'react-native';
import { useMemo } from 'react';

/**
 * Screen size breakpoints
 */
const breakpoints = {
  smallPhone: 320,
  phone: 500,
  tablet: 834,
};

/**
 * Hook for responsive design based on screen width
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  
  const screen = useMemo(() => {
    return {
      width,
      height,
      isSmallPhone: width <= breakpoints.smallPhone,
      isPhone: width <= breakpoints.phone,
      isTablet: width >= breakpoints.tablet,
      isLandscape: width > height,
    };
  }, [width, height]);
  
  /**
   * Calculate responsive padding based on screen size
   */
  const getPadding = (base = 16) => {
    if (screen.isTablet) return base * 1.5;
    if (screen.isSmallPhone) return base * 0.75;
    return base;
  };
  
  /**
   * Calculate responsive font size based on screen size
   */
  const getFontSize = (base = 16) => {
    if (screen.isTablet) return base * 1.25;
    if (screen.isSmallPhone) return base * 0.85;
    return base;
  };
  
  /**
   * Calculate a responsive value based on screen width percentage
   * @param percentage - Percentage of screen width (0-100)
   */
  const wp = (percentage: number) => {
    return width * (percentage / 100);
  };
  
  /**
   * Calculate a responsive value based on screen height percentage
   * @param percentage - Percentage of screen height (0-100)
   */
  const hp = (percentage: number) => {
    return height * (percentage / 100);
  };
  
  return {
    screen,
    getPadding,
    getFontSize,
    wp,
    hp,
  };
}