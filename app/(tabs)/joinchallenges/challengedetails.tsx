// app/(tabs)/joinchallenges/challengedetails.tsx

import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
  StatusBar,
  SafeAreaView
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../components/UserContext';

// Get screen dimensions
const { width } = Dimensions.get('window');
const isSmallDevice = width < 375;
const isTablet = width >= 768;

// Define gradient colors based on challenge type
const CHALLENGE_TYPE_GRADIENTS = {
  race: ['#FF416C', '#FF4B2B'],
  survival: ['#4776E6', '#8E54E9'],
  streak: ['#FF8008', '#FFC837'],
  custom: ['#11998e', '#38ef7d'],
};

// Activity icon mapping
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
  'Stretching': 'child',
  'Bonus Points': 'star',
  Custom: 'star',
};

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  challenge_type: 'race' | 'survival' | 'streak' | 'custom';
  status: 'active' | 'completed' | 'cancelled' | 'draft';
  start_date: string | null;
  end_date: string | null;
  is_private: boolean;
  creator_id: string;
  rules: {
    allowed_activities: string[];
    points_per_activity: Record<string, number>;
    finish_line?: number;
    minimum_threshold?: number;
    streak_bonus?: number;
    custom_rules?: any;
  };
  created_at: string;
  creator?: {
    nickname: string;
    avatar_url: string | null;
  };
}

interface Participant {
  id: string;
  user_id: string;
  status: string;
  joined_at: string;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  profile: {
    nickname: string;
    avatar_url: string | null;
  };
}

interface Activity {
  activity_type: string;
  points: number;
  threshold: string;
}

export default function ChallengeDetailsScreen() {
  const { challenge_id } = useLocalSearchParams();
  const { settings } = useUser();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch challenge details including creator info
  const fetchChallengeDetails = useCallback(async () => {
    try {
      if (!challenge_id) return;

      const { data, error } = await supabase
        .from('challenges')
        .select(`
          *,
          creator:profiles!challenges_creator_id_fkey (
            nickname,
            avatar_url
          )
        `)
        .eq('id', challenge_id)
        .single();

      if (error) throw error;
      setChallenge(data as Challenge);

      // Extract activities from challenge rules
      if (data && data.rules && data.rules.points_per_activity) {
        const activitiesData = Object.entries(data.rules.points_per_activity).map(
          ([activity_type, points]) => ({
            activity_type,
            points,
            threshold: 'Custom Target' // Default
          })
        );
        setActivities(activitiesData);
      }
    } catch (err) {
      console.error('Error fetching challenge details:', err);
      setError('Failed to load challenge details');
    }
  }, [challenge_id]);

  // Fetch participants sorted by total points (descending)
  const fetchParticipants = useCallback(async () => {
    try {
      if (!challenge_id) return;

      const { data, error } = await supabase
        .from('challenge_participants')
        .select(`
          id,
          user_id,
          status,
          joined_at,
          total_points,
          current_streak,
          longest_streak,
          profile:profiles (
            nickname,
            avatar_url
          )
        `)
        .eq('challenge_id', challenge_id)
        .order('total_points', { ascending: false });

      if (error) throw error;
      setParticipants(data as Participant[]);
    } catch (err) {
      console.error('Error fetching participants:', err);
    }
  }, [challenge_id]);

  // Fetch challenge activities
  const fetchChallengeActivities = useCallback(async () => {
    try {
      if (!challenge_id) return;

      const { data, error } = await supabase
        .from('challenge_activities')
        .select('*')
        .eq('challenge_id', challenge_id);

      if (error) throw error;

      // If activities data is available, update the activities state
      if (data && data.length > 0) {
        const activityMap = new Map();
        data.forEach(item => {
          activityMap.set(item.activity_type, {
            activity_type: item.activity_type,
            points: item.points,
            threshold: item.threshold || 'Custom Target'
          });
        });
        if (activityMap.size > 0) {
          setActivities(Array.from(activityMap.values()));
        }
      }
    } catch (err) {
      console.error('Error fetching challenge activities:', err);
    }
  }, [challenge_id]);

  // Load all data
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        fetchChallengeDetails(),
        fetchParticipants(),
        fetchChallengeActivities()
      ]);
    } catch (err) {
      console.error('Error loading challenge data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fetchChallengeDetails, fetchParticipants, fetchChallengeActivities]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, [loadAllData]);

  // Initial data load
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get gradient colors
  const getChallengeGradient = () => {
    if (!challenge) return CHALLENGE_TYPE_GRADIENTS.custom;
    return CHALLENGE_TYPE_GRADIENTS[challenge.challenge_type] || CHALLENGE_TYPE_GRADIENTS.custom;
  };

  // Render loading
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading challenge details...</Text>
      </SafeAreaView>
    );
  }

  // Render error
  if (error || !challenge) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="dark-content" />
        <Ionicons name="alert-circle-outline" size={64} color="#FF4B4B" />
        <Text style={styles.errorTitle}>Oops!</Text>
        <Text style={styles.errorMessage}>{error || 'Challenge not found'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* We removed the local "Header with back button" block here */}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Challenge Header */}
        <LinearGradient
          colors={getChallengeGradient()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.topRow}>
              <View style={styles.challengeTypeTag}>
                <Text style={styles.challengeTypeText}>
                  {challenge.challenge_type.toUpperCase()}
                </Text>
              </View>

              <View style={styles.visibilityTag}>
                <Ionicons name={challenge.is_private ? "lock-closed" : "globe"} size={14} color="#fff" />
                <Text style={styles.visibilityText}>
                  {challenge.is_private ? "Private" : "Public"}
                </Text>
              </View>
            </View>

            <Text style={styles.challengeTitle}>{challenge.title}</Text>
            {challenge.description && (
              <Text style={styles.challengeDescription}>{challenge.description}</Text>
            )}

            <View style={styles.creatorRow}>
              <Image
                source={{
                  uri: challenge.creator?.avatar_url || 'https://ui-avatars.com/api/?name=User&background=random'
                }}
                style={styles.creatorAvatar}
              />
              <Text style={styles.creatorText}>
                Created by <Text style={styles.creatorName}>{challenge.creator?.nickname || 'Unknown'}</Text>
              </Text>
            </View>

            <View style={styles.dateRow}>
              <View style={styles.dateItem}>
                <Ionicons name="calendar-outline" size={16} color="#fff" />
                <Text style={styles.dateLabel}>Starts</Text>
                <Text style={styles.dateText}>{formatDate(challenge.start_date)}</Text>
              </View>
              <View style={styles.dateDivider} />
              <View style={styles.dateItem}>
                <Ionicons name="calendar-outline" size={16} color="#fff" />
                <Text style={styles.dateLabel}>Ends</Text>
                <Text style={styles.dateText}>
                  {challenge.end_date ? formatDate(challenge.end_date) : 'Open-ended'}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Activities Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Challenge Activities</Text>
          {activities.length === 0 ? (
            <View style={styles.noActivitiesContainer}>
              <Text style={styles.noActivitiesText}>No activities defined</Text>
            </View>
          ) : (
            <View style={styles.activitiesContainer}>
              {activities.map((activity, index) => (
                <View key={`${activity.activity_type}-${index}`} style={styles.activityCard}>
                  <View style={styles.activityIconContainer}>
                    <FontAwesome5
                      name={ACTIVITY_ICONS[activity.activity_type] || 'star'}
                      size={18}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.activityDetails}>
                    <Text style={styles.activityName}>{activity.activity_type}</Text>
                    <Text style={styles.activityThreshold}>{activity.threshold}</Text>
                  </View>
                  <View style={styles.pointsContainer}>
                    <Text style={styles.pointsValue}>{activity.points}</Text>
                    <Text style={styles.pointsLabel}>pts</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Participants Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leaderboard</Text>
          <Text style={styles.participantsCount}>
            {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
          </Text>
          {participants.length === 0 ? (
            <View style={styles.noParticipantsContainer}>
              <Text style={styles.noParticipantsText}>No participants yet</Text>
            </View>
          ) : (
            <View style={styles.leaderboardContainer}>
              {participants.map((participant, index) => (
                <View
                  key={participant.id}
                  style={[
                    styles.participantRow,
                    index === 0 && styles.firstPlaceRow,
                    index === 1 && styles.secondPlaceRow,
                    index === 2 && styles.thirdPlaceRow
                  ]}
                >
                  <View style={styles.rankContainer}>
                    {index < 3 ? (
                      <View
                        style={[
                          styles.medalIcon,
                          index === 0 && styles.goldMedal,
                          index === 1 && styles.silverMedal,
                          index === 2 && styles.bronzeMedal
                        ]}
                      >
                        <Text style={styles.medalText}>{index + 1}</Text>
                      </View>
                    ) : (
                      <Text style={styles.rankText}>{index + 1}</Text>
                    )}
                  </View>

                  <Image
                    source={{
                      uri:
                        participant.profile?.avatar_url ||
                        'https://ui-avatars.com/api/?name=User&background=random'
                    }}
                    style={styles.participantAvatar}
                  />

                  <View style={styles.participantInfo}>
                    <Text style={styles.participantName}>
                      {participant.profile?.nickname || 'Unknown'}
                    </Text>
                    <Text style={styles.participantStatus}>
                      {participant.status.charAt(0).toUpperCase() + participant.status.slice(1)}
                    </Text>
                  </View>

                  <View style={styles.scoreContainer}>
                    <Text style={styles.scoreValue}>{participant.total_points}</Text>
                    <Text style={styles.scoreLabel}>pts</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#555',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  headerGradient: {
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    paddingTop: 70,
    paddingHorizontal: 24,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  challengeTypeTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
  },
  challengeTypeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },
  visibilityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
  },
  visibilityText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    marginLeft: 4,
  },
  challengeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  challengeDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 20,
    lineHeight: 22,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  creatorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ddd',
    marginRight: 10,
  },
  creatorText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  creatorName: {
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    padding: 12,
  },
  dateItem: {
    flex: 1,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 2,
  },
  dateDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 10,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  noActivitiesContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  noActivitiesText: {
    color: '#888',
    fontSize: 16,
  },
  activitiesContainer: {
    gap: 10,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityDetails: {
    flex: 1,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  activityThreshold: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  pointsContainer: {
    alignItems: 'center',
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  pointsLabel: {
    fontSize: 12,
    color: '#666',
  },
  participantsCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  noParticipantsContainer: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  noParticipantsText: {
    color: '#888',
    fontSize: 16,
  },
  leaderboardContainer: {
    gap: 8,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  firstPlaceRow: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  secondPlaceRow: {
    backgroundColor: 'rgba(192, 192, 192, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)',
  },
  thirdPlaceRow: {
    backgroundColor: 'rgba(205, 127, 50, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(205, 127, 50, 0.3)',
  },
  rankContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 8,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  medalIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ccc',
  },
  goldMedal: {
    backgroundColor: '#FFD700',
  },
  silverMedal: {
    backgroundColor: '#C0C0C0',
  },
  bronzeMedal: {
    backgroundColor: '#CD7F32',
  },
  medalText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  participantStatus: {
    fontSize: 14,
    color: '#666',
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#666',
  },
});