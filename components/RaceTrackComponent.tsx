// components/RaceTrackComponent.tsx

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  Image,
  ImageBackground,
  ScrollView,
  LayoutChangeEvent,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import Svg, {
  Path,
  G,
  Polygon,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
  Circle,
  Text as SvgText,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const screenWidth = Dimensions.get('window').width;
const AVATAR_SIZE = 36;
const STEP_DURATION = 600;
// Default values
const DEFAULT_TOTAL_CHECKPOINTS = 100;
const SPACING = 80;
const START_OFFSET = 100;
const END_OFFSET = 100;
// Function to calculate content width based on checkpoints
function calculateContentWidth(totalCheckpoints: number): number {
  return SPACING * (totalCheckpoints - 1) + START_OFFSET + END_OFFSET + 50;
}

export interface RaceParticipant {
  id: string;
  avatar_url: string;
  nickname: string;
  currentStep: number;
  isCurrentUser: boolean;
  user_id: string; // Added to store the actual user ID
}

interface RaceTrackProps {
  participants: RaceParticipant[];
  containerHeight?: number;
  showTitle?: boolean;
  totalCheckpoints?: number; // Allow the challenge to specify the exact number of checkpoints
  onMoveParticipant?: (participantId: string, newStep: number, challengeId: string) => void;
  challengeId: string;
}

/* Generate track points in a sine wave shape */
function generateTrackPoints(containerHeight: number, totalCheckpoints: number) {
  const points: { x: number; y: number }[] = [];
  const amplitude = containerHeight * 0.15;
  const baseY = containerHeight / 2;
  for (let i = 0; i < totalCheckpoints; i++) {
    const x = i * SPACING + START_OFFSET;
    const y = baseY + Math.sin(i / 5) * amplitude;
    points.push({ x, y });
  }
  return points;
}

/* Create a smooth cubic Bezier path for the track */
function createPathFromCheckpoints(pts: { x: number; y: number }[]) {
  if (pts.length === 0) return '';
  let path = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx1 = prev.x + (curr.x - prev.x) / 2;
    const cpy1 = prev.y;
    const cpx2 = prev.x + (curr.x - prev.x) / 2;
    const cpy2 = curr.y;
    path += ` C ${cpx1},${cpy1} ${cpx2},${cpy2} ${curr.x},${curr.y}`;
  }
  return path;
}

/* Child component for a single participant's animated avatar */
function AnimatedParticipantAvatar({
  participant,
  trackPoints,
  onMoveParticipant,
  scrollToPosition,
  challengeId,
}: {
  participant: RaceParticipant;
  trackPoints: { x: number; y: number }[];
  onMoveParticipant?: (id: string, newStep: number, challengeId: string) => void;
  scrollToPosition: (x: number) => void;
  challengeId: string;
}) {
  const stepValue = useSharedValue(participant.currentStep);
  const [lastStep, setLastStep] = useState(participant.currentStep);

  // Animate whenever participant.currentStep changes
  useEffect(() => {
    if (participant.currentStep !== lastStep) {
      setLastStep(participant.currentStep);
      stepValue.value = withTiming(participant.currentStep, {
        duration: STEP_DURATION,
        easing: Easing.inOut(Easing.ease),
      });
    }
  }, [participant.currentStep, lastStep, stepValue]);

  // If current user, auto-scroll but DON'T notify parent of step changes
  // We only want explicit position changes from UI controls, not automatic animations
  useAnimatedReaction(
    () => stepValue.value,
    (newStep, oldStep) => {
      if (participant.isCurrentUser) {
        const avatarX = newStep * SPACING + START_OFFSET;
        runOnJS(scrollToPosition)(avatarX);
        
        // DISABLED: Don't automatically update position when animation occurs
        // This prevents cascading updates and duplicate position changes
        // Position updates should only come from explicit user actions or backend
      }
    }
  );

  // Interpolate x,y along the track
  const animatedStyle = useAnimatedStyle(() => {
    if (trackPoints.length === 0) {
      return { transform: [{ translateX: 0 }, { translateY: 0 }] };
    }
    const i = Math.floor(stepValue.value);
    const progress = stepValue.value - i;
    const currentPt = trackPoints[Math.min(i, trackPoints.length - 1)];
    const nextPt = trackPoints[Math.min(i + 1, trackPoints.length - 1)];

    const x = currentPt.x + (nextPt.x - currentPt.x) * progress;
    const y = currentPt.y + (nextPt.y - currentPt.y) * progress;

    // Calculate a slight vertical offset for participants at the same position
    // Current user will be on top, others will be lower
    const yOffset = participant.isCurrentUser ? 0 : AVATAR_SIZE * 0.3;

    return {
      transform: [
        { translateX: x - AVATAR_SIZE / 2 },
        { translateY: y - AVATAR_SIZE / 2 + yOffset },
      ],
      // Increase z-index for current user to ensure they're visible when overlapping
      zIndex: participant.isCurrentUser ? 10 : 5,
    };
  });

  // Gray out others by reducing opacity
  const containerStyle = [styles.avatar, animatedStyle];
  if (!participant.isCurrentUser) {
    containerStyle.push({ opacity: 0.7 });
  }

  return (
    <Animated.View style={containerStyle}>
      {participant.isCurrentUser ? (
        // Vibrant gradient border for current user
        <LinearGradient 
          colors={['#4CAF50', '#2196F3', '#9C27B0']} 
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarGradient}
        >
          <Image
            source={{ uri: participant.avatar_url }}
            style={styles.avatarImage}
          />
        </LinearGradient>
      ) : (
        // Simple frame for others with reduced opacity
        <View style={styles.avatarFrame}>
          <Image
            source={{ uri: participant.avatar_url }}
            style={styles.avatarImage}
          />
        </View>
      )}

      {/* Full nickname, no truncation */}
      <View
        style={
          participant.isCurrentUser
            ? styles.currentUserLabel
            : styles.nicknameContainer
        }
      >
        <Text
          style={
            participant.isCurrentUser
              ? styles.currentUserNickname
              : styles.nickname
          }
          numberOfLines={1}
        >
          {participant.nickname}
          {participant.isCurrentUser && ' (You)'}
        </Text>
      </View>
    </Animated.View>
  );
}

/* Main RaceTrack component */
export default function MultiAvatarRaceTrack({
  participants,
  containerHeight = 300,
  showTitle = true,
  onMoveParticipant,
  challengeId,
  totalCheckpoints = DEFAULT_TOTAL_CHECKPOINTS, // Use provided value or default
}: RaceTrackProps) {
  // Get content width based on total checkpoints
  const contentWidth = calculateContentWidth(totalCheckpoints);
  
  const [trackPoints, setTrackPoints] = useState<{ x: number; y: number }[]>([]);
  const [svgPath, setSvgPath] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  // Force re-render participants when their positions change
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    // Force a component update when participants change
    forceUpdate({});
  }, [participants]);

  const onLayoutContainer = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    const h = height || containerHeight;
    const pts = generateTrackPoints(h, totalCheckpoints);
    setTrackPoints(pts);
    setSvgPath(createPathFromCheckpoints(pts));
  };

  // For auto-scrolling
  function scrollToPosition(avatarX: number) {
    if (scrollViewRef.current) {
      const target = Math.max(0, avatarX - screenWidth / 2 + AVATAR_SIZE / 2);
      scrollViewRef.current.scrollTo({ x: target, animated: true });
    }
  }

  // Find current user & sort participants with the current user at the end
  // so they're drawn last (on top) in the case of overlapping avatars
  const currentUser = participants.find((p) => p.isCurrentUser);
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.isCurrentUser) return 1; // current user comes last
    if (b.isCurrentUser) return -1;
    
    // For same position, sort by ID to ensure consistent ordering
    if (a.currentStep === b.currentStep) {
      return a.id.localeCompare(b.id);
    }
    
    return 0;
  });
  
  const [isAtEnd, setIsAtEnd] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.currentStep >= totalCheckpoints - 1) {
      setIsAtEnd(true);
    } else {
      setIsAtEnd(false);
    }
  }, [participants, currentUser, totalCheckpoints]);

  function moveToNextCheckpoint() {
    if (!currentUser || isAtEnd) return;
    
    // DISABLED: We're removing manual position changes
    // The "press to move" feature is causing position conflicts with the challenge points system
    console.log('Manual position changes have been disabled');
    
    // IMPORTANT: Position updates should only come from backend activity processing
    // This ensures consistent point calculations and prevents duplicate updates
  }

  // Calculate progress statistics for visual display
// Calculate progress statistics for visual display
const totalParticipants = participants.length;
const participantsAtEnd = participants.filter(p => p.currentStep >= totalCheckpoints - 1).length;
const completionPercentage = participants.length > 0 
  ? Math.round(
      (participants.reduce((sum, p) => sum + Math.min(p.currentStep, totalCheckpoints - 1), 0) / 
       (totalParticipants * (totalCheckpoints - 1))) 
      * 100
    )
  : 0;
  // Get leaderboard positions
  const leaderboard = [...participants]
    .sort((a, b) => b.currentStep - a.currentStep)
    .map((p, idx) => ({ ...p, position: idx + 1 }));
  
  // Current user's position
  const userPosition = leaderboard.find(p => p.isCurrentUser)?.position || 0;

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      {/* Background image */}
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1572372896847-b1e90e88739a?auto=format&fit=crop&w=800&q=80' }}
        style={StyleSheet.absoluteFillObject}
        blurRadius={2}
      />

      <View style={[styles.mapContainer, { height: containerHeight * 0.75 }]}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          contentContainerStyle={styles.scrollContent}
          showsHorizontalScrollIndicator={false}
          bounces={false}
        >
          <View
            style={[styles.trackContainer, { height: containerHeight * 0.75, width: contentWidth }]}
            onLayout={onLayoutContainer}
          >
            {svgPath ? (
              <Svg width={contentWidth} height={containerHeight * 0.75}>
                <Defs>
                  <SvgLinearGradient id="roadGradient" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#444" stopOpacity="1" />
                    <Stop offset="1" stopColor="#222" stopOpacity="1" />
                  </SvgLinearGradient>
                  
                  {/* Multi-color gradient for track progress */}
                  <SvgLinearGradient id="progressGradient" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0.1" stopColor="#4CAF50" stopOpacity="0.7" />
                    <Stop offset="0.5" stopColor="#2196F3" stopOpacity="0.7" />
                    <Stop offset="0.9" stopColor="#9C27B0" stopOpacity="0.7" />
                  </SvgLinearGradient>
                </Defs>

                {/* Background grass */}
                <Rect
                  x={0}
                  y={0}
                  width={contentWidth}
                  height={containerHeight * 0.75}
                  fill="#2e7d32"
                  opacity={0.3}
                />
                
                {/* Outer track outline */}
                <Path
                  d={svgPath}
                  stroke="#000"
                  strokeWidth={40}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Road gradient fill */}
                <Path
                  d={svgPath}
                  stroke="url(#roadGradient)"
                  strokeWidth={34}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Center dashed line */}
                <Path
                  d={svgPath}
                  stroke="#fff"
                  strokeWidth={2}
                  strokeDasharray="10,8"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* START line */}
                {trackPoints.length > 0 && (
                  <G transform={`translate(${trackPoints[0].x},${trackPoints[0].y})`}>
                    <Polygon points="-25,-8 25,-8 25,8 -25,8" fill="#fff" stroke="#000" strokeWidth={2} />
                    <SvgText x="0" y="30" fill="#fff" fontSize="16" fontWeight="bold" textAnchor="middle">
                      START
                    </SvgText>
                  </G>
                )}

                {/* FINISH line */}
                {trackPoints.length > totalCheckpoints - 1 && (
                  <G
                    transform={`translate(${
                      trackPoints[totalCheckpoints - 1].x
                    },${trackPoints[totalCheckpoints - 1].y})`}
                  >
                    <Polygon points="-25,-8 25,-8 25,8 -25,8" fill="#222" stroke="#fff" strokeWidth={2} />
                    <SvgText x="0" y="30" fill="#fff" fontSize="16" fontWeight="bold" textAnchor="middle">
                      FINISH
                    </SvgText>
                  </G>
                )}

                {/* Major Checkpoints - only show every interval and START/FINISH */}
                {trackPoints.map((pt, idx) => {
                  // For challenges with fewer checkpoints, adjust label interval
                  // to ensure we don't have too many or too few labels
                  const labelInterval = totalCheckpoints <= 10 ? 1 : 
                    totalCheckpoints <= 20 ? 2 : 
                    totalCheckpoints <= 50 ? 5 : 10;
                  
                  if (idx % labelInterval !== 0 && idx !== 0 && idx !== totalCheckpoints - 1) return null;
                  
                  // Find if any user has reached this checkpoint
                  const isReached = participants.some(p => p.currentStep >= idx);
                  // Find if current user has reached this checkpoint
                  const isUserReached = currentUser && currentUser.currentStep >= idx;
                  
                  return (
                    <G key={idx} transform={`translate(${pt.x},${pt.y})`}>
                      <Circle
                        r={5}
                        fill={isUserReached ? '#4CAF50' : isReached ? '#FFD700' : '#ccc'}
                        stroke="#000"
                        strokeWidth={1}
                      />
                      {idx % labelInterval === 0 && (
                        <SvgText
                          x="0"
                          y="-12"
                          fill={isUserReached ? '#4CAF50' : isReached ? '#FFD700' : '#fff'}
                          fontSize="12"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {idx === 0 ? '' : idx}
                        </SvgText>
                      )}
                    </G>
                  );
                })}
                
                {/* Minor Checkpoints - smaller markers for intermediate points */}
                {trackPoints.map((pt, idx) => {
                  // Calculate minor marker interval based on total checkpoints
                  const majorInterval = totalCheckpoints <= 10 ? 1 : 
                    totalCheckpoints <= 20 ? 2 : 
                    totalCheckpoints <= 50 ? 5 : 10;
                  
                  const minorInterval = Math.max(1, Math.floor(majorInterval / 2));
                  
                  if (idx % minorInterval !== 0 || idx % majorInterval === 0 || idx === 0 || idx === totalCheckpoints - 1) return null;
                  
                  const isReached = participants.some(p => p.currentStep >= idx);
                  
                  return (
                    <G key={`minor-${idx}`} transform={`translate(${pt.x},${pt.y})`}>
                      <Circle
                        r={3}
                        fill={isReached ? '#FFD700' : '#aaa'}
                        stroke="#000"
                        strokeWidth={0.5}
                      />
                    </G>
                  );
                })}
              </Svg>
            ) : null}

            {/* One AnimatedParticipantAvatar per participant, sorted so current user is drawn last */}
            {sortedParticipants.map((p) => (
              <AnimatedParticipantAvatar
                key={p.id}
                participant={p}
                trackPoints={trackPoints}
                scrollToPosition={scrollToPosition}
                onMoveParticipant={onMoveParticipant}
                challengeId={challengeId}
              />
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Title and statistics */}
      {showTitle && (
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>Race Challenge</Text>
          {currentUser && (
            <Text style={styles.statsText}>
              Position: {userPosition}/{totalParticipants} • 
              Checkpoint: {currentUser.currentStep}/{totalCheckpoints-1} • 
              {completionPercentage}% Finished
            </Text>
          )}
        </View>
      )}

      {/* We've removed the Accelerate button as it's not needed in production 
          since positions are now automatically updated based on points earned */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#101010', 
    overflow: 'hidden',
    borderRadius: 12 
  },
  mapContainer: { flexGrow: 1 },
  scrollContent: { minWidth: screenWidth, alignItems: 'center' },
  trackContainer: { position: 'relative' },

  titleContainer: {
    backgroundColor: '#1F1F1F',
    paddingVertical: 12,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: '700', 
    letterSpacing: 1.1 
  },
  statsText: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 0.5
  },

  buttonRow: {
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#101010',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  disabledButton: { backgroundColor: '#88AA88', opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },

  // Avatars
  avatar: { 
    position: 'absolute', 
    width: AVATAR_SIZE, 
    height: AVATAR_SIZE,
  },
  avatarGradient: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 4,
  },
  avatarFrame: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: '#ccc',
    overflow: 'hidden',
  },
  avatarImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: AVATAR_SIZE / 2 
  },
  currentUserLabel: {
    position: 'absolute',
    top: -22,
    left: -10,
    right: -10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 2,
  },
  nicknameContainer: {
    position: 'absolute',
    top: -18,
    left: -10,
    right: -10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignItems: 'center',
  },
  currentUserNickname: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  nickname: { color: '#fff', fontSize: 10, fontWeight: '500' },
});