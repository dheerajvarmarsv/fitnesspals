import React, { useEffect, useState, useRef } from 'react';
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
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import Svg, {
  Path,
  Circle,
  Text as SvgText,
  G,
  Polygon,
  Defs,
  LinearGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

/* ----- CONFIG & CONSTANTS ----- */
const AVATAR_SIZE = 36;
const STEP_DURATION = 600;
const TOTAL_CHECKPOINTS = 100;
const SPACING = 80;

// Extra offset so there's space before the start line and after the finish line
const START_OFFSET = 100;
const END_OFFSET = 100;

// Total width for the horizontal track (with left & right padding)
const CONTENT_WIDTH =
  SPACING * (TOTAL_CHECKPOINTS - 1) + START_OFFSET + END_OFFSET + 50;

const screenWidth = Dimensions.get('window').width;

// Use any avatar image you like
const avatarUri = 'https://cdn-icons-png.flaticon.com/512/147/147144.png';

/* ----- HELPER FUNCTIONS ----- */

/** 
 * Generate 100 track checkpoints. 
 * Each point has an x (horizontal) and y (vertical) coordinate.
 * We add START_OFFSET so there's extra space on the left,
 * and the sine wave gives a winding road effect.
 */
function generateTrackPoints(containerHeight: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const amplitude = containerHeight * 0.15; // wave amplitude
  const baseY = containerHeight / 2;       // center line
  for (let i = 0; i < TOTAL_CHECKPOINTS; i++) {
    const x = i * SPACING + START_OFFSET;
    const y = baseY + Math.sin(i / 5) * amplitude;
    points.push({ x, y });
  }
  return points;
}

/** 
 * Convert array of points into a smooth cubic path for the SVG <Path>. 
 */
function createPathFromCheckpoints(pts: { x: number; y: number }[]): string {
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

/* ----- MAIN COMPONENT ----- */

export default function App() {
  const [containerHeight, setContainerHeight] = useState(300);
  const [trackPoints, setTrackPoints] = useState<{ x: number; y: number }[]>([]);
  const [svgPath, setSvgPath] = useState('');

  // We no longer read currentStep.value directly in the render
  // to avoid the Reanimated warning.
  const currentStep = useSharedValue(0);

  // We'll keep a simple boolean in state to know if we've reached the end
  const [isAtEnd, setIsAtEnd] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  /* SCROLLING THE VIEW TO KEEP AVATAR CENTERED */
  const scrollToAvatar = (avatarX: number) => {
    if (scrollViewRef.current) {
      // Scroll so that the avatar is roughly centered
      const targetScroll = Math.max(0, avatarX - screenWidth / 2 + AVATAR_SIZE / 2);
      scrollViewRef.current.scrollTo({ x: targetScroll, animated: true });
    }
  };

  // Reanimated reaction to track changes in currentStep.value
  // 1) Scroll to keep avatar visible
  // 2) Update isAtEnd in normal React state
  useAnimatedReaction(
    () => currentStep.value,
    (stepValue) => {
      const avatarX = stepValue * SPACING + START_OFFSET;
      runOnJS(scrollToAvatar)(avatarX);

      // If we've reached or passed the final checkpoint
      runOnJS(setIsAtEnd)(stepValue >= TOTAL_CHECKPOINTS - 1);
    }
  );

  /* LAYOUT: Once we know the track container height, generate points + path */
  function onTrackContainerLayout(e: LayoutChangeEvent) {
    const { height } = e.nativeEvent.layout;
    setContainerHeight(height);

    const pts = generateTrackPoints(height);
    setTrackPoints(pts);
    setSvgPath(createPathFromCheckpoints(pts));
  }

  /* AVATAR ANIMATION */
  const avatarStyle = useAnimatedStyle(() => {
    if (trackPoints.length === 0) {
      return { transform: [{ translateX: 0 }, { translateY: 0 }] };
    }
    const i = Math.floor(currentStep.value);
    const progress = currentStep.value - i;
    const currentPoint = trackPoints[i];
    const nextPoint = trackPoints[Math.min(i + 1, trackPoints.length - 1)];

    const x = currentPoint.x + (nextPoint.x - currentPoint.x) * progress;
    const y = currentPoint.y + (nextPoint.y - currentPoint.y) * progress;
    return {
      transform: [
        { translateX: x - AVATAR_SIZE / 2 },
        { translateY: y - AVATAR_SIZE / 2 },
        { scale: 1.1 },
      ],
    };
  });

  /* BUTTON HANDLERS */
  const moveToNextCheckpoint = () => {
    // Only move if we haven't reached the end
    if (!isAtEnd) {
      currentStep.value = withTiming(currentStep.value + 1, {
        duration: STEP_DURATION,
        easing: Easing.inOut(Easing.ease),
      });
    }
  };

  const resetTrack = () => {
    currentStep.value = withTiming(0, {
      duration: STEP_DURATION / 2,
      easing: Easing.inOut(Easing.ease),
    });
  };

  // Reset on mount
  useEffect(() => {
    resetTrack();
  }, []);

  return (
    <View style={styles.container}>
      {/* A subtle jungle-themed background image */}
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1572372896847-b1e90e88739a?auto=format&fit=crop&w=800&q=80',
        }}
        resizeMode="cover"
        style={StyleSheet.absoluteFillObject}
        blurRadius={2}
      />

      {/* MAP AREA (Fixed Height) */}
      <View style={styles.mapContainer}>
        <ScrollView
          horizontal
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsHorizontalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.trackContainer} onLayout={onTrackContainerLayout}>
            {svgPath ? (
              <Svg width={CONTENT_WIDTH} height={containerHeight}>
                <Defs>
                  <LinearGradient id="roadGradient" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#444" stopOpacity="1" />
                    <Stop offset="1" stopColor="#222" stopOpacity="1" />
                  </LinearGradient>
                </Defs>
                {/* "Grass" overlay */}
                <Rect
                  x={0}
                  y={0}
                  width={CONTENT_WIDTH}
                  height={containerHeight}
                  fill="#2e7d32"
                  opacity={0.3}
                />

                {/* Thick outline */}
                <Path
                  d={svgPath}
                  stroke="#000"
                  strokeWidth={40}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Gradient fill */}
                <Path
                  d={svgPath}
                  stroke="url(#roadGradient)"
                  strokeWidth={34}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* White dashed center line */}
                <Path
                  d={svgPath}
                  stroke="#fff"
                  strokeWidth={2}
                  strokeDasharray="10,8"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* START */}
                {trackPoints.length > 0 && (
                  <G
                    transform={`translate(${trackPoints[0].x},${trackPoints[0].y})`}
                  >
                    <Polygon
                      points="-25,-8 25,-8 25,8 -25,8"
                      fill="#fff"
                      stroke="#000"
                      strokeWidth={2}
                    />
                    <SvgText
                      x="0"
                      y="30"
                      fill="#fff"
                      fontSize="16"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      START
                    </SvgText>
                  </G>
                )}

                {/* FINISH */}
                {trackPoints.length > 0 && (
                  <G
                    transform={`translate(${
                      trackPoints[TOTAL_CHECKPOINTS - 1].x
                    },${trackPoints[TOTAL_CHECKPOINTS - 1].y})`}
                  >
                    <Polygon
                      points="-25,-8 25,-8 25,8 -25,8"
                      fill="#222"
                      stroke="#fff"
                      strokeWidth={2}
                    />
                    <SvgText
                      x="0"
                      y="30"
                      fill="#fff"
                      fontSize="16"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      FINISH
                    </SvgText>
                  </G>
                )}

                {/* CHECKPOINTS */}
                {trackPoints.map((pt, idx) => {
                  const isReached = idx <= Math.floor(currentStep.value);
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

            {/* AVATAR */}
            <Animated.View style={[styles.avatar, avatarStyle]}>
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            </Animated.View>
          </View>
        </ScrollView>
      </View>

      {/* TITLE BELOW THE MAP */}
      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>Epic 100-Checkpoint Race</Text>
      </View>

      {/* BOTTOM BUTTONS */}
      <View style={styles.buttonsContainer}>
        <Pressable
          style={[styles.button, isAtEnd && styles.disabledButton]}
          onPress={moveToNextCheckpoint}
          disabled={isAtEnd}
        >
          <Ionicons name="play" size={24} color="#fff" />
          <Text style={styles.buttonText}>Accelerate</Text>
        </Pressable>

        <Pressable style={[styles.button, styles.resetButton]} onPress={resetTrack}>
          <Ionicons name="refresh" size={24} color="#fff" />
          <Text style={styles.buttonText}>Reset</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ----- STYLES ----- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101010',
  },

  // Map area: fix the height so the user sees a horizontal track
  mapContainer: {
    height: 300,
    // optional: add some margin or spacing if desired
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    // minWidth ensures we don't get black edges if track is narrower
    minWidth: screenWidth,
    alignItems: 'center',
  },
  trackContainer: {
    width: CONTENT_WIDTH,
    height: '100%',
    position: 'relative',
  },

  titleContainer: {
    backgroundColor: '#1F1F1F',
    paddingVertical: 12,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    // A subtle shadow or elevation
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  titleText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 1.1,
  },

  buttonsContainer: {
    height: 80,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-around',
    backgroundColor: '#101010',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#88AA88',
    opacity: 0.7,
  },
  resetButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  avatar: {
    position: 'absolute',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 5,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
});