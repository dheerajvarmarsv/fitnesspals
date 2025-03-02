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
const TOTAL_CHECKPOINTS = 100;
const SPACING = 80;
const START_OFFSET = 100;
const END_OFFSET = 100;
const CONTENT_WIDTH =
  SPACING * (TOTAL_CHECKPOINTS - 1) + START_OFFSET + END_OFFSET + 50;

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
  onMoveParticipant?: (participantId: string, newStep: number, challengeId: string) => void;
  challengeId: string;
}

/* Generate track points in a sine wave shape */
function generateTrackPoints(containerHeight: number) {
  const points: { x: number; y: number }[] = [];
  const amplitude = containerHeight * 0.15;
  const baseY = containerHeight / 2;
  for (let i = 0; i < TOTAL_CHECKPOINTS; i++) {
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

  // If current user, auto-scroll & notify parent
  useAnimatedReaction(
    () => stepValue.value,
    (newStep, oldStep) => {
      if (participant.isCurrentUser) {
        const avatarX = newStep * SPACING + START_OFFSET;
        runOnJS(scrollToPosition)(avatarX);

        // Only notify parent if new value is different from old (prevent loops)
        if (onMoveParticipant && Math.floor(newStep) !== Math.floor(oldStep || 0)) {
          console.log('Position change detected:', {
            userId: participant.user_id,
            step: Math.floor(newStep),
            challengeId: challengeId
          });
          // Pass user_id not id (which is the database row ID)
          runOnJS(onMoveParticipant)(participant.user_id, Math.floor(newStep), challengeId);
        }
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

    return {
      transform: [
        { translateX: x - AVATAR_SIZE / 2 },
        { translateY: y - AVATAR_SIZE / 2 },
      ],
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
        // Gold gradient border for current user
        <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.avatarGradient}>
          <Image
            source={{ uri: participant.avatar_url }}
            style={styles.avatarImage}
          />
        </LinearGradient>
      ) : (
        // Simple frame for others
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
}: RaceTrackProps) {
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
    const pts = generateTrackPoints(h);
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

  // Optional accelerate button here
  const currentUser = participants.find((p) => p.isCurrentUser);
  const [isAtEnd, setIsAtEnd] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.currentStep >= TOTAL_CHECKPOINTS - 1) {
      setIsAtEnd(true);
    } else {
      setIsAtEnd(false);
    }
  }, [participants, currentUser]);

// In RaceTrackComponent.tsx
function moveToNextCheckpoint() {
    if (!currentUser || isAtEnd) return;
    
    const nextStep = Math.min(TOTAL_CHECKPOINTS - 1, currentUser.currentStep + 1);
    console.log('Accelerate pressed:', {
      nextStep,
      userId: currentUser.user_id,
      challengeId
    });
    
    // Make sure we're passing the user_id, not the component ID
    if (onMoveParticipant && currentUser.user_id) {
      onMoveParticipant(currentUser.user_id, nextStep, challengeId);
    } else {
      console.error('Cannot move participant: missing user_id or callback', {
        user_id: currentUser.user_id,
        hasCallback: !!onMoveParticipant
      });
    }
  }

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
            style={[styles.trackContainer, { height: containerHeight * 0.75 }]}
            onLayout={onLayoutContainer}
          >
            {svgPath ? (
              <Svg width={CONTENT_WIDTH} height={containerHeight * 0.75}>
                <Defs>
                  <SvgLinearGradient id="roadGradient" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#444" stopOpacity="1" />
                    <Stop offset="1" stopColor="#222" stopOpacity="1" />
                  </SvgLinearGradient>
                </Defs>

                {/* Background grass */}
                <Rect
                  x={0}
                  y={0}
                  width={CONTENT_WIDTH}
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
                {trackPoints.length > TOTAL_CHECKPOINTS - 1 && (
                  <G
                    transform={`translate(${
                      trackPoints[TOTAL_CHECKPOINTS - 1].x
                    },${trackPoints[TOTAL_CHECKPOINTS - 1].y})`}
                  >
                    <Polygon points="-25,-8 25,-8 25,8 -25,8" fill="#222" stroke="#fff" strokeWidth={2} />
                    <SvgText x="0" y="30" fill="#fff" fontSize="16" fontWeight="bold" textAnchor="middle">
                      FINISH
                    </SvgText>
                  </G>
                )}

                {/* Checkpoints */}
                {trackPoints.map((pt, idx) => {
                  // Only show every 10th checkpoint and START/FINISH
                  if (idx % 10 !== 0 && idx !== 0 && idx !== TOTAL_CHECKPOINTS - 1) return null;
                  
                  // Find if any user has reached this checkpoint
                  const isReached = participants.some(p => p.currentStep >= idx);
                  
                  return (
                    <G key={idx} transform={`translate(${pt.x},${pt.y})`}>
                      <Circle
                        r={5}
                        fill={isReached ? '#FFD700' : '#ccc'}
                        stroke="#000"
                        strokeWidth={1}
                      />
                      {idx % 10 === 0 && (
                        <SvgText
                          x="0"
                          y="-12"
                          fill={isReached ? '#FFD700' : '#fff'}
                          fontSize="12"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {idx + 1}
                        </SvgText>
                      )}
                    </G>
                  );
                })}
              </Svg>
            ) : null}

            {/* One AnimatedParticipantAvatar per participant */}
            {participants.map((p) => (
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

      {/* Optional title */}
      {showTitle && (
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>Race Challenge</Text>
        </View>
      )}

      {/* Accelerate button for the current user */}
      {currentUser && (
        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.button, isAtEnd && styles.disabledButton]}
            onPress={moveToNextCheckpoint}
            disabled={isAtEnd}
          >
            <Ionicons name="play" size={24} color="#fff" />
            <Text style={styles.buttonText}>Accelerate</Text>
          </Pressable>
        </View>
      )}
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
  trackContainer: { width: CONTENT_WIDTH, position: 'relative' },

  titleContainer: {
    backgroundColor: '#1F1F1F',
    paddingVertical: 12,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: { color: '#fff', fontSize: 20, fontWeight: '700', letterSpacing: 1.1 },

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
  },
  disabledButton: { backgroundColor: '#88AA88', opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },

  // Avatars
  avatar: { position: 'absolute', width: AVATAR_SIZE, height: AVATAR_SIZE },
  avatarGradient: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFrame: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: '#ccc',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: AVATAR_SIZE / 2 },
  currentUserLabel: {
    position: 'absolute',
    top: -22,
    left: -10,
    right: -10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
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
  currentUserNickname: { color: '#FFD700', fontSize: 12, fontWeight: 'bold' },
  nickname: { color: '#fff', fontSize: 10, fontWeight: '500' },
});