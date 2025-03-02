import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Animated, Platform } from 'react-native';
import Svg, { Circle, G, Line, Defs, RadialGradient, Stop } from 'react-native-svg';
import { UserDot } from './UserDot';
import { useArenaStore } from '../lib/arenaStore';

const { width } = Dimensions.get('window');
const ARENA_SIZE = width * 0.9;
const CENTER_X = ARENA_SIZE / 2;
const CENTER_Y = ARENA_SIZE / 2;

export const Arena = () => {
  const { safeZoneRadius, users } = useArenaStore();
  const safeZoneAnimation = useRef(new Animated.Value(safeZoneRadius)).current;
  const [isAnimating, setIsAnimating] = useState(false);

  // Pulse animation for the arena boundary
  const pulseAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Start pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        })
      ])
    ).start();
  }, []);

  useEffect(() => {
    setIsAnimating(true);
    Animated.timing(safeZoneAnimation, {
      toValue: safeZoneRadius,
      duration: 800,
      useNativeDriver: false,
    }).start(() => {
      setIsAnimating(false);
    });
  }, [safeZoneRadius]);

  const AnimatedCircle = Animated.createAnimatedComponent(Circle);
  
  // Calculate the pulse stroke width
  const pulseStrokeWidth = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 4]
  });
  
  // Calculate the pulse opacity
  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3]
  });

  // Platform-specific props to avoid warnings on web
  const webSafeProps = Platform.OS === 'web' ? {} : { collapsable: false };

  return (
    <View style={styles.container}>
      <Svg width={ARENA_SIZE} height={ARENA_SIZE} viewBox={`0 0 ${ARENA_SIZE} ${ARENA_SIZE}`}>
        <Defs>
          {/* Gradient for danger zone */}
          <RadialGradient id="dangerGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor="#7f1d1d" />
            <Stop offset="70%" stopColor="#b91c1c" />
            <Stop offset="100%" stopColor="#ef4444" />
          </RadialGradient>
          
          {/* Gradient for safe zone */}
          <RadialGradient id="safeGradient" cx="50%" cy="50%" r="100%" fx="50%" fy="50%">
            <Stop offset="0%" stopColor="#14532d" />
            <Stop offset="70%" stopColor="#16a34a" />
            <Stop offset="100%" stopColor="#22c55e" />
          </RadialGradient>
        </Defs>
        
        {/* Danger Zone (Red Background with Gradient) */}
        <Circle
          cx={CENTER_X}
          cy={CENTER_Y}
          r={ARENA_SIZE / 2}
          fill="url(#dangerGradient)"
        />
        
        {/* Safe Zone (Green with Gradient) */}
        <AnimatedCircle
          cx={CENTER_X}
          cy={CENTER_Y}
          r={safeZoneAnimation}
          fill="url(#safeGradient)"
          {...webSafeProps}
        />
        
        {/* Pulsing boundary for safe zone */}
        <AnimatedCircle
          cx={CENTER_X}
          cy={CENTER_Y}
          r={safeZoneAnimation}
          fill="none"
          stroke="#ffffff"
          strokeWidth={pulseStrokeWidth}
          strokeOpacity={pulseOpacity}
          {...webSafeProps}
        />
        
        {/* Grid Lines */}
        <G>
          {/* Radial grid lines */}
          {[0.2, 0.4, 0.6, 0.8].map((ratio, index) => (
            <Circle
              key={`circle-${index}`}
              cx={CENTER_X}
              cy={CENTER_Y}
              r={(ARENA_SIZE / 2) * ratio}
              fill="none"
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth={1}
              strokeDasharray={Platform.OS === 'web' ? "4,4" : [4, 4]}
            />
          ))}
          
          {/* Radial lines from center */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, index) => {
            const radians = (angle * Math.PI) / 180;
            const x2 = CENTER_X + Math.cos(radians) * (ARENA_SIZE / 2);
            const y2 = CENTER_Y + Math.sin(radians) * (ARENA_SIZE / 2);
            
            return (
              <Line
                key={`line-${index}`}
                x1={CENTER_X}
                y1={CENTER_Y}
                x2={x2}
                y2={y2}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth={1}
                strokeDasharray={Platform.OS === 'web' ? "4,4" : [4, 4]}
              />
            );
          })}
        </G>
        
        {/* User Dots */}
        {users.map((user) => (
          <UserDot
            key={user.id}
            user={user}
            centerX={CENTER_X}
            centerY={CENTER_Y}
            arenaRadius={ARENA_SIZE / 2}
            safeZoneRadius={safeZoneRadius}
          />
        ))}
      </Svg>
      
      {/* Visual indicator when safe zone changes */}
      {isAnimating && (
        <View style={styles.animationOverlay}>
          <View style={styles.animationIndicator} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: ARENA_SIZE,
    height: ARENA_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: ARENA_SIZE / 2,
    // Add subtle shadow for depth
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  animationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  animationIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    opacity: 0.7,
  },
});