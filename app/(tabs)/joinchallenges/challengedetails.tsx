// app/(tabs)/joinchallenges/challengedetails.tsx
import { subscribeToRaceUpdates } from '../../../lib/racetrack';
import { updateRacePosition } from '../../../lib/racetrack';
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
  StatusBar,
  SafeAreaView,
  Modal,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../components/UserContext';
import MultiAvatarRaceTrack from '../../../components/RaceTrackComponent';

const { width, height } = Dimensions.get('window');

// Optional: color gradients for challenge types
const CHALLENGE_TYPE_GRADIENTS: { [key: string]: string[] } = {
  race: ['#FF416C', '#FF4B2B'],
  survival: ['#4776E6', '#8E54E9'],
  streak: ['#FF8008', '#FFC837'],
  custom: ['#11998e', '#38ef7d'],
};

// Optional icons for activities
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

type ChallengeTab = 'leaderboard' | 'map';

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
  map_position?: number;
  profile: {
    nickname: string;
    avatar_url: string | null;
  };
}

interface Activity {
  activity_type: string;
  points: number;
  target_value: number;
}

// What the RaceTrack expects
interface RaceParticipant {
  id: string;
  avatar_url: string;
  nickname: string;
  currentStep: number;
  isCurrentUser: boolean;
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
  // The ID of the current challenge from route params
  const { challenge_id } = useLocalSearchParams();
  // If you store user settings, etc.
  const { settings } = useUser();

  // Tab state
  const [activeTab, setActiveTab] = useState<ChallengeTab>('leaderboard');

  // Loading & data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Show/hide more activities
  const [showAllActivities, setShowAllActivities] = useState(false);
  // Info modal
  const [showActivitiesInfo, setShowActivitiesInfo] = useState(false);

  // 1) Fetch current user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserId(data.user.id);
      }
    });
  }, []);

  // 2) Fetch challenge details
  const fetchChallengeDetails = useCallback(async () => {
    if (!challenge_id) return;
    try {
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

      // If there's a points_per_activity object, convert to an array
      if (data?.rules?.points_per_activity) {
        const arr = Object.entries(data.rules.points_per_activity).map(
          ([activity_type, points]) => ({
            activity_type,
            points,
            target_value: 0, 
          })
        );
        setActivities(arr);
      }
    } catch (err) {
      console.error('Error fetching challenge details:', err);
      setError('Failed to load challenge details');
    }
  }, [challenge_id]);

  // 3) Fetch participants
  const fetchParticipants = useCallback(async () => {
    if (!challenge_id) return;
    try {
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
          map_position,
          profile:profiles (
            id,
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

  // 4) Fetch challenge activities
  const fetchChallengeActivities = useCallback(async () => {
    if (!challenge_id) return;
    try {
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
            target_value: typeof item.target_value === 'number' ? item.target_value : 0,
          });
        });
        setActivities(Array.from(activityMap.values()));
      }
    } catch (err) {
      console.error('Error fetching challenge activities:', err);
    }
  }, [challenge_id]);

  // 5) Load all data at once
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

  // Initial load
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, [loadAllData]);

  // 6) Real-time subscription for this challenge
// app/(tabs)/joinchallenges/challengedetails.tsx
// Import at the top:
useEffect(() => {
  if (!challenge_id || !currentUserId) return;

  console.log('Setting up real-time subscription for challenge:', challenge_id);
  
  const subscription = subscribeToRaceUpdates(challenge_id as string, (payload) => {
    console.log('Real-time race update received:', payload.new);
    
    // Get the updated participant data
    const updatedParticipant = payload.new;
    
    // Update local state with the new position information
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === updatedParticipant.id
          ? {
              ...p,
              total_points: updatedParticipant.total_points ?? p.total_points,
              map_position: 
                typeof updatedParticipant.map_position === 'number' ? 
                updatedParticipant.map_position : 
                p.map_position,
            }
          : p
      )
    );
  });

  return () => {
    console.log('Cleaning up subscription for challenge:', challenge_id);
    supabase.removeChannel(subscription);
  };
}, [challenge_id, currentUserId]);
  // 7) Handle user movement: only update row for this challenge
// Then update the function:
const handleMoveParticipant = async (participantUserId: string, step: number, challengeId: string) => {
    console.log('handleMoveParticipant called with:', participantUserId, step, challengeId);
  
    // If userId is undefined, use the currentUserId instead
    const userId = participantUserId || currentUserId;
    
    if (!challengeId || !userId) {
      console.log('Missing required data:', { challengeId, userId });
      return;
    }
    
    // Validate that this is for the current challenge
    if (challengeId !== challenge_id) {
      console.log('Ignoring update for different challenge', challengeId, 'vs current', challenge_id);
      return;
    }
    
    // Find participant by user_id, not by ID
    const participantInThisChallenge = participants.find(
      (p) => p.user_id === userId
    );
    
    if (!participantInThisChallenge) {
      console.log('User not found in participants. User ID:', userId, 'Available participants:', participants.map(p => p.user_id));
      return;
    }
  
    // Proceed with the update
    try {
      const pointsPerStep = 10;
      const totalPoints = step * pointsPerStep;
      
      console.log('Updating participant in DB:', {
        participantId: participantInThisChallenge.id,
        userId: userId,
        step: step,
        totalPoints: totalPoints
      });
  
      const { data, error } = await supabase
        .from('challenge_participants')
        .update({
          map_position: step,
          total_points: totalPoints,
          last_activity_date: new Date().toISOString()
        })
        .eq('id', participantInThisChallenge.id)
        .select();
  
      if (error) throw error;
      console.log('Successfully updated participant row in DB!', data);
      
      // Update local state
      setParticipants(prev => prev.map(p => 
        p.id === participantInThisChallenge.id 
          ? {...p, map_position: step, total_points: totalPoints} 
          : p
      ));
      
    } catch (err) {
      console.error('Error updating participant position:', err);
    }
  };

  // 8) Convert participants to RaceTrack format
  const getRaceParticipants = (): RaceParticipant[] => {
    if (!currentUserId) return [];
    
    return participants.map((p) => {
      // Prioritize map_position if available, otherwise calculate from points
      const step = typeof p.map_position === 'number' && p.map_position >= 0
          ? p.map_position
          : Math.floor((p.total_points || 0) / 10);
  
      return {
        id: p.id,                                      // This is the DB row ID
        user_id: p.user_id,                           // Add this explicitly
        avatar_url: p.profile?.avatar_url || 'https://via.placeholder.com/36',
        nickname: p.profile?.nickname || 'Unknown',
        currentStep: step,
        isCurrentUser: p.user_id === currentUserId,   // Compare with user_id
      };
    });
  };

  // Helpers
  function formatDate(dateString: string | null) {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  function formatTargetValue(value: number): string {
    // If the numeric value is zero, display "Custom Target"
    return value > 0 ? value.toString() : 'Custom Target';
  }
  function getChallengeGradient() {
    if (!challenge) return CHALLENGE_TYPE_GRADIENTS.custom;
    return (
      CHALLENGE_TYPE_GRADIENTS[challenge.challenge_type] ||
      CHALLENGE_TYPE_GRADIENTS.custom
    );
  }

  // Loading / error states
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

  // Prepare activities & map participants
  const displayedActivities = showAllActivities ? activities : activities.slice(0, 3);
  const timeframe = challenge.rules?.timeframe || 'day';
  const timeframeLabel = timeframe === 'day' ? 'Daily' : 'Weekly';
  const raceParticipants = getRaceParticipants();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Gradient header */}
        <LinearGradient
          colors={getChallengeGradient()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientContainer}
        >
          {/* Top row: back + title */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButtonContainer}
            >
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.challengeName} numberOfLines={1}>
              {challenge.title}
            </Text>

            <View style={{ width: 26 }} />
          </View>

          {/* Sub row: type, creator, private/public */}
          <View style={styles.subRow}>
            <View style={[styles.subRowItem, styles.darkTag]}>
              <Text style={styles.darkTagText}>
                {challenge.challenge_type.toUpperCase()}
              </Text>
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

          {/* Description + dates box */}
          <View style={styles.descDatesBox}>
            {challenge.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionText}>{challenge.description}</Text>
              </View>
            )}

            <View style={styles.dateRow}>
              <View style={styles.dateItem}>
                <Ionicons name="calendar-outline" size={16} color="#fff" />
                <Text style={styles.dateLabel}>Starts</Text>
                <Text style={styles.dateValue}>
                  {formatDate(challenge.start_date)}
                </Text>
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
  {formatTargetValue(activity.target_value)} • {timeframeLabel}
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

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'leaderboard' && styles.activeTabButton]}
            onPress={() => setActiveTab('leaderboard')}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'leaderboard' && styles.activeTabText,
              ]}
            >
              Leaderboard
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'map' && styles.activeTabButton]}
            onPress={() => setActiveTab('map')}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'map' && styles.activeTabText,
              ]}
            >
              Map
            </Text>
          </TouchableOpacity>
        </View>

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Leaderboard</Text>
            <Text style={styles.participantsCount}>
              {participants.length}{' '}
              {participants.length === 1 ? 'participant' : 'participants'}
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
                          participant.user_id === currentUserId && styles.currentUserRow,
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
                            {participant.user_id === currentUserId && ' (You)'}
                          </Text>
                          <Text style={styles.participantStatus}>
                            {participant.status.charAt(0).toUpperCase() +
                              participant.status.slice(1)}
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
        )}

        {/* Map Tab */}
        {activeTab === 'map' && (
  <View style={styles.mapSection}>
    {raceParticipants.length > 0 && currentUserId ? (
      <MultiAvatarRaceTrack
        participants={raceParticipants}
        containerHeight={height * 0.5}
        showTitle={true}
        onMoveParticipant={handleMoveParticipant}
        challengeId={challenge_id as string}
        key={`racetrack-${challenge_id}`} // Force remount when challenge changes
      />
    ) : (
      <View style={styles.noParticipantsContainer}>
        <Text style={styles.noParticipantsText}>No participants to show on the map</Text>
      </View>
    )}
  </View>
)}
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
                This challenge includes multiple activities you can complete{' '}
                {timeframeLabel.toLowerCase()} to earn points. Stay consistent and have fun!
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
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { paddingBottom: 16 },

  // Loading / Error
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff',
  },
  loadingText: { marginTop: 16, fontSize: 17, color: '#555' },
  errorContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff',
  },
  errorTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 16, marginBottom: 8 },
  errorMessage: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 24 },
  backButton: { backgroundColor: '#4A90E2', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  backButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Gradient Container
  gradientContainer: {
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24, paddingBottom: 16,
  },

  // Header row
  headerRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingHorizontal: 16, justifyContent: 'space-between',
  },
  backButtonContainer: {
    width: 40, alignItems: 'flex-start', justifyContent: 'center',
  },
  challengeName: {
    flex: 1, fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginHorizontal: 8,
  },

  // Sub row
  subRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingHorizontal: 16, justifyContent: 'space-between',
  },
  subRowItem: {
    flexDirection: 'row', alignItems: 'center',
  },
  darkTag: {
    backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, marginRight: 10,
  },
  darkTagText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  createdByText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Description + Dates
  descDatesBox: {
    marginTop: 12, marginHorizontal: 16, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 14,
  },
  descriptionContainer: { marginBottom: 10 },
  descriptionText: { fontSize: 14, lineHeight: 20, color: '#fff' },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 10,
  },
  dateItem: { flex: 1, alignItems: 'center' },
  dateLabel: { fontSize: 12, color: '#fff', marginTop: 2 },
  dateValue: { fontSize: 14, fontWeight: '600', color: '#fff', marginTop: 2 },
  dateDivider: {
    width: 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 10,
  },

  // Sections
  section: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333' },
  infoButtonGrayCircle: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#444', alignItems: 'center', justifyContent: 'center',
  },

  // Activities
  noActivitiesContainer: { padding: 16, alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 8 },
  noActivitiesText: { color: '#888', fontSize: 14 },
  activitiesContainer: { gap: 8 },
  activityRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  activityIconContainer: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#4A90E2', alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 15, fontWeight: '600', color: '#333' },
  activitySubText: { fontSize: 12, color: '#666', marginTop: 2 },
  activityPoints: { alignItems: 'center' },
  pointsValue: { fontSize: 16, fontWeight: 'bold', color: '#4A90E2' },
  pointsLabel: { fontSize: 10, color: '#666' },
  showMoreButton: {
    alignSelf: 'center', marginTop: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#444',
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 12,
    borderRadius: 12, overflow: 'hidden',
  },
  tabButton: {
    flex: 1, paddingVertical: 14, alignItems: 'center', backgroundColor: '#f0f0f0',
  },
  activeTabButton: {
    backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: '#4A90E2',
  },
  tabButtonText: { fontSize: 15, fontWeight: '500', color: '#666' },
  activeTabText: { color: '#4A90E2', fontWeight: '600' },

  // Map Section
  mapSection: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 12, overflow: 'hidden',
  },

  // Leaderboard
  participantsCount: { fontSize: 13, color: '#666', marginBottom: 6 },
  noParticipantsContainer: {
    padding: 16, alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 8,
  },
  noParticipantsText: { color: '#888', fontSize: 14 },
  leaderboardContainer: { gap: 8 },
  participantRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 12,
  },
  firstPlaceRow: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  secondPlaceRow: {
    backgroundColor: 'rgba(192, 192, 192, 0.1)', borderWidth: 1, borderColor: 'rgba(192, 192, 192, 0.3)',
  },
  thirdPlaceRow: {
    backgroundColor: 'rgba(205, 127, 50, 0.1)', borderWidth: 1, borderColor: 'rgba(205, 127, 50, 0.3)',
  },
  currentUserRow: {
    borderWidth: 1, borderColor: '#4A90E2',
  },
  rankContainer: {
    width: 34, alignItems: 'center', marginRight: 8,
  },
  rankText: { fontSize: 14, fontWeight: 'bold', color: '#666' },
  medalIcon: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ccc',
  },
  goldMedal: { backgroundColor: '#FFD700' },
  silverMedal: { backgroundColor: '#C0C0C0' },
  bronzeMedal: { backgroundColor: '#CD7F32' },
  medalText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  participantAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },
  participantInfo: { flex: 1 },
  participantName: { fontSize: 14, fontWeight: '600', color: '#333' },
  participantStatus: { fontSize: 12, color: '#666' },
  scoreContainer: { alignItems: 'center' },
  scoreValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  scoreLabel: { fontSize: 10, color: '#666' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalContainer: {
    width: '85%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 16, padding: 20,
  },
  modalContent: {},
  modalTitle: {
    fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 16, textAlign: 'center',
  },
  modalBodyText: {
    fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 20, textAlign: 'center',
  },
  modalCloseButton: {
    backgroundColor: '#4A90E2', paddingVertical: 10, borderRadius: 8, alignItems: 'center',
  },
  modalCloseButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});