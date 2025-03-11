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
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import SharedLayout from '../../components/SharedLayout';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../components/UserContext';
import AddActivityModal from '../../components/AddActivityModal';
import ActivitySummary from '../../components/ActivitySummary';
import { getActiveChallengesForUser } from '../../lib/challengeUtils';

const { width } = Dimensions.get('window');

// --- Light Mode UI tokens ---
// --- Light Mode UI tokens ---
const theme = {
  colors: {
    gradientBackground: ['#E6F2FF', '#BCD6FF', '#007AFF'],
    gradientButton:  ['#4895EF', '#3A56D4'],
    primary: '#007AFF',            // Vibrant Blue for progress indicators and CTAs
    background: '#FFFFFF',           // Clean white background
    glassCardBg: '#E6F2FF',          // Light blue for cards
    glassBorder: 'rgba(255,255,255,0.35)',
    textPrimary: '#333333',          // Dark gray for primary text
    textSecondary: '#666666',        // Medium gray for secondary text
    error: '#EF4444',
    errorLight: '#FEE2E2',
  },
  spacing: {
    small: 8,
    medium: 16,
    large: 24,
  },
  radius: {
    card: 16,
    button: 20,
  },
  typography: {
    heading: {
      fontSize: 24,
      fontWeight: '700',
      color: '#333333',
      fontFamily: Platform.select({ ios: 'SF Pro', android: 'Roboto', default: 'Inter' }),
    },
    body: {
      fontSize: 16,
      color: '#333333',
      fontFamily: Platform.select({ ios: 'SF Pro', android: 'Roboto', default: 'Inter' }),
    },
    small: {
      fontSize: 14,
      color: '#666666',
      fontFamily: Platform.select({ ios: 'SF Pro', android: 'Roboto', default: 'Inter' }),
    },
  },
  shadows: {
    light: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
  },
};

// --- Stable array of random positions for "noise" squares ---
const NOISE_SQUARES = Array.from({ length: 150 }).map((_, i) => ({
  key: i,
  top: Math.random() * 100,
  left: Math.random() * 100,
}));

// --- Simple noise overlay component ---
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

// --- Single subtle linear gradient + noise overlay ---
function SingleLinearGradientBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={theme.colors.gradientBackground}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <NoiseOverlay />
    </View>
  );
}

// --- Fetch summary for today ---
async function fetchTodayActivitiesSummary(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data, error } = await supabase
    .from('activities')
    .select('duration, distance, calories, steps, activity_type')
    .eq('user_id', userId)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString());

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

// --- Fetch activities list for today ---
async function fetchTodayActivitiesList(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', today.toISOString())
    .lt('created_at', tomorrow.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching activities:', error);
    throw new Error(error.message);
  }
  return data || [];
}

function getActivityIcon(activityType: string): string {
  switch (activityType.toLowerCase()) {
    case 'walking':
    case 'running':
    case 'steps':
      return 'walk';
    case 'cycling':
      return 'bicycle';
    case 'swimming':
      return 'water';
    case 'sleep':
      return 'bed';
    case 'screen time':
      return 'phone-portrait';
    case 'workout':
      return 'barbell';
    case 'yoga':
      return 'body';
    case 'high intensity':
      return 'flame';
    case 'no sugars':
      return 'nutrition';
    default:
      return 'fitness';
  }
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
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const todayString = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

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

      const summary = await fetchTodayActivitiesSummary(user.id);
      setActivitySummary(summary);

      const todayActivities = await fetchTodayActivitiesList(user.id);
      setActivities(todayActivities);
    } catch (err: any) {
      console.error('Error loading home data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  const displayedActivities = showAllActivities ? activities : activities.slice(0, 3);
  const displayedChallenges = showAllChallenges ? activeChallenges : activeChallenges.slice(0, 3);

  // --- If loading, show spinner ---
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <SingleLinearGradientBackground />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={theme.colors.textPrimary} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </View>
    );
  }

  // --- Render a single row in Activities ---
  function renderActivityRow(activity: any) {
    const iconName = getActivityIcon(activity.activity_type);
    let displayValue = '';

    switch (activity.metric) {
      case 'time':
        if (activity.duration) displayValue = `${activity.duration} min`;
        break;
      case 'distance_km':
        if (activity.distance !== null) {
          if (settings.useKilometers) {
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

    return (
      <View key={activity.id} style={styles.activityCardWrapper}>
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint="light" style={styles.glassCard}>
            <View style={styles.activityItem}>
              <Ionicons
                name={iconName}
                size={22}
                color={theme.colors.textPrimary}
                style={{ marginRight: 12 }}
              />
              <View>
                <Text style={styles.activityName}>{activity.activity_type}</Text>
                <Text style={styles.activityMeta}>{displayValue || 'No data'}</Text>
              </View>
            </View>
          </BlurView>
        ) : (
          <View style={[styles.glassCard, styles.androidCard]}>
            <View style={styles.activityItem}>
              <Ionicons
                name={iconName}
                size={22}
                color={theme.colors.textPrimary}
                style={{ marginRight: 12 }}
              />
              <View>
                <Text style={styles.activityName}>{activity.activity_type}</Text>
                <Text style={styles.activityMeta}>{displayValue || 'No data'}</Text>
              </View>
            </View>
          </View>
        )}
      </View>
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
            tintColor={theme.colors.textPrimary}
            colors={[theme.colors.textPrimary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Sticky Header */}
        <View style={styles.stickyHeader}>
          <View style={styles.topHeader}>
            <Text style={styles.appName}>CTP</Text>
            <View style={styles.syncContainer}>
              <View style={styles.syncStatus}>
                <View style={[styles.statusDot, !isOnline && { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.syncText}>{isOnline ? 'Updated Now' : 'Offline'}</Text>
              </View>
              <TouchableOpacity style={styles.gradientButtonWrapper} onPress={onRefresh} disabled={refreshing}>
              <LinearGradient
  colors={theme.colors.gradientButton}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
  style={styles.gradientButton}
>
  <Ionicons name={refreshing ? 'sync' : 'sync-outline'} size={20} color="#FFF" />
</LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.bottomHeader}>
            <Text style={styles.greeting}>Hello, {settings.nickname || 'Friend'}</Text>
            <Text style={styles.dashboardTitle}>Your Dashboard</Text>
          </View>
        </View>

        {/* Remaining Content */}
        {error && (
          <View style={styles.errorBanner}>
            <View style={styles.errorContent}>
              <Ionicons name="alert-circle-outline" size={22} color={theme.colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>TODAY'S ACTIVITY</Text>
            <TouchableOpacity
              style={styles.gradientButtonWrapper}
              onPress={() => setShowAddActivityModal(true)}
            >
              <LinearGradient colors={theme.colors.gradientButton} style={styles.gradientButton}>
                <Ionicons name="add" size={18} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.gradientButtonText}>Add Activity</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <View style={styles.summaryCardWrapper}>
            {Platform.OS === 'ios' ? (
              <BlurView intensity={80} tint="light" style={styles.glassCard}>
                <ActivitySummary
                  steps={activitySummary.steps}
                  distance={activitySummary.distance}
                  duration={activitySummary.duration}
                  calories={activitySummary.calories}
                  useKilometers={settings.useKilometers}
                />
              </BlurView>
            ) : (
              <View style={[styles.glassCard, styles.androidCard]}>
                <ActivitySummary
                  steps={activitySummary.steps}
                  distance={activitySummary.distance}
                  duration={activitySummary.duration}
                  calories={activitySummary.calories}
                  useKilometers={settings.useKilometers}
                />
              </View>
            )}
          </View>
          <Text style={styles.subsectionTitle}>Today’s Logged Activities</Text>
          {activities.length === 0 ? (
            <View style={styles.emptyStateWrapper}>
              {Platform.OS === 'ios' ? (
                <BlurView intensity={60} tint="light" style={styles.glassCard}>
                  <View style={styles.emptyContent}>
                    <Ionicons
                      name="fitness-outline"
                      size={40}
                      color={theme.colors.textSecondary}
                      style={{ marginBottom: 12 }}
                    />
                    <Text style={styles.emptyTitle}>No activities yet</Text>
                    <Text style={styles.emptyText}>
                      Start your fitness journey by adding your first activity!
                    </Text>
                    <TouchableOpacity
                      style={[styles.gradientButtonWrapper, { marginTop: theme.spacing.medium }]}
                      onPress={() => setShowAddActivityModal(true)}
                    >
                      <LinearGradient colors={theme.colors.gradientButton} style={styles.gradientButton}>
                        <Text style={styles.gradientButtonText}>Log Activity</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </BlurView>
              ) : (
                <View style={[styles.glassCard, styles.androidCard]}>
                  <View style={styles.emptyContent}>
                    <Ionicons
                      name="fitness-outline"
                      size={40}
                      color={theme.colors.textSecondary}
                      style={{ marginBottom: 12 }}
                    />
                    <Text style={styles.emptyTitle}>No activities yet</Text>
                    <Text style={styles.emptyText}>
                      Start your fitness journey by adding your first activity!
                    </Text>
                    <TouchableOpacity
                      style={[styles.gradientButtonWrapper, { marginTop: theme.spacing.medium }]}
                      onPress={() => setShowAddActivityModal(true)}
                    >
                      <LinearGradient colors={theme.colors.gradientButton} style={styles.gradientButton}>
                        <Text style={styles.gradientButtonText}>Log Activity</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={{ marginTop: 8 }}>
              {displayedActivities.map((activity) => renderActivityRow(activity))}
              {activities.length > 3 && (
                <TouchableOpacity
                  style={[styles.gradientButtonWrapper, { alignSelf: 'center', marginTop: 16 }]}
                  onPress={() => setShowAllActivities(!showAllActivities)}
                >
                  <LinearGradient colors={theme.colors.gradientButton} style={styles.gradientButton}>
                    <Text style={styles.gradientButtonText}>
                      {showAllActivities ? 'Show Less' : `View All (${activities.length})`}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>CHALLENGES</Text>
            <TouchableOpacity
              style={styles.gradientButtonWrapper}
              onPress={() => router.push('/joinchallenges/joincreate')}
            >
              <LinearGradient colors={theme.colors.gradientButton} style={styles.gradientButton}>
                <Text style={styles.gradientButtonText}>Join / Create</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          {activeChallenges.length === 0 ? (
            <View style={styles.emptyStateWrapper}>
              {Platform.OS === 'ios' ? (
                <BlurView intensity={60} tint="light" style={styles.glassCard}>
                  <View style={styles.emptyContent}>
                    <Ionicons
                      name="trophy-outline"
                      size={40}
                      color={theme.colors.textSecondary}
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
                      <LinearGradient colors={theme.colors.gradientButton} style={styles.gradientButton}>
                        <Text style={styles.gradientButtonText}>Find Challenges</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </BlurView>
              ) : (
                <View style={[styles.glassCard, styles.androidCard]}>
                  <View style={styles.emptyContent}>
                    <Ionicons
                      name="trophy-outline"
                      size={40}
                      color={theme.colors.textSecondary}
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
                      <LinearGradient colors={theme.colors.gradientButton} style={styles.gradientButton}>
                        <Text style={styles.gradientButtonText}>Find Challenges</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={{ marginTop: 8 }}>
              {displayedChallenges.map((challenge) => (
                <View key={challenge.id} style={styles.activityCardWrapper}>
                  {Platform.OS === 'ios' ? (
                    <TouchableOpacity
                      onPress={() =>
                        router.push(`/joinchallenges/challengedetails?challenge_id=${challenge.id}`)
                      }
                    >
                      <BlurView intensity={60} tint="light" style={styles.glassCard}>
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
                      style={[styles.glassCard, styles.androidCard]}
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
              {activeChallenges.length > 3 && (
                <TouchableOpacity
                  style={[styles.gradientButtonWrapper, { alignSelf: 'center', marginTop: 16 }]}
                  onPress={() => setShowAllChallenges(!showAllChallenges)}
                >
                  <LinearGradient colors={theme.colors.gradientButton} style={styles.gradientButton}>
                    <Text style={styles.gradientButtonText}>
                      {showAllChallenges ? 'Show Less' : `View All (${activeChallenges.length})`}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Activity Modal */}
      <AddActivityModal
        visible={showAddActivityModal}
        onClose={() => setShowAddActivityModal(false)}
        onSaveComplete={loadHomeData}
      />
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.large,
  },

  // Loading
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
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
  },

  // Sticky header container
  stickyHeader: {
    backgroundColor: '#FFFFFF',
    paddingTop: 50, // Increase this value for more space from the top
    paddingBottom: theme.spacing.medium,
    paddingHorizontal: theme.spacing.large,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.glassBorder,
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
    color: theme.colors.textPrimary,
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
    ...theme.shadows.light,
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
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  gradientButtonWrapper: {
    borderRadius: theme.radius.button,
    overflow: 'hidden',
    ...theme.shadows.light,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  gradientButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  bottomHeader: {
    marginTop: theme.spacing.small,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  dashboardTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },

  // Error Banner
  errorBanner: {
    marginHorizontal: theme.spacing.medium,
    marginBottom: theme.spacing.small,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.errorLight,
    padding: 16,
  },
  errorText: {
    color: theme.colors.error,
    marginLeft: 8,
    flex: 1,
  },

  // Sections
  section: {
    marginBottom: theme.spacing.large,
    paddingHorizontal: theme.spacing.medium,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  subsectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: 16,
    marginBottom: 12,
  },

  // Glassmorphic card
  glassCard: {
    backgroundColor: theme.colors.glassCardBg,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    borderRadius: theme.radius.card,
  },
  androidCard: {
    ...theme.shadows.medium,
  },

  // Summary Card
  summaryCardWrapper: {
    ...theme.shadows.medium,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
  },

  // Activities
  activityCardWrapper: {
    ...theme.shadows.light,
    marginBottom: theme.spacing.small,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.medium,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  activityMeta: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },

  // Empty state
  emptyStateWrapper: {
    ...theme.shadows.medium,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
  },
  emptyContent: {
    alignItems: 'center',
    padding: theme.spacing.large,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginHorizontal: theme.spacing.small,
  },

  // Challenges
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
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  challengeTypeBadge: {
    backgroundColor: 'rgba(74,144,226,0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  challengeTypeText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  challengeMeta: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
});
