import React, { useState, useEffect } from 'react';
import { 
  Platform, // Add this import
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Modal,
  Alert,
  ActivityIndicator,
  TextInput
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { Arena } from '../components/Arena';
import { useArenaStore } from '../lib/arenaStore';
import { calculateSafeZoneRadius, DEFAULT_SURVIVAL_SETTINGS } from '../lib/survivalUtils';

// Create a simple testing component for survival challenges
export default function SurvivalChallengeTest() {
  // State to store the challenge ID to test
  const [challengeId, setChallengeId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  // Mock date state
  const [mockDate, setMockDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Challenge details
  const [challenge, setChallenge] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [userParticipant, setUserParticipant] = useState<any>(null);
  
  // Get some values from arena store
  const { 
    safeZoneRadius, 
    currentDay, 
    totalDays,
    challengeDetails,
    users
  } = useArenaStore();

  // Mock an activity submission
  const [activityPoints, setActivityPoints] = useState(5);
  const [activityType, setActivityType] = useState('Walking');
  
  // Load current user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }
      } catch (err) {
        console.error('Error loading user:', err);
      }
    };
    
    loadUser();
  }, []);
  
  // Initialize the arena store with the specified challenge
  const initializeChallenge = async () => {
    if (!challengeId || !userId) {
      Alert.alert('Missing Data', 'Please enter both Challenge ID and ensure you are logged in.');
      return;
    }
    
    setLoading(true);
    try {
      // 1. Fetch the challenge details
      const { data: challengeData, error: challengeError } = await supabase
        .from('challenges')
        .select('*, survival_settings')
        .eq('id', challengeId)
        .single();
        
      if (challengeError) throw challengeError;
      if (!challengeData) throw new Error('Challenge not found');
      
      if (challengeData.challenge_type !== 'survival') {
        throw new Error('This is not a survival challenge');
      }
      
      setChallenge(challengeData);
      
      // 2. Check if current user is a participant
      const { data: participantData, error: participantError } = await supabase
        .from('challenge_participants')
        .select('*')
        .eq('challenge_id', challengeId)
        .eq('user_id', userId);
        
      if (participantError) throw participantError;
      
      // If user is not a participant, join the challenge
      if (!participantData || participantData.length === 0) {
        const { initializeParticipant } = await import('../lib/survivalUtils');
        
        // Get challenge dates to calculate duration
        const startDate = new Date(challengeData.start_date);
        const endDate = challengeData.end_date ? new Date(challengeData.end_date) : null;
        
        // Calculate total days
        let totalDays = 30; // Default
        if (endDate) {
          totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        }
        
        // Calculate current day based on mock date
        const currentDay = Math.ceil((mockDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Initialize with the appropriate settings
        const newParticipant = initializeParticipant(
          userId,
          challengeId,
          challengeData.survival_settings || challengeData.rules?.survival_settings,
          currentDay,
          totalDays
        );
        
        // Add to database
        const { data: addedParticipant, error: addError } = await supabase
          .from('challenge_participants')
          .insert({
            ...newParticipant,
            status: 'active',
            joined_at: new Date().toISOString(),
            total_points: 0,
            current_streak: 0,
            longest_streak: 0
          })
          .select()
          .single();
          
        if (addError) throw addError;
        
        setUserParticipant(addedParticipant);
      } else {
        setUserParticipant(participantData[0]);
      }
      
      // 3. Load all participants
      const { data: allParticipants, error: allError } = await supabase
        .from('challenge_participants')
        .select(`
          *,
          profile:profiles (
            id,
            nickname,
            avatar_url
          )
        `)
        .eq('challenge_id', challengeId);
        
      if (allError) throw allError;
      setParticipants(allParticipants || []);
      
      // 4. Initialize the arena with this challenge
      // This uses your existing arena store logic
      await useArenaStore.getState().setChallenge(challengeId, userId);
      
      setInitialized(true);
    } catch (err) {
      console.error('Error initializing challenge:', err);
      Alert.alert('Error', err.message || 'Failed to initialize challenge');
    } finally {
      setLoading(false);
    }
  };
  
  // Simulate the passage of time (1 day)
  const advanceDay = async () => {
    // Increment mock date by 1 day
    const nextDate = new Date(mockDate);
    nextDate.setDate(nextDate.getDate() + 1);
    setMockDate(nextDate);
    
    // Use the new date to trigger danger status processing
    processDangerStatus(nextDate);
  };
  
  // Process danger status for all participants based on the new date
  const processDangerStatus = async (date: Date) => {
    if (!challenge || !userParticipant) return;
    
    setLoading(true);
    try {
      // Get participant data from the database
      const { data: participant, error: participantError } = await supabase
        .from('challenge_participants')
        .select('*')
        .eq('id', userParticipant.id)
        .single();
        
      if (participantError) throw participantError;
      if (!participant) throw new Error('Participant not found');
      
      // Get survival settings
      const survivalSettings = challenge.survival_settings || 
                              challenge.rules?.survival_settings || 
                              DEFAULT_SURVIVAL_SETTINGS;
                              
      // Calculate challenge duration
      const startDate = new Date(challenge.start_date);
      const endDate = challenge.end_date ? new Date(challenge.end_date) : null;
      
      // Default duration if open-ended (30 days)
      let effectiveEndDate = endDate;
      if (!endDate) {
        effectiveEndDate = new Date(startDate);
        effectiveEndDate.setDate(startDate.getDate() + 30);
      }
      
      const totalDays = Math.ceil((effectiveEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const currentDay = Math.ceil((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate today's safe zone radius
      const safeZoneRadius = calculateSafeZoneRadius(currentDay, totalDays, survivalSettings);
      
      // Determine if user is in danger
      const isInDanger = participant.distance_from_center > safeZoneRadius;
      
      // Update danger days and process lives
      let daysInDanger = participant.days_in_danger || 0;
      let lives = participant.lives;
      let isEliminated = participant.is_eliminated;
      
      if (isInDanger) {
        // Increment danger days
        daysInDanger += 1;
        
        // Determine elimination threshold
        const eliminationThreshold = survivalSettings.elimination_threshold || 3;
        
        // Check if user loses a life
        if (daysInDanger >= eliminationThreshold) {
          lives = Math.max(0, lives - 1);
          daysInDanger = 0; // Reset after losing a life
          
          // If no lives left, eliminate
          if (lives <= 0) {
            isEliminated = true;
          }
        }
      } else {
        // Reset danger days if not in danger
        daysInDanger = 0;
      }
      
      // Update participant in database
      const { data: updatedParticipant, error: updateError } = await supabase
        .from('challenge_participants')
        .update({
          days_in_danger: daysInDanger,
          lives: lives,
          is_eliminated: isEliminated
        })
        .eq('id', participant.id)
        .select()
        .single();
        
      if (updateError) throw updateError;
      
      // Update local state
      setUserParticipant(updatedParticipant);
      
      // Refresh the arena
      await useArenaStore.getState().fetchParticipants(challengeId, userId);
      
      // Show alert with status update
      Alert.alert(
        'Day Advanced',
        `New date: ${date.toLocaleDateString()}\n` +
        `Safe zone radius: ${safeZoneRadius.toFixed(2)}\n` +
        `In danger: ${isInDanger ? 'Yes' : 'No'}\n` +
        `Danger days: ${daysInDanger}\n` +
        `Lives remaining: ${lives}\n` +
        `Eliminated: ${isEliminated ? 'Yes' : 'No'}`
      );
    } catch (err) {
      console.error('Error processing danger status:', err);
      Alert.alert('Error', err.message || 'Failed to process danger status');
    } finally {
      setLoading(false);
    }
  };
  
  // Log a new activity
  const logActivity = async () => {
    if (!challenge || !userParticipant) return;
    
    setLoading(true);
    try {
      // 1. First, log the activity in the activities table
      const { data: activity, error: activityError } = await supabase
        .from('activities')
        .insert({
          user_id: userId,
          activity_type: activityType,
          duration: 30, // 30 minutes
          distance: 2.5, // 2.5 km
          calories: 200,
          steps: 5000,
          metric: 'time', // Using time as the metric
          created_at: mockDate.toISOString(),
          source: 'manual'
        })
        .select()
        .single();
        
      if (activityError) throw activityError;
      
      // 2. Process the activity for the challenge
      // This would normally be done by the updateChallengesWithActivity function
      // But for testing, we'll manually update the participant's position
      
      // Get survival settings
      const survivalSettings = challenge.survival_settings || 
                              challenge.rules?.survival_settings || 
                              DEFAULT_SURVIVAL_SETTINGS;
      
      // Import calculation function                        
      const { calculateNewDistance } = await import('../lib/survivalUtils');
      
      // Calculate new distance
      const currentDistance = userParticipant.distance_from_center;
      
      // Calculate challenge duration
      const startDate = new Date(challenge.start_date);
      const endDate = challenge.end_date ? new Date(challenge.end_date) : null;
      
      // Default duration if open-ended (30 days)
      let effectiveEndDate = endDate;
      if (!endDate) {
        effectiveEndDate = new Date(startDate);
        effectiveEndDate.setDate(startDate.getDate() + 30);
      }
      
      const totalDays = Math.ceil((effectiveEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const currentDay = Math.ceil((mockDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate the new distance
      const newDistance = calculateNewDistance(
        currentDistance,
        activityPoints, // Points awarded
        10, // Assume max possible points is 10
        survivalSettings,
        currentDay,
        totalDays
      );
      
      // Update the participant with new distance and points
      const { data: updatedParticipant, error: updateError } = await supabase
        .from('challenge_participants')
        .update({
          distance_from_center: newDistance,
          total_points: userParticipant.total_points + activityPoints,
          last_activity_date: mockDate.toISOString()
        })
        .eq('id', userParticipant.id)
        .select()
        .single();
        
      if (updateError) throw updateError;
      
      // Update local state
      setUserParticipant(updatedParticipant);
      
      // Refresh the arena
      await useArenaStore.getState().refreshParticipant(updatedParticipant);
      
      // Show success alert
      Alert.alert(
        'Activity Logged',
        `Activity: ${activityType}\n` +
        `Points: ${activityPoints}\n` +
        `Previous distance: ${currentDistance.toFixed(2)}\n` +
        `New distance: ${newDistance.toFixed(2)}\n` +
        `Total points: ${updatedParticipant.total_points}`
      );
    } catch (err) {
      console.error('Error logging activity:', err);
      Alert.alert('Error', err.message || 'Failed to log activity');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Survival Challenge Tester</Text>
      
      {/* Challenge selection */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Challenge ID:</Text>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            value={challengeId}
            onChangeText={setChallengeId}
            placeholder="Enter challenge ID"
          />
          <TouchableOpacity 
            style={styles.button}
            onPress={initializeChallenge}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Loading...' : 'Initialize'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Mock date controls */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Test Date:</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateText}>{mockDate.toLocaleDateString()}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={advanceDay}
            disabled={loading || !initialized}
          >
            <Text style={styles.buttonText}>Advance Day</Text>
          </TouchableOpacity>
        </View>
        
        {showDatePicker && (
          <DateTimePicker
            value={mockDate}
            mode="date"
            display="spinner"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setMockDate(selectedDate);
              }
            }}
          />
        )}
      </View>
      
      {/* Activity logging */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Log Activity:</Text>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            value={activityPoints.toString()}
            onChangeText={(text) => setActivityPoints(parseInt(text) || 0)}
            keyboardType="numeric"
            placeholder="Points"
          />
          <TouchableOpacity 
            style={styles.button}
            onPress={logActivity}
            disabled={loading || !initialized}
          >
            <Text style={styles.buttonText}>Log Activity</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* User status */}
      {userParticipant && (
        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>User Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Distance:</Text>
            <Text style={styles.statusValue}>
              {userParticipant.distance_from_center.toFixed(2)}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Lives:</Text>
            <Text style={styles.statusValue}>{userParticipant.lives}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Days in Danger:</Text>
            <Text style={styles.statusValue}>{userParticipant.days_in_danger}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Total Points:</Text>
            <Text style={styles.statusValue}>{userParticipant.total_points}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Eliminated:</Text>
            <Text style={styles.statusValue}>
              {userParticipant.is_eliminated ? 'Yes' : 'No'}
            </Text>
          </View>
        </View>
      )}
      
      {/* Challenge info */}
      {challenge && (
        <View style={styles.statusCard}>
          <Text style={styles.cardTitle}>Challenge Info</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Name:</Text>
            <Text style={styles.statusValue}>{challenge.title}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Start Date:</Text>
            <Text style={styles.statusValue}>
              {new Date(challenge.start_date).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>End Date:</Text>
            <Text style={styles.statusValue}>
              {challenge.end_date 
                ? new Date(challenge.end_date).toLocaleDateString() 
                : 'Open-ended'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Current Day:</Text>
            <Text style={styles.statusValue}>{currentDay}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Total Days:</Text>
            <Text style={styles.statusValue}>{totalDays}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Safe Zone Radius:</Text>
            <Text style={styles.statusValue}>
              {safeZoneRadius ? (safeZoneRadius / (ARENA_SIZE / 2)).toFixed(2) : 'N/A'}
            </Text>
          </View>
        </View>
      )}
      
      {/* Arena visualization */}
      {initialized && (
        <View style={styles.arenaContainer}>
          <Text style={styles.cardTitle}>Arena Visualization</Text>
          <Arena />
        </View>
      )}
      
      {loading && (
        <Modal transparent visible={loading}>
          <View style={styles.loadingModal}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

// Get actual arena size from the Arena component
const ARENA_SIZE = 400; // Default value, should match your Arena component

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    fontSize: 16,
    color: '#1f2937',
  },
  button: {
    height: 48,
    paddingHorizontal: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  dateButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#1f2937',
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statusLabel: {
    fontSize: 15,
    color: '#6b7280',
  },
  statusValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  arenaContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  loadingModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 12,
  },
});