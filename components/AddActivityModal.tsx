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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  'Count', // "Count" means you measure a numeric count in .duration
];

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
  const { user, settings } = useUser();
  const [challengeActivities, setChallengeActivities] = useState<string[]>([]);
  const [selectedActivity, setSelectedActivity] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [customActivity, setCustomActivity] = useState('');

  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On modal open => load challenge-based activities
  useEffect(() => {
    if (visible && user?.id) {
      loadChallengeActivities(user.id);
    } else {
      resetForm();
    }
  }, [visible]);

  const loadChallengeActivities = async (userId: string) => {
    try {
      setError(null);
      setLoading(true);
      const acts = await getChallengeActivityTypes(userId);
      setChallengeActivities(acts);
    } catch (err: any) {
      console.error('Error loading challenge activities:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedActivity('');
    setIsCustom(false);
    setCustomActivity('');
    setDuration('');
    setDistance('');
    setCalories('');
    setNotes('');
    setError(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSelectActivity = (activity: string) => {
    setSelectedActivity(activity);
    setIsCustom(activity === 'Custom Activity');
  };

  // filter out challenge-based from global
  const finalGlobal = GLOBAL_ACTIVITIES.filter((ga) => !challengeActivities.includes(ga));

  const distanceLabel = settings.useKilometers ? 'Distance (km)' : 'Distance (mi)';

  const handleSave = async () => {
    if (!user?.id) {
      setError('User not logged in');
      return;
    }
    if (!selectedActivity && !isCustom) {
      setError('Please select an activity');
      return;
    }
    if (isCustom && !customActivity.trim()) {
      setError('Enter a custom activity name');
      return;
    }
    if (!duration.trim()) {
      setError('Please enter a duration');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Convert distance to km if user uses miles
      let distVal = parseFloat(distance) || 0;
      if (!settings.useKilometers) {
        distVal = distVal / 0.621371; // from miles => km
      }

      const finalActivity = isCustom ? customActivity.trim() : selectedActivity;
      const payload = {
        activityType: finalActivity,
        duration: parseInt(duration, 10) || 0,
        distance: distVal,
        calories: parseInt(calories, 10) || 0,
        notes: notes.trim(),
      };

      // insert activity
      const result = await saveUserActivity(payload, user.id);
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to save activity');
      }
      const newActivityId = result.data.id;

      // update challenges
      await updateChallengesWithActivity(newActivityId, user.id);

      // notify parent
      if (onSaveComplete) {
        onSaveComplete();
      }
      handleClose();
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
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
            {challengeActivities.length === 0 ? (
              <Text style={styles.noActivitiesText}>No active challenge activities</Text>
            ) : (
              <View style={styles.activityList}>
                {challengeActivities.map((act) => (
                  <TouchableOpacity
                    key={act}
                    style={[
                      styles.activityButton,
                      selectedActivity === act && styles.activityButtonSelected,
                    ]}
                    onPress={() => handleSelectActivity(act)}
                  >
                    <Text
                      style={[
                        styles.activityButtonText,
                        selectedActivity === act && styles.activityButtonTextSelected,
                      ]}
                    >
                      {act}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Filtered Global Activities */}
            <Text style={styles.sectionLabel}>General Activities</Text>
            <View style={styles.activityList}>
              {finalGlobal.map((ga) => (
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
              {/* “Custom Activity” option */}
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

            {/* Duration */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Duration (minutes)</Text>
              <TextInput
                style={styles.input}
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
                placeholder="Enter duration"
                placeholderTextColor="#999"
              />
            </View>

            {/* Distance */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{distanceLabel}</Text>
              <TextInput
                style={styles.input}
                value={distance}
                onChangeText={setDistance}
                keyboardType="numeric"
                placeholder="Optional"
                placeholderTextColor="#999"
              />
            </View>

            {/* Calories */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Calories (optional)</Text>
              <TextInput
                style={styles.input}
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
                placeholder="e.g. 200"
                placeholderTextColor="#999"
              />
            </View>

            {/* Notes */}
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
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
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
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#333' },
  body: { padding: 16 },
  errorContainer: { backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8, marginBottom: 12 },
  errorText: { color: '#DC2626', textAlign: 'center' },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 8 },
  noActivitiesText: { fontSize: 14, color: '#666', marginBottom: 12 },
  activityList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  activityButton: { backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  activityButtonSelected: { backgroundColor: '#4A90E2' },
  activityButtonText: { fontSize: 14, color: '#333' },
  activityButtonTextSelected: { color: '#fff' },
  inputGroup: { marginTop: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  input: { backgroundColor: '#f5f5f5', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#333' },
  notesInput: { height: 80, textAlignVertical: 'top' },
  footer: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#eee', paddingHorizontal: 16, paddingVertical: 12 },
  saveButton: { flex: 1, backgroundColor: '#4A90E2', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});