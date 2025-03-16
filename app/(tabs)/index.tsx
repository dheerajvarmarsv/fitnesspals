import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import Svg, { Text as SvgText, LinearGradient as SvgLinearGradient, Stop, Defs } from 'react-native-svg';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../components/UserContext';
import AddActivityModal from '../../components/AddActivityModal';
import CalendarStrip from '../../components/CalendarStrip';
import { getActiveChallengesForUser } from '../../lib/challengeUtils';

const { width } = Dimensions.get('window');

// RANDOM sets for custom activities
const RANDOM_CUSTOM_COLOR_SETS = [
  { light: '#E8EAF6', primary: '#3F51B5', gradient: ['#3F51B5', '#1A237E'], text: '#1A237E' },
  { light: '#FFF3E0', primary: '#FFA726', gradient: ['#FFA726', '#EF6C00'], text: '#EF6C00' },
  { light: '#E0F2F1', primary: '#26A69A', gradient: ['#26A69A', '#004D40'], text: '#004D40' },
  { light: '#FCE4EC', primary: '#F48FB1', gradient: ['#F48FB1', '#AD1457'], text: '#AD1457' },
];

const RANDOM_CUSTOM_ICONS = [
  'alien',
  'chess-knight',
  'dragon',
  'fire-alt',
  'gem',
  'hippo',
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Predefined activity color sets (from AddActivityModal)
const ACTIVITY_COLORS: { 
  [key: string]: { light: string; primary: string; gradient: string[]; text: string }
} = {
  Workout:        { light: '#E1F5FE', primary: '#2196F3', gradient: ['#2196F3', '#0D47A1'], text: '#0D47A1' },
  Steps:          { light: '#E8F5E9', primary: '#4CAF50', gradient: ['#4CAF50', '#1B5E20'], text: '#1B5E20' },
  Sleep:          { light: '#E0F7FA', primary: '#00BCD4', gradient: ['#00BCD4', '#006064'], text: '#006064' },
  'Screen Time':  { light: '#FFF3E0', primary: '#FF9800', gradient: ['#FF9800', '#E65100'], text: '#E65100' },
  'No Sugars':    { light: '#FCE4EC', primary: '#F06292', gradient: ['#F06292', '#880E4F'], text: '#880E4F' },
  'High Intensity': { light: '#FFEBEE', primary: '#F44336', gradient: ['#F44336', '#B71C1C'], text: '#B71C1C' },
  Yoga:           { light: '#F3E5F5', primary: '#9C27B0', gradient: ['#9C27B0', '#4A148C'], text: '#4A148C' },
  Count:          { light: '#ECEFF1', primary: '#607D8B', gradient: ['#607D8B', '#263238'], text: '#263238' },
  Walking:        { light: '#F1F8E9', primary: '#8BC34A', gradient: ['#8BC34A', '#33691E'], text: '#33691E' },
  Running:        { light: '#FFF8E1', primary: '#FFC107', gradient: ['#FFC107', '#FF6F00'], text: '#FF6F00' },
  Cycling:        { light: '#E3F2FD', primary: '#42A5F5', gradient: ['#42A5F5', '#1565C0'], text: '#1565C0' },
  Swimming:       { light: '#E1F5FE', primary: '#29B6F6', gradient: ['#29B6F6', '#01579B'], text: '#01579B' },
  Hiking:         { light: '#DCEDC8', primary: '#9CCC65', gradient: ['#9CCC65', '#33691E'], text: '#33691E' },
  Meditation:     { light: '#EDE7F6', primary: '#7E57C2', gradient: ['#7E57C2', '#4527A0'], text: '#4527A0' },
  'Weight Training': { light: '#EFEBE9', primary: '#8D6E63', gradient: ['#8D6E63', '#3E2723'], text: '#3E2723' },
  'Cardio Workout': { light: '#FFCDD2', primary: '#EF5350', gradient: ['#EF5350', '#B71C1C'], text: '#B71C1C' },
  Custom:         { light: '#E8EAF6', primary: '#3F51B5', gradient: ['#3F51B5', '#1A237E'], text: '#1A237E' },
};

// Predefined activity icons (from AddActivityModal)
const ACTIVITY_ICONS: { [key: string]: string } = {
  Workout: 'dumbbell',
  Steps: 'shoe-prints',
  Sleep: 'bed',
  'Screen Time': 'mobile',
  'No Sugars': 'cookie-bite',
  'High Intensity': 'fire',
  Yoga: 'pray',
  Count: 'hashtag',
  Walking: 'walking',
  Running: 'running',
  Cycling: 'biking',
  Swimming: 'swimmer',
  Hiking: 'mountain',
  Meditation: 'brain',
  'Weight Training': 'dumbbell',
  'Cardio Workout': 'heartbeat',
  Custom: 'star',
};
const getTextWidth = (text) => {
  // Simple estimation - adjust the multiplier based on your font
  return text.length * 20; // Approximately 20 units per character
}
function getColorSetForActivity(activityType: string) {
  const colorSet = ACTIVITY_COLORS[activityType];
  if (colorSet) return colorSet;
  return pickRandom(RANDOM_CUSTOM_COLOR_SETS);
}

function getIconForActivity(activityType: string) {
  if (ACTIVITY_ICONS[activityType]) return ACTIVITY_ICONS[activityType];
  return pickRandom(RANDOM_CUSTOM_ICONS);
}

const theme = {
  colors: {
    background: '#ffffff',
    primary: '#4A90E2',
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
    warningBanner: {
      background: '#FEE2E2',
      text: '#DC2626',
    },
  },
  typography: {
    fontFamily: Platform.select({
      ios: 'SF Pro',
      android: 'Roboto',
      default: 'Inter',
    }),
    sizes: {
      greeting: 32,
      widgetTitle: 16,
      widgetValue: 28,
      warningText: 16,
    },
    weights: {
      greeting: '700' as '700',
      widgetTitle: '600' as '600',
      widgetValue: '700' as '700',
    },
  },
  spacing: {
    small: 8,
    medium: 16,
    large: 24,
  },
  borderRadius: {
    card: 16,
    warningBanner: 16,
  },
};

const NOISE_SQUARES = Array.from({ length: 150 }).map((_, i) => ({
  key: i,
  top: Math.random() * 100,
  left: Math.random() * 100,
}));

function NoiseOverlay() {
  return (
    <View style={StyleSheet.absoluteFill}>
      {NOISE_SQUARES.map((sq) => (
        <View
          key={sq.key}
          style={{
            position: 'absolute',
            top: `${sq.top}%`,
            left: `${sq.left}%`,
            width: 1,
            height: 1,
            backgroundColor: 'rgba(0,0,0,0.02)',
          }}
        />
      ))}
    </View>
  );
}

function SingleLinearGradientBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[theme.colors.background, theme.colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <NoiseOverlay />
    </View>
  );
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

function isFutureDay(date: Date, today: Date) {
  if (date.getFullYear() > today.getFullYear()) return true;
  if (date.getFullYear() < today.getFullYear()) return false;
  if (date.getMonth() > today.getMonth()) return true;
  if (date.getMonth() < today.getMonth()) return false;
  return date.getDate() > today.getDate();
}

async function fetchActivitiesByDate(userId: string, date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startOfDay.toISOString())
    .lt('created_at', endOfDay.toISOString())
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching activities by date:', error);
    throw new Error(error.message);
  }
  return data || [];
}

async function fetchActivitySummaryByDate(userId: string, date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  const { data, error } = await supabase
    .from('activities')
    .select('duration, distance, calories, steps, activity_type')
    .eq('user_id', userId)
    .gte('created_at', startOfDay.toISOString())
    .lt('created_at', endOfDay.toISOString());
  if (error) {
    console.error('Error fetching summary:', error);
    throw new Error(error.message);
  }
  let steps = 0, duration = 0, distance = 0, calories = 0;
  (data || []).forEach((act) => {
    if (act.steps) steps += act.steps;
    if (act.duration) duration += act.duration;
    if (act.distance) distance += act.distance;
    if (act.calories) calories += act.calories;
  });
  return { steps, distance, duration, calories };
}

function formatMetricValue(activity: any, useKilometers: boolean): string {
  let displayValue = '';
  switch (activity.metric) {
    case 'time':
      if (activity.duration) displayValue = `${activity.duration} min`;
      break;
    case 'distance_km':
      if (activity.distance !== null) {
        if (useKilometers) {
          displayValue = `${activity.distance.toFixed(2)} km`;
        } else {
          const miles = activity.distance * 0.621371;
          displayValue = `${miles.toFixed(2)} mi`;
        }
      }
      break;
    case 'distance_miles':
      if (activity.distance !== null) {
        const miles = activity.distance * 0.621371;
        displayValue = `${miles.toFixed(2)} mi`;
      }
      break;
    case 'calories':
      if (activity.calories) displayValue = `${activity.calories} cal`;
      break;
    case 'steps':
      if (activity.steps) displayValue = `${activity.steps} steps`;
      break;
    case 'count':
      if (activity.count) displayValue = `${activity.count} count`;
      break;
    default:
      displayValue = 'No data';
      break;
  }
  return displayValue;
}

export default function HomeScreen() {
  const router = useRouter();
  const { settings, isOnline } = useUser();

  const [activeChallenges, setActiveChallenges] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitySummary, setActivitySummary] = useState({
    steps: 0,
    distance: 0,
    duration: 0,
    calories: 0,
  });
  const [showAllChallenges, setShowAllChallenges] = useState(false);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const today = new Date();
  const onToday = isSameDay(selectedDate, today);

  const loadHomeData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        setLoading(false);
        return;
      }
      const userChallenges = await getActiveChallengesForUser(user.id);
      setActiveChallenges(Array.isArray(userChallenges) ? userChallenges : []);
      if (isFutureDay(selectedDate, today)) {
        setActivitySummary({ steps: 0, distance: 0, duration: 0, calories: 0 });
        setActivities([]);
      } else {
        const summary = await fetchActivitySummaryByDate(user.id, selectedDate);
        setActivitySummary(summary);
        const dayActivities = await fetchActivitiesByDate(user.id, selectedDate);
        setActivities(dayActivities);
      }
    } catch (err: any) {
      console.error('Error loading home data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  const renderedChallenges = showAllChallenges ? activeChallenges : activeChallenges.slice(0, 3);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <SingleLinearGradientBackground />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={theme.colors.text.primary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  function renderActivitiesCarousel() {
    if (activities.length === 0) {
      return (
        <View style={styles.emptyStateWrapper}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={60} tint="light" style={styles.card}>
              <View style={styles.emptyContent}>
                <Ionicons
                  name="fitness-outline"
                  size={40}
                  color={theme.colors.text.secondary}
                  style={{ marginBottom: 12 }}
                />
                {isFutureDay(selectedDate, today) ? (
                  <>
                    <Text style={styles.emptyTitle}>No data (future date)</Text>
                    <Text style={styles.emptyText}>
                      You can't add or view future activities.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.emptyTitle}>
                      No activities{onToday ? ' yet' : ''}
                    </Text>
                    <Text style={styles.emptyText}>
                      {onToday
                        ? 'Start your fitness journey by adding your first activity!'
                        : 'No activities were logged on this date.'}
                    </Text>
                  </>
                )}
              </View>
            </BlurView>
          ) : (
            <View style={[styles.card, styles.androidShadow]}>
              <View style={styles.emptyContent}>
                <Ionicons
                  name="fitness-outline"
                  size={40}
                  color={theme.colors.text.secondary}
                  style={{ marginBottom: 12 }}
                />
                {isFutureDay(selectedDate, today) ? (
                  <>
                    <Text style={styles.emptyTitle}>No data (future date)</Text>
                    <Text style={styles.emptyText}>
                      You can't add or view future activities.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.emptyTitle}>
                      No activities{onToday ? ' yet' : ''}
                    </Text>
                    <Text style={styles.emptyText}>
                      {onToday
                        ? 'Start your fitness journey by adding your first activity!'
                        : 'No activities were logged on this date.'}
                    </Text>
                  </>
                )}
              </View>
            </View>
          )}
        </View>
      );
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.activitiesHorizontalScroll}
      >
        {activities.map((activity) => {
          const type = activity.activity_type || 'Custom';
          const colorSet = ACTIVITY_COLORS[type] ?? pickRandom(RANDOM_CUSTOM_COLOR_SETS);
          const iconName = ACTIVITY_ICONS[type] ?? pickRandom(RANDOM_CUSTOM_ICONS);
          const metricValue = formatMetricValue(activity, settings.useKilometers);
          return (
            <LinearGradient
              key={activity.id}
              colors={colorSet.gradient}
              style={styles.activitySquareCard}
            >
              <FontAwesome5 name={iconName} size={34} color="#fff" style={{ marginBottom: 8 }} />
              <Text style={[styles.activitySquareTitle, { color: '#fff' }]}>
                {type}
              </Text>
              <Text style={[styles.activitySquareValue, { color: '#fff' }]}>{metricValue}</Text>
            </LinearGradient>
          );
        })}
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <SingleLinearGradientBackground />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[0]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.text.primary}
            colors={[theme.colors.text.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.stickyHeader}>
          <View style={styles.topHeader}>
            <Text style={styles.appName}>CTP</Text>
            <View style={styles.syncContainer}>
              <View style={styles.syncStatus}>
                <View style={[styles.statusDot, !isOnline && { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.syncText}>
                  {isOnline ? 'Updated Now' : 'Offline'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.gradientButtonWrapper}
                onPress={onRefresh}
                disabled={refreshing}
              >
                <LinearGradient
                  colors={['#E0E0E0', '#E0E0E0']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Ionicons name={refreshing ? 'sync' : 'sync-outline'} size={20} color="#000" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.bottomHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
  <Text style={[styles.greeting, { color: '#000000' }]}>Hello, </Text>
  <View>
    <Svg height="40" width={getTextWidth(settings.nickname || 'Friend')}>
      <Defs>
        <SvgLinearGradient id="nameGradient" x1="0" y1="0" x2="100%" y2="0">
          <Stop offset="0" stopColor="#F58529" />
          <Stop offset="0.33" stopColor="#DD2A7B" />
          <Stop offset="0.66" stopColor="#8134AF" />
          <Stop offset="1" stopColor="#515BD4" />
        </SvgLinearGradient>
      </Defs>
      <SvgText
        fill="url(#nameGradient)"
        fontSize={theme.typography.sizes.greeting}
        fontWeight={theme.typography.weights.greeting}
        x="0"
        y="30"
        fontFamily={theme.typography.fontFamily}
      >
        {settings.nickname || 'Friend'}
      </SvgText>
    </Svg>
  </View>
</View>
            <Text style={styles.dashboardTitle}>Your Dashboard</Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <View style={styles.errorContent}>
              <Ionicons name="alert-circle-outline" size={22} color={theme.colors.warningBanner.text} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          </View>
        )}

        <View style={styles.calendarContainer}>
          <CalendarStrip
            selectedDate={selectedDate}
            onDateSelect={(date) => setSelectedDate(date)}
            style={{ height: 100, paddingBottom: 10 }}
            calendarAnimation={{ type: 'sequence', duration: 30 }}
            daySelectionAnimation={{
              type: 'background',
              duration: 200,
              highlightColor: theme.colors.primary,
            }}
          />
        </View>

        {/* Activity Summary */}
        <View style={[styles.section, { marginBottom: theme.spacing.small }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Activity Summary</Text>
            <TouchableOpacity
              style={[styles.gradientButtonWrapper, !onToday && { opacity: 0.5 }]}
              onPress={() => {
                if (onToday) setShowAddActivityModal(true);
              }}
              disabled={!onToday}
            >
              <LinearGradient
                colors={['#E0E0E0', '#E0E0E0']}
                style={styles.gradientButton}
              >
                <Ionicons name="add" size={18} color="#000" style={{ marginRight: 6 }} />
                <Text style={[styles.gradientButtonText, { color: '#000' }]}>Add Activity</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <View style={[styles.summaryCardWrapper, styles.androidShadow]}>
            <View style={styles.activitySummaryContainer}>
              <View style={styles.activityStatItem}>
                <View style={[styles.activityStatIconContainer, { backgroundColor: 'rgba(74,144,226,0.1)' }]}>
                  <Ionicons name="walk" size={28} color="#4A90E2" />
                </View>
                <Text style={styles.activityStatValue}>{activitySummary.steps}</Text>
                <Text style={styles.activityStatLabel}>steps</Text>
              </View>
              <View style={styles.activityStatItem}>
                <View style={[styles.activityStatIconContainer, { backgroundColor: 'rgba(80,200,120,0.1)' }]}>
                  <Ionicons name="pin" size={28} color="#50C878" />
                </View>
                <Text style={styles.activityStatValue}>
                  {settings.useKilometers
                    ? `${activitySummary.distance.toFixed(2)} km`
                    : `${(activitySummary.distance * 0.621371).toFixed(2)} mi`}
                </Text>
                <Text style={styles.activityStatLabel}>distance</Text>
              </View>
              <View style={styles.activityStatItem}>
                <View style={[styles.activityStatIconContainer, { backgroundColor: 'rgba(156,106,222,0.1)' }]}>
                  <Ionicons name="time" size={28} color="#9C6ADE" />
                </View>
                <Text style={styles.activityStatValue}>
                  {(activitySummary.duration / 60).toFixed(1)}
                </Text>
                <Text style={styles.activityStatLabel}>hours</Text>
              </View>
              <View style={styles.activityStatItem}>
                <View style={[styles.activityStatIconContainer, { backgroundColor: 'rgba(245,166,35,0.1)' }]}>
                  <Ionicons name="flame" size={28} color="#F5A623" />
                </View>
                <Text style={styles.activityStatValue}>{activitySummary.calories}</Text>
                <Text style={styles.activityStatLabel}>cal</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Today's Logged Activities */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { marginBottom: theme.spacing.small }]}>
            Today's Logged Activities
          </Text>
          {renderActivitiesCarousel()}
        </View>

        {/* Challenges */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Challenges</Text>
            <TouchableOpacity
              style={[styles.gradientButtonWrapper]}
              onPress={() => router.push('/joinchallenges/joincreate')}
            >
              <LinearGradient
                colors={['#E0E0E0', '#E0E0E0']}
                style={styles.gradientButton}
              >
                <Text style={[styles.gradientButtonText, { color: '#000' }]}>Join / Create</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          {activeChallenges.length === 0 ? (
            <View style={styles.emptyStateWrapper}>
              {Platform.OS === 'ios' ? (
                <BlurView intensity={60} tint="light" style={styles.card}>
                  <View style={styles.emptyContent}>
                    <Ionicons
                      name="trophy-outline"
                      size={40}
                      color={theme.colors.text.secondary}
                      style={{ marginBottom: 12 }}
                    />
                    <Text style={styles.emptyTitle}>No active challenges</Text>
                    <Text style={styles.emptyText}>
                      Join a challenge or create your own to compete with friends!
                    </Text>
                    <TouchableOpacity
                      style={[styles.gradientButtonWrapper, { marginTop: theme.spacing.medium }]}
                      onPress={() => router.push('/joinchallenges/joincreate')}
                    >
                      <LinearGradient
                        colors={['#E0E0E0', '#E0E0E0']}
                        style={styles.gradientButton}
                      >
                        <Text style={[styles.gradientButtonText, { color: '#000' }]}>Join / Create</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </BlurView>
              ) : (
                <View style={[styles.card, styles.androidShadow]}>
                  <View style={styles.emptyContent}>
                    <Ionicons
                      name="trophy-outline"
                      size={40}
                      color={theme.colors.text.secondary}
                      style={{ marginBottom: 12 }}
                    />
                    <Text style={styles.emptyTitle}>No active challenges</Text>
                    <Text style={styles.emptyText}>
                      Join a challenge or create your own to compete with friends!
                    </Text>
                    <TouchableOpacity
                      style={[styles.gradientButtonWrapper, { marginTop: theme.spacing.medium }]}
                      onPress={() => router.push('/joinchallenges/joincreate')}
                    >
                      <LinearGradient
                        colors={['#E0E0E0', '#E0E0E0']}
                        style={styles.gradientButton}
                      >
                        <Text style={[styles.gradientButtonText, { color: '#000' }]}>Join / Create</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <>
              {renderedChallenges.map((challenge) => (
                <View key={challenge.id} style={styles.activityCardWrapper}>
                  {Platform.OS === 'ios' ? (
                    <TouchableOpacity
                      onPress={() =>
                        router.push(`/joinchallenges/challengedetails?challenge_id=${challenge.id}`)
                      }
                    >
                      <BlurView intensity={60} tint="light" style={styles.card}>
                        <View style={styles.challengeCard}>
                          <View style={styles.challengeHeader}>
                            <Text style={styles.challengeTitle}>{challenge.title}</Text>
                            <View style={styles.challengeTypeBadge}>
                              <Text style={styles.challengeTypeText}>
                                {challenge.challenge_type?.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.challengeMeta}>
                            {new Date(challenge.start_date).toLocaleDateString()} -{' '}
                            {challenge.end_date
                              ? new Date(challenge.end_date).toLocaleDateString()
                              : 'Open-ended'}
                          </Text>
                          <Text style={styles.challengeMeta}>
                            {challenge.participant_count || 0} participant(s)
                          </Text>
                        </View>
                      </BlurView>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() =>
                        router.push(`/joinchallenges/challengedetails?challenge_id=${challenge.id}`)
                      }
                      style={[styles.card, styles.androidShadow]}
                    >
                      <View style={styles.challengeCard}>
                        <View style={styles.challengeHeader}>
                          <Text style={styles.challengeTitle}>{challenge.title}</Text>
                          <View style={styles.challengeTypeBadge}>
                            <Text style={styles.challengeTypeText}>
                              {challenge.challenge_type?.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.challengeMeta}>
                          {new Date(challenge.start_date).toLocaleDateString()} -{' '}
                          {challenge.end_date
                            ? new Date(challenge.end_date).toLocaleDateString()
                            : 'Open-ended'}
                        </Text>
                        <Text style={styles.challengeMeta}>
                          {challenge.participant_count || 0} participant(s)
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {activeChallenges.length > 3 && !showAllChallenges && (
                <TouchableOpacity
                  style={[styles.gradientButtonWrapper, { alignSelf: 'center', marginTop: 16 }]}
                  onPress={() => setShowAllChallenges(true)}
                >
                  <LinearGradient
                    colors={['#E0E0E0', '#E0E0E0']}
                    style={styles.gradientButton}
                  >
                    <Text style={[styles.gradientButtonText, { color: '#000' }]}>View All Challenges</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <AddActivityModal
        visible={showAddActivityModal}
        onClose={() => setShowAddActivityModal(false)}
        onSaveComplete={loadHomeData}
        selectedDate={selectedDate}
      />
    </View>
  );
}

function getSquareSize() {
  return Math.min(160, (width - 64) / 3);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.large * 3,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: theme.typography.sizes.widgetTitle,
    color: theme.colors.text.secondary,
  },
  stickyHeader: {
    backgroundColor: theme.colors.background,
    paddingTop: 50,
    paddingBottom: theme.spacing.medium,
    paddingHorizontal: theme.spacing.large,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.small,
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
    color: theme.colors.text.primary,
    textTransform: 'uppercase',
  },
  syncContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncStatus: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
    marginRight: 6,
  },
  syncText: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  gradientButtonWrapper: {
    borderRadius: theme.borderRadius.card,
    overflow: 'hidden',
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  gradientButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 14,
  },
  bottomHeader: {
    marginTop: theme.spacing.small,
  },
  greeting: {
    fontSize: theme.typography.sizes.greeting,
    fontWeight: theme.typography.weights.greeting,
    backgroundColor: 'transparent',
    textAlign: 'center',
    color: '#F58529', // Using the starting gradient color as a static fallback
  },
  dashboardTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  errorBanner: {
    marginHorizontal: theme.spacing.medium,
    marginBottom: theme.spacing.small,
    borderRadius: theme.borderRadius.warningBanner,
    overflow: 'hidden',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warningBanner.background,
    padding: 16,
  },
  errorText: {
    color: theme.colors.warningBanner.text,
    marginLeft: 8,
    flex: 1,
  },
  calendarContainer: {
    marginHorizontal: theme.spacing.medium,
    marginBottom: theme.spacing.medium,
  },
  section: {
    marginBottom: theme.spacing.large,
    paddingHorizontal: theme.spacing.medium,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.small,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text.primary,
    letterSpacing: 0.5,
  },
  summaryCardWrapper: {
    borderRadius: theme.borderRadius.card,
    overflow: 'hidden',
    marginBottom: theme.spacing.medium,
  },
  androidShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  activitySummaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: theme.borderRadius.card,
    padding: theme.spacing.medium,
  },
  activityStatItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  activityStatIconContainer: {
    borderRadius: 30,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  activityStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  activityStatLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  activitiesHorizontalScroll: {
    paddingVertical: theme.spacing.small,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.small,
  },
  activitySquareCard: {
    width: Math.min(120, (width - 64) / 3),
    height: Math.min(120, (width - 64) / 3),
    borderRadius: theme.borderRadius.card,
    marginRight: theme.spacing.small,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.small,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  activitySquareTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  activitySquareValue: {
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#F5F8FF',
    borderRadius: theme.borderRadius.card,
  },
  emptyStateWrapper: {
    borderRadius: theme.borderRadius.card,
    overflow: 'hidden',
    marginTop: theme.spacing.small,
  },
  emptyContent: {
    alignItems: 'center',
    padding: theme.spacing.large,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginHorizontal: theme.spacing.small,
  },
  activityCardWrapper: {
    marginBottom: theme.spacing.small,
    borderRadius: theme.borderRadius.card,
    overflow: 'hidden',
  },
  challengeCard: {
    padding: theme.spacing.medium,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  challengeTypeBadge: {
    backgroundColor: 'rgba(82, 130, 255, 0.2)', // Light blue bg for badge
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  challengeTypeText: {
    color: '#4067E3', // Medium blue text within badge
    fontSize: 12,
    fontWeight: '600',
  },
  challengeMeta: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
});