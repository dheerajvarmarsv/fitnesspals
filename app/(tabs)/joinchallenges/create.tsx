import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Dimensions,
  Animated,
  Platform,
  Image,
  Easing,
  Pressable,
  StatusBar,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { createChallengeInSupabase } from '../../../lib/challenges';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as Haptics from 'expo-haptics';
import FriendSelectionModal from '../../../components/FriendSelectionModal';

const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;
const isTablet = width >= 768;

type ChallengeMode = 'race' | 'survival' | 'streak' | 'custom';
type Step = 1 | 2 | 3 | 4 | 5;
type GlobalTimeframe = 'day' | 'week';

const ACTIVITY_ICONS: { [key: string]: any } = {
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
  'Stretching': ['#4568DC', '#B06AB3'],
  'Bonus Points': ['#8A2387', '#F27121'],
  Custom: ['#654ea3', '#eaafc8'],
};

const DEFAULT_ACTIVITIES = [
  {
    activityType: 'Walking',
    threshold: '5000 steps',
    points: 2,
    isSelected: false,
  },
  {
    activityType: 'Running',
    threshold: '3 km',
    points: 5,
    isSelected: false,
  },
  {
    activityType: 'Cycling',
    threshold: '5 km',
    points: 4,
    isSelected: false,
  },
  {
    activityType: 'Swimming',
    threshold: '1 km',
    points: 6,
    isSelected: false,
  },
  {
    activityType: 'Workout',
    threshold: '30 min',
    points: 3,
    isSelected: false,
  },
  {
    activityType: 'Yoga',
    threshold: '20 min',
    points: 3,
    isSelected: false,
  },
  {
    activityType: 'Hiking',
    threshold: '4 km',
    points: 5,
    isSelected: false,
  },
  {
    activityType: 'Steps',
    threshold: '10000 steps',
    points: 4,
    isSelected: false,
  },
  {
    activityType: 'Meditation',
    threshold: '15 min',
    points: 2,
    isSelected: false,
  },
  {
    activityType: 'Sleep Quality',
    threshold: '7 hours',
    points: 3,
    isSelected: false,
  },
  {
    activityType: 'Weight Training',
    threshold: '45 min',
    points: 4,
    isSelected: false,
  },
  {
    activityType: 'Cardio Workout',
    threshold: '30 min',
    points: 4,
    isSelected: false,
  },
  {
    activityType: 'High-Intensity',
    threshold: '20 min',
    points: 5,
    isSelected: false,
  },
  {
    activityType: 'Stretching',
    threshold: '10 min',
    points: 2,
    isSelected: false,
  },
  {
    activityType: 'Bonus Points',
    threshold: 'Complete all daily goals',
    points: 5,
    isSelected: false,
  },
];

const CHALLENGE_MODES = [
  {
    id: 'race',
    title: 'RACE',
    icon: '🏁',
    description: 'Compete against friends on a virtual track. First to reach the goal wins!',
    gradient: ['#FF416C', '#FF4B2B'],
  },
  {
    id: 'survival',
    title: 'SURVIVAL',
    icon: '⚔️',
    description: 'Meet the daily target or get eliminated. Last person standing wins!',
    gradient: ['#4776E6', '#8E54E9'],
  },
  {
    id: 'streak',
    title: 'STREAK',
    icon: '🔥',
    description: 'Maintain daily activities to build your streak. Longest streak wins!',
    gradient: ['#FF8008', '#FFC837'],
  },
  {
    id: 'custom',
    title: 'CUSTOM',
    icon: '🎯',
    description: 'Design your own challenge with custom rules and scoring!',
    gradient: ['#11998e', '#38ef7d'],
  },
];

interface ChallengeDetails {
  name: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
  isOpenEnded: boolean;
  globalTimeframe: GlobalTimeframe;
}

interface ActivityRule {
  activityType: string;
  threshold: string;
  points: number;
  isSelected: boolean;
  isCustom?: boolean;
}

// Friend model for the Friend Selection modal
interface Friend {
  id: string;
  nickname: string;
  avatar_url: string;
  selected?: boolean;
}

// Friend Selection Modal component
function LocalFriendSelectionModal({ 
  visible, 
  onClose, 
  onInvite, 
  challengeId
}: { 
  visible: boolean; 
  onClose: () => void; 
  onInvite: (selectedFriends: Friend[]) => void;
  challengeId: string | null;
}) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load friends when modal opens
  useEffect(() => {
    if (visible) {
      loadFriends();
    }
  }, [visible]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get user's friends from supabase
      const { data, error } = await supabase
        .from('friends')
        .select(`
          friend_id,
          friend:profiles!friends_friend_id_fkey (
            id,
            nickname,
            avatar_url
          )
        `);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const friendsList = data.map(item => ({
          id: item.friend_id,
          nickname: item.friend.nickname,
          avatar_url: item.friend.avatar_url,
          selected: false
        }));
        setFriends(friendsList);
      } else {
        setFriends([]);
      }
    } catch (e: any) {
      console.error('Error loading friends:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFriendSelection = (id: string) => {
    setFriends(prev => 
      prev.map(friend => 
        friend.id === id 
          ? { ...friend, selected: !friend.selected } 
          : friend
      )
    );
  };

  const handleInvite = async () => {
    const selectedFriends = friends.filter(f => f.selected);
    if (selectedFriends.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one friend to invite');
      return;
    }

    if (!challengeId) {
      Alert.alert('Error', 'Challenge ID is missing');
      return;
    }

    setInviting(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create invites for each selected friend
      const invites = selectedFriends.map(friend => ({
        challenge_id: challengeId,
        sender_id: user.id,
        receiver_id: friend.id,
        status: 'pending'
      }));

      const { error } = await supabase
        .from('challenge_invites')
        .insert(invites);

      if (error) throw error;
      
      onInvite(selectedFriends);
      onClose();
      Alert.alert('Success', `Invitations sent to ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}!`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send invitations');
    } finally {
      setInviting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.container}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Invite Friends</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={modalStyles.loadingContainer}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Ionicons name="refresh" size={24} color="#4A90E2" />
              </Animated.View>
              <Text style={modalStyles.loadingText}>Loading friends...</Text>
            </View>
          ) : error ? (
            <View style={modalStyles.errorContainer}>
              <Text style={modalStyles.errorText}>{error}</Text>
              <TouchableOpacity 
                style={modalStyles.retryButton}
                onPress={loadFriends}
              >
                <Text style={modalStyles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : friends.length === 0 ? (
            <View style={modalStyles.emptyContainer}>
              <Text style={modalStyles.emptyText}>
                You don't have any friends yet.{'\n'}
                Add friends to invite them to your challenge!
              </Text>
            </View>
          ) : (
            <ScrollView style={modalStyles.friendsList}>
              {friends.map(friend => (
                <TouchableOpacity
                  key={friend.id}
                  style={[
                    modalStyles.friendItem,
                    friend.selected && modalStyles.friendItemSelected
                  ]}
                  onPress={() => toggleFriendSelection(friend.id)}
                >
                  <Image 
                    source={{ uri: friend.avatar_url }} 
                    style={modalStyles.avatar} 
                  />
                  <Text style={modalStyles.friendName}>{friend.nickname}</Text>
                  <View style={[
                    modalStyles.checkbox,
                    friend.selected && modalStyles.checkboxSelected
                  ]}>
                    {friend.selected && (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={modalStyles.footer}>
            <TouchableOpacity
              style={[
                modalStyles.inviteButton,
                (friends.length === 0 || !friends.some(f => f.selected) || inviting) && 
                  modalStyles.inviteButtonDisabled
              ]}
              onPress={handleInvite}
              disabled={friends.length === 0 || !friends.some(f => f.selected) || inviting}
            >
              <Text style={modalStyles.inviteButtonText}>
                {inviting ? 'Sending Invites...' : 'Invite Selected Friends'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function CreateChallenge() {
  // Steps & transitions
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Loading spinner for creation
  const [isCreating, setIsCreating] = useState(false);
  const loadingSpinValue = useRef(new Animated.Value(0)).current;
  const spin = loadingSpinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // User
  const [userId, setUserId] = useState<string | null>(null);

  // Mode & challenge details
  const [selectedMode, setSelectedMode] = useState<ChallengeMode | null>(null);
  const [details, setDetails] = useState<ChallengeDetails>({
    name: '',
    description: '',
    startDate: new Date(new Date().setHours(0, 0, 0, 0)),
    endDate: new Date(new Date().setDate(new Date().getDate() + 14)),
    isOpenEnded: false,
    globalTimeframe: 'day',
  });

  // Activity rules
  const [activities, setActivities] = useState<ActivityRule[]>(DEFAULT_ACTIVITIES);

  // Expanded activity details
  const [expandedActivity, setExpandedActivity] = useState<number | null>(null);

  // Custom activity modal
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customActivity, setCustomActivity] = useState({
    name: '',
    threshold: '',
    points: '3',
  });

  // Friend invitation modal
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [createdChallengeId, setCreatedChallengeId] = useState<string | null>(null);

  // Date pickers
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Fetch user
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        setUserId(data.user.id);
      }
    })();
  }, []);

  // Animate step transitions
  const animateStepTransition = (forward: boolean) => {
    // Fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      // Slide out
      Animated.timing(slideAnim, {
        toValue: forward ? -50 : 50,
        duration: 1,
        useNativeDriver: true,
      }).start(() => {
        // Update step
        setCurrentStep((prev) => (prev + (forward ? 1 : -1)) as Step);
        // Reset slide
        slideAnim.setValue(forward ? 50 : -50);
        // Fade in new
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      });
    });
  };

  // Spinner animation
  useEffect(() => {
    if (isCreating) {
      Animated.loop(
        Animated.timing(loadingSpinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      loadingSpinValue.setValue(0);
    }
  }, [isCreating]);

  // Step 1: Mode selection
  const handleModeSelect = (mode: ChallengeMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMode(mode);
    animateStepTransition(true);
  };

  // Step 3: Activity toggles
  const toggleActivitySelection = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = [...activities];
    updated[index].isSelected = !updated[index].isSelected;
    
    // Expand activity when selected
    if (updated[index].isSelected) {
      setExpandedActivity(index);
    } else if (expandedActivity === index) {
      setExpandedActivity(null);
    }
    
    setActivities(updated);
  };

  const handleExpandActivity = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (expandedActivity === index) {
      setExpandedActivity(null);
    } else {
      setExpandedActivity(index);
    }
  };

  const updateActivityRule = (index: number, field: keyof ActivityRule, value: string | number) => {
    const updated = [...activities];
    (updated[index] as any)[field] = value;
    setActivities(updated);
  };

  // Add custom activity
  const handleAddCustomActivity = () => {
    if (!customActivity.name.trim()) {
      Alert.alert('Activity Name Required', 'Please enter a name for your custom activity');
      return;
    }

    if (!customActivity.threshold.trim()) {
      Alert.alert('Target Required', 'Please enter a target for your custom activity');
      return;
    }

    const points = parseInt(customActivity.points) || 1;

    const newActivity: ActivityRule = {
      activityType: customActivity.name.trim(),
      threshold: customActivity.threshold.trim(),
      points: points,
      isSelected: true,
      isCustom: true,
    };

    setActivities([...activities, newActivity]);
    setCustomActivity({ name: '', threshold: '', points: '3' });
    setShowCustomModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Auto-expand the newly added custom activity
    setExpandedActivity(activities.length);
  };

  // Change global timeframe
  const handleTimeframeChange = (timeframe: GlobalTimeframe) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetails({ ...details, globalTimeframe: timeframe });
  };

  // Navigation
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep === 1 || currentStep === 5) {
      router.back();
    } else {
      animateStepTransition(false);
    }
  };

  // Validation for 'Next' / 'Create'
  const isNextEnabled = () => {
    if (currentStep === 2) {
      return (
        details.name.trim().length > 0 &&
        details.startDate !== null &&
        (details.isOpenEnded || details.endDate !== null)
      );
    }
    if (currentStep === 3) {
      return activities.some((a) => a.isSelected);
    }
    return true;
  };

  // Share & Invite Friends
  const handleShareChallenge = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Share', 'Challenge link copied to clipboard!');
  };

  const handleInviteFriends = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowFriendModal(true);
  };

  // Continue or create
  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Steps 1 -> 2 -> 3 -> 4
    if (currentStep < 4) {
      animateStepTransition(true);
      return;
    }
    // Step 4 -> create challenge
    if (currentStep === 4) {
      try {
        setIsCreating(true);
        const challengeId = await createChallengeInDB();
        setCreatedChallengeId(challengeId);
        setIsCreating(false);
        animateStepTransition(true); // go to step 5
      } catch (err: any) {
        setIsCreating(false);
        Alert.alert('Error', err.message || 'Failed to create challenge');
      }
    }
  };

  // Create in DB
  const createChallengeInDB = async () => {
    if (!userId) throw new Error('You must be logged in first');
    if (!selectedMode) throw new Error('No mode selected');

    const selectedActivities = activities.filter((a) => a.isSelected);
    const newChallenge = await createChallengeInSupabase({
      userId,
      challengeType: selectedMode,
      name: details.name,
      description: details.description,
      startDate: details.startDate,
      endDate: details.endDate,
      isOpenEnded: details.isOpenEnded,
      selectedActivities: selectedActivities.map((act) => ({
        activityType: act.activityType,
        threshold: act.threshold,
        points: act.points,
        timeframe: details.globalTimeframe, // Use global timeframe for all activities
      })),
      globalTimeframe: details.globalTimeframe,
    });
    console.log('Created challenge in DB:', newChallenge);
    return newChallenge.id;
  };

  // Progress bar instead of dots
  const renderProgressBar = () => (
    <View style={styles.progressBarContainer}>
      {[1, 2, 3, 4].map((step) => (
        <View
          key={step}
          style={[
            styles.progressBar,
            currentStep >= step && styles.activeProgressBar,
            step < 4 && styles.progressBarMargin,
          ]}
        />
      ))}
    </View>
  );

  // Handle friend invitations
  const handleFriendInvites = (selectedFriends: Friend[]) => {
    console.log('Invited friends:', selectedFriends);
  };

  // Activity item renderer
  const renderActivityItem = ({ item, index }: { item: ActivityRule; index: number }) => {
    const isExpanded = expandedActivity === index;
    const iconName = ACTIVITY_ICONS[item.activityType] || 'star';
    const gradientColors = ACTIVITY_GRADIENTS[item.activityType] || ['#654ea3', '#eaafc8'];

    return (
      <View style={styles.activityCard}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.activityCardGradient}
        >
          <Pressable 
            style={styles.activityHeader}
            onPress={() => toggleActivitySelection(index)}
          >
            <View style={styles.activityHeaderContent}>
              <View style={styles.activityIconContainer}>
                <FontAwesome5 name={iconName} size={16} color="#fff" />
              </View>
              <Text style={styles.activityName}>{item.activityType}</Text>
            </View>

            <View style={styles.activityHeaderActions}>
              <View
                style={[
                  styles.activityCheckbox,
                  item.isSelected && styles.activityCheckboxSelected,
                ]}
              >
                {item.isSelected && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </View>
              
              {item.isSelected && (
                <TouchableOpacity
                  style={styles.expandButton} 
                  onPress={() => handleExpandActivity(index)}
                >
                  <Ionicons 
                    name={isExpanded ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#fff" 
                  />
                </TouchableOpacity>
              )}
            </View>
          </Pressable>

          {item.isSelected && isExpanded && (
            <View style={styles.activitySettings}>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Target:</Text>
                <TextInput
                  style={styles.settingInput}
                  placeholder={`e.g. ${item.activityType === 'Walking' || item.activityType === 'Steps' ? '5000 steps' : '30 min'}`}
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={item.threshold}
                  onChangeText={(text) => updateActivityRule(index, 'threshold', text)}
                />
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Points:</Text>
                <TextInput
                  style={[styles.settingInput, styles.pointsInput]}
                  keyboardType="numeric"
                  value={String(item.points)}
                  onChangeText={(text) => {
                    const num = parseInt(text) || 0;
                    updateActivityRule(index, 'points', num);
                  }}
                  placeholderTextColor="rgba(255,255,255,0.6)"
                />
              </View>
            </View>
          )}
        </LinearGradient>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
  {currentStep < 5 ? (
    <>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={handleBack}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <Ionicons name="chevron-back" size={24} color="#333" />
      </TouchableOpacity>
      
      {renderProgressBar()}
      
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => router.back()}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <Ionicons name="close" size={24} color="#333" />
      </TouchableOpacity>
    </>
  ) : (
    // For step 5, do not show any header buttons.
    <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#333' }}>Success</Text>
    </View>
  )}
</View>

      {/* Content area */}
      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Animated step container */}
          <Animated.View
            style={[
              styles.stepContent,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* STEP 1: Mode Selection */}
            {currentStep === 1 && (
              <View style={styles.modeSelectionContainer}>
                <Text style={styles.mainTitle}>Choose Your Challenge Type</Text>
                <Text style={styles.subtitle}>Select the type of challenge you want to create</Text>

                <View style={styles.modeCardsContainer}>
                  {CHALLENGE_MODES.map((mode) => (
                    <Pressable
                      key={mode.id}
                      onPress={() => handleModeSelect(mode.id as ChallengeMode)}
                      style={({ pressed }) => [
                        styles.gradientCardWrapper,
                        pressed && { opacity: 0.95 },
                      ]}
                      android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                    >
                      <LinearGradient
                        colors={mode.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientCard}
                      >
                        <View style={styles.gradientCardContent}>
                          <Text style={styles.gradientCardTitle}>{mode.title}</Text>
                          <Text style={styles.gradientCardDesc}>{mode.description}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#fff" />
                      </LinearGradient>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* STEP 2: Challenge Details */}
            {currentStep === 2 && (
              <View style={styles.detailsContainer}>
                <Text style={styles.mainTitle}>Challenge Details</Text>
                <Text style={styles.subtitle}>
                  Set the basic information for your {selectedMode} challenge
                </Text>

                {/* Challenge Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Challenge Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={details.name}
                    onChangeText={(text) => setDetails({ ...details, name: text })}
                    placeholder="e.g., 10K Steps Daily Challenge"
                    placeholderTextColor="#999"
                    maxLength={40}
                  />
                  <Text style={styles.characterCount}>
                    {details.name.length}/40
                  </Text>
                </View>

                {/* Description */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Description <Text style={styles.optionalText}>(Optional)</Text>
                  </Text>
                  <TextInput
                    style={[styles.textInput, styles.textAreaInput]}
                    value={details.description}
                    onChangeText={(text) => setDetails({ ...details, description: text })}
                    placeholder="Tell us more about your challenge"
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={200}
                  />
                  <Text style={styles.characterCount}>
                    {details.description.length}/200
                  </Text>
                </View>

                {/* Duration */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Challenge Duration</Text>

                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>Starts</Text>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowStartPicker(true)}
                    >
                      <Text style={styles.dateText}>
                        {details.startDate ? details.startDate.toDateString() : 'Select'}
                      </Text>
                      <Ionicons name="calendar-outline" size={18} color="#666" />
                    </TouchableOpacity>
                  </View>

                  {!details.isOpenEnded && (
                    <View style={styles.dateRow}>
                      <Text style={styles.dateLabel}>Ends</Text>
                      <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setShowEndPicker(true)}
                      >
                        <Text style={styles.dateText}>
                          {details.endDate ? details.endDate.toDateString() : 'Select'}
                        </Text>
                        <Ionicons name="calendar-outline" size={18} color="#666" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Open-Ended Toggle */}
                  <Pressable
                    style={styles.toggleContainer}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setDetails({
                        ...details,
                        isOpenEnded: !details.isOpenEnded,
                        endDate: null,
                      });
                    }}
                  >
                    <View
                      style={[
                        styles.toggleTrack,
                        details.isOpenEnded && styles.toggleTrackActive,
                      ]}
                    >
                      <Animated.View
                        style={[
                          styles.toggleThumb,
                          details.isOpenEnded && styles.toggleThumbActive,
                        ]}
                      />
                    </View>
                    <Text style={styles.toggleLabel}>Open-ended challenge (no end date)</Text>
                  </Pressable>
                </View>

                {/* Date Pickers */}
                <DateTimePickerModal
                  isVisible={showStartPicker}
                  mode="date"
                  display="spinner"
                  date={details.startDate || new Date()}
                  onConfirm={(date) => {
                    setShowStartPicker(false);
                    setDetails({ ...details, startDate: date });
                  }}
                  onCancel={() => setShowStartPicker(false)}
                  minimumDate={new Date()}
                />

                <DateTimePickerModal
                  isVisible={showEndPicker}
                  mode="date"
                  display="spinner"
                  date={
                    details.endDate || new Date(new Date().setDate(new Date().getDate() + 14))
                  }
                  onConfirm={(date) => {
                    setShowEndPicker(false);
                    setDetails({ ...details, endDate: date });
                  }}
                  onCancel={() => setShowEndPicker(false)}
                  minimumDate={details.startDate || new Date()}
/>
              </View>
            )}

            {/* STEP 3: Activities */}
            {currentStep === 3 && (
              <View style={styles.activitiesContainer}>
                <Text style={styles.mainTitle}>Select Activities</Text>
                <Text style={styles.subtitle}>
                  Choose activities to include in your challenge
                </Text>

                {/* Global Timeframe Setting */}
                <View style={styles.globalTimeframeContainer}>
                  <Text style={styles.globalTimeframeLabel}>
                    Activity Tracking Frequency:
                  </Text>
                  <View style={styles.timeframeToggle}>
                    <Pressable
                      style={[
                        styles.timeframeOption,
                        details.globalTimeframe === 'day' && styles.timeframeSelected,
                      ]}
                      onPress={() => handleTimeframeChange('day')}
                    >
                      <Text
                        style={[
                          styles.timeframeText,
                          details.globalTimeframe === 'day' && styles.timeframeTextSelected,
                        ]}
                      >
                        Daily
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.timeframeOption,
                        details.globalTimeframe === 'week' && styles.timeframeSelected,
                      ]}
                      onPress={() => handleTimeframeChange('week')}
                    >
                      <Text
                        style={[
                          styles.timeframeText,
                          details.globalTimeframe === 'week' && styles.timeframeTextSelected,
                        ]}
                      >
                        Weekly
                      </Text>
                    </Pressable>
                  </View>
                  <Text style={styles.timeframeDescription}>
                    {details.globalTimeframe === 'day'
                      ? 'Participants must complete activities daily to earn points'
                      : 'Participants have a full week to complete activities for points'}
                  </Text>
                </View>

                {/* Activities List */}
                <View style={styles.activitiesListContainer}>
                  <FlatList
                    data={activities}
                    renderItem={renderActivityItem}
                    keyExtractor={(item, index) => `${item.activityType}-${index}`}
                    scrollEnabled={false}
                    ListFooterComponent={
                      <Pressable 
                        style={styles.addCustomActivityCard}
                        onPress={() => setShowCustomModal(true)}
                      >
                        <LinearGradient
                          colors={['#f3f4f6', '#e5e7eb']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.addCustomGradient}
                        >
                          <Ionicons name="add-circle" size={24} color="#4A90E2" />
                          <Text style={styles.addCustomActivityText}>Add Custom Activity</Text>
                        </LinearGradient>
                      </Pressable>
                    }
                  />
                </View>

                {!activities.some((a) => a.isSelected) && (
                  <View style={styles.noActivitiesWarning}>
                    <Ionicons name="alert-circle-outline" size={24} color="#FF4B2B" />
                    <Text style={styles.warningText}>Please select at least one activity</Text>
                  </View>
                )}

                {/* Custom Activity Modal */}
                <Modal
                  visible={showCustomModal}
                  animationType="slide"
                  transparent={true}
                  onRequestClose={() => setShowCustomModal(false)}
                >
                  <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Add Custom Activity</Text>
                        <TouchableOpacity
                          onPress={() => setShowCustomModal(false)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.modalBody}>
                        <View style={styles.modalInputGroup}>
                          <Text style={styles.modalInputLabel}>Activity Name</Text>
                          <TextInput
                            style={styles.modalInput}
                            placeholder="e.g. Basketball, Meditation"
                            value={customActivity.name}
                            onChangeText={(text) => setCustomActivity({...customActivity, name: text})}
                          />
                        </View>

                        <View style={styles.modalInputGroup}>
                          <Text style={styles.modalInputLabel}>Target</Text>
                          <TextInput
                            style={styles.modalInput}
                            placeholder="e.g. 30 min, 5 games"
                            value={customActivity.threshold}
                            onChangeText={(text) => setCustomActivity({...customActivity, threshold: text})}
                          />
                        </View>

                        <View style={styles.modalInputGroup}>
                          <Text style={styles.modalInputLabel}>Points</Text>
                          <TextInput
                            style={styles.modalInput}
                            placeholder="3"
                            value={customActivity.points}
                            onChangeText={(text) => setCustomActivity({...customActivity, points: text})}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>

                      <View style={styles.modalFooter}>
                        <TouchableOpacity
                          style={styles.modalCancelButton}
                          onPress={() => setShowCustomModal(false)}
                        >
                          <Text style={styles.modalCancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.modalAddButton}
                          onPress={handleAddCustomActivity}
                        >
                          <Text style={styles.modalAddButtonText}>Add Activity</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </Modal>
              </View>
            )}

            {/* STEP 4: Review */}
            {currentStep === 4 && (
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
                          <Text style={styles.reviewIconText}>
                            {CHALLENGE_MODES.find((m) => m.id === selectedMode)?.icon}
                          </Text>
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
                    </View>

                    <View style={styles.reviewSection}>
                      <Text style={styles.reviewSectionTitle}>ACTIVITIES</Text>
                      {activities.filter((a) => a.isSelected).map((act, idx) => (
                        <View key={`${act.activityType}-${idx}`} style={styles.activityReview}>
                          <View 
                            style={[
                              styles.activityIconCircle,
                              { backgroundColor: ACTIVITY_GRADIENTS[act.activityType]?.[0] || '#4A90E2' }
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
            )}

            {/* STEP 5: Success */}
            {currentStep === 5 && (
              <View style={styles.successContainer}>
                <Image
                  source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4436/4436481.png' }}
                  style={styles.successImage}
                />
                <Text style={styles.successTitle}>Challenge Created!</Text>
                <Text style={styles.successMessage}>
                  Your challenge is now live and ready for participants
                </Text>

                <View style={styles.actionButtons}>
                  <Pressable
                    style={styles.actionButton}
                    onPress={handleShareChallenge}
                  >
                    <LinearGradient
                      colors={['#4776E6', '#8E54E9']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.actionButtonGradient}
                    >
                      <Ionicons name="share-social" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Share Challenge</Text>
                    </LinearGradient>
                  </Pressable>

                  <Pressable
                    style={styles.actionButton}
                    onPress={handleInviteFriends}
                  >
                    <LinearGradient
                      colors={['#FF416C', '#FF4B2B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.actionButtonGradient}
                    >
                      <Ionicons name="people" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Invite Friends</Text>
                    </LinearGradient>
                  </Pressable>

                  <Pressable
                    style={styles.actionButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      router.replace('/(tabs)/joinchallenges/racetrack copy');
                    }}
                  >
                    <LinearGradient
                      colors={['#11998e', '#38ef7d']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.actionButtonGradient}
                    >
                      <Ionicons name="home" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Go to Dashboard</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </View>

      {/* Bottom footer for steps 2..4 */}
      {currentStep > 1 && currentStep < 5 && (
        <View style={styles.footer}>
          <Pressable
            style={[
              styles.nextButton,
              !isNextEnabled() && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={!isNextEnabled() || isCreating}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          >
            {isCreating ? (
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Ionicons name="refresh" size={24} color="#fff" />
              </Animated.View>
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {currentStep < 4 ? 'Continue' : 'Create Challenge'}
                </Text>
                <Ionicons
                  name={currentStep < 4 ? 'arrow-forward' : 'checkmark'}
                  size={22}
                  color="#fff"
                />
              </>
            )}
          </Pressable>
        </View>
      )}

      {/* Friend Selection Modal */}
      <FriendSelectionModal
        visible={showFriendModal}
        onClose={() => setShowFriendModal(false)}
        onInvite={handleFriendInvites}
        challengeId={createdChallengeId}
      />
    </SafeAreaView>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
  },
  friendsList: {
    flex: 1,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  friendItemSelected: {
    backgroundColor: '#EBF5FF',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  friendName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  footer: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
  },
  inviteButton: {
    backgroundColor: '#4A90E2',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  inviteButtonDisabled: {
    opacity: 0.5,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  }
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaecef',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  
  // Progress bar
  progressBarContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#eee',
    borderRadius: 2,
  },
  activeProgressBar: {
    backgroundColor: '#4A90E2',
  },
  progressBarMargin: {
    marginRight: 8,
  },

  // Scroll content
  content: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingBottom: 40, // Space for inputs
  },
  stepContent: {
    flex: 1,
    padding: 20,
  },

  // Step 1: Mode Selection
  modeSelectionContainer: {
    flex: 1,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: Platform.select({ ios: 'Avenir-Heavy', android: 'sans-serif-black' }),
    color: '#222',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Avenir-Medium', android: 'sans-serif-medium' }),
    color: '#555',
    letterSpacing: 0.5,
    marginBottom: 24,
  },
  modeCardsContainer: {
    gap: 20,
  },
  gradientCardWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  gradientCardContent: {
    flex: 1,
    marginRight: 12,
  },
  gradientCardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  gradientCardDesc: {
    color: '#fff',
    fontSize: 14,
  },

  // Step 2: Challenge Details
  detailsContainer: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  optionalText: {
    fontWeight: '400',
    fontSize: 14,
    color: '#888',
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textAreaInput: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  characterCount: {
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
    marginTop: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateLabel: {
    width: 60,
    fontSize: 16,
    color: '#555',
  },
  datePickerButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  toggleTrack: {
    width: 40,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ccc',
    paddingHorizontal: 2,
    justifyContent: 'center',
  },
  toggleTrackActive: {
    backgroundColor: '#4A90E2',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  toggleThumbActive: {
    transform: [{ translateX: 16 }],
  },
  toggleLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: '#555',
  },

  // Step 3: Activities
  activitiesContainer: {
    flex: 1,
  },
  // Global timeframe settings
  globalTimeframeContainer: {
    marginBottom: 24,
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
  },
  globalTimeframeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  timeframeDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  timeframeToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#ddd',
    alignSelf: 'flex-start',
  },
  timeframeOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    width: 80,
  },
  timeframeSelected: {
    backgroundColor: '#4A90E2',
  },
  timeframeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  timeframeTextSelected: {
    color: '#fff',
  },
  // Activity list
  activitiesListContainer: {
    marginTop: 8,
  },
  activityCard: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activityCardGradient: {
    borderRadius: 12,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  activityHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  activityCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCheckboxSelected: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderColor: 'white',
  },
  expandButton: {
    marginLeft: 8,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activitySettings: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingLabel: {
    width: 60,
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
  },
  settingInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#fff',
  },
  pointsInput: {
    flex: 0,
    width: 60,
    textAlign: 'center',
  },
  addCustomActivityCard: {
    borderRadius: 12,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderStyle: 'dashed',
  },
  addCustomGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  addCustomActivityText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  noActivitiesWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4F4',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  warningText: {
    marginLeft: 8,
    color: '#FF4B2B',
    fontSize: 14,
  },

  // Custom Activity Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalBody: {
    marginBottom: 20,
  },
  modalInputGroup: {
    marginBottom: 16,
  },
  modalInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalAddButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalAddButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Step 4: Review
  reviewContainer: {
    flex: 1,
  },
  reviewCardGradient: {
    borderRadius: 16,
    padding: 2,
    marginBottom: 20,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  reviewSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  reviewIconText: {
    fontSize: 20,
  },
  reviewHeaderText: {
    flex: 1,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  reviewType: {
    fontSize: 14,
    color: '#888',
    textTransform: 'uppercase',
  },
  reviewSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Avenir-Heavy', android: 'sans-serif-black' }),
    color: '#333',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.07)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  reviewDescription: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  reviewDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewDetailText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: Platform.select({ ios: 'Avenir-Book', android: 'sans-serif' }),
    color: '#444',
    marginLeft: 12,
    textShadowColor: 'rgba(0,0,0,0.05)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  activityReview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityReviewDetail: {
    flex: 1,
  },
  activityReviewName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  activityReviewMeta: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: Platform.select({ ios: 'Avenir-Book', android: 'sans-serif' }),
    color: '#555',
  },

  // Step 5: Success
  successContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  successImage: {
    width: 150,
    height: 150,
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  actionButtons: {
    width: '100%',
    gap: 12,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 10,
  },

  // Footer
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  nextButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  nextButtonDisabled: {
    backgroundColor: '#ccc',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});