import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Animated, Platform, ActivityIndicator, Text } from 'react-native';
import Svg, { Circle, G, Line, Defs, RadialGradient, Stop, Pattern, Rect } from 'react-native-svg';
import UserDot from '../app/UserDot';
import { useArenaStore } from '../lib/arenaStore';

const { width } = Dimensions.get('window');
const ARENA_SIZE = width * 0.9;
const MAP_SIZE = ARENA_SIZE * 1.5; // Larger map for better visualization
const CENTER_X = MAP_SIZE / 2;
const CENTER_Y = MAP_SIZE / 2;
const ARENA_RADIUS = ARENA_SIZE / 2;

export const Arena = () => {
  const { safeZoneRadius, users, loading, currentDay, totalDays, currentUser } = useArenaStore();
  const safeZoneAnimation = useRef(new Animated.Value(safeZoneRadius)).current;
  const [isAnimating, setIsAnimating] = useState(false);
  const mapRef = useRef(null);

  // Pulse animation for the arena boundary
  const pulseAnim = useRef(new Animated.Value(0)).current;
  
  // Calculate progress percentage
  const progressPercentage = totalDays > 0 ? Math.min(100, (currentDay / totalDays) * 100) : 0;
  
  // Determine user status
  const isInDanger = currentUser ? 
    currentUser.distance > safeZoneRadius : false;
    
  // Determine if user is eliminated
  const isEliminated = currentUser?.isEliminated || false;
  
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

  // Set status color and text
  let statusColor = '#22c55e'; // Default green for safe
  let statusText = 'Safe';
  
  if (isEliminated) {
    statusColor = '#9ca3af'; // Gray for eliminated
    statusText = 'Eliminated';
  } else if (isInDanger) {
    statusColor = '#ef4444'; // Red for danger
    statusText = 'Danger';
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Loading arena...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.arenaWrapper}>
      {/* User stats header */}
      <View style={styles.statsContainer}>
        <View style={styles.dayContainer}>
          <Text style={styles.dayText}>Day {currentDay} of {totalDays}</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
          </View>
        </View>
        
        <View style={styles.userStatsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Points</Text>
            <Text style={styles.statValue}>
              {currentUser && typeof currentUser.points === 'number' ? currentUser.points : 0}
            </Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Lives</Text>
            <Text style={styles.statValue}>{currentUser?.lives || 3}/3</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Status</Text>
            <Text style={[styles.statValue, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>
        </View>
        
        {isInDanger && !isEliminated && (
          <View style={styles.dangerAlert}>
            <Text style={styles.dangerText}>
              In danger zone! Log activity to survive
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.container}>
        <Animated.View style={styles.mapContainer} ref={mapRef}>
          <Svg width={MAP_SIZE} height={MAP_SIZE} viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`}>
            <Defs>
              {/* Grid pattern for the map background */}
              <Pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <Rect width="40" height="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
              </Pattern>

              {/* Gradient for the arena boundary */}
              <RadialGradient
                id="arenaGradient"
                cx="50%"
                cy="50%"
                r="50%"
                fx="50%"
                fy="50%"
              >
                <Stop offset="0%" stopColor="#1e40af" stopOpacity="0.1" />
                <Stop offset="80%" stopColor="#3b82f6" stopOpacity="0.3" />
                <Stop offset="100%" stopColor="#60a5fa" stopOpacity="0.5" />
              </RadialGradient>

              {/* Gradient for danger zone */}
              <RadialGradient 
                id="dangerGradient" 
                cx="50%" 
                cy="50%" 
                r="50%" 
                fx="50%" 
                fy="50%"
              >
                <Stop offset="0%" stopColor="#7f1d1d" stopOpacity="0.1" />
                <Stop offset="70%" stopColor="#b91c1c" stopOpacity="0.3" />
                <Stop offset="100%" stopColor="#ef4444" stopOpacity="0.5" />
              </RadialGradient>
              
              {/* Gradient for safe zone */}
              <RadialGradient 
                id="safeGradient" 
                cx="50%" 
                cy="50%" 
                r="100%" 
                fx="50%" 
                fy="50%"
              >
                <Stop offset="0%" stopColor="#14532d" stopOpacity="0.1" />
                <Stop offset="70%" stopColor="#16a34a" stopOpacity="0.3" />
                <Stop offset="100%" stopColor="#22c55e" stopOpacity="0.5" />
              </RadialGradient>
            </Defs>
            
            {/* Map background with grid */}
            <Rect
              x="0"
              y="0"
              width={MAP_SIZE}
              height={MAP_SIZE}
              fill="#0f172a"
            />
            
            <Rect
              x="0"
              y="0"
              width={MAP_SIZE}
              height={MAP_SIZE}
              fill="url(#grid)"
            />
          
            {/* Arena boundary with pulsing effect */}
            <Circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r={ARENA_RADIUS}
              fill="url(#arenaGradient)"
              stroke="#60a5fa"
              strokeWidth="2"
              strokeDasharray={Platform.OS === 'web' ? "4,4" : [4, 4]}
            />
            
            {/* Danger Zone (Red Background with Gradient) */}
            <Circle
              cx={CENTER_X}
              cy={CENTER_Y}
              r={ARENA_RADIUS}
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
              stroke="#22c55e"
              strokeWidth={pulseStrokeWidth}
              strokeOpacity={pulseOpacity}
              {...webSafeProps}
            />
            
            {/* Grid Lines */}
            <G>
              {/* Concentric circles */}
              {[0.25, 0.5, 0.75].map((ratio, index) => (
                <Circle
                  key={`circle-${index}`}
                  cx={CENTER_X}
                  cy={CENTER_Y}
                  r={ARENA_RADIUS * ratio}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth={1}
                  strokeDasharray={Platform.OS === 'web' ? "4,4" : [4, 4]}
                />
              ))}
              
              {/* Radial lines from center */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, index) => {
                const radians = (angle * Math.PI) / 180;
                const x2 = CENTER_X + Math.cos(radians) * ARENA_RADIUS;
                const y2 = CENTER_Y + Math.sin(radians) * ARENA_RADIUS;
                
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
                arenaRadius={ARENA_RADIUS}
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
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  arenaWrapper: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
  },
  container: {
    width: MAP_SIZE,
    height: MAP_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#0f172a',
    // Add subtle shadow for depth
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  mapContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 14,
  },
  statsContainer: {
    width: '90%',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dayContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  progressBarContainer: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  userStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#d1d5db',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 8,
  },
  dangerAlert: {
    marginTop: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.7)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dangerText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
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