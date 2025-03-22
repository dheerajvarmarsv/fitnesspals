import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export interface ChallengeDetails {
  name: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
  globalTimeframe: 'day' | 'week';
  isPrivate: boolean;
}

export interface ActivityRule {
  activityType: string;
  targetValue: number;
  points: number;
  isSelected: boolean;
  isCustom?: boolean;
}
function formatThreshold(value: number, metric: string, useKilometers: boolean = true): string {
    switch (metric) {
      case 'steps':
        return `${value} steps`;
      case 'distance_km':
        // Input and display are both in kilometers
        return useKilometers ? `${value} km` : `${(value * 0.621371).toFixed(2)} miles`;
      case 'distance_miles':
        // Input is in miles, but may need to display in km
        return useKilometers ? `${(value * 1.60934).toFixed(2)} km` : `${value} miles`;
      case 'time':
        return `${value} hours`;
      case 'calories':
        return `${value} calories`;
      case 'count':
        return `${value} count`;
      default:
        return `${value}`;
    }
  }
export interface ModeInfo {
  id: 'race' | 'survival' | 'streak' | 'custom';
  title: string;
  icon: string;        // e.g. could be an emoji "🏁" or a valid icon name like "flag-checkered"
  description: string;
  gradient: string[];  // e.g. ['#FF416C', '#FF4B2B']
}

interface Step4ReviewProps {
  details: ChallengeDetails;
  selectedMode: 'race' | 'survival' | 'streak' | 'custom' | null;
  CHALLENGE_MODES: ModeInfo[];
  activities: ActivityRule[];
  styles: any;
}

// Example icons & gradients for activities
const ACTIVITY_ICONS: { [key: string]: string } = {
  Walking: 'walking',
  Running: 'running',
  Cycling: 'biking',
  Swimming: 'swimmer',
  Workout: 'dumbbell',
  Yoga: 'pray',
  Hiking: 'mountain',
  'Sleep Quality': 'bed',
  Steps: 'shoe-prints',
  Meditation: 'brain',
  'Weight Training': 'dumbbell',
  'Cardio Workout': 'heartbeat',
  'High-Intensity': 'fire',
  Stretching: 'child',
  'Bonus Points': 'star',
  Custom: 'star',
};

const ACTIVITY_GRADIENTS: { [key: string]: string[] } = {
  Walking: ['#4776E6', '#8E54E9'],
  Running: ['#FF416C', '#FF4B2B'],
  Cycling: ['#11998e', '#38ef7d'],
  Swimming: ['#1CB5E0', '#000851'],
  Workout: ['#FF8008', '#FFC837'],
  Yoga: ['#834d9b', '#d04ed6'],
  Hiking: ['#3E5151', '#DECBA4'],
  'Sleep Quality': ['#0F2027', '#203A43'],
  Steps: ['#2193b0', '#6dd5ed'],
  Meditation: ['#5614B0', '#DBD65C'],
  'Weight Training': ['#373B44', '#4286f4'],
  'Cardio Workout': ['#ED213A', '#93291E'],
  'High-Intensity': ['#f12711', '#f5af19'],
  Stretching: ['#4568DC', '#B06AB3'],
  'Bonus Points': ['#8A2387', '#F27121'],
  Custom: ['#654ea3', '#eaafc8'],
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BORDER_WIDTH = 4; // thickness of the animated gradient border

export default function Step4Review({
  details,
  selectedMode,
  CHALLENGE_MODES,
  activities,
}: Step4ReviewProps) {
  // Find the chosen mode; fallback to valid defaults if not found.
  // If the icon is "🏁", we intend to render it as plain text.
  const modeInfo = CHALLENGE_MODES.find((m) => m.id === selectedMode) || {
    icon: 'flag-checkered',
    gradient: ['#ccc', '#999'],
  };

  // If no gradient specified or empty, pick a fallback
  const modeGradient = modeInfo.gradient?.length
    ? modeInfo.gradient
    : ['#654ea3', '#eaafc8'];

  // Create an Animated.Value to run from 0 -> 1 -> 0 in a loop for the animated border.
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(borderAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: false,
          easing: Easing.linear,
        }),
        Animated.timing(borderAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: false,
          easing: Easing.linear,
        }),
      ])
    ).start();
  }, [borderAnim]);

  // Interpolate the animation value to shift the gradient’s start/end.
  const startX = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const endX = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Text style={styles.mainTitle}>Review Your Challenge</Text>
        <Text style={styles.subtitle}>Check the details before creating</Text>

        {/* Outer container for the animated gradient border */}
        <View style={styles.animatedBorderWrapper}>
          <AnimatedLinearGradient
            colors={modeGradient}
            style={styles.animatedBorder}
            start={{ x: startX, y: 0 }}
            end={{ x: endX, y: 0 }}
          >
            {/* The actual card sits inside, inset by BORDER_WIDTH */}
            <View style={styles.cardInner}>
              {/* Header with a solid gradient behind the icon and text */}
              <LinearGradient
                colors={modeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cardHeader}
              >
                <View style={styles.headerIconContainer}>
                  {modeInfo.icon === '🏁' ? (
                    <Text style={styles.emojiIcon}>🏁</Text>
                  ) : (
                    <FontAwesome5 name={modeInfo.icon} size={26} color="#fff" />
                  )}
                </View>
                <View style={styles.headerTextContainer}>
                  <Text style={styles.challengeName}>{details.name}</Text>
                  <Text style={styles.challengeType}>
                    {selectedMode?.toUpperCase()} CHALLENGE
                  </Text>
                </View>
              </LinearGradient>

              {/* Description Section */}
              {details.description ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Description</Text>
                  <Text style={styles.sectionText}>{details.description}</Text>
                </View>
              ) : null}

              {/* Duration Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Duration</Text>
                <View style={styles.detailRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color="#444"
                    style={styles.icon}
                  />
                  <Text style={styles.detailText}>
                    Starts: {details.startDate?.toDateString()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color="#444"
                    style={styles.icon}
                  />
                  <Text style={styles.detailText}>
                    Ends: {details.endDate?.toDateString()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color="#444"
                    style={styles.icon}
                  />
                  <Text style={styles.detailText}>
                    Tracking: {details.globalTimeframe === 'day' ? 'Daily' : 'Weekly'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#444"
                    style={styles.icon}
                  />
                  <Text style={styles.detailText}>
                    {details.isPrivate ? 'Private (Invite Only)' : 'Public'}
                  </Text>
                </View>
              </View>

              {/* Activities Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Activities</Text>
                {activities
                  .filter((a) => a.isSelected)
                  .map((act, idx) => {
                    const activityGradient =
                      ACTIVITY_GRADIENTS[act.activityType] || ['#4A90E2', '#6A11CB'];
                    return (
                      <View key={`${act.activityType}-${idx}`} style={styles.activityItem}>
                        <LinearGradient
                          colors={activityGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.activityIconCircle}
                        >
                          <FontAwesome5
                            name={ACTIVITY_ICONS[act.activityType] || 'star'}
                            size={17}
                            color="#fff"
                          />
                        </LinearGradient>
                        <View style={styles.activityTextContainer}>
                          <Text style={styles.activityName}>{act.activityType}</Text>
                          <Text style={styles.activityMeta}>
  Target: {formatThreshold(act.targetValue, act.metric)} • {act.points} points
</Text>
                        </View>
                      </View>
                    );
                  })}
              </View>
            </View>
          </AnimatedLinearGradient>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 16,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 17,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  animatedBorderWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  animatedBorder: {
    flex: 1,
    borderRadius: 20,
  },
  cardInner: {
    flex: 1,
    backgroundColor: '#fff',
    margin: BORDER_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emojiIcon: {
    fontSize: 26,
    color: '#fff',
  },
  headerTextContainer: {
    flex: 1,
  },
  challengeName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  challengeType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
    marginTop: 2,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.6,
    borderBottomColor: '#ebebeb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 15,
    color: '#555',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  icon: {
    marginRight: 8,
  },
  detailText: {
    fontSize: 15,
    color: '#444',
    flexShrink: 1,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityTextContainer: {
    flex: 1,
  },
  activityName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  activityMeta: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },
});