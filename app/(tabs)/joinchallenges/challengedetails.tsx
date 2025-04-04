// app/(tabs)/joinchallenges/challengedetails.tsx
// This file exports ChallengeDetailsScreen as a default export
import { subscribeToRaceUpdates, updateRacePosition } from '../../../lib/racetrack';
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
  FlatList,
  Alert,
  Pressable
} from 'react-native';
import CheckpointProgress from '../../../components/CheckpointProgress';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { useUser, generateAvatarUrl } from '../../../components/UserContext';
import MultiAvatarRaceTrack from '../../../components/RaceTrackComponent';
import { Arena } from '../../../components/Arena';
import { ArenaHeader } from '../../../components/ArenaHeader';
import { useArenaStore } from '../../../lib/arenaStore';

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
    totalCheckpoints?: number;
    pointsPerCheckpoint?: number;
  };
  survival_settings?: {
    initial_safe_zone_ratio: number;
    daily_danger_growth: number;
    workout_recovery: number;
    elimination_days: number;
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
  lives?: number;
  days_in_danger?: number;
  distance_from_center?: number;
  angle?: number;
  is_eliminated?: boolean;
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

// Define component
function ChallengeDetailsScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ChallengeDetailsContent />
    </>
  );
}

// Export component as default
export default ChallengeDetailsScreen;

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
  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  // Friend selection
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);

  // 1) Fetch current user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUserId(data.user.id);
        console.log('Current user ID set to:', data.user.id);
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

  const renderArena = () => {
    return (
      <View style={styles.arenaContainer}>
        <Arena />
        {!realTimeConnected && arenaInitialized && (
          <View style={styles.connectionWarning}>
            <Text style={styles.connectionWarningText}>
              ⚠️ Real-time updates unavailable
            </Text>
          </View>
        )}
      </View>
    );
  };
  const handleParticipantLongPress = (participant: Participant) => {
    // Only the creator can remove participants
    if (challenge?.creator_id !== currentUserId) return;
  
    // Prevent creator from removing themselves
    if (participant.user_id === currentUserId) {
      Alert.alert("Not allowed", "You cannot remove yourself from your own challenge.");
      return;
    }
  
    Alert.alert(
      "Remove Participant",
      `Are you sure you want to remove ${participant.profile?.nickname || 'this user'} from the challenge?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeParticipant(participant),
        },
      ]
    );
  };
  
  const removeParticipant = async (participant: Participant) => {
    try {
      // 1. Remove from challenge_participants
      await supabase
        .from('challenge_participants')
        .delete()
        .eq('id', participant.id);
  
      // 2. Also remove any invites for this user in this challenge
      // Use the current challenge_id from route params since participant might not have it
      await supabase
        .from('challenge_invites')
        .delete()
        .eq('challenge_id', challenge_id)
        .eq('receiver_id', participant.user_id);
  
      Alert.alert(
        "Removed",
        `${participant.profile?.nickname || 'User'} has been removed from the challenge.`
      );
  
      await fetchParticipants(); // refresh the list
    } catch (err) {
      console.error('Error removing participant:', err);
      Alert.alert("Error", "Failed to remove participant. Please try again.");
    }
  };
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
          lives,
          days_in_danger,
          distance_from_center,
          angle,
          is_eliminated,
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

  // 4) Fetch challenge activities and challenge details (including rules)
  const fetchChallengeActivities = useCallback(async () => {
    if (!challenge_id) return;
    try {
      // First check if the challenge has pointsPerCheckpoint in its rules
      const { data: challengeData, error: challengeError } = await supabase
        .from('challenges')
        .select('rules')
        .eq('id', challenge_id)
        .single();
        
      if (challengeError) throw challengeError;
      
      // Log the challenge rules to debug
      if (challengeData?.rules) {
        console.log('Challenge rules:', {
          pointsPerCheckpoint: challengeData.rules.pointsPerCheckpoint,
          totalCheckpoints: challengeData.rules.totalCheckpoints
        });
      }
      
      // Now fetch the activities with all details
      const { data, error } = await supabase
        .from('challenge_activities')
        .select('*')
        .eq('challenge_id', challenge_id);

      if (error) throw error;
      if (data && data.length > 0) {
        const activityMap = new Map();
        data.forEach((item) => {
          console.log('Challenge activity details:', item);
          activityMap.set(item.activity_type, {
            activity_type: item.activity_type,
            points: item.points,
            target_value: typeof item.target_value === 'number' ? item.target_value : 0,
            metric: item.metric || 'count', // Store the metric
            timeframe: item.timeframe || 'day',
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
  
  // Setup arena for survival challenges
  const [arenaInitialized, setArenaInitialized] = useState(false);
  const [realTimeConnected, setRealTimeConnected] = useState(false);
  
  // Setup arena for survival challenges with better error handling
  useEffect(() => {
    if (challenge?.challenge_type === 'survival' && currentUserId && challenge_id) {
      console.log('Setting up arena for survival challenge:', challenge_id);
      
      // Initialize arena data when map tab is active
      if (activeTab === 'map' && !arenaInitialized) {
        setLoading(true);
        
        // Initialize the arena with the challenge data
        const setupArena = async () => {
          try {
            // Clear previous state first
            useArenaStore.getState().reset();
            
            // Initialize with current challenge data
            await useArenaStore.getState().setChallenge(challenge_id as string, currentUserId);
            console.log('Arena setup complete');
            
            // Mark as initialized
            setArenaInitialized(true);
          } catch (err) {
            console.error('Error setting up arena:', err);
            setError('Could not initialize arena. Please try refreshing.');
          } finally {
            setLoading(false);
          }
        };
        
        setupArena();
      }
      
      // Setup real-time updates with Supabase subscription
      const setupRealTimeUpdates = () => {
        const channel = supabase
          .channel(`challenge_arena_${challenge_id}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'challenge_participants',
            filter: `challenge_id=eq.${challenge_id}`
          }, (payload) => {
            // Handle real-time updates to participants
            console.log('Participant update received:', payload.new);
            
            // Update the participant in ArenaStore
            if (arenaInitialized) {
              useArenaStore.getState().refreshParticipant(payload.new);
            }
            
            // Also update local participants state if needed
            setParticipants(prev => prev.map(p => 
              p.id === payload.new.id ? { ...p, ...payload.new } : p
            ));
          })
          .subscribe((status) => {
            console.log(`Arena real-time subscription status: ${status}`);
            setRealTimeConnected(status === 'SUBSCRIBED');
          });
          
        return () => {
          supabase.removeChannel(channel);
        };
      };
      
      // Only setup real-time if we're on the map tab
      const cleanup = activeTab === 'map' ? setupRealTimeUpdates() : undefined;
      
      return () => {
        // Clean up function
        if (cleanup) cleanup();
        
        // Reset arena state if navigating away from map tab
        if (activeTab !== 'map' && arenaInitialized) {
          useArenaStore.getState().reset();
          setArenaInitialized(false);
        }
      };
    }
  }, [challenge, currentUserId, challenge_id, activeTab, arenaInitialized]);
  // Pull-to-refresh
  // Fetch friends list for invitations
  const fetchFriends = useCallback(async () => {
    if (!currentUserId) return;
    
    try {
      // Query the friends table using the correct table name
      const { data, error } = await supabase
        .from('friends')
        .select(`
          friend:profiles!friends_friend_id_fkey (
            id,
            nickname,
            avatar_url
          )
        `)
        .eq('user_id', currentUserId);
      
      if (error) throw error;
      
      // Map to a simpler format
      const friendsList = (data || []).map((item) => item.friend);
      setFriends(friendsList);
      
      console.log('Friends fetched:', friendsList.length);
      
    } catch (err) {
      console.error('Error fetching friends:', err);
      
      // Fallback: Try querying the friend_requests table if friends table fails
      try {
        const { data, error } = await supabase
          .from('friend_requests')
          .select(`
            receiver:profiles!friend_requests_receiver_id_fkey (
              id,
              nickname,
              avatar_url
            )
          `)
          .eq('sender_id', currentUserId)
          .eq('status', 'accepted');
        
        if (error) throw error;
        
        const friendsList = (data || []).map((item) => item.receiver);
        setFriends(friendsList);
        
        console.log('Friends fetched from requests:', friendsList.length);
      } catch (secondErr) {
        console.error('Error fetching from friend_requests:', secondErr);
        // Show error message in the UI
        setFriends([]);
      }
    }
  }, [currentUserId]);
  
  // Load friends when the invite modal is opened
  useEffect(() => {
    if (showInviteModal) {
      fetchFriends();
    }
  }, [showInviteModal, fetchFriends]);
  
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
    
    // Subscribe to challenge_participants table changes for this challenge
    const channel = supabase
      .channel(`challenge_points_${challenge_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'challenge_participants',
          filter: `challenge_id=eq.${challenge_id}`,
        },
        (payload) => {
          console.log('Real-time challenge update received:', payload.new);
          
          // Get the updated participant data
          const updatedParticipant = payload.new;
          
          // Update local state with the new position and points information
          setParticipants((prev) => {
            const updatedParticipants = prev.map((p) =>
              p.id === updatedParticipant.id
                ? {
                    ...p,
                    total_points: updatedParticipant.total_points ?? p.total_points,
                    map_position: 
                      typeof updatedParticipant.map_position === 'number' ? 
                      updatedParticipant.map_position : 
                      p.map_position,
                    current_streak: updatedParticipant.current_streak ?? p.current_streak,
                    longest_streak: updatedParticipant.longest_streak ?? p.longest_streak,
                    // Add survival-specific fields
                    lives: updatedParticipant.lives ?? p.lives,
                    days_in_danger: updatedParticipant.days_in_danger ?? p.days_in_danger,
                    distance_from_center: updatedParticipant.distance_from_center ?? p.distance_from_center,
                    angle: updatedParticipant.angle ?? p.angle,
                    is_eliminated: updatedParticipant.is_eliminated ?? p.is_eliminated,
                  }
                : p
            );
            
            // Sort the participants by total points in descending order for the leaderboard
            return updatedParticipants.sort((a, b) => 
              (b.total_points || 0) - (a.total_points || 0)
            );
          });
        }
      )
      .subscribe((status) => {
        console.log(`Challenge points subscription status: ${status}`);
      });
  
    return () => {
      console.log('Cleaning up subscription for challenge:', challenge_id);
      supabase.removeChannel(channel);
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
      // Get points threshold from challenge rules or default to 10
      const pointsPerStep = challenge?.rules?.pointsPerCheckpoint || 10;
      const totalPoints = step * pointsPerStep;
      
      console.log('Updating participant in DB:', {
        participantId: participantInThisChallenge.id,
        userId: userId,
        step: step,
        totalPoints: totalPoints
      });
  
      // Important: Don't set map_position directly to step value
      // The map_position should be calculated in the backend based on total_points
      // Only update the total_points, the position will be calculated by the
      // challenge point system based on pointsThreshold
      const { data, error } = await supabase
        .from('challenge_participants')
        .update({
          total_points: totalPoints,
          last_activity_date: new Date().toISOString()
        })
        .eq('id', participantInThisChallenge.id)
        .select();
  
      if (error) throw error;
      console.log('Successfully updated participant row in DB!', data);
      
      // Update local state - only change total_points
      // Let the real-time subscription update the map_position
      // when the backend calculates it based on the points threshold
      setParticipants(prev => prev.map(p => 
        p.id === participantInThisChallenge.id 
          ? {...p, total_points: totalPoints} 
          : p
      ));
      
    } catch (err) {
      console.error('Error updating participant position:', err);
    }
  };

  // 8) Convert participants to RaceTrack format
  const getRaceParticipants = (): RaceParticipant[] => {
    if (!participants.length) return [];
    
    // Always ensure we have participants visible in the race view
    return participants.map((p) => {
      // Get points threshold from challenge rules or default to 10
      const pointsThreshold = challenge?.rules?.pointsPerCheckpoint || 10;
      
      // Calculate position from points, ensuring it's always accurate
      // If map_position is present, use it; otherwise calculate from total_points
      let step = 0;
      if (typeof p.map_position === 'number' && p.map_position >= 0) {
        step = p.map_position;
      } else if (p.total_points) {
        step = Math.floor(p.total_points / pointsThreshold);
      }
      
      // Is this the current user?
      const isCurrentUser = currentUserId ? p.user_id === currentUserId : false;
      
      console.log(`Participant ${p.profile?.nickname} position:`, {
        total_points: p.total_points,
        map_position: p.map_position,
        calculated_step: step,
        pointsThreshold,
        isCurrentUser
      });
  
      return {
        id: p.id,
        user_id: p.user_id,
        avatar_url: generateAvatarUrl(p.profile?.nickname || 'User'),
        nickname: p.profile?.nickname || 'Unknown',
        currentStep: step,
        isCurrentUser: isCurrentUser,
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
  function formatActivityTarget(activity: any): string {
    // Get the target value and metric
    const targetValue = activity.target_value;
    const metric = activity.metric || '';
    const useKilometers = settings?.useKilometers !== undefined ? settings.useKilometers : true;

    // Set a default value if target value is missing or zero
    if (!targetValue || targetValue <= 0) {
      // Use a default value based on the activity type instead of "Custom Target"
      switch(metric.toLowerCase()) {
        case 'time': return '1 hour';
        case 'distance_km': return useKilometers ? '1 km' : '0.6 mi';
        case 'distance_miles': return useKilometers ? '1.6 km' : '1 mi';
        case 'calories': return '100 cal';
        case 'steps': return '1000 steps';
        case 'count': return '10 reps';
        default: return '1';
      }
    }
    
    // Format based on metric type
    switch(metric.toLowerCase()) {
      case 'time':
        // For time, the target_value is stored in hours in the database
        if (targetValue === 1) {
          return '1 hour';
        } else {
          return `${targetValue} hours`;
        }
      case 'distance_km':
        if (useKilometers) {
          return `${targetValue} km`;
        } else {
          // Convert km to miles (1 km = 0.621371 miles)
          const miles = (targetValue * 0.621371).toFixed(1);
          return `${miles} mi`;
        }
      case 'distance_miles':
        if (useKilometers) {
          // Convert miles to km (1 mile = 1.60934 km)
          const km = (targetValue * 1.60934).toFixed(1);
          return `${km} km`;
        } else {
          return `${targetValue} mi`;
        }
      case 'calories':
        return `${targetValue} cal`;
      case 'steps':
        return `${targetValue} steps`;
      case 'count':
        return `${targetValue} reps`;
      default:
        // If there's a target value but unknown/custom metric
        return `${targetValue} ${metric || ''}`;
    }
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
        <ActivityIndicator size="large" color="#00000" />
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
              onPress={() => router.push('/joinchallenges/challengesettings')} 
              style={styles.backButtonContainer}
            >
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.challengeName} numberOfLines={1}>
              {challenge.title}
            </Text>

            <TouchableOpacity
              onPress={() => setShowInviteModal(true)} 
              style={styles.inviteButtonHeader}
            >
              <Ionicons name="person-add-outline" size={18} color="#fff" />
              <Text style={styles.inviteButtonText}>Invite</Text>
            </TouchableOpacity>
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
                    <View style={styles.activityMetricContainer}>
                      <Text style={styles.activitySubText}>
                        <Text style={{fontWeight: '600'}}>Target:</Text> {formatActivityTarget(activity)}
                      </Text>
                      <Text style={[styles.activitySubText, {marginLeft: 4}]}>
                        <Text style={{fontWeight: '600'}}>Frequency:</Text> {activity.timeframe ? (activity.timeframe === 'day' ? 'Daily' : 'Weekly') : timeframeLabel}
                      </Text>
                    </View>
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
              {challenge?.challenge_type === 'survival' ? 'Arena' : 'Map'}
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
  <Pressable
    key={participant.id}
    onLongPress={() => handleParticipantLongPress(participant)}
    android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
    style={({ pressed }) => [
      styles.participantRow,
      index === 0 && styles.firstPlaceRow,
      index === 1 && styles.secondPlaceRow,
      index === 2 && styles.thirdPlaceRow,
      participant.user_id === currentUserId && styles.currentUserRow,
      pressed ? { opacity: 0.7 } : null,
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
        uri: generateAvatarUrl(participant.profile?.nickname || 'User'),
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
  </Pressable>
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
    {raceParticipants.length > 0 ? (
      challenge.challenge_type === 'survival' ? (
        <View style={styles.arenaContainer}>
          <Arena />
        </View>
      ) : (
        <>
          <MultiAvatarRaceTrack
            participants={raceParticipants}
            containerHeight={height * 0.5}
            showTitle={true}
            challengeId={challenge_id as string}
            onMoveParticipant={handleMoveParticipant}
            totalCheckpoints={challenge?.rules?.totalCheckpoints || undefined}
            key={`racetrack-${challenge_id}-${participants.length}`}
          />
          
          {/* Checkpoint Progress for current user */}
          {currentUserId && (
            <>
              {(() => {
                // Find current user's participant data
                const currentUserParticipant = participants.find(p => p.user_id === currentUserId);
                
                if (!currentUserParticipant) return null;
                
                // Get points threshold from challenge rules
                const pointsThreshold = challenge?.rules?.pointsPerCheckpoint || 10;
                
                // Calculate current progress values
                const totalPoints = currentUserParticipant.total_points || 0;
                const checkpoint = Math.floor(totalPoints / pointsThreshold);
                const previousCheckpointThreshold = checkpoint * pointsThreshold;
                const nextCheckpointThreshold = (checkpoint + 1) * pointsThreshold;
                
                return (
                  <View style={styles.checkpointProgressContainer}>
                    <CheckpointProgress
                      currentPoints={totalPoints}
                      nextCheckpointThreshold={nextCheckpointThreshold}
                      previousCheckpointThreshold={previousCheckpointThreshold}
                      totalPointsAccumulated={totalPoints}
                      checkpointLevel={checkpoint + 1}
                    />
                  </View>
                );
              })()}
            </>
          )}
        </>
      )
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
              <Text style={styles.modalTitle}>{
                challenge.challenge_type === 'race' ? 'Race Challenge' : 
                challenge.challenge_type === 'survival' ? 'Survival Challenge' : 
                challenge.challenge_type === 'streak' ? 'Streak Challenge' : 
                'Challenge'
              }</Text>
              <Text style={styles.modalBodyText}>
                {challenge.challenge_type === 'race' ? (
                  <>
                    <Text style={styles.modalBodyTextBold}>How Race Challenges Work:</Text>{'\n\n'}
                    Race to the finish line by completing activities and earning points! {'\n\n'}
                    <Text style={styles.modalBodyTextBold}>What You Need to Know:</Text>{'\n'}
                    • Each activity completed = points earned based on target values{'\n'}
                    • Points automatically move you forward on the race track{'\n'}
                    • Checkpoints mark your progress along the way{'\n'}
                    • Everyone can see each other's positions in real-time{'\n'}
                    • First to reach the finish line wins{'\n\n'}
                    <Text style={styles.modalBodyTextBold}>Pro Tip:</Text> Focus on high-point activities to advance faster!
                  </>
                ) : challenge.challenge_type === 'survival' ? (
                  <>
                    <Text style={styles.modalBodyTextBold}>How Survival Challenges Work:</Text>{'\n\n'}
                    Stay in the safe zone by remaining active - or risk elimination! {'\n\n'}
                    <Text style={styles.modalBodyTextBold}>What You Need to Know:</Text>{'\n'}
                    • The safe zone shrinks daily as the challenge progresses{'\n'}
                    • Complete activities to move toward the center of the arena{'\n'}
                    • Being outside the safe zone for consecutive days costs lives{'\n'}
                    • When you lose all lives, you're eliminated{'\n'}
                    • Last participant standing wins{'\n\n'}
                    <Text style={styles.modalBodyTextBold}>Pro Tip:</Text> Don't miss more than 1-2 days in a row to stay safe!
                  </>
                ) : (
                  <>
                    <Text style={styles.modalBodyTextBold}>How This Challenge Works:</Text>{'\n\n'}
                    Complete activities to earn points and compete with friends! {'\n\n'}
                    <Text style={styles.modalBodyTextBold}>What You Need to Know:</Text>{'\n'}
                    • Complete listed activities to earn points{'\n'}
                    • Track your progress on the leaderboard{'\n'}
                    • Highest point total at the end wins{'\n\n'}
                  </>
                )}
                <Text style={styles.modalBodyTextBold}>Activity Frequency: {timeframeLabel}</Text>{'\n'}
                Activities must be completed {timeframeLabel.toLowerCase()} to earn points.{'\n\n'}
                <Text style={styles.modalBodyTextBold}>Activity Targets & Points:</Text>{'\n'}
                • Each activity has a specific target (time, distance, etc.){'\n'}
                • Meet or exceed the target to earn the listed points{'\n'}
                • Points are awarded automatically when you log activities
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

      {/* Invite Friends Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.inviteModalContainer}>
          <View style={styles.inviteModalHeader}>
            <Text style={styles.inviteModalTitle}>Invite Friends</Text>
            <TouchableOpacity onPress={() => setShowInviteModal(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.inviteModalContent}>
            {friends.length > 0 ? (
              <FlatList
                data={friends}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.friendRow,
                      selectedFriends.includes(item.id) && styles.selectedFriendRow,
                    ]}
                    onPress={() => {
                      setSelectedFriends((prev) =>
                        prev.includes(item.id)
                          ? prev.filter((id) => id !== item.id)
                          : [...prev, item.id]
                      );
                    }}
                  >
                    <Image
                      source={{ 
                        uri: generateAvatarUrl(item.nickname || 'User')
                      }}
                      style={styles.friendAvatar}
                    />
                    <Text style={styles.friendName}>{item.nickname || 'Unknown User'}</Text>
                    <View style={[
                      styles.checkbox, 
                      selectedFriends.includes(item.id) && styles.checkboxSelected
                    ]}>
                      {selectedFriends.includes(item.id) && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={styles.noFriendsContainer}>
                <Ionicons name="people" size={48} color="#ccc" />
                <Text style={styles.noFriendsText}>Loading friends list...</Text>
              </View>
            )}
          </View>

          <View style={styles.inviteModalFooter}>
            <TouchableOpacity
              style={[
                styles.inviteModalButton,
                selectedFriends.length > 0 ? styles.inviteButtonActive : styles.inviteButtonInactive,
                inviteLoading && styles.inviteButtonDisabled
              ]}
              disabled={selectedFriends.length === 0 || inviteLoading}
              onPress={async () => {
                if (selectedFriends.length === 0) return;
                
                setInviteLoading(true);
                try {
                  // Handle invite logic based on if creator or not
                  const isCreator = challenge?.creator_id === currentUserId;
                  
                  for (const friendId of selectedFriends) {
                    await supabase.from('challenge_invites').insert({
                      challenge_id: challenge_id,
                      sender_id: currentUserId,
                      receiver_id: friendId,
                      status: 'pending',
                      created_at: new Date().toISOString(),
                    });
                  }
                  
                  // Success toast or message with more specific information
                  const successMessage = isCreator 
                    ? "Friends added to challenge successfully! They will receive a notification about the invite." 
                    : "Invitations sent to the challenge creator for approval!";
                  
                  Alert.alert(
                    "Success",
                    successMessage
                  );
                  
                  // Refresh participants list
                  await fetchParticipants();
                  
                } catch (err) {
                  console.error('Error inviting friends:', err);
                  alert('Failed to send invitations. Please try again.');
                } finally {
                  setInviteLoading(false);
                  setShowInviteModal(false);
                  setSelectedFriends([]);
                }
              }}
            >
              {inviteLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.inviteModalButtonText}>
                    {challenge?.creator_id === currentUserId 
                      ? "Add to Challenge" 
                      : "Send Invitations"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Container & Scroll
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { paddingBottom: 16 },
  // Invite Button in header
  inviteButtonHeader: {
    flexDirection: 'row',
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  connectionWarning: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(251, 191, 36, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  arenaContainer: {
    backgroundColor: '#1a1c23',
    padding: 20,
    alignItems: 'center',
    borderRadius: 12,
    width: '100%',
    position: 'relative',
  },
  connectionWarningText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  // Invite Friends Modal
  inviteModalContainer: {
    height: '70%', // This sets the height to 50% of the screen
    backgroundColor: '#fff',
    marginTop: 'auto',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  inviteModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  inviteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  inviteModalContent: {
    flex: 1,
    padding: 12,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8, // Reduced padding
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedFriendRow: {
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
  },
  friendAvatar: {
    width: 32, // Smaller size
    height: 32, // Smaller size
    borderRadius: 16, // Adjusted for smaller size
    marginRight: 8, // Less margin
  },
  friendName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  noFriendsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noFriendsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    textAlign: 'center',
  },
  inviteModalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  inviteModalButton: {
    backgroundColor: '#00000',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  inviteButtonActive: {
    backgroundColor: '#000000',
  },
  inviteButtonInactive: {
    backgroundColor: '#666666',
  },
  inviteButtonDisabled: {
    opacity: 0.5,
  },
  inviteModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

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
  backButton: { backgroundColor: '#00000', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
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
  activityMetricContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 6,
  },
  activityName: { fontSize: 15, fontWeight: '600', color: '#333' },
  activitySubText: { 
    fontSize: 12, 
    color: '#666', 
    marginTop: 2, 
    backgroundColor: 'rgba(0,0,0,0.05)', 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 4 
  },
  activityPoints: { alignItems: 'center' },
  pointsValue: { fontSize: 16, fontWeight: 'bold', color: '#00000' },
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
    backgroundColor: '#fff', borderBottomWidth: 2, borderBottomColor: '#00000',
  },
  tabButtonText: { fontSize: 15, fontWeight: '500', color: '#666' },
  activeTabText: { color: '#00000', fontWeight: '600' },

  // Map Section
  mapSection: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 12, overflow: 'hidden',
  },
  arenaContainer: {
    backgroundColor: '#1a1c23', padding: 20, alignItems: 'center', borderRadius: 12,
  },
  checkpointProgressContainer: {
    padding: 16,
    backgroundColor: '#fff', 
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
    borderWidth: 1, borderColor: '#00000',
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
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modalContainer: {
    width: '90%', maxWidth: 450, backgroundColor: '#fff', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  modalContent: {},
  modalTitle: {
    fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 16, textAlign: 'center', 
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  modalBodyText: {
    fontSize: 14, color: '#555', lineHeight: 22, marginBottom: 20, textAlign: 'left',
  },
  modalBodyTextBold: {
    fontSize: 16, fontWeight: 'bold', color: '#333', 
  },
  modalCloseButton: {
    backgroundColor: '#00000', paddingVertical: 12, borderRadius: 8, alignItems: 'center',
  },
  modalCloseButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  // Invite Friends Modal Styles
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  inviteModalButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  inviteButtonActive: {
    backgroundColor: '#000000',
  },
  inviteButtonInactive: {
    backgroundColor: '#666666',
  },
  inviteButtonDisabled: {
    opacity: 0.5,
  },
});