import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Image } from 'react-native';
import Svg, { Circle, Text as SvgText, G, Image as SvgImage, ClipPath, Defs } from 'react-native-svg';
import { User } from '../types/user';

interface UserDotProps {
  user: User;
  centerX: number;
  centerY: number;
  arenaRadius: number;
  safeZoneRadius: number;
}

export default function UserDot({
  user,
  centerX,
  centerY,
  arenaRadius,
  safeZoneRadius,
}: UserDotProps) {
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
  // For circle edge positioning on the outer edge of the circle:
  // x = centerX + arenaRadius * distance * cos(angle)
  // y = centerY + arenaRadius * distance * sin(angle)
  // This ensures the dot is positioned on the outer edge of the circle when distance is 1.0
  const x = Animated.add(
    centerX,
    Animated.multiply(Animated.multiply(distanceAnimation, arenaRadius), cosValAnim)
  );
  const y = Animated.add(
    centerY,
    Animated.multiply(Animated.multiply(distanceAnimation, arenaRadius), sinValAnim)
  );

  // Danger zone
  const isInDanger = user.distance > safeZoneRadius;

  // Dot color logic - always highlight current user and make others gray
  let dotColor = '#9ca3af'; // Default gray for all other users
  let dotStrokeColor = 'rgba(255, 255, 255, 0.5)';
  
  if (user.isCurrentUser) {
    // Current user is always blue, even if in danger or eliminated
    dotColor = '#3b82f6';
    dotStrokeColor = '#ffffff';
  } else if (user.isEliminated) {
    // Make eliminated users darker gray
    dotColor = '#4b5563';
    dotStrokeColor = '#333333';
  } else if (isInDanger) {
    // Yellow if in danger but not current user
    dotColor = '#fbbf24';
  }

  // Dot size - make current user significantly larger for better visibility
  const dotSize = user.isCurrentUser ? 16 : 10;
  
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

  // Create a unique ID for this user's clip path
  const clipId = `clip-${user.id.replace(/[^a-zA-Z0-9]/g, '-')}`;
  
  // Calculate position values for the clip path and avatar
  // We need to ensure avatar follows position updates properly
  const staticX = centerX + (user.distance * cosVal);
  const staticY = centerY + (user.distance * sinVal);
  
  return (
    <AnimatedG {...webSafeProps}>
      <Defs>
        <ClipPath id={clipId}>
          <Circle cx={staticX} cy={staticY} r={dotSize} />
        </ClipPath>
      </Defs>
    
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
      
      {/* White background circle for avatar */}
      <AnimatedCircle
        cx={x}
        cy={y}
        r={dotSize + 2}
        fill="white"
        stroke={dotStrokeColor}
        strokeWidth={user.isCurrentUser ? 3 : 1.5}
        {...webSafeProps}
      />
      
      {/* User avatar with background tint based on status */}
      <Circle
        cx={staticX}
        cy={staticY}
        r={dotSize}
        fill={dotColor}
        opacity={0.3}
      />
      
      {/* Actual avatar image */}
      <SvgImage
        x={staticX - dotSize}
        y={staticY - dotSize}
        width={dotSize * 2}
        height={dotSize * 2}
        href={{ uri: user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400' }}
        clipPath={`url(#${clipId})`}
        preserveAspectRatio="xMidYMid slice"
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

      {/* Display user name - use static positioning for reliability */}
      <SvgText
        x={staticX}
        y={staticY + textOffsetY}
        fontSize={user.isCurrentUser ? 12 : 9}
        fill={user.isCurrentUser ? "#ffffff" : "#dddddd"}
        fontWeight={user.isCurrentUser ? "bold" : "normal"}
        textAnchor="middle"
        opacity={user.isEliminated ? 0.7 : 1}
      >
        {user.name}
      </SvgText>
    </AnimatedG>
  );
}