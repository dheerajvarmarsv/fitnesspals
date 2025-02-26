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
  SafeAreaView,
  Modal,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../components/UserContext';

const { width } = Dimensions.get('window');

const CHALLENGE_TYPE_GRADIENTS = {
  race: ['#FF416C', '#FF4B2B'],
  survival: ['#4776E6', '#8E54E9'],
  streak: ['#FF8008', '#FFC837'],
  custom: ['#11998e', '#38ef7d'],
};

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
    timeframe?: 'day' | 'week';
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
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ChallengeDetailsContent />
    </>
  );
}

function ChallengeDetailsContent() {
  const { challenge_id } = useLocalSearchParams();
  const { settings } = useUser();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showActivitiesInfo, setShowActivitiesInfo] = useState(false);

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

      if (data?.rules?.points_per_activity) {
        const activitiesData = Object.entries(data.rules.points_per_activity).map(
          ([activity_type, points]) => ({
            activity_type,
            points,
            threshold: 'Custom Target',
          })
        );
        setActivities(activitiesData);
      }
    } catch (err) {
      console.error('Error fetching challenge details:', err);
      setError('Failed to load challenge details');
    }
  }, [challenge_id]);

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

  const fetchChallengeActivities = useCallback(async () => {
    try {
      if (!challenge_id) return;
      const { data, error } = await supabase
        .from('challenge_activities')
        .select('*')
        .eq('challenge_id', challenge_id);
      if (error) throw error;

      if (data && data.length > 0) {
        const activityMap = new Map();
        data.forEach((item) => {
          activityMap.set(item.activity_type, {
            activity_type: item.activity_type,
            points: item.points,
            threshold: item.threshold || 'Custom Target',
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

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([
        fetchChallengeDetails(),
        fetchParticipants(),
        fetchChallengeActivities(),
      ]);
    } catch (err) {
      console.error('Error loading challenge data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fetchChallengeDetails, fetchParticipants, fetchChallengeActivities]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, [loadAllData]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getChallengeGradient = () => {
    if (!challenge) return CHALLENGE_TYPE_GRADIENTS.custom;
    return CHALLENGE_TYPE_GRADIENTS[challenge.challenge_type] || CHALLENGE_TYPE_GRADIENTS.custom;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading challenge details...</Text>
      </SafeAreaView>
    );
  }

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

  const displayedActivities = showAllActivities ? activities : activities.slice(0, 3);
  const timeframe = challenge.rules?.timeframe || 'day';
  const timeframeLabel = timeframe === 'day' ? 'Daily' : 'Weekly';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Full gradient top section */}
        <LinearGradient
          colors={getChallengeGradient()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientContainer}
        >
          {/* Top row: back button + challenge name */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButtonContainer}>
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.challengeName} numberOfLines={1}>
              {challenge.title}
            </Text>

            <View style={{ width: 26 }} />
          </View>

          {/* Sub row: type, created by, public/private */}
          <View style={styles.subRow}>
            <View style={[styles.subRowItem, styles.darkTag]}>
              <Text style={styles.darkTagText}>{challenge.challenge_type.toUpperCase()}</Text>
            </View>

            <View style={styles.subRowItem}>
              <Text style={styles.createdByText}>
                by {challenge.creator?.nickname || 'Unknown'}
              </Text>
            </View>

            <View style={[styles.subRowItem, styles.darkTag]}>
              <Ionicons
                name={challenge.is_private ? 'lock-closed' : 'globe'}
                size={14}
                color="#fff"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.darkTagText}>
                {challenge.is_private ? 'Private' : 'Public'}
              </Text>
            </View>
          </View>

          {/* Combined box: description + start/end dates, with 3D effect */}
          <View style={styles.descDatesBox}>
            {challenge.description ? (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionText}>{challenge.description}</Text>
              </View>
            ) : null}

            <View style={styles.dateRow}>
              <View style={styles.dateItem}>
                <Ionicons name="calendar-outline" size={16} color="#fff" />
                <Text style={styles.dateLabel}>Starts</Text>
                <Text style={styles.dateValue}>{formatDate(challenge.start_date)}</Text>
              </View>
              <View style={styles.dateDivider} />
              <View style={styles.dateItem}>
                <Ionicons name="calendar-outline" size={16} color="#fff" />
                <Text style={styles.dateLabel}>Ends</Text>
                <Text style={styles.dateValue}>
                  {challenge.end_date ? formatDate(challenge.end_date) : 'Open-ended'}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Activities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Challenge Activities</Text>
            <TouchableOpacity
              style={styles.infoButtonGrayCircle}
              onPress={() => setShowActivitiesInfo(true)}
            >
              <Ionicons name="information-circle" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {displayedActivities.length === 0 ? (
            <View style={styles.noActivitiesContainer}>
              <Text style={styles.noActivitiesText}>No activities defined</Text>
            </View>
          ) : (
            <View style={styles.activitiesContainer}>
              {displayedActivities.map((activity, index) => (
                <View key={`${activity.activity_type}-${index}`} style={styles.activityRow}>
                  <View style={styles.activityIconContainer}>
                    <FontAwesome5
                      name={ACTIVITY_ICONS[activity.activity_type] || 'star'}
                      size={16}
                      color="#fff"
                    />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityName}>{activity.activity_type}</Text>
                    <Text style={styles.activitySubText}>
                      {activity.threshold} • {timeframeLabel}
                    </Text>
                  </View>
                  <View style={styles.activityPoints}>
                    <Text style={styles.pointsValue}>{activity.points}</Text>
                    <Text style={styles.pointsLabel}>pts</Text>
                  </View>
                </View>
              ))}

              {activities.length > 3 && (
                <TouchableOpacity
                  onPress={() => setShowAllActivities(!showAllActivities)}
                  style={styles.showMoreButton}
                >
                  <Ionicons
                    name={showAllActivities ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#fff"
                  />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Leaderboard */}
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
            <View style={{ maxHeight: 300 }}>
              <ScrollView nestedScrollEnabled>
                <View style={styles.leaderboardContainer}>
                  {participants.map((participant, index) => (
                    <View
                      key={participant.id}
                      style={[
                        styles.participantRow,
                        index === 0 && styles.firstPlaceRow,
                        index === 1 && styles.secondPlaceRow,
                        index === 2 && styles.thirdPlaceRow,
                      ]}
                    >
                      <View style={styles.rankContainer}>
                        {index < 3 ? (
                          <View
                            style={[
                              styles.medalIcon,
                              index === 0 && styles.goldMedal,
                              index === 1 && styles.silverMedal,
                              index === 2 && styles.bronzeMedal,
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
                            'https://ui-avatars.com/api/?name=User&background=random',
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
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Info Modal */}
      <Modal
        visible={showActivitiesInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActivitiesInfo(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowActivitiesInfo(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Activities Info</Text>
              <Text style={styles.modalBodyText}>
                This challenge includes multiple activities you can complete {timeframeLabel.toLowerCase()} 
                to earn points. Stay consistent and have fun!
              </Text>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowActivitiesInfo(false)}
              >
                <Text style={styles.modalCloseButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Container & Scroll
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 16, // reduced so there's less extra space
  },

  // Loading / Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 17,
    color: '#555',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'Roboto',
    }),
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
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'Roboto',
    }),
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'Roboto',
    }),
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
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'Roboto',
    }),
  },

  // Gradient Container
  gradientContainer: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingBottom: 16,
  },

  // Header row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  backButtonContainer: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  challengeName: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginHorizontal: 8,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Bold',
      android: 'Roboto',
    }),
  },

  // Sub row
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  subRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  darkTag: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 10,
  },
  darkTagText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'Roboto',
    }),
  },
  createdByText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'Roboto',
    }),
  },

  // Description + Dates in one box
  descDatesBox: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 14,
    // Subtle shadow for 3D effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  descriptionContainer: {
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#fff',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'Roboto',
    }),
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 10,
  },
  dateItem: {
    flex: 1,
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 12,
    color: '#fff',
    marginTop: 2,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'Roboto',
    }),
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 2,
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'Roboto',
    }),
  },
  dateDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 10,
  },

  // Sections
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12, // reduced
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'Roboto',
    }),
  },
  infoButtonGrayCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Activities
  noActivitiesContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  noActivitiesText: {
    color: '#888',
    fontSize: 14,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'Roboto',
    }),
  },
  activitiesContainer: {
    gap: 8,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  activityIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'Roboto',
    }),
  },
  activitySubText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'Roboto',
    }),
  },
  activityPoints: {
    alignItems: 'center',
  },
  pointsValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'Roboto',
    }),
  },
  pointsLabel: {
    fontSize: 10,
    color: '#666',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'Roboto',
    }),
  },
  showMoreButton: {
    alignSelf: 'center',
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#444',
  },

  // Leaderboard
  participantsCount: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'Roboto',
    }),
  },
  noParticipantsContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  noParticipantsText: {
    color: '#888',
    fontSize: 14,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'Roboto',
    }),
  },
  leaderboardContainer: {
    gap: 8,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
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
    width: 34,
    alignItems: 'center',
    marginRight: 8,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'Roboto',
    }),
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
    fontSize: 12,
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'Roboto',
    }),
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Medium',
      android: 'Roboto',
    }),
  },
  participantStatus: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'Roboto',
    }),
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'Roboto',
    }),
  },
  scoreLabel: {
    fontSize: 10,
    color: '#666',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'Roboto',
    }),
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 8,
  },
  modalContent: {},
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'Roboto',
    }),
  },
  modalBodyText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'Roboto',
    }),
  },
  modalCloseButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'Roboto',
    }),
  },
});