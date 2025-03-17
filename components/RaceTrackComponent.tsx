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
  Platform,
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
  Image as SvgImage,
  Pattern,
  ClipPath,
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
    (newStep) => {
      if (participant.isCurrentUser) {
        const avatarX = newStep * SPACING + START_OFFSET;
        runOnJS(scrollToPosition)(avatarX);
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
    const yOffset = participant.isCurrentUser ? -5 : AVATAR_SIZE * 0.3;

    return {
      transform: [
        { translateX: x - AVATAR_SIZE / 2 },
        { translateY: y - AVATAR_SIZE / 2 + yOffset },
      ],
      // Increase z-index for current user to ensure they're visible when overlapping
      zIndex: participant.isCurrentUser ? 10 : 5,
    };
  });

  // Styles for participants' avatars
  const containerStyle = [styles.avatar, animatedStyle];
  if (!participant.isCurrentUser) {
    containerStyle.push({ opacity: 0.8 });
  }

  return (
    <Animated.View style={containerStyle}>
      {participant.isCurrentUser ? (
        // Enhanced avatar for current user with pulsing effect
        <View style={styles.currentUserAvatarContainer}>
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
          <View style={styles.pulsingRing} />
        </View>
      ) : (
        // Simple frame for others with reduced opacity
        <View style={styles.avatarFrame}>
          <Image
            source={{ uri: participant.avatar_url }}
            style={styles.avatarImage}
          />
        </View>
      )}

      {/* Better nickname display with background for readability */}
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

  // For auto-scrolling
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

  // Sort participants to ensure current user is drawn last (on top)
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
  const currentUser = participants.find((p) => p.isCurrentUser);

  useEffect(() => {
    if (currentUser && currentUser.currentStep >= totalCheckpoints - 1) {
      setIsAtEnd(true);
    } else {
      setIsAtEnd(false);
    }
  }, [participants, currentUser, totalCheckpoints]);

  // Calculate progress statistics for leaderboard
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

  // Flag image URLs
  const startFlagUrl = 'https://cdn-icons-png.flaticon.com/512/4661/4661344.png'; 
  const finishFlagUrl = 'https://cdn-icons-png.flaticon.com/512/4661/4661344.png';

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      {/* Enhanced Title area with stats and gradient background - NOW AT THE TOP */}
      {showTitle && (
        <LinearGradient
          colors={['#1a2135', '#0f172a']}
          style={styles.titleContainer}
        >
          <View style={styles.titleRow}>
            <Text style={styles.titleText}>Race Challenge</Text>
            <View style={styles.positionBadge}>
              <Text style={styles.positionText}>#{userPosition}</Text>
            </View>
          </View>
          
          {currentUser && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Position</Text>
                <Text style={styles.statValue}>{userPosition}/{totalParticipants}</Text>
              </View>
              
              <View style={styles.statDivider}></View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Checkpoint</Text>
                <Text style={styles.statValue}>{currentUser.currentStep}/{totalCheckpoints-1}</Text>
              </View>
              
              <View style={styles.statDivider}></View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Progress</Text>
                <Text style={styles.statValue}>{completionPercentage}%</Text>
              </View>
            </View>
          )}
          
          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${currentUser ? (currentUser.currentStep / (totalCheckpoints-1)) * 100 : 0}%` }
                ]}
              />
            </View>
          </View>
        </LinearGradient>
      )}

      {/* Enhanced Background with racing theme */}
      <View style={styles.mapContainer}>
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1493244177612-b8749762c2be?auto=format&fit=crop&w=800&q=80' }}
          style={StyleSheet.absoluteFillObject}
          blurRadius={4}
        >
          <View style={styles.backgroundOverlay} />
        </ImageBackground>

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
                  
                  {/* Clip path for the start flag */}
                  <ClipPath id="startFlagClip">
                    <Rect x="-30" y="-30" width="60" height="60" />
                  </ClipPath>
                  
                  {/* Clip path for the finish flag */}
                  <ClipPath id="finishFlagClip">
                    <Rect x="-30" y="-30" width="60" height="60" />
                  </ClipPath>
                </Defs>
                
                {/* Background gradient */}
                <Rect
                  x={0}
                  y={0}
                  width={contentWidth}
                  height={containerHeight * 0.75}
                  fill="#0a192f"
                  opacity={0.7}
                />
                
                {/* Track Shadow for depth */}
                <Path
                  d={svgPath}
                  stroke="#000"
                  strokeWidth={48}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.6}
                />
                
                {/* Main Track with Asphalt Texture - single solid color */}
                <Path
                  d={svgPath}
                  stroke="#333"
                  strokeWidth={42}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Track Borders - White lines on edges */}
                <Path
                  d={svgPath}
                  stroke="#fff"
                  strokeWidth={44}
                  strokeOpacity={0.3}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Dashed center line */}
                <Path
                  d={svgPath}
                  stroke="#fff"
                  strokeWidth={2}
                  strokeDasharray="15,10"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* START Area with enhanced graphics */}
                {trackPoints.length > 0 && (
                  <G
                    transform={`translate(${trackPoints[0].x},${trackPoints[0].y})`}
                  >
                    {/* START - Checkered pattern for start/finish line */}
                    <Rect
                      x="-25"
                      y="-40"
                      width="50"
                      height="80"
                      fill="#000"
                    />
                    <Rect
                      x="-25"
                      y="-40"
                      width="12.5"
                      height="20"
                      fill="#fff"
                    />
                    <Rect
                      x="0"
                      y="-40"
                      width="12.5"
                      height="20"
                      fill="#fff"
                    />
                    <Rect
                      x="-12.5"
                      y="-20"
                      width="12.5"
                      height="20"
                      fill="#fff"
                    />
                    <Rect
                      x="12.5"
                      y="-20"
                      width="12.5"
                      height="20"
                      fill="#fff"
                    />
                    <Rect
                      x="-25"
                      y="0"
                      width="12.5"
                      height="20"
                      fill="#fff"
                    />
                    <Rect
                      x="0"
                      y="0"
                      width="12.5"
                      height="20"
                      fill="#fff"
                    />
                    <Rect
                      x="-12.5"
                      y="20"
                      width="12.5"
                      height="20"
                      fill="#fff"
                    />
                    <Rect
                      x="12.5"
                      y="20"
                      width="12.5"
                      height="20"
                      fill="#fff"
                    />
                    
                    {/* Race flag at start */}
                    <SvgImage
                      href={startFlagUrl}
                      x="-50"
                      y="-70"
                      width="40"
                      height="40"
                      clipPath="url(#startFlagClip)"
                    />
                    
                    {/* Start label */}
                    <G transform="translate(0, 50)">
                      <Rect
                        x="-35"
                        y="-15"
                        width="70"
                        height="30"
                        rx="5"
                        ry="5"
                        fill="rgba(0,0,0,0.7)"
                      />
                      <SvgText
                        x="0"
                        y="5"
                        fill="#fff"
                        fontSize="16"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        START
                      </SvgText>
                    </G>
                  </G>
                )}

                {/* FINISH line with enhanced graphics */}
                {trackPoints.length > totalCheckpoints - 1 && (
                  <G
                    transform={`translate(${
                      trackPoints[totalCheckpoints - 1].x
                    },${trackPoints[totalCheckpoints - 1].y})`}
                  >
                    {/* FINISH - Checkered pattern for finish line */}
                    <Rect
                      x="-25"
                      y="-40"
                      width="50"
                      height="80"
                      fill="#000"
                    />
                    <Rect
                      x="-25"
                      y="-40"
                      width="12.5"
                      height="20"
                      fill="#fff"
                    />
                    <Rect
                      x="0"
                      y="-40"
                      width="12.5"
                      height="20"
                      fill="#fff"
                    />
                    <Rect
                      x="-12.5"
                      y="-20"
                      width="12.5"
                      height="20"
                      fill="#fff"
                    />
                    <Rect
                      x="12.5"
                      y="-20"
                      width="12.5"
                      height="20"
                      fill="#fff"
                    />
                    <Rect
                      x="-25"
                      y="0"
                      width="12.5"
                      height="20"
                      fill="#fff"
                    />
                    <Rect
                      x="0"
                      y="0"
                      width="12.5"
                      height="20"
                      fill="#fff"
                    />
                    <Rect
                      x="-12.5"
                      y="20"
                      width="12.5"
                      height="20"
                      fill="#fff"
                    />
                    <Rect
                      x="12.5"
                      y="20"
                      width="12.5"
                      height="20"
                      fill="#fff"
                    />
                    
                    {/* Race flag at finish */}
                    <SvgImage
                      href={finishFlagUrl}
                      x="10"
                      y="-70"
                      width="40"
                      height="40"
                      clipPath="url(#finishFlagClip)"
                    />
                    
                    {/* Finish label */}
                    <G transform="translate(0, 50)">
                      <Rect
                        x="-35"
                        y="-15"
                        width="70"
                        height="30"
                        rx="5"
                        ry="5"
                        fill="rgba(0,0,0,0.7)"
                      />
                      <SvgText
                        x="0"
                        y="5"
                        fill="#fff"
                        fontSize="16"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        FINISH
                      </SvgText>
                    </G>
                  </G>
                )}

                {/* CHECKPOINTS - Enhanced with color-coding and animations */}
                {trackPoints.map((pt, idx) => {
                  // Calculate checkpoint visibility rules
                  const labelInterval = totalCheckpoints <= 10 ? 1 : 
                    totalCheckpoints <= 20 ? 2 : 
                    totalCheckpoints <= 50 ? 5 : 10;
                  
                  if (idx % labelInterval !== 0 && idx !== 0 && idx !== totalCheckpoints - 1) return null;
                  
                  // Find if any user has reached this checkpoint
                  const isReached = participants.some(p => p.currentStep >= idx);
                  // Find if current user has reached this checkpoint
                  const isUserReached = currentUser && currentUser.currentStep >= idx;
                  
                  // More vibrant colors based on progress
                  const checkpointColor = isUserReached ? '#4ade80' : 
                                          isReached ? '#fbbf24' : 
                                          '#94a3b8';
                                          
                  const labelColor = isUserReached ? '#4ade80' : 
                                     isReached ? '#fbbf24' : 
                                     '#e2e8f0';
                  
                  // Enhanced checkpoint display
                  return (
                    <G key={idx} transform={`translate(${pt.x},${pt.y})`}>
                      {/* Shadow for depth */}
                      <Circle
                        r={7}
                        fill="rgba(0,0,0,0.5)"
                        cx={2}
                        cy={2}
                      />
                      
                      {/* Main checkpoint marker */}
                      <Circle
                        r={6}
                        fill={checkpointColor}
                        stroke="#000"
                        strokeWidth={1}
                      />
                      
                      {/* Inner highlight */}
                      <Circle
                        r={3}
                        fill="#fff"
                        opacity={0.6}
                      />
                      
                      {idx % labelInterval === 0 && (
                        <G transform="translate(0, -18)">
                          <Rect
                            x="-18"
                            y="-12"
                            width="36"
                            height="24"
                            rx="12"
                            ry="12"
                            fill="rgba(0,0,0,0.7)"
                          />
                          <SvgText
                            x="0"
                            y="4"
                            fill={labelColor}
                            fontSize="12"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {idx === 0 ? '' : idx}
                          </SvgText>
                        </G>
                      )}
                    </G>
                  );
                })}
                
                {/* Minor Checkpoints - More subtle markers for intermediate points */}
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
                        r={4}
                        fill={isReached ? '#fbbf24' : '#94a3b8'}
                        stroke="#000"
                        strokeWidth={0.5}
                        opacity={0.8}
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
    </View>
  );
}

const styles = StyleSheet.create({
  // Container
  container: { 
    flex: 1, 
    backgroundColor: '#0f172a', 
    overflow: 'hidden',
    borderRadius: 16,
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
    }),
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
  },
  mapContainer: { 
    flexGrow: 1,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  scrollContent: { 
    minWidth: screenWidth, 
    alignItems: 'center',
  },
  trackContainer: { 
    position: 'relative',
  },

  // Title Area with updated styling - NOW AT THE TOP
  titleContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleText: { 
    color: '#fff', 
    fontSize: 22, 
    fontWeight: '800', 
    letterSpacing: 1, 
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  positionBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  positionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 2,
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },

  // Enhanced Avatar Styling
  avatar: { 
    position: 'absolute', 
    width: AVATAR_SIZE, 
    height: AVATAR_SIZE,
  },
  currentUserAvatarContainer: {
    position: 'relative',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  pulsingRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: AVATAR_SIZE + 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
    opacity: 0.7,
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  avatarImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: AVATAR_SIZE / 2 
  },
  currentUserLabel: {
    position: 'absolute',
    top: -26,
    left: -10,
    right: -10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  nicknameContainer: {
    position: 'absolute',
    top: -22,
    left: -10,
    right: -10,
    backgroundColor: 'rgba(0,0,0,0.7)',
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
  nickname: { 
    color: '#fff', 
    fontSize: 10, 
    fontWeight: '500' 
  },
});