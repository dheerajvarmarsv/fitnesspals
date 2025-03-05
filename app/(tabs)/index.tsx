// app/(tabs)/index.tsx

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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SharedLayout from '../../components/SharedLayout';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../components/UserContext';
import AddActivityModal from '../../components/AddActivityModal';
import ActivitySummary from '../../components/ActivitySummary';
import { getActiveChallengesForUser, updateChallengesWithActivity } from '../../lib/challengeUtils';

interface Challenge {
  id: string;
  title: string;
  description?: string;
  challenge_type: string;
  start_date: string;
  end_date?: string | null;
  participant_count?: number;
}

interface ActivityType {
  id: string;
  user_id: string;
  activity_type: string;
  // New columns for the single-metric approach:
  duration: number | null;   // time in minutes if metric = 'time'
  distance: number | null;   // in km if metric = 'distance_km'
  calories: number | null;   // if metric = 'calories'
  steps: number | null;      // if metric = 'steps'
  count: number | null;      // if metric = 'count'
  notes: string | null;
  source: 'manual' | 'device';
  created_at: string;
  metric: string; // e.g. 'time','distance_km','distance_miles','steps','calories','count'
}

//
// Fetch the user's activities for today and compute a summary
//
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

  // We'll accumulate total steps, total time, total distance, total calories
  let steps = 0,
      duration = 0,
      distance = 0,
      calories = 0;

  (data || []).forEach((act) => {
    if (act.steps) {
      steps += act.steps;
    }
    if (act.duration) {
      duration += act.duration;
    }
    if (act.distance) {
      distance += act.distance;
    }
    if (act.calories) {
      calories += act.calories;
    }
  });

  return { steps, distance, duration, calories };
}

//
// Fetch the list of activities for today
//
async function fetchTodayActivitiesList(userId: string): Promise<ActivityType[]> {
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
  return (data || []) as ActivityType[];
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

  const [activeChallenges, setActiveChallenges] = useState<Challenge[]>([]);
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [activitySummary, setActivitySummary] = useState({ steps: 0, distance: 0, duration: 0, calories: 0 });

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

  //
  // Load all data (challenges, summary, today's activities)
  //
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

      // 1) Load user's active challenges
      const userChallenges = await getActiveChallengesForUser(user.id);
      setActiveChallenges(Array.isArray(userChallenges) ? userChallenges : []);

      // 2) Load today's summary
      const summary = await fetchTodayActivitiesSummary(user.id);
      setActivitySummary(summary);

      // 3) Load today's activities
      const todayActivities = await fetchTodayActivitiesList(user.id);
      setActivities(todayActivities);
    } catch (err: any) {
      console.error('Error loading home data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  //
  // On component mount, load data
  //
  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  //
  // Pull-to-refresh
  //
  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  //
  // Decide which activities to display if we have "Show More" or "Show Less"
  //
  const displayedActivities = showAllActivities ? activities : activities.slice(0, 3);
  const displayedChallenges = showAllChallenges ? activeChallenges : activeChallenges.slice(0, 3);

  //
  // If loading, show a spinner
  //
  if (loading) {
    return (
      <SharedLayout style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4B4B" />
          <Text style={styles.loadingText}>Loading your dashboard...</Text>
        </View>
      </SharedLayout>
    );
  }

  //
  // Render a single row in "Today’s Logged Activities"
  // This will show only the metric that was actually used
  //
  function renderActivityRow(activity: ActivityType) {
    const iconName = getActivityIcon(activity.activity_type);

    // We'll figure out exactly which metric to show
    // based on activity.metric and the corresponding column
    let displayValue = '';

    switch (activity.metric) {
      case 'time':
        // e.g. 45 minutes
        if (activity.duration) {
          displayValue = `${activity.duration} min`;
        }
        break;
      case 'distance_km':
        // e.g. 2.00 km or (miles if user prefers?)
        if (activity.distance !== null) {
          if (settings.useKilometers) {
            displayValue = `${activity.distance.toFixed(2)} km`;
          } else {
            // Convert to miles
            const miles = activity.distance * 0.621371;
            displayValue = `${miles.toFixed(2)} mi`;
          }
        }
        break;
      case 'distance_miles':
        // distance is stored in km, so convert back if needed
        if (activity.distance !== null) {
          const miles = activity.distance * 0.621371;
          displayValue = `${miles.toFixed(2)} mi`;
        }
        break;
      case 'calories':
        if (activity.calories) {
          displayValue = `${activity.calories} cal`;
        }
        break;
      case 'steps':
        if (activity.steps) {
          displayValue = `${activity.steps} steps`;
        }
        break;
      case 'count':
        if (activity.count) {
          displayValue = `${activity.count} count`;
        }
        break;
      default:
        // fallback if somehow no metric or unknown
        // show at least one column if we have something
        // or just say "No data"
        displayValue = 'No data';
        break;
    }

    return (
      <View key={activity.id} style={styles.activityItem}>
        <Ionicons name={iconName} size={24} color="#333" style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.activityTypeText}>{activity.activity_type}</Text>
          <Text style={styles.activityMetaText}>
            {displayValue || 'No data'}
          </Text>
        </View>
      </View>
    );
  }

  //
  // Main render
  //
  return (
    <SharedLayout style={styles.container}>
      {/* ----- HEADER ----- */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>Stridekick</Text>
          <View style={styles.syncStatus}>
            <Text style={styles.syncText}>Last synced: {isOnline ? 'Just now' : 'Offline'}</Text>
            <TouchableOpacity onPress={onRefresh} disabled={refreshing}>
              <Ionicons name={refreshing ? 'sync-circle' : 'sync'} size={20} color={isOnline ? '#fff' : '#ccc'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ----- MAIN CONTENT ----- */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* error message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* YOUR ACTIVITY */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>YOUR ACTIVITY</Text>
              <Text style={styles.sectionDate}>Today, {todayString}</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddActivityModal(true)}
            >
              <Text style={styles.addButtonText}>+ Add activity</Text>
            </TouchableOpacity>
          </View>

          <ActivitySummary
            steps={activitySummary.steps}
            distance={activitySummary.distance}
            duration={activitySummary.duration}
            calories={activitySummary.calories}
            useKilometers={settings.useKilometers}
          />

          <Text style={styles.recentActivitiesTitle}>Today’s Logged Activities</Text>
          {activities.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No activities yet</Text>
              <Text style={styles.emptyStateText}>
                Start tracking your fitness journey by adding your first activity!
              </Text>
            </View>
          ) : (
            <View style={styles.loggedActivitiesContainer}>
              {displayedActivities.map((activity) => renderActivityRow(activity))}

              {activities.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => setShowAllActivities(!showAllActivities)}
                >
                  <Text style={styles.viewAllButtonText}>
                    {showAllActivities
                      ? 'Show Less'
                      : `See More (${activities.length} total)`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* CHALLENGES */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>CHALLENGES</Text>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => router.push('/joinchallenges/joincreate')}
            >
              <Text style={styles.joinButtonText}>+ Join / Create</Text>
            </TouchableOpacity>
          </View>

          {activeChallenges.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No active challenges</Text>
              <Text style={styles.emptyStateText}>
                Join a challenge or create your own to get started!
              </Text>
            </View>
          ) : (
            <View style={styles.challengesContainer}>
              {displayedChallenges.map((challenge) => (
                <TouchableOpacity
                  key={challenge.id}
                  style={styles.challengeCard}
                  onPress={() =>
                    router.push(
                      `/joinchallenges/challengedetails?challenge_id=${challenge.id}`
                    )
                  }
                >
                  <View style={styles.challengeContent}>
                    <View style={styles.challengeHeader}>
                      <Text style={styles.challengeTitle}>
                        {challenge.title}
                      </Text>
                      <View style={styles.challengeTypeBadge}>
                        <Text style={styles.challengeTypeText}>
                          {challenge.challenge_type.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.challengeDates}>
                      {new Date(challenge.start_date).toLocaleDateString()} -{' '}
                      {challenge.end_date
                        ? new Date(challenge.end_date).toLocaleDateString()
                        : 'Open-ended'}
                    </Text>
                    <Text style={styles.participantCountText}>
                      {challenge.participant_count || 0} participant(s)
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {activeChallenges.length > 3 && (
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={() => setShowAllChallenges(!showAllChallenges)}
                >
                  <Text style={styles.viewAllButtonText}>
                    {showAllChallenges
                      ? 'Show Less'
                      : `View All (${activeChallenges.length} total)`}
                  </Text>
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
    </SharedLayout>
  );
}

//
// ---------- STYLES ----------
//
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF4B4B',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: 16,
  },
  logoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncText: {
    color: '#fff',
    fontSize: 14,
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#fff',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  sectionDate: {
    fontSize: 13,
    fontWeight: '400',
    color: '#666',
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#FF4B4B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  recentActivitiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  loggedActivitiesContainer: {
    marginTop: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  activityTypeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  activityMetaText: {
    fontSize: 13,
    color: '#666',
  },
  viewAllButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  viewAllButtonText: {
    color: '#4A90E2',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    backgroundColor: '#f8f9fa',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  joinButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  joinButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  challengesContainer: {
    gap: 12,
  },
  challengeCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  challengeContent: {
    padding: 16,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  challengeTypeBadge: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  challengeTypeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  challengeDates: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  participantCountText: {
    fontSize: 13,
    color: '#666',
  },
});