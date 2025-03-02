// components/AddActivityModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../lib/supabase';
import { useUser } from './UserContext';
import { getChallengeActivityTypes, saveUserActivity, updateChallengesWithActivity } from '../lib/challengeUtils';

const GLOBAL_ACTIVITIES = [
  'Workout',
  'Steps',
  'Sleep',
  'Screen Time',
  'No Sugars',
  'High Intensity',
  'Yoga',
  'Count',
];

// Default metrics for activities
const DEFAULT_METRICS: { [key: string]: string } = {
  'Workout': 'time',
  'Steps': 'steps',
  'Sleep': 'time',
  'Screen Time': 'time',
  'No Sugars': 'count',
  'Yoga': 'time',
  'High Intensity': 'calories',
  'Count': 'count',
};

type MetricType = 'steps' | 'distance_km' | 'distance_miles' | 'time' | 'calories' | 'count';

interface AddActivityModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveComplete?: () => void;
}

export default function AddActivityModal({
  visible,
  onClose,
  onSaveComplete,
}: AddActivityModalProps) {
  const { settings } = useUser();
  const [userId, setUserId] = useState<string | null>(null);
  const [challengeActivities, setChallengeActivities] = useState<string[]>([]);
  const [selectedActivity, setSelectedActivity] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [customActivity, setCustomActivity] = useState('');
  
  // New state for metrics
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('time');
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [calories, setCalories] = useState('');
  const [points, setPoints] = useState('10'); // Default points
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingActivities, setFetchingActivities] = useState(false);

  // On mount - get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUserId(data.user.id);
      }
    });
  }, []);

  // On modal open => load challenge-based activities
  useEffect(() => {
    if (visible && userId) {
      loadChallengeActivities(userId);
    } else {
      resetForm();
    }
  }, [visible, userId]);

  // Set default metric when an activity is selected
  useEffect(() => {
    if (selectedActivity && !isCustom) {
      const defaultMetric = DEFAULT_METRICS[selectedActivity] as MetricType || 'time';
      setSelectedMetric(defaultMetric);
    }
  }, [selectedActivity, isCustom]);

  const loadChallengeActivities = async (userId: string) => {
    try {
      setError(null);
      setFetchingActivities(true);
      const acts = await getChallengeActivityTypes(userId);
      console.log('Challenge activities:', acts);
      setChallengeActivities(acts);
    } catch (err: any) {
      console.error('Error loading challenge activities:', err);
      setError(err.message);
    } finally {
      setFetchingActivities(false);
    }
  };

  const resetForm = () => {
    setSelectedActivity('');
    setIsCustom(false);
    setCustomActivity('');
    setSelectedMetric('time');
    setDuration('');
    setDistance('');
    setCalories('');
    setPoints('10');
    setNotes('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectActivity = (activity: string) => {
    setSelectedActivity(activity);
    setIsCustom(activity === 'Custom Activity');
    
    // Reset metrics if activity changes
    if (activity !== 'Custom Activity') {
      const defaultMetric = DEFAULT_METRICS[activity] as MetricType || 'time';
      setSelectedMetric(defaultMetric);
    }
  };

  // Filter out challenge-based from global
  const filteredGlobalActivities = GLOBAL_ACTIVITIES.filter(
    (ga) => !challengeActivities.includes(ga)
  );

  const getUnitLabel = () => {
    switch (selectedMetric) {
      case 'steps':
        return 'steps';
      case 'distance_km':
        return 'kilometers';
      case 'distance_miles':
        return 'miles';
      case 'time':
        return 'minutes';
      case 'calories':
        return 'calories';
      case 'count':
        return 'count';
      default:
        return '';
    }
  };

  const validateNumericInput = (text: string): boolean => {
    return !isNaN(Number(text)) && text.trim() !== '';
  };

  const handleSave = async () => {
    if (!userId) {
      setError('User not logged in');
      return;
    }
    
    const activityName = isCustom ? customActivity.trim() : selectedActivity;
    
    if (!activityName) {
      setError('Please select or enter an activity');
      return;
    }
    
    if (isCustom && !customActivity.trim()) {
      setError('Please enter a custom activity name');
      return;
    }
    
    if (!duration.trim() || !validateNumericInput(duration)) {
      setError('Please enter a valid duration (numeric only)');
      return;
    }
    
    if (selectedMetric === 'distance_km' || selectedMetric === 'distance_miles') {
      if (!distance.trim() || !validateNumericInput(distance)) {
        setError('Please enter a valid distance (numeric only)');
        return;
      }
    }
    
    if (selectedMetric === 'calories') {
      if (!calories.trim() || !validateNumericInput(calories)) {
        setError('Please enter valid calories (numeric only)');
        return;
      }
    }
    
    if (!validateNumericInput(points)) {
      setError('Please enter valid points (numeric only)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Convert distance to km if user uses miles
      let distVal = parseFloat(distance) || 0;
      if (selectedMetric === 'distance_miles') {
        distVal = distVal / 0.621371; // from miles => km
      }

      const durationVal = parseInt(duration, 10) || 0;
      const caloriesVal = parseInt(calories, 10) || 0;
      
      // For steps and count, we use the duration field to store the count value
      const payload = {
        activityType: activityName,
        duration: selectedMetric === 'steps' || selectedMetric === 'count' ? durationVal : durationVal,
        distance: selectedMetric.includes('distance') ? distVal : 0,
        calories: selectedMetric === 'calories' ? caloriesVal : 0,
        notes: notes.trim(),
        metric: selectedMetric,
        points: parseInt(points, 10) || 0,
      };

      console.log('Saving activity:', payload);

      // Insert activity
      const { data, error: insertError } = await supabase
        .from('activities')
        .insert({
          user_id: userId,
          activity_type: activityName,
          duration: payload.duration,
          distance: payload.distance,
          calories: payload.calories,
          notes: payload.notes,
          source: 'manual',
          metric: selectedMetric,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      
      // Update challenges with the new activity
      if (data) {
        await updateChallengesWithActivity(data.id, userId);
      }

      // Success!
      Alert.alert(
        'Success',
        'Activity added successfully',
        [{ text: 'OK', onPress: handleClose }]
      );
      
      // Notify parent component
      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (e: any) {
      console.error('Error saving activity:', e);
      setError(e.message || 'Failed to save activity');
      setLoading(false);
    }
  };

  // Render metric picker
  const renderMetricPicker = () => {
    const options = [
      { label: 'Steps', value: 'steps' },
      { label: 'Distance (km)', value: 'distance_km' },
      { label: 'Distance (miles)', value: 'distance_miles' },
      { label: 'Time (minutes)', value: 'time' },
      { label: 'Calories', value: 'calories' },
      { label: 'Count', value: 'count' },
    ];

    if (Platform.OS === 'ios') {
      return (
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedMetric}
            onValueChange={(value) => setSelectedMetric(value as MetricType)}
            style={styles.picker}
          >
            {options.map((option) => (
              <Picker.Item key={option.value} label={option.label} value={option.value} />
            ))}
          </Picker>
        </View>
      );
    } else {
      return (
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedMetric}
            onValueChange={(value) => setSelectedMetric(value as MetricType)}
            style={styles.picker}
            mode="dropdown"
          >
            {options.map((option) => (
              <Picker.Item key={option.value} label={option.label} value={option.value} />
            ))}
          </Picker>
        </View>
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add Activity</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Challenge-based Activities */}
            <Text style={styles.sectionLabel}>Activities from Your Challenges</Text>
            {fetchingActivities ? (
              <ActivityIndicator size="small" color="#4A90E2" style={{ marginVertical: 10 }} />
            ) : challengeActivities.length === 0 ? (
              <Text style={styles.noActivitiesText}>No active challenge activities</Text>
            ) : (
              <View style={styles.activityList}>
                {challengeActivities.map((act) => (
                  <TouchableOpacity
                    key={act}
                    style={[
                      styles.activityButton,
                      selectedActivity === act && !isCustom && styles.activityButtonSelected,
                    ]}
                    onPress={() => handleSelectActivity(act)}
                  >
                    <Text
                      style={[
                        styles.activityButtonText,
                        selectedActivity === act && !isCustom && styles.activityButtonTextSelected,
                      ]}
                    >
                      {act}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* General Activities */}
            <Text style={styles.sectionLabel}>General Activities</Text>
            <View style={styles.activityList}>
              {filteredGlobalActivities.map((ga) => (
                <TouchableOpacity
                  key={ga}
                  style={[
                    styles.activityButton,
                    selectedActivity === ga && !isCustom && styles.activityButtonSelected,
                  ]}
                  onPress={() => handleSelectActivity(ga)}
                >
                  <Text
                    style={[
                      styles.activityButtonText,
                      selectedActivity === ga && !isCustom && styles.activityButtonTextSelected,
                    ]}
                  >
                    {ga}
                  </Text>
                </TouchableOpacity>
              ))}
              {/* Custom Activity option */}
              <TouchableOpacity
                style={[
                  styles.activityButton,
                  isCustom && styles.activityButtonSelected,
                ]}
                onPress={() => handleSelectActivity('Custom Activity')}
              >
                <Text
                  style={[
                    styles.activityButtonText,
                    isCustom && styles.activityButtonTextSelected,
                  ]}
                >
                  + Custom Activity
                </Text>
              </TouchableOpacity>
            </View>

            {/* If user picked "Custom Activity" */}
            {isCustom && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Custom Activity Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Basketball"
                  placeholderTextColor="#999"
                  value={customActivity}
                  onChangeText={(text) => setCustomActivity(text)}
                />
              </View>
            )}

            {/* Only show remaining fields if an activity is selected */}
            {(selectedActivity || isCustom) && (
              <>
                {/* Metric Selector */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Metric</Text>
                  {renderMetricPicker()}
                </View>

                {/* Duration/Value input - always shown */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    {selectedMetric === 'steps' ? 'Steps' : 
                      selectedMetric === 'count' ? 'Count' : 'Duration (minutes)'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={duration}
                    onChangeText={(text) => {
                      if (text === '' || validateNumericInput(text)) {
                        setDuration(text);
                      }
                    }}
                    keyboardType="numeric"
                    placeholder={`Enter ${selectedMetric === 'steps' ? 'steps' : 
                      selectedMetric === 'count' ? 'count' : 'duration'}`}
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Distance - only shown for distance metrics */}
                {(selectedMetric === 'distance_km' || selectedMetric === 'distance_miles') && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Distance ({selectedMetric === 'distance_km' ? 'km' : 'miles'})
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={distance}
                      onChangeText={(text) => {
                        if (text === '' || validateNumericInput(text)) {
                          setDistance(text);
                        }
                      }}
                      keyboardType="numeric"
                      placeholder={`Enter distance in ${selectedMetric === 'distance_km' ? 'kilometers' : 'miles'}`}
                      placeholderTextColor="#999"
                    />
                  </View>
                )}

                {/* Calories - only shown for calories metric */}
                {selectedMetric === 'calories' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Calories</Text>
                    <TextInput
                      style={styles.input}
                      value={calories}
                      onChangeText={(text) => {
                        if (text === '' || validateNumericInput(text)) {
                          setCalories(text);
                        }
                      }}
                      keyboardType="numeric"
                      placeholder="Enter calories burned"
                      placeholderTextColor="#999"
                    />
                  </View>
                )}

                {/* Points - always shown */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Points (for challenges)</Text>
                  <TextInput
                    style={styles.input}
                    value={points}
                    onChangeText={(text) => {
                      if (text === '' || validateNumericInput(text)) {
                        setPoints(text);
                      }
                    }}
                    keyboardType="numeric"
                    placeholder="Enter points"
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Notes - always shown */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Notes (optional)</Text>
                  <TextInput
                    style={[styles.input, styles.notesInput]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Add any extra details"
                    placeholderTextColor="#999"
                    multiline
                  />
                </View>
              </>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.saveButton, 
                (loading || !(selectedActivity || (isCustom && customActivity))) && 
                styles.saveButtonDisabled
              ]}
              onPress={handleSave}
              disabled={loading || !(selectedActivity || (isCustom && customActivity))}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Activity</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Styles
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  body: {
    padding: 16,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 8,
  },
  noActivitiesText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  activityList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  activityButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    marginRight: 8,
  },
  activityButtonSelected: {
    backgroundColor: '#4A90E2',
  },
  activityButtonText: {
    fontSize: 14,
    color: '#333',
  },
  activityButtonTextSelected: {
    color: '#fff',
  },
  inputGroup: {
    marginTop: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#333',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 8,
  },
  picker: {
    height: 50,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});