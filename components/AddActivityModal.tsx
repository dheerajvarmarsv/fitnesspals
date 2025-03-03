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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useUser } from './UserContext';
import {
  getChallengeActivityTypes,
  saveUserActivity,
  updateChallengesWithActivity,
} from '../lib/challengeUtils';

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

type MetricType = 'steps' | 'distance_km' | 'distance_miles' | 'time' | 'calories' | 'count';

const DEFAULT_METRICS: { [key: string]: MetricType } = {
  Workout: 'time',
  Steps: 'steps',
  Sleep: 'time',
  'Screen Time': 'time',
  'No Sugars': 'count',
  Yoga: 'time',
  'High Intensity': 'calories',
  Count: 'count',
};

const ACTIVITY_COLORS: { [key: string]: { light: string; primary: string; text: string } } = {
  Workout:        { light: '#E3F2FD', primary: '#2196F3', text: '#0D47A1' },
  Steps:          { light: '#E8F5E9', primary: '#4CAF50', text: '#1B5E20' },
  Sleep:          { light: '#E0F7FA', primary: '#00BCD4', text: '#006064' },
  'Screen Time':  { light: '#FFF3E0', primary: '#FF9800', text: '#E65100' },
  'No Sugars':    { light: '#FCE4EC', primary: '#F06292', text: '#880E4F' },
  'High Intensity':{light: '#FFEBEE', primary: '#F44336', text: '#B71C1C' },
  Yoga:           { light: '#F3E5F5', primary: '#9C27B0', text: '#4A148C' },
  Count:          { light: '#EEEEEE', primary: '#9E9E9E', text: '#212121' },
  Custom:         { light: '#E1F5FE', primary: '#03A9F4', text: '#01579B' },
};

const ACTIVITY_ICONS: { [key: string]: string } = {
  Workout: 'dumbbell',
  Steps: 'shoe-prints',
  Sleep: 'bed',
  'Screen Time': 'mobile',
  'No Sugars': 'cookie-bite',
  Yoga: 'pray',
  'High Intensity': 'fire',
  Count: 'hashtag',
  Custom: 'plus-circle',
};

// Update the METRIC_DESCRIPTIONS to be dynamic based on settings
const getMetricDescriptions = (useKilometers: boolean) => ({
    time: { 
      label: 'Time (hours)', 
      hint: 'e.g., 0.5 = 30 min',
      convert: (value: number) => convertHoursToMinutes(value) // Convert to minutes for storage
    },
    distance_km: { 
      label: useKilometers ? 'Distance (km)' : 'Distance (miles)',
      hint: useKilometers ? 'Distance in kilometers' : 'Distance in miles',
      convert: (value: number) => useKilometers ? value : convertMilesToKm(value) // Always store as km
    },
    distance_miles: { 
      label: 'Distance (miles)', 
      hint: 'Distance in miles',
      convert: (value: number) => convertMilesToKm(value) // Convert to km for storage
    },
    steps: { 
      label: 'Steps',
      hint: 'Count of steps',
      convert: (value: number) => value 
    },
    calories: { 
      label: 'Calories',
      hint: 'Count of calories burned',
      convert: (value: number) => value 
    },
    count: { 
      label: 'Quantity',
      hint: 'Generic numeric measure',
      convert: (value: number) => value 
    },
  });

const convertMinutesToHours = (minutes: number): number => {
    return minutes / 60;
  };
  
  const convertHoursToMinutes = (hours: number): number => {
    return hours * 60;
  };
  
  const convertKmToMiles = (km: number): number => {
    return km * 0.621371;
  };
  
  const convertMilesToKm = (miles: number): number => {
    return miles / 0.621371;
  };
  
// Convert user setting to distance metric
function distanceKey(useKilometers: boolean): MetricType {
  return useKilometers ? 'distance_km' : 'distance_miles';
}

// Unit label
function getUnitLabel(metric: MetricType): string {
  switch (metric) {
    case 'steps':         return 'steps';
    case 'distance_km':   return 'kilometers';
    case 'distance_miles':return 'miles';
    case 'time':          return 'hours';
    case 'calories':      return 'calories';
    case 'count':         return 'count';
    default:              return '';
  }
}

interface ActivityData {
  activityType: string;
  metrics: { [key in MetricType]?: string };
  customSelectedMetrics?: MetricType[];
}

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
  const [challengeMetrics, setChallengeMetrics] = useState<{ [key: string]: MetricType[] }>({});

  const [selectedActivities, setSelectedActivities] = useState<{ [key: string]: ActivityData }>({});

  // For custom activity
  const [customActivity, setCustomActivity] = useState('');
  const [isCustomExpanded, setIsCustomExpanded] = useState(false);
  const [customSelectedMetrics, setCustomSelectedMetrics] = useState<MetricType[]>([]);

  // UI states
  const [loading, setLoading] = useState(false);
  const [fetchingActivities, setFetchingActivities] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (visible && userId) {
      loadChallengeActivities(userId);
    } else {
      resetForm();
    }
  }, [visible, userId]);

  async function loadChallengeActivities(uid: string) {
    try {
      setError(null);
      setFetchingActivities(true);

      const { data: challengeData, error: challengeError } = await supabase
        .from('challenge_participants')
        .select(`
          challenge_id,
          challenges (
            id,
            title,
            challenge_activities (
              activity_type,
              metric
            )
          )
        `)
        .eq('user_id', uid)
        .eq('status', 'active');

      if (challengeError) throw challengeError;

      const activities: string[] = [];
      const metricsMap: { [key: string]: MetricType[] } = {};

      (challengeData || []).forEach(participant => {
        const challenge = participant.challenges;
        if (challenge && challenge.challenge_activities) {
          challenge.challenge_activities.forEach((act: any) => {
            const actType = act.activity_type;
            const metric = act.metric as MetricType;
            if (!activities.includes(actType)) activities.push(actType);
            if (!metricsMap[actType]) metricsMap[actType] = [];
            if (!metricsMap[actType].includes(metric)) metricsMap[actType].push(metric);
          });
        }
      });

      setChallengeActivities(activities);
      setChallengeMetrics(metricsMap);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFetchingActivities(false);
    }
  }

  function resetForm() {
    setSelectedActivities({});
    setCustomActivity('');
    setIsCustomExpanded(false);
    setCustomSelectedMetrics([]);
    setError(null);
    setFormErrors({});
    setLoading(false);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function toggleActivity(activityName: string, isCustom: boolean = false) {
    if (isCustom) {
      setIsCustomExpanded(!isCustomExpanded);
      return;
    }
    if (selectedActivities[activityName]) {
      const newSel = { ...selectedActivities };
      delete newSel[activityName];
      setSelectedActivities(newSel);
      return;
    }
    let defaultMetric: MetricType = 'time';
    if (challengeMetrics[activityName] && challengeMetrics[activityName].length > 0) {
      defaultMetric = challengeMetrics[activityName][0];
    } else if (DEFAULT_METRICS[activityName]) {
      defaultMetric = DEFAULT_METRICS[activityName];
    }
    if (defaultMetric === 'distance_km' || defaultMetric === 'distance_miles') {
      defaultMetric = settings.useKilometers ? 'distance_km' : 'distance_miles';
    }
    setSelectedActivities({
      ...selectedActivities,
      [activityName]: {
        activityType: activityName,
        metrics: { [defaultMetric]: '' },
      },
    });
  }

  function toggleCustomMetric(metric: MetricType) {
    if (customSelectedMetrics.includes(metric)) {
      setCustomSelectedMetrics(prev => prev.filter(m => m !== metric));
    } else {
      setCustomSelectedMetrics(prev => [...prev, metric]);
    }
  }

  function addCustomActivity() {
    const name = customActivity.trim();
    if (!name) {
      setFormErrors({ ...formErrors, custom: 'Please enter a name for the custom activity' });
      return;
    }
    if (selectedActivities[name]) {
      setFormErrors({ ...formErrors, custom: 'This activity name already exists' });
      return;
    }
    if (customSelectedMetrics.length === 0) {
      setFormErrors({ ...formErrors, custom: 'Please select at least one metric' });
      return;
    }
    const metricObj: { [key in MetricType]?: string } = {};
    customSelectedMetrics.forEach(mt => {
      if (mt === 'distance_km' || mt === 'distance_miles') {
        metricObj[distanceKey(settings.useKilometers)] = '';
      } else {
        metricObj[mt] = '';
      }
    });
    // Instead of rendering it inside the "custom activity" container,
    // we treat this new custom activity exactly like a new "general" item:
    setSelectedActivities({
      ...selectedActivities,
      [name]: {
        activityType: name,
        metrics: metricObj,
        customSelectedMetrics: [...customSelectedMetrics],
      },
    });
    setCustomActivity('');
    setCustomSelectedMetrics([]);
    setIsCustomExpanded(false);
    setFormErrors({ ...formErrors, custom: '' });
  }

  function updateActivityMetric(activityName: string, metric: MetricType, value: string) {
    if (!selectedActivities[activityName]) return;
    const prevData = selectedActivities[activityName];
    const updated = {
      ...prevData,
      metrics: { ...prevData.metrics, [metric]: value },
    };
    setSelectedActivities({ ...selectedActivities, [activityName]: updated });
    if (formErrors[`${activityName}_${metric}`]) {
      const newErrors = { ...formErrors };
      delete newErrors[`${activityName}_${metric}`];
      setFormErrors(newErrors);
    }
  }

  function validateNumericInput(text: string): boolean {
    return !isNaN(Number(text)) && text.trim() !== '';
  }

  function validateForm(): boolean {
    const newErrors: { [key: string]: string } = {};
    let valid = true;
    if (Object.keys(selectedActivities).length === 0) {
      newErrors['activities'] = 'Please select at least one activity';
      valid = false;
    }
    Object.entries(selectedActivities).forEach(([actName, data]) => {
      let hasValue = false;
      Object.entries(data.metrics).forEach(([mtKey, val]) => {
        if (val && val.trim() !== '') {
          hasValue = true;
        } else if (val === '') {
          delete data.metrics[mtKey as MetricType];
        }
      });
      if (!hasValue) {
        newErrors[`${actName}_general`] = 'Enter at least one value';
        valid = false;
      }
    });
    setFormErrors(newErrors);
    return valid;
  }

  async function handleSave() {
    if (!userId) {
      setError('User not logged in');
      return;
    }
    if (!validateForm()) return;
    setLoading(true);
    setError(null);
  
    try {
      const metricDescriptions = getMetricDescriptions(settings.useKilometers);
      
      for (const [actName, data] of Object.entries(selectedActivities)) {
        for (const [metricType, val] of Object.entries(data.metrics)) {
          if (!val || val.trim() === '') continue;
          
          const numericVal = parseFloat(val);
          let distanceVal: number | null = null;
          let durationVal: number | null = null;
          let caloriesVal: number | null = null;
          
          // Use the conversion functions from our metric descriptions
          switch (metricType as MetricType) {
            case 'distance_miles':
            case 'distance_km':
              // Always convert to km for storage regardless of display preference
              distanceVal = metricDescriptions[metricType].convert(numericVal);
              break;
            case 'time':
              // Convert hours to minutes for storage
              durationVal = metricDescriptions.time.convert(numericVal);
              break;
            case 'calories':
              caloriesVal = numericVal;
              break;
            case 'steps':
            case 'count':
              durationVal = numericVal; // Store in duration field
              break;
          }
  
          const { data: newActivity, error: insertErr } = await supabase
            .from('activities')
            .insert({
              user_id: userId,
              activity_type: actName,
              duration: durationVal,
              distance: distanceVal && distanceVal > 0 ? distanceVal : null,
              calories: caloriesVal && caloriesVal > 0 ? caloriesVal : null,
              metric: metricType,
              source: 'manual',
              created_at: new Date(),
              notes: '',
            })
            .select()
            .single();
  
          if (insertErr) throw insertErr;
          if (newActivity) {
            await updateChallengesWithActivity(newActivity.id, userId);
          }
        }
      }
      Alert.alert('Success', 'Activities added successfully', [
        { text: 'OK', onPress: handleClose },
      ]);
      if (onSaveComplete) onSaveComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to save activities');
      setLoading(false);
    }
  }

// Update the function that renders metric inputs to show correct units
function renderMetricInputs(activityName: string, data: ActivityData) {
    const colorSet = ACTIVITY_COLORS[activityName] || ACTIVITY_COLORS.Custom;
    let metricsToShow: MetricType[] = [];
    const metricDescriptions = getMetricDescriptions(settings.useKilometers);
  
    // Rest of the function remains the same...
    
    return (
      <View style={styles.metricsContainer}>
        {metricsToShow.map(mt => {
          if ((mt === 'distance_km' || mt === 'distance_miles') && 
              mt !== (settings.useKilometers ? 'distance_km' : 'distance_miles')) {
            return null;
          }
          const val = data.metrics[mt] || '';
          const desc = metricDescriptions[mt];
          return (
            <View key={mt} style={styles.metricInputContainer}>
              <TextInput
                style={[
                  styles.metricInput,
                  formErrors[`${activityName}_${mt}`] && styles.inputError,
                ]}
                value={val}
                onChangeText={(text) => {
                  if (text === '' || validateNumericInput(text)) {
                    updateActivityMetric(activityName, mt, text);
                  }
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
              />
              <Text style={styles.metricLabel}>{desc.label}</Text>
            </View>
          );
        })}
      </View>
    );
  }

  function renderActivityChip(activityName: string) {
    const selected = !!selectedActivities[activityName];
    const colorSet = ACTIVITY_COLORS[activityName] || ACTIVITY_COLORS.Custom;
    const actIcon = ACTIVITY_ICONS[activityName] || 'plus-circle';

    return (
      <View key={activityName} style={styles.activityChipContainer}>
        <TouchableOpacity
          style={[styles.activityChip, selected && { backgroundColor: colorSet.primary }]}
          onPress={() => toggleActivity(activityName)}
        >
          <FontAwesome5
            name={actIcon}
            size={16}
            color={selected ? '#fff' : colorSet.primary}
            style={styles.activityIcon}
          />
          <Text style={[styles.activityChipText, selected && { color: '#fff' }]}>
            {activityName}
          </Text>
          {selected && (
            <Ionicons name="checkmark-circle" size={16} color="#fff" style={{ marginLeft: 4 }} />
          )}
        </TouchableOpacity>

        {selected && selectedActivities[activityName] && (
          <View style={[styles.activityForm, { backgroundColor: colorSet.light }]}>
            {renderMetricInputs(activityName, selectedActivities[activityName])}
            {formErrors[`${activityName}_general`] && (
              <Text style={styles.fieldErrorText}>
                {formErrors[`${activityName}_general`]}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }

  function renderCustomActivityPanel() {
    const colorSet = ACTIVITY_COLORS.Custom;
    if (!isCustomExpanded) return null;

    return (
      <View style={[styles.activityForm, { backgroundColor: colorSet.light }]}>
        <View style={styles.formRow}>
          <Text style={[styles.formLabel, { color: colorSet.text }]}>Activity Name</Text>
          <TextInput
            style={[styles.formInput, formErrors['custom'] && styles.inputError]}
            value={customActivity}
            onChangeText={setCustomActivity}
            placeholder="Enter custom activity name"
            placeholderTextColor="#999"
          />
          {formErrors['custom'] && (
            <Text style={styles.fieldErrorText}>{formErrors['custom']}</Text>
          )}
        </View>

        <Text style={[styles.formLabel, { color: colorSet.text }]}>Select Metrics</Text>
        <View style={styles.metricCheckboxes}>
          {(['time', 'distance_km', 'steps', 'calories', 'count'] as MetricType[]).map(metric => {
            const isChecked = customSelectedMetrics.includes(metric);
            const label = getMetricDescriptions(settings.useKilometers)[metric].label;
            return (
              <TouchableOpacity
                key={metric}
                style={[styles.metricCheckbox, isChecked && styles.metricCheckboxSelected]}
                onPress={() => toggleCustomMetric(metric)}
              >
                <Text style={[styles.metricCheckboxText, isChecked && styles.metricCheckboxTextSelected]}>
                  {label}
                </Text>
                {isChecked && <Ionicons name="checkmark" size={16} color="#fff" />}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[
            styles.addCustomButton,
            customSelectedMetrics.length === 0 && styles.addCustomButtonDisabled,
          ]}
          onPress={addCustomActivity}
          disabled={customSelectedMetrics.length === 0}
        >
          <Text style={styles.addCustomButtonText}>Add Custom Activity</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayedGlobalActivities = GLOBAL_ACTIVITIES.filter(g => !challengeActivities.includes(g));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Add Activity</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 20 }}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {formErrors['activities'] && (
              <View style={styles.formErrorContainer}>
                <Text style={styles.formErrorText}>{formErrors['activities']}</Text>
              </View>
            )}

            {/* Challenge-based */}
            <Text style={styles.sectionLabel}>Activities from Your Challenges</Text>
            {fetchingActivities ? (
              <ActivityIndicator size="small" color="#4A90E2" style={styles.loadingIndicator} />
            ) : challengeActivities.length === 0 ? (
              <Text style={styles.noActivitiesText}>No active challenge activities</Text>
            ) : (
              <View style={styles.activityGrid}>
                {challengeActivities.map(act => renderActivityChip(act))}
              </View>
            )}

            {/* General */}
            <Text style={styles.sectionLabel}>General Activities</Text>
            <View style={styles.activityGrid}>
              {displayedGlobalActivities.map(act => renderActivityChip(act))}

              {/* + Custom Activity Button */}
              <View style={styles.activityChipContainer}>
                <TouchableOpacity
                  style={[
                    styles.activityChip,
                    isCustomExpanded && { backgroundColor: ACTIVITY_COLORS.Custom.primary },
                  ]}
                  onPress={() => setIsCustomExpanded(!isCustomExpanded)}
                >
                  <FontAwesome5
                    name={ACTIVITY_ICONS.Custom}
                    size={16}
                    color={isCustomExpanded ? '#fff' : ACTIVITY_COLORS.Custom.primary}
                    style={styles.activityIcon}
                  />
                  <Text style={[styles.activityChipText, isCustomExpanded && { color: '#fff' }]}>
                    + Custom Activity
                  </Text>
                </TouchableOpacity>

                {renderCustomActivityPanel()}
              </View>

              {/* Render newly added custom activities as separate chips */}
              {Object.keys(selectedActivities)
                .filter(a => !GLOBAL_ACTIVITIES.includes(a) && !challengeActivities.includes(a))
                .map(a => renderActivityChip(a))}
            </View>

            {Object.keys(selectedActivities).length === 0 && (
              <Text style={[styles.noActivitiesText, { marginTop: 8 }]}>
                Select at least one activity to log
              </Text>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (loading || Object.keys(selectedActivities).length === 0) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={loading || Object.keys(selectedActivities).length === 0}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  Save {Object.keys(selectedActivities).length} Activities
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
  formErrorContainer: {
    backgroundColor: '#FFEAEA',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  formErrorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  loadingIndicator: {
    marginVertical: 12,
  },
  noActivitiesText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  activityChipContainer: {
    width: '48%',
    marginBottom: 12,
  },
  activityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  activityIcon: {
    marginRight: 8,
  },
  activityChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  checkIcon: {
    marginLeft: 4,
  },
  activityForm: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  metricInputContainer: {
    width: '30%',
    marginBottom: 12,
    alignItems: 'center',
  },
  metricInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    width: '100%',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  metricCheckboxes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    marginTop: 6,
  },
  metricCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metricCheckboxSelected: {
    backgroundColor: '#4A90E2',
  },
  metricCheckboxText: {
    fontSize: 14,
    color: '#333',
    marginRight: 4,
  },
  metricCheckboxTextSelected: {
    color: '#fff',
  },
  addCustomButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  addCustomButtonDisabled: {
    opacity: 0.5,
  },
  addCustomButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  formRow: {
    marginBottom: 10,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  fieldErrorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 16,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
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