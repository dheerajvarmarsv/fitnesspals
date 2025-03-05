import React, { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';
import Svg, { Circle, Text as SvgText, G } from 'react-native-svg';
import { User } from '../types/user';

interface UserDotProps {
  user: User;
  centerX: number;
  centerY: number;
  arenaRadius: number;
  safeZoneRadius: number;
}

export const UserDot = ({
  user,
  centerX,
  centerY,
  arenaRadius,
  safeZoneRadius,
}: UserDotProps) => {
  const AnimatedCircle = Animated.createAnimatedComponent(Circle);
  const AnimatedText = Animated.createAnimatedComponent(SvgText);
  const AnimatedG = Animated.createAnimatedComponent(G);

  // Distance is animated
  const distanceAnimation = useRef(new Animated.Value(user.distance)).current;
  
  // Pulse animation for current user
  const pulseAnim = useRef(new Animated.Value(0)).current;
  
  // Glow animation for eliminated users
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Convert angle to radians
  const angleRad = (user.angle * Math.PI) / 180;

  // Precompute cos/sin as normal JS values
  const cosVal = Math.cos(angleRad);
  const sinVal = Math.sin(angleRad);

  // Wrap them in Animated.Values so we can multiply
  const cosValAnim = useRef(new Animated.Value(cosVal)).current;
  const sinValAnim = useRef(new Animated.Value(sinVal)).current;

  useEffect(() => {
    // Animate distance changes
    Animated.timing(distanceAnimation, {
      toValue: user.distance,
      duration: 800,
      useNativeDriver: false, // We are animating layout, so keep false
    }).start();
    
    // For current user, add pulsing effect
    if (user.isCurrentUser) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          })
        ])
      ).start();
    }
    
    // For eliminated users, add glow effect
    if (user.isEliminated) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          })
        ])
      ).start();
    }
  }, [user.distance, user.isCurrentUser, user.isEliminated]);

  // X, Y position:
  // x = centerX - distance * cos(angle)
  // y = centerY - distance * sin(angle)
  const x = Animated.subtract(
    centerX,
    Animated.multiply(distanceAnimation, cosValAnim)
  );
  const y = Animated.subtract(
    centerY,
    Animated.multiply(distanceAnimation, sinValAnim)
  );

  // Danger zone
  const isInDanger = user.distance > safeZoneRadius;

  // Dot color logic
  let dotColor = '#ffffff';
  let dotStrokeColor = 'rgba(255, 255, 255, 0.5)';
  
  if (user.isCurrentUser) {
    dotColor = '#3b82f6';
    dotStrokeColor = '#ffffff';
  } else if (user.isEliminated) {
    dotColor = '#9ca3af';
    dotStrokeColor = '#4b5563';
  } else if (isInDanger) {
    dotColor = '#fbbf24'; // Yellow for users in danger
  }

  // Dot size
  const dotSize = user.isCurrentUser ? 12 : 8;
  
  // Pulse size for current user
  const pulseSize = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [dotSize, dotSize * 1.8]
  });
  
  // Pulse opacity
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 0]
  });
  
  // Glow opacity for eliminated users
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.5]
  });

  // Label offset
  const textOffsetY = user.isCurrentUser ? 20 : 15;
  
  // Scale animation for text
  const textScale = user.isCurrentUser ? 
    pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.1]
    }) : 1;

  // Platform-specific props to avoid warnings on web
  const webSafeProps = Platform.OS === 'web' ? {} : { collapsable: false };

  return (
    <AnimatedG {...webSafeProps}>
      {/* Background glow for eliminated users */}
      {user.isEliminated && (
        <AnimatedCircle
          cx={x}
          cy={y}
          r={dotSize * 2}
          fill="#4b5563"
          opacity={glowOpacity}
          {...webSafeProps}
        />
      )}
      
      {/* Pulse effect for current user */}
      {user.isCurrentUser && (
        <AnimatedCircle
          cx={x}
          cy={y}
          r={pulseSize}
          fill="#3b82f6"
          opacity={pulseOpacity}
          {...webSafeProps}
        />
      )}
      
      {/* Main dot */}
      <AnimatedCircle
        cx={x}
        cy={y}
        r={dotSize}
        fill={dotColor}
        stroke={dotStrokeColor}
        strokeWidth={user.isCurrentUser ? 2 : 1}
        {...webSafeProps}
      />

      {/* Danger zone life indicators */}
      {!user.isEliminated && isInDanger && (
        <>
          {[...Array(user.lives)].map((_, i) => (
            <AnimatedCircle
              key={i}
              cx={Animated.add(x, (i - 1) * 8)}
              cy={Animated.add(y, -15)}
              r={3}
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth={0.5}
              {...webSafeProps}
            />
          ))}
        </>
      )}

      {/* Show user name for self or on web */}
      {(user.isCurrentUser || Platform.OS === 'web') && (
        <AnimatedText
          x={x}
          y={Animated.add(y, textOffsetY)}
          fontSize={user.isCurrentUser ? 12 : 10}
          fill="#ffffff"
          fontWeight="bold"
          textAnchor="middle"
          opacity={user.isEliminated ? 0.7 : 1}
          {...webSafeProps}
        >
          {user.name}
        </AnimatedText>
      )}
    </AnimatedG>
  );
};