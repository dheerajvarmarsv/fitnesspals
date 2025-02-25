// create.tsx
import React, { useState, useEffect } from 'react';
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
  ImageBackground,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { createChallengeInSupabase } from '../../../lib/challenges';
import DatePickerField from '../../../components/DatePickerField';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;

type ChallengeMode = 'race' | 'survival' | 'streak' | 'custom';
type Step = 1 | 2 | 3 | 4 | 5;

const CHALLENGE_MODES = [
  { 
    id: 'race', 
    title: 'RACE', 
    icon: '🏁', 
    description: 'Compete on a virtual track...',
    gradient: ['#FF416C', '#FF4B2B'],
    illustration: 'https://cdn-icons-png.flaticon.com/512/2921/2921829.png'
  },
  { 
    id: 'survival', 
    title: 'SURVIVAL', 
    icon: '⚔️', 
    description: 'Avoid elimination...',
    gradient: ['#4776E6', '#8E54E9'],
    illustration: 'https://cdn-icons-png.flaticon.com/512/1384/1384065.png'
  },
  { 
    id: 'streak', 
    title: 'STREAK', 
    icon: '🔥', 
    description: 'Maintain consecutive days...',
    gradient: ['#FF8008', '#FFC837'],
    illustration: 'https://cdn-icons-png.flaticon.com/512/3063/3063175.png'
  },
  { 
    id: 'custom', 
    title: 'CUSTOM', 
    icon: '🎯', 
    description: 'Fully customize...',
    gradient: ['#11998e', '#38ef7d'],
    illustration: 'https://cdn-icons-png.flaticon.com/512/633/633611.png'
  },
];

interface ChallengeDetails {
  name: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
  isOpenEnded: boolean;
}

interface ActivityRule {
  activityType: string;
  threshold: string;  // DB column
  points: number;
  timeframe: 'day' | 'week';
  isSelected: boolean;
}

export default function CreateChallenge() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [selectedMode, setSelectedMode] = useState<ChallengeMode | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  const [details, setDetails] = useState<ChallengeDetails>({
    name: '',
    description: '',
    startDate: null,
    endDate: null,
    isOpenEnded: false,
  });

  const [activities, setActivities] = useState<ActivityRule[]>([
    {
      activityType: 'Walking',
      threshold: '5000 steps',
      points: 2,
      timeframe: 'day',
      isSelected: false,
    },
    {
      activityType: 'Running',
      threshold: '3 km',
      points: 5,
      timeframe: 'day',
      isSelected: false,
    },
    {
      activityType: 'Cycling',
      threshold: '5 km',
      points: 4,
      timeframe: 'week',
      isSelected: false,
    },
    {
      activityType: 'Swimming',
      threshold: '1 km',
      points: 6,
      timeframe: 'week',
      isSelected: false,
    },
    {
      activityType: 'Workout',
      threshold: '30 min',
      points: 3,
      timeframe: 'day',
      isSelected: false,
    },
  ]);

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error('Error fetching user:', error);
      else if (data?.user) setUserId(data.user.id);
      else console.warn('No user logged in');
    })();
  }, []);

  useEffect(() => {
    // Animation for page transitions
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  const progress = (currentStep / 5) * 100;

  function handleModeSelect(mode: ChallengeMode) {
    setSelectedMode(mode);
    // Reset animations for transition
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    setCurrentStep(2);
  }

  function toggleActivitySelection(index: number) {
    const updated = [...activities];
    updated[index].isSelected = !updated[index].isSelected;
    setActivities(updated);
  }

  function updateActivityRule(index: number, field: keyof ActivityRule, value: string | number) {
    const updated = [...activities];
    (updated[index] as any)[field] = value;
    setActivities(updated);
  }

  async function handleNext() {
    // Reset animations for transition
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as Step);
      return;
    }
    if (currentStep === 4) {
      try {
        await createChallengeInDB();
        setCurrentStep(5);
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to create challenge');
      }
    }
  }

  function handleBack() {
    // Reset animations for transition
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    
    if (currentStep === 1) {
      router.back();
    } else if (currentStep === 5) {
      router.back();
    } else {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  }

  function isNextEnabled() {
    if (currentStep === 2) {
      return (
        details.name.trim().length > 0 &&
        details.startDate !== null &&
        (details.isOpenEnded || details.endDate !== null)
      );
    }
    if (currentStep === 3) {
      // Require at least one activity to be selected
      return activities.some(a => a.isSelected);
    }
    return true;
  }

  async function createChallengeInDB() {
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
        timeframe: act.timeframe,
      })),
    });

    console.log('Created challenge in DB:', newChallenge);
    return newChallenge.id;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground 
        source={{ uri: 'https://cdn.pixabay.com/photo/2017/08/30/07/45/texture-2695108_960_720.jpg' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <BlurView intensity={90} style={styles.headerBlur}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {currentStep < 5 ? 'Create a challenge' : 'Challenge Created'}
            </Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </BlurView>

        {currentStep <= 4 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <LinearGradient
                colors={['#4A90E2', '#5C38ED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBar, { width: `${progress}%` }]}
              />
            </View>
            <View style={styles.stepsIndicator}>
              {[1, 2, 3, 4].map((step) => (
                <View key={step} style={styles.stepIndicatorWrapper}>
                  <View
                    style={[
                      styles.stepDot,
                      currentStep >= step ? styles.stepDotActive : {},
                    ]}
                  >
                    {currentStep > step ? (
                      <Ionicons name="checkmark" size={12} color="#FFF" />
                    ) : (
                      <Text style={styles.stepDotText}>{step}</Text>
                    )}
                  </View>
                  <Text style={[
                    styles.stepText,
                    currentStep >= step ? styles.stepTextActive : {}
                  ]}>
                    {step === 1 ? 'Mode' : step === 2 ? 'Details' : step === 3 ? 'Activities' : 'Review'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            width: '100%'
          }}>
            {currentStep === 1 && (
              <View style={styles.modeSelection}>
                <Text style={styles.title}>Choose your challenge</Text>
                <Text style={styles.subtitle}>Select a mode that fits your fitness goals</Text>
                <View style={styles.modeList}>
                  {CHALLENGE_MODES.map((mode) => (
                    <TouchableOpacity
                      key={mode.id}
                      onPress={() => handleModeSelect(mode.id as ChallengeMode)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={mode.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.modeCard}
                      >
                        <View style={styles.modeContent}>
                          <View style={styles.modeTextContent}>
                            <View style={styles.modeIconContainer}>
                              <Text style={styles.modeIconText}>{mode.icon}</Text>
                            </View>
                            <Text style={styles.modeTitle}>{mode.title}</Text>
                            <Text style={styles.modeDescription}>{mode.description}</Text>
                          </View>
                          <MaterialCommunityIcons name="chevron-right" size={28} color="#FFF" />
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {currentStep === 2 && (
              <View style={styles.detailsForm}>
                <Text style={styles.title}>Challenge Details</Text>
                <Text style={styles.subtitle}>Set up your challenge parameters</Text>
                <View style={styles.formCard}>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Challenge Name</Text>
                    <TextInput
                      style={styles.input}
                      value={details.name}
                      onChangeText={(text) => setDetails({ ...details, name: text })}
                      placeholder="e.g., 10K Steps Daily Challenge"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Description (Optional)</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={details.description}
                      onChangeText={(text) => setDetails({ ...details, description: text })}
                      placeholder="Tell us more about your challenge"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.label}>Challenge Duration</Text>
                    <DatePickerField
                      label="Start Date"
                      value={details.startDate}
                      onChange={(date) => setDetails({ ...details, startDate: date })}
                      minimumDate={new Date()}
                      customStyles={datePickerCustomStyles}
                    />
                    {!details.isOpenEnded && (
                      <DatePickerField
                        label="End Date"
                        value={details.endDate}
                        onChange={(date) => setDetails({ ...details, endDate: date })}
                        minimumDate={details.startDate || new Date()}
                        customStyles={datePickerCustomStyles}
                      />
                    )}
                    <TouchableOpacity
                      style={styles.openEndedToggle}
                      onPress={() =>
                        setDetails({
                          ...details,
                          isOpenEnded: !details.isOpenEnded,
                          endDate: null,
                        })
                      }
                    >
                      <View
                        style={[
                          styles.checkbox,
                          details.isOpenEnded && styles.checkboxChecked,
                        ]}
                      >
                        {details.isOpenEnded && (
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        )}
                      </View>
                      <Text style={styles.checkboxLabel}>Open-Ended Challenge</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {currentStep === 3 && (
              <View style={styles.rulesForm}>
                <Text style={styles.title}>Activities & Rules</Text>
                <Text style={styles.subtitle}>Select activities to track in your challenge</Text>
                <View style={styles.formCard}>
                  {activities.map((act, idx) => (
                    <View key={act.activityType} style={styles.activityCard}>
                      <TouchableOpacity
                        style={styles.checkboxRow}
                        onPress={() => toggleActivitySelection(idx)}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            act.isSelected && styles.checkboxChecked,
                          ]}
                        >
                          {act.isSelected && (
                            <Ionicons name="checkmark" size={16} color="#fff" />
                          )}
                        </View>
                        <Text style={styles.activityLabel}>{act.activityType}</Text>
                      </TouchableOpacity>
                      {act.isSelected && (
                        <View style={styles.activityConfig}>
                          <View style={styles.activityInputRow}>
                            <Text style={styles.smallLabel}>Goal:</Text>
                            <TextInput
                              style={styles.activityInput}
                              value={act.threshold}
                              onChangeText={(txt) => updateActivityRule(idx, 'threshold', txt)}
                              placeholder="e.g. 5000 steps"
                              placeholderTextColor="rgba(255,255,255,0.5)"
                            />
                          </View>
                          <View style={styles.activityConfigRow}>
                            <View style={styles.pointsContainer}>
                              <Text style={styles.smallLabel}>Points:</Text>
                              <TextInput
                                style={[styles.activityInput, styles.pointsInput]}
                                keyboardType="numeric"
                                value={String(act.points)}
                                onChangeText={(txt) =>
                                  updateActivityRule(idx, 'points', parseInt(txt) || 0)
                                }
                              />
                            </View>
                            <View style={styles.timeframeContainer}>
                              <Text style={styles.smallLabel}>Timeframe:</Text>
                              <View style={styles.timeframeButtons}>
                                <TouchableOpacity
                                  style={[
                                    styles.timeframeOption,
                                    act.timeframe === 'day' && styles.timeframeOptionActive,
                                  ]}
                                  onPress={() => updateActivityRule(idx, 'timeframe', 'day')}
                                >
                                  <Text
                                    style={[
                                      styles.timeframeText,
                                      act.timeframe === 'day' && styles.timeframeTextActive,
                                    ]}
                                  >
                                    Daily
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[
                                    styles.timeframeOption,
                                    act.timeframe === 'week' && styles.timeframeOptionActive,
                                  ]}
                                  onPress={() => updateActivityRule(idx, 'timeframe', 'week')}
                                >
                                  <Text
                                    style={[
                                      styles.timeframeText,
                                      act.timeframe === 'week' && styles.timeframeTextActive,
                                    ]}
                                  >
                                    Weekly
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {currentStep === 4 && (
              <View style={styles.confirmation}>
                <Text style={styles.title}>Review & Create</Text>
                <Text style={styles.subtitle}>Confirm your challenge settings</Text>
                <View style={styles.formCard}>
                  <View style={styles.summarySection}>
                    <Text style={styles.summaryTitle}>Challenge Type</Text>
                    <View style={styles.summaryRow}>
                      <MaterialCommunityIcons name="flag-checkered" size={20} color="#FFF" />
                      <Text style={styles.summaryText}>
                        {selectedMode?.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.summarySection}>
                    <Text style={styles.summaryTitle}>Basic Info</Text>
                    <View style={styles.summaryRow}>
                      <MaterialCommunityIcons name="tag-text" size={20} color="#FFF" />
                      <Text style={styles.summaryText}>{details.name}</Text>
                    </View>
                    {details.description && (
                      <View style={styles.summaryRow}>
                        <MaterialCommunityIcons name="text" size={20} color="#FFF" />
                        <Text style={styles.summaryText}>{details.description}</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.summarySection}>
                    <Text style={styles.summaryTitle}>Duration</Text>
                    <View style={styles.summaryRow}>
                      <MaterialCommunityIcons name="calendar-start" size={20} color="#FFF" />
                      <Text style={styles.summaryText}>
                        Start: {details.startDate?.toDateString() || 'Not set'}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <MaterialCommunityIcons name="calendar-end" size={20} color="#FFF" />
                      <Text style={styles.summaryText}>
                        End: {details.isOpenEnded ? 'Open-Ended' : (details.endDate?.toDateString() || 'Not set')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.summarySection}>
                    <Text style={styles.summaryTitle}>Activities</Text>
                    {activities.filter((a) => a.isSelected).length > 0 ? (
                      activities
                        .filter((a) => a.isSelected)
                        .map((act) => (
                          <View key={act.activityType} style={styles.summaryRow}>
                            <MaterialCommunityIcons 
                              name={getActivityIcon(act.activityType)} 
                              size={20} 
                              color="#FFF" 
                            />
                            <Text style={styles.summaryText}>
                              {act.activityType}: {act.threshold}, {act.points} pts / {act.timeframe}
                            </Text>
                          </View>
                        ))
                    ) : (
                      <View style={styles.summaryRow}>
                        <MaterialCommunityIcons name="alert" size={20} color="#FFF" />
                        <Text style={styles.summaryText}>(No activities selected)</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            )}

            {currentStep === 5 && (
              <View style={styles.successScreen}>
                <View style={styles.successIconContainer}>
                  <Ionicons name="checkmark-circle" size={100} color="#4A90E2" />
                </View>
                <Text style={styles.successTitle}>Challenge Created!</Text>
                <Text style={styles.successSubtitle}>
                  Your challenge is now active and ready for participants
                </Text>
                <View style={styles.successActions}>
                  <TouchableOpacity
                    style={styles.successButton}
                    onPress={() => Alert.alert('Share Link', 'Link copied to clipboard!')}
                  >
                    <LinearGradient
                      colors={['#4A90E2', '#5C38ED']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.gradientButton}
                    >
                      <Ionicons name="share-social" size={20} color="#fff" />
                      <Text style={styles.buttonText}>Share Challenge</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.successButton}
                    onPress={() => Alert.alert('Invite Friends', 'Open friend list...')}
                  >
                    <LinearGradient
                      colors={['#FF416C', '#FF4B2B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.gradientButton}
                    >
                      <Ionicons name="person-add" size={20} color="#fff" />
                      <Text style={styles.buttonText}>Invite Friends</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.successButton}
                    onPress={() => router.back()}
                  >
                    <LinearGradient
                      colors={['#11998e', '#38ef7d']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.gradientButton}
                    >
                      <Ionicons name="home" size={20} color="#fff" />
                      <Text style={styles.buttonText}>Go to Dashboard</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {currentStep <= 4 && (
          <BlurView intensity={90} style={styles.footer}>
            <TouchableOpacity
              style={[styles.nextButton, !isNextEnabled() && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={!isNextEnabled()}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={isNextEnabled() ? ['#4A90E2', '#5C38ED'] : ['#BBBBBB', '#999999']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={styles.nextButtonText}>
                  {currentStep < 4 ? 'Continue' : 'Create Challenge'}
                </Text>
                <Ionicons 
                  name={currentStep < 4 ? "arrow-forward" : "checkmark-circle"} 
                  size={20} 
                  color="#fff" 
                />
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>
        )}
      </ImageBackground>
    </SafeAreaView>
  );
}

// Helper function to get activity icon
function getActivityIcon(activityType: string): string {
  switch (activityType.toLowerCase()) {
    case 'walking': return 'walk';
    case 'running': return 'run';
    case 'cycling': return 'bike';
    case 'swimming': return 'swim';
    case 'workout': return 'weight-lifter';
    default: return 'dumbbell';
  }
}

// Custom styles for the DatePickerField component
const datePickerCustomStyles = {
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  textStyle: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.5)',
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  headerBlur: {
    width: '100%',
    zIndex: 10,
    backgroundColor: 'rgba(18, 18, 18, 0.7)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(18, 18, 18, 0.7)',
  },
  progressBackground: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2.5,
    width: '100%',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2.5,
  },
  stepsIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  stepIndicatorWrapper: {
    alignItems: 'center',
    width: width / 5,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginBottom: 4,
  },
  stepDotActive: {
    borderColor: '#4A90E2',
    backgroundColor: '#4A90E2',
  },
  stepDotText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  stepTextActive: {
    color: '#FFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  modeSelection: {
    width: '100%',
  },
  title: {
    fontSize: isSmallDevice ? 24 : 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 24,
    textAlign: 'center',
  },
  modeList: {
    gap: 16,
  },
  modeCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  modeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeTextContent: {
    flex: 1,
  },
  modeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modeIconText: {
    fontSize: 20,
  },
  modeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  modeDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  detailsForm: {
    width: '100%',
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  formField: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#FFF',
    marginBottom: 4,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  openEndedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#4A90E2',
  },
  checkboxLabel: {
    color: '#FFF',
    fontSize: 16,
  },
  rulesForm: {
    width: '100%',
  },
  activityCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityLabel: {
    color: '#FFF',
    fontSize: 16,
    marginLeft: 8,
  },
  activityConfig: {
    marginTop: 12,
  },
  activityInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  smallLabel: {
    fontSize: 14,
    color: '#FFF',
    marginRight: 8,
  },
  activityInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: '#FFF',
  },
  activityConfigRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsContainer: {
    flex: 1,
    marginRight: 8,
  },
  pointsInput: {
    width: 60,
    textAlign: 'center',
  },
  timeframeContainer: {
    flex: 1,
  },
  timeframeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeframeOption: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  timeframeOptionActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  timeframeText: {
    color: '#FFF',
    fontSize: 14,
  },
  timeframeTextActive: {
    fontWeight: 'bold',
  },
  confirmation: {
    width: '100%',
  },
  summarySection: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 16,
    color: '#FFF',
    marginLeft: 8,
  },
  successScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: 'rgba(0,0,0,0.6)',
    textAlign: 'center',
    marginBottom: 24,
  },
  successActions: {
    width: '100%',
  },
  successButton: {
    marginBottom: 16,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'rgba(18, 18, 18, 0.7)',
  },
  nextButton: {
    borderRadius: 8,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});