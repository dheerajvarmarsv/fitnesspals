// app/(tabs)/joinchallenges/create.tsx

import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Animated,
  Pressable,
  TouchableOpacity,
  View,
  Text,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { createChallengeInSupabase } from '../../../lib/challenges';
import FriendSelectionModal from '../../../components/FriendSelectionModal';
import Step1ModeSelection from './steps/Step1ModeSelection';
import Step2ChallengeDetails from './steps/Step2ChallengeDetails';
import Step3Activities from './steps/Step3Activities';
import Step4Review from './steps/Step4Review';
import Step5Success from './steps/Step5Success';

const VALID_CHALLENGE_TYPES = ['race', 'survival', 'streak', 'custom'] as const;
type ChallengeMode = typeof VALID_CHALLENGE_TYPES[number];
type Step = 1 | 2 | 3 | 4 | 5;

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
  id: ChallengeMode;
  title: string;
  icon: string;
  description: string;
  gradient: string[];
}

const CHALLENGE_MODES: ModeInfo[] = [
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

const DEFAULT_ACTIVITIES: ActivityRule[] = [
  { activityType: 'Walking', threshold: '5000 steps', points: 2, isSelected: false },
  { activityType: 'Running', threshold: '3 km', points: 5, isSelected: false },
  { activityType: 'Cycling', threshold: '5 km', points: 4, isSelected: false },
  { activityType: 'Swimming', threshold: '1 km', points: 6, isSelected: false },
  { activityType: 'Workout', threshold: '30 min', points: 3, isSelected: false },
  { activityType: 'Yoga', threshold: '20 min', points: 3, isSelected: false },
  { activityType: 'Hiking', threshold: '4 km', points: 5, isSelected: false },
  { activityType: 'Steps', threshold: '10000 steps', points: 4, isSelected: false },
  { activityType: 'Meditation', threshold: '15 min', points: 2, isSelected: false },
  { activityType: 'Sleep Quality', threshold: '7 hours', points: 3, isSelected: false },
  { activityType: 'Weight Training', threshold: '45 min', points: 4, isSelected: false },
  { activityType: 'Cardio Workout', threshold: '30 min', points: 4, isSelected: false },
  { activityType: 'High-Intensity', threshold: '20 min', points: 5, isSelected: false },
  { activityType: 'Stretching', threshold: '10 min', points: 2, isSelected: false },
  { activityType: 'Bonus Points', threshold: 'Complete all daily goals', points: 5, isSelected: false },
];

export default function CreateChallenge() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [isCreating, setIsCreating] = useState(false);
  const loadingSpinValue = useRef(new Animated.Value(0)).current;
  const spin = loadingSpinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<ChallengeMode | null>(null);
  const [details, setDetails] = useState<ChallengeDetails>({
    name: '',
    description: '',
    startDate: new Date(new Date().setHours(0, 0, 0, 0)),
    endDate: new Date(new Date().setDate(new Date().getDate() + 14)),
    isOpenEnded: false,
    globalTimeframe: 'day',
    isPrivate: false,
  });
  const [activities, setActivities] = useState<ActivityRule[]>(DEFAULT_ACTIVITIES);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customActivity, setCustomActivity] = useState({ name: '', threshold: '', points: '3' });
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [createdChallengeId, setCreatedChallengeId] = useState<string | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        setUserId(data.user.id);
      }
    })();
  }, []);

  useEffect(() => {
    if (isCreating) {
      Animated.loop(
        Animated.timing(loadingSpinValue, { toValue: 1, duration: 1000, useNativeDriver: true })
      ).start();
    } else {
      loadingSpinValue.setValue(0);
    }
  }, [isCreating]);

  const animateStepTransition = (forward: boolean) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
      Animated.timing(slideAnim, { toValue: forward ? -50 : 50, duration: 1, useNativeDriver: true }).start(() => {
        setCurrentStep((prev) => (prev + (forward ? 1 : -1)) as Step);
        slideAnim.setValue(forward ? 50 : -50);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
      });
    });
  };

  const handleModeSelect = (mode: ChallengeMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMode(mode);
    animateStepTransition(true);
  };

  const handleTimeframeChange = (timeframe: 'day' | 'week') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetails({ ...details, globalTimeframe: timeframe });
  };

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (currentStep < 4) {
      animateStepTransition(true);
      return;
    }
    if (currentStep === 4) {
      try {
        setIsCreating(true);
        const challengeId = await createChallengeInDB();
        setCreatedChallengeId(challengeId);
        setIsCreating(false);
        animateStepTransition(true);
      } catch (err: any) {
        setIsCreating(false);
        alert(err.message || 'Failed to create challenge');
      }
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep === 1 || currentStep === 5) {
      router.back();
    } else {
      animateStepTransition(false);
    }
  };

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

  const createChallengeInDB = async () => {
    if (!userId) throw new Error('You must be logged in first');
    if (!selectedMode) throw new Error('Challenge mode must be selected');
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
        timeframe: details.globalTimeframe,
      })),
      isPrivate: details.isPrivate,
    });
    return newChallenge.id;
  };

  const handleShareChallenge = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    alert('Challenge link copied to clipboard!');
  };

  const handleInviteFriends = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowFriendModal(true);
  };

  const handleGoDashboard = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(tabs)/joinchallenges/challengesettings');
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        {currentStep < 5 ? (
          <>
            <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
              <Ionicons name="chevron-back" size={24} color="#333" />
            </TouchableOpacity>
            {renderProgressBar()}
            <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </>
        ) : (
          <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#333' }}>Success</Text>
          </View>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.stepContent,
              { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
            ]}
          >
            {currentStep === 1 && (
              <Step1ModeSelection
                CHALLENGE_MODES={CHALLENGE_MODES}
                onSelectMode={handleModeSelect}
                styles={styles}
              />
            )}

            {currentStep === 2 && (
              <Step2ChallengeDetails
                details={details}
                setDetails={setDetails}
                showStartPicker={showStartPicker}
                setShowStartPicker={setShowStartPicker}
                showEndPicker={showEndPicker}
                setShowEndPicker={setShowEndPicker}
                selectedMode={selectedMode || ''}
                styles={styles}
              />
            )}

            {currentStep === 3 && (
              <Step3Activities
                activities={activities}
                setActivities={setActivities}
                details={details}
                handleTimeframeChange={handleTimeframeChange}
                showCustomModal={showCustomModal}
                setShowCustomModal={setShowCustomModal}
                customActivity={customActivity}
                setCustomActivity={setCustomActivity}
                handleAddCustomActivity={() => {
                  if (!customActivity.name.trim() || !customActivity.threshold.trim()) {
                    alert('Please enter valid custom activity details');
                    return;
                  }
                  const points = parseInt(customActivity.points) || 1;
                  const newActivity: ActivityRule = {
                    activityType: customActivity.name.trim(),
                    threshold: customActivity.threshold.trim(),
                    points,
                    isSelected: true,
                    isCustom: true,
                  };
                  setActivities([...activities, newActivity]);
                  setCustomActivity({ name: '', threshold: '', points: '3' });
                  setShowCustomModal(false);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
                styles={styles}
              />
            )}

            {currentStep === 4 && (
              <Step4Review
                details={details}
                selectedMode={selectedMode}
                CHALLENGE_MODES={CHALLENGE_MODES}
                activities={activities}
                styles={styles}
              />
            )}

            {currentStep === 5 && (
              <Step5Success
                handleShareChallenge={handleShareChallenge}
                handleInviteFriends={handleInviteFriends}
                handleGoDashboard={handleGoDashboard}
                styles={styles}
              />
            )}
          </Animated.View>
        </ScrollView>
      </View>

      {currentStep > 1 && currentStep < 5 && (
        <View style={styles.footer}>
          <Pressable
            style={[styles.nextButton, !isNextEnabled() && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={!isNextEnabled() || isCreating}
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

      <FriendSelectionModal
        visible={showFriendModal}
        onClose={() => setShowFriendModal(false)}
        onInvite={() => {}}
        challengeId={createdChallengeId}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  progressBarContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flex: 1, paddingHorizontal: 8 },
  progressBar: { flex: 1, height: 4, backgroundColor: '#eee', borderRadius: 2 },
  activeProgressBar: { backgroundColor: '#4A90E2' },
  progressBarMargin: { marginRight: 8 },
  content: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingBottom: 40 },
  stepContent: { flex: 1, padding: 20 },
  modeSelectionContainer: { flex: 1 },
  mainTitle: { fontSize: 26, fontWeight: '800', fontFamily: Platform.select({ ios: 'Avenir-Heavy', android: 'sans-serif-black' }), color: '#222', marginBottom: 10 },
  subtitle: { fontSize: 18, fontWeight: '600', fontFamily: Platform.select({ ios: 'Avenir-Medium', android: 'sans-serif-medium' }), color: '#555', marginBottom: 24 },
  modeCardsContainer: { gap: 20 },
  gradientCardWrapper: { borderRadius: 16, overflow: 'hidden' },
  gradientCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 20 },
  gradientCardContent: { flex: 1, marginRight: 12 },
  gradientCardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  gradientCardDesc: { color: '#fff', fontSize: 14 },
  detailsContainer: { flex: 1 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  textInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#333' },
  textAreaInput: { minHeight: 120, textAlignVertical: 'top', paddingTop: 16 },
  characterCount: { fontSize: 12, color: '#888', textAlign: 'right', marginTop: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dateLabel: { width: 60, fontSize: 16, color: '#555' },
  datePickerButton: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  dateText: { fontSize: 16, color: '#333' },
  toggleContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  toggleTrack: { width: 40, height: 24, borderRadius: 12, backgroundColor: '#ccc', paddingHorizontal: 2, justifyContent: 'center' },
  toggleTrackActive: { backgroundColor: '#4A90E2' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleThumbActive: { transform: [{ translateX: 16 }] },
  toggleLabel: { marginLeft: 12, fontSize: 16, color: '#555' },
  globalTimeframeContainer: { marginBottom: 24, backgroundColor: '#f8f9fa', padding: 16, borderRadius: 12 },
  globalTimeframeLabel: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  timeframeToggle: { flexDirection: 'row', borderRadius: 8, overflow: 'hidden', backgroundColor: '#ddd', alignSelf: 'flex-start' },
  timeframeOption: { paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', width: 80 },
  timeframeSelected: { backgroundColor: '#4A90E2' },
  timeframeText: { fontSize: 14, fontWeight: '500', color: '#555' },
  timeframeTextSelected: { color: '#fff' },
  timeframeDescription: { fontSize: 14, color: '#666', marginTop: 8, fontStyle: 'italic' },
  activitiesContainer: { flex: 1 },
  activitiesListContainer: { marginTop: 8 },
  activityCard: { borderRadius: 12, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  activityCardGradient: { borderRadius: 12 },
  activityHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  activityHeaderContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  activityIconContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  activityName: { fontSize: 16, fontWeight: '600', color: '#fff' },
  activityHeaderActions: { flexDirection: 'row', alignItems: 'center' },
  activityCheckbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.7)', backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  activityCheckboxSelected: { backgroundColor: 'rgba(255,255,255,0.3)', borderColor: 'white' },
  expandButton: { marginLeft: 8, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  activitySettings: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 0 },
  settingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  settingLabel: { width: 60, fontSize: 15, color: '#fff', fontWeight: '500' },
  settingInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#fff' },
  pointsInput: { flex: 0, width: 60, textAlign: 'center' },
  addCustomActivityCard: { borderRadius: 12, marginVertical: 8, overflow: 'hidden', borderWidth: 2, borderColor: '#4A90E2', borderStyle: 'dashed' },
  addCustomGradient: { padding: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  addCustomActivityText: { color: '#4A90E2', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  noActivitiesWarning: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF4F4', padding: 12, borderRadius: 8, marginTop: 20 },
  warningText: { marginLeft: 8, color: '#FF4B2B', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, width: '100%', padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#333' },
  modalBody: { marginBottom: 20 },
  modalInputGroup: { marginBottom: 16 },
  modalInputLabel: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  modalInput: { backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#333' },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancelButton: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelButtonText: { color: '#666', fontSize: 16, fontWeight: '600' },
  modalAddButton: { backgroundColor: '#4A90E2', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  modalAddButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  reviewContainer: { flex: 1 },
  reviewCardGradient: { borderRadius: 16, padding: 2, marginBottom: 20 },
  reviewCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 6 },
  reviewSection: { marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  reviewHeader: { flexDirection: 'row', alignItems: 'center' },
  reviewIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#4A90E2', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  reviewIconText: { fontSize: 20 },
  reviewHeaderText: { flex: 1 },
  reviewTitle: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 2 },
  reviewType: { fontSize: 14, color: '#888', textTransform: 'uppercase' },
  reviewSectionTitle: { fontSize: 14, fontWeight: '700', fontFamily: Platform.select({ ios: 'Avenir-Heavy', android: 'sans-serif-black' }), color: '#333', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, textShadowColor: 'rgba(0, 0, 0, 0.07)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1 },
  reviewDescription: { fontSize: 15, color: '#555', lineHeight: 22 },
  reviewDetail: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  reviewDetailText: { fontSize: 16, fontWeight: '500', fontFamily: Platform.select({ ios: 'Avenir-Book', android: 'sans-serif' }), color: '#444', marginLeft: 12, textShadowColor: 'rgba(0,0,0,0.05)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1 },
  activityReview: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  activityIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#4A90E2', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  activityReviewDetail: { flex: 1 },
  activityReviewName: { fontSize: 15, fontWeight: '600', color: '#333' },
  activityReviewMeta: { fontSize: 14, fontWeight: '400', fontFamily: Platform.select({ ios: 'Avenir-Book', android: 'sans-serif' }), color: '#555' },
  successContainer: { flex: 1, alignItems: 'center', padding: 20 },
  successImage: { width: 150, height: 150, marginBottom: 24 },
  successTitle: { fontSize: 28, fontWeight: '700', color: '#333', marginBottom: 12 },
  successMessage: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 40 },
  actionButtons: { width: '100%', gap: 12 },
  actionButton: { borderRadius: 12, overflow: 'hidden' },
  actionButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  actionButtonText: { fontSize: 16, fontWeight: '600', color: '#fff', marginLeft: 10 },
  footer: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 3 },
  nextButton: { backgroundColor: '#4A90E2', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  nextButtonDisabled: { backgroundColor: '#ccc' },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginRight: 8 },
});