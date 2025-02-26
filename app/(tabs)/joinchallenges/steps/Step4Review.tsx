// app/(tabs)/joinchallenges/steps/Step4Review.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FontAwesome5 } from '@expo/vector-icons';

export interface ChallengeDetails {
  name: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
  isOpenEnded: boolean;
  globalTimeframe: 'day' | 'week';
  isPrivate: boolean;
}

export interface ActivityRule {
  activityType: string;
  threshold: string;
  points: number;
  isSelected: boolean;
  isCustom?: boolean;
}

export interface ModeInfo {
  id: 'race' | 'survival' | 'streak' | 'custom';
  title: string;
  icon: string;
  description: string;
  gradient: string[];
}

interface Step4ReviewProps {
  details: ChallengeDetails;
  selectedMode: 'race' | 'survival' | 'streak' | 'custom' | null;
  CHALLENGE_MODES: ModeInfo[];
  activities: ActivityRule[];
  styles: any;
}

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

export default function Step4Review({
  details,
  selectedMode,
  CHALLENGE_MODES,
  activities,
  styles,
}: Step4ReviewProps) {
  const modeInfo = CHALLENGE_MODES.find((m) => m.id === selectedMode) || { icon: '' };

  return (
    <View style={styles.reviewContainer}>
      <Text style={styles.mainTitle}>Review Your Challenge</Text>
      <Text style={styles.subtitle}>Check the details before creating</Text>
      <LinearGradient
        colors={['#4776E6', '#8E54E9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.reviewCardGradient}
      >
        <View style={styles.reviewCard}>
          <View style={styles.reviewSection}>
            <View style={styles.reviewHeader}>
              <View
                style={[
                  styles.reviewIcon,
                  selectedMode === 'race'
                    ? { backgroundColor: '#FF416C' }
                    : selectedMode === 'survival'
                    ? { backgroundColor: '#4776E6' }
                    : selectedMode === 'streak'
                    ? { backgroundColor: '#FF8008' }
                    : { backgroundColor: '#11998e' },
                ]}
              >
                <Text style={styles.reviewIconText}>{modeInfo.icon}</Text>
              </View>
              <View style={styles.reviewHeaderText}>
                <Text style={styles.reviewTitle}>{details.name}</Text>
                <Text style={styles.reviewType}>
                  {selectedMode?.toUpperCase()} CHALLENGE
                </Text>
              </View>
            </View>
          </View>

          {details.description ? (
            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>DESCRIPTION</Text>
              <Text style={styles.reviewDescription}>{details.description}</Text>
            </View>
          ) : null}

          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>DURATION</Text>
            <View style={styles.reviewDetail}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.reviewDetailText}>
                Starts: {details.startDate?.toDateString()}
              </Text>
            </View>
            <View style={styles.reviewDetail}>
              <Ionicons name="calendar-outline" size={20} color="#666" />
              <Text style={styles.reviewDetailText}>
                {details.isOpenEnded
                  ? 'No end date (open-ended)'
                  : `Ends: ${details.endDate?.toDateString()}`}
              </Text>
            </View>
            <View style={styles.reviewDetail}>
              <Ionicons name="time-outline" size={20} color="#666" />
              <Text style={styles.reviewDetailText}>
                Tracking: {details.globalTimeframe === 'day' ? 'Daily' : 'Weekly'}
              </Text>
            </View>
            <View style={styles.reviewDetail}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" />
              <Text style={styles.reviewDetailText}>
                {details.isPrivate ? 'Private (Invite Only)' : 'Public'}
              </Text>
            </View>
          </View>

          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>ACTIVITIES</Text>
            {activities
              .filter((a) => a.isSelected)
              .map((act, idx) => (
                <View key={`${act.activityType}-${idx}`} style={styles.activityReview}>
                  <View
                    style={[
                      styles.activityIconCircle,
                      { backgroundColor: ACTIVITY_GRADIENTS[act.activityType]?.[0] || '#4A90E2' },
                    ]}
                  >
                    <FontAwesome5
                      name={ACTIVITY_ICONS[act.activityType] || 'star'}
                      size={16}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.activityReviewDetail}>
                    <Text style={styles.activityReviewName}>{act.activityType}</Text>
                    <Text style={styles.activityReviewMeta}>
                      Target: {act.threshold} • {act.points} points
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}