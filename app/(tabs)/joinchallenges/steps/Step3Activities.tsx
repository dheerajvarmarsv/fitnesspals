// app/(tabs)/joinchallenges/steps/Step3Activities.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { useUser } from '../../../../components/UserContext';

// Instead of storing "0 hours," we keep numeric threshold + a separate metric
export type MetricType = 'steps' | 'distance_km' | 'distance_miles' | 'time' | 'calories' | 'count';

export interface ActivityRule {
  activityType: string;
  metric: MetricType;
  targetValue: number;  // numeric threshold
  points: number;
  isSelected: boolean;
  isCustom?: boolean;
  // threshold?: string; // No longer used, or if you keep it, it's purely for display
}

interface Step3ActivitiesProps {
  activities: ActivityRule[];
  setActivities: (activities: ActivityRule[]) => void;
  details: { globalTimeframe: 'day' | 'week' };
  handleTimeframeChange: (timeframe: 'day' | 'week') => void;
  showCustomModal: boolean;
  setShowCustomModal: (value: boolean) => void;
  customActivity: {
    name: string;
    metric: MetricType;
    targetValue: string;
    points: string;
  };
  setCustomActivity: (activity: {
    name: string;
    metric: MetricType;
    targetValue: string;
    points: string;
  }) => void;
  handleAddCustomActivity: () => void;
  styles?: any;
}

const DEFAULT_ACTIVITIES = [
  { activityType: 'Workout', defaultMetric: 'time' as MetricType },
  { activityType: 'Steps', defaultMetric: 'steps' as MetricType },
  { activityType: 'Sleep', defaultMetric: 'time' as MetricType },
  { activityType: 'Screen Time', defaultMetric: 'time' as MetricType },
  { activityType: 'No Sugars', defaultMetric: 'steps' as MetricType },
  { activityType: 'Yoga', defaultMetric: 'time' as MetricType },
  { activityType: 'High Intensity', defaultMetric: 'calories' as MetricType },
];

const ACTIVITY_GRADIENTS: { [key: string]: string[] } = {
  Workout: ['#FF8008', '#FFC837'],
  Steps: ['#2193b0', '#6dd5ed'],
  Sleep: ['#0F2027', '#203A43'],
  'Screen Time': ['#4568DC', '#B06AB3'],
  'No Sugars': ['#8A2387', '#F27121'],
  Yoga: ['#834d9b', '#d04ed6'],
  'High Intensity': ['#f12711', '#f5af19'],
  Custom: ['#654ea3', '#eaafc8'],
};

const ACTIVITY_ICONS: { [key: string]: string } = {
  Workout: 'dumbbell',
  Steps: 'shoe-prints',
  Sleep: 'bed',
  'Screen Time': 'mobile',
  'No Sugars': 'cookie-bite',
  Yoga: 'pray',
  'High Intensity': 'fire',
  Custom: 'star',
};

// The metric options will be generated dynamically based on user preferences
const getMetricOptions = (useKilometers: boolean) => [
  { label: 'Time (hours)', value: 'time' },
  { label: 'Steps', value: 'steps' },
  { label: useKilometers ? 'Distance (km)' : 'Distance (miles)', value: useKilometers ? 'distance_km' : 'distance_miles' },
  { label: 'Calories', value: 'calories' },
  { label: 'Quantity', value: 'count' },
];

// For placeholders in the UI
function getMetricLabel(metric: MetricType, useKilometers: boolean = true): string {
  switch (metric) {
    case 'steps':
      return 'Steps';
    case 'distance_km':
      return useKilometers ? 'Kilometers' : 'Miles';
    case 'distance_miles':
      return useKilometers ? 'Kilometers' : 'Miles';
    case 'time':
      return 'Hours';
    case 'calories':
      return 'Calories';
    case 'count':
      return 'Quantity';
    default:
      return 'Units';
  }
}

export default function Step3Activities({
  activities,
  setActivities,
  details,
  handleTimeframeChange,
  showCustomModal,
  setShowCustomModal,
  customActivity,
  setCustomActivity,
  handleAddCustomActivity,
}: Step3ActivitiesProps) {
  const { settings } = useUser();
  const [expandedActivity, setExpandedActivity] = useState<number | null>(null);
  const [initializedActivities, setInitializedActivities] = useState(false);

  // Initialize default activities once
  useEffect(() => {
    if (!initializedActivities && activities.length === 0) {
      const updatedActivities = DEFAULT_ACTIVITIES.map((activity) => ({
        activityType: activity.activityType,
        metric: activity.defaultMetric,
        targetValue: 0,
        points: 1,
        isSelected: false,
      }));
      setActivities(updatedActivities);
      setInitializedActivities(true);
    }
  }, [initializedActivities, setActivities, activities]);

  const toggleActivitySelection = (index: number) => {
    const updated = [...activities];
    updated[index].isSelected = !updated[index].isSelected;
    if (updated[index].isSelected) {
      setExpandedActivity(index);
    } else if (expandedActivity === index) {
      setExpandedActivity(null);
    }
    setActivities(updated);
  };

  const handleExpandActivity = (index: number) => {
    setExpandedActivity(expandedActivity === index ? null : index);
  };

  const validateNumericInput = (text: string): boolean => {
    return !isNaN(Number(text)) && text.trim() !== '';
  };

  // Update fields (metric, targetValue, points)
  const updateActivityRule = (index: number, field: keyof ActivityRule, value: any) => {
    const updated = [...activities];
    (updated[index] as any)[field] = value;
    setActivities(updated);
  };

  const renderActivityItem = ({
    item,
    index,
  }: {
    item: ActivityRule;
    index: number;
  }) => {
    const isExpanded = expandedActivity === index;
    const gradientColors = ACTIVITY_GRADIENTS[item.activityType] || ACTIVITY_GRADIENTS.Custom;
    const iconName = ACTIVITY_ICONS[item.activityType] || ACTIVITY_ICONS.Custom;

    return (
      <View style={localStyles.activityCard}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={localStyles.activityCardGradient}
        >
          <Pressable style={localStyles.activityHeader} onPress={() => toggleActivitySelection(index)}>
            <View style={localStyles.activityHeaderContent}>
              <View style={localStyles.activityIconContainer}>
                <FontAwesome5 name={iconName} size={16} color="#fff" />
              </View>
              <Text style={localStyles.activityName}>{item.activityType}</Text>
            </View>
            <View style={localStyles.activityHeaderActions}>
              <View
                style={[
                  localStyles.activityCheckbox,
                  item.isSelected && localStyles.activityCheckboxSelected,
                ]}
              >
                {item.isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              {item.isSelected && (
                <TouchableOpacity
                  style={localStyles.expandButton}
                  onPress={() => handleExpandActivity(index)}
                >
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#fff"
                  />
                </TouchableOpacity>
              )}
            </View>
          </Pressable>

          {item.isSelected && isExpanded && (
            <View style={localStyles.activitySettings}>
              {/* Metric */}
              <View style={localStyles.settingRow}>
                <Text style={localStyles.settingLabel}>Metric:</Text>
                <View style={localStyles.pickerContainer}>
                  {Platform.OS === 'ios' ? (
                    <TouchableOpacity
                      style={localStyles.pickerButton}
                      onPress={() => {
                        const useKilometers = settings?.useKilometers !== undefined ? settings.useKilometers : true;
                        Alert.alert(
                          'Select Metric',
                          'Please select a metric type:',
                          getMetricOptions(useKilometers).map(option => ({
                            text: option.label,
                            onPress: () => updateActivityRule(index, 'metric', option.value),
                          }))
                        );
                      }}
                    >
                      <Text style={localStyles.pickerButtonText}>
                        {getMetricOptions(settings?.useKilometers !== undefined ? settings.useKilometers : true)
                          .find(opt => opt.value === item.metric)?.label || 'Select Metric'}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color="#fff" />
                    </TouchableOpacity>
                  ) : (
                    <Picker
                      selectedValue={item.metric}
                      onValueChange={(val) => updateActivityRule(index, 'metric', val)}
                      style={localStyles.metricPicker}
                      dropdownIconColor="#fff"
                      mode="dropdown"
                    >
                      {getMetricOptions(settings?.useKilometers !== undefined ? settings.useKilometers : true)
                        .map((opt) => (
                          <Picker.Item
                            key={opt.value}
                            label={opt.label}
                            value={opt.value}
                            color="#333"
                          />
                        ))}
                    </Picker>
                  )}
                </View>
              </View>

              {/* Target Value */}
              <View style={localStyles.settingRow}>
                <Text style={localStyles.settingLabel}>Target:</Text>
                <TextInput
                  style={localStyles.settingInput}
                  placeholder={`Enter target in ${getMetricLabel(item.metric, settings?.useKilometers !== undefined ? settings.useKilometers : true)}`}
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  value={item.targetValue ? item.targetValue.toString() : ''}
                  onChangeText={(text) => {
                    const trimmed = text.trim();
                    if (trimmed === '') {
                      updateActivityRule(index, 'targetValue', 1);
                      return;
                    }
                    if (isNaN(Number(trimmed))) {
                      return;
                    }
                    const numericVal = parseFloat(trimmed);
                    if (numericVal <= 0) {
                      updateActivityRule(index, 'targetValue', 1);
                    } else {
                      updateActivityRule(index, 'targetValue', numericVal);
                    }
                  }}
                  keyboardType="numeric"
                />
              </View>

              {/* Points */}
              <View style={localStyles.settingRow}>
                <Text style={localStyles.settingLabel}>Points:</Text>
                <TextInput
                  style={[localStyles.settingInput, localStyles.pointsInput]}
                  placeholder="e.g. 3"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  value={item.points ? item.points.toString() : ''}
                  onChangeText={(text) => {
                    if (text === '' || !isNaN(Number(text))) {
                      updateActivityRule(index, 'points', Number(text) || 0);
                    }
                  }}
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}
        </LinearGradient>
      </View>
    );
  };

  const AddCustomActivityButton = () => (
    <Pressable
      style={localStyles.addCustomActivityCard}
      onPress={() => {
        setCustomActivity({
          name: '',
          metric: 'time',
          targetValue: '',
          points: '3',
        });
        setShowCustomModal(true);
      }}
    >
      <LinearGradient
        colors={['#f3f4f6', '#e5e7eb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={localStyles.addCustomGradient}
      >
        <Ionicons name="add-circle" size={24} color="#00000" />
        <Text style={localStyles.addCustomActivityText}>Add Custom Activity</Text>
      </LinearGradient>
    </Pressable>
  );

  return (
    <View style={localStyles.activitiesContainer}>
      <Text style={localStyles.mainTitle}>Select Activities</Text>
      <Text style={localStyles.subtitle}>Choose activities to include in your challenge</Text>

      <View style={localStyles.globalTimeframeContainer}>
        <Text style={localStyles.globalTimeframeLabel}>Activity Tracking Frequency</Text>
        <View style={localStyles.timeframeToggle}>
          <Pressable
            style={[
              localStyles.timeframeOption,
              details.globalTimeframe === 'day' && localStyles.timeframeOptionSelected,
            ]}
            onPress={() => handleTimeframeChange('day')}
          >
            {details.globalTimeframe === 'day' ? (
              <View style={localStyles.timeframeSelected}>
                <Text style={localStyles.timeframeTextSelected}>Daily</Text>
              </View>
            ) : (
              <Text style={localStyles.timeframeText}>Daily</Text>
            )}
          </Pressable>
          <Pressable
            style={[
              localStyles.timeframeOption,
              details.globalTimeframe === 'week' && localStyles.timeframeOptionSelected,
            ]}
            onPress={() => handleTimeframeChange('week')}
          >
            {details.globalTimeframe === 'week' ? (
              <View style={localStyles.timeframeSelected}>
                <Text style={localStyles.timeframeTextSelected}>Weekly</Text>
              </View>
            ) : (
              <Text style={localStyles.timeframeText}>Weekly</Text>
            )}
          </Pressable>
        </View>
        <Text style={localStyles.timeframeDescription}>
          {details.globalTimeframe === 'day'
            ? 'Participants must complete activities daily to earn points.'
            : 'Participants have a full week to complete activities for points.'}
        </Text>
      </View>

      <View style={localStyles.activitiesListContainer}>
        <FlatList
          data={activities}
          renderItem={renderActivityItem}
          keyExtractor={(item, idx) => `${item.activityType}-${idx}`}
          style={{ flexGrow: 0 }}
          ListFooterComponent={<AddCustomActivityButton />}
          scrollEnabled={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      </View>

      {activities.length > 0 && !activities.some((a) => a.isSelected) && (
        <View style={localStyles.noActivitiesWarning}>
          <Ionicons name="alert-circle-outline" size={24} color="#FF4B2B" />
          <Text style={localStyles.warningText}>Please select at least one activity</Text>
        </View>
      )}

      {/* Custom Activity Modal */}
      <Modal
        visible={showCustomModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={localStyles.modalOverlay}>
          <View style={localStyles.modalContent}>
            <View style={localStyles.modalHeader}>
              <Text style={localStyles.modalTitle}>Add Custom Activity</Text>
              <TouchableOpacity onPress={() => setShowCustomModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={localStyles.modalBody}>
              <View style={localStyles.modalInputGroup}>
                <Text style={localStyles.modalInputLabel}>Activity Name</Text>
                <TextInput
                  style={localStyles.modalInput}
                  placeholder="e.g. Basketball, Dancing"
                  placeholderTextColor="#999"
                  value={customActivity.name}
                  onChangeText={(text) => setCustomActivity({ ...customActivity, name: text })}
                />
              </View>
              <View style={localStyles.modalInputGroup}>
                <Text style={localStyles.modalInputLabel}>Metric</Text>
                <View style={localStyles.modalPickerContainer}>
                  {Platform.OS === 'ios' ? (
                    <TouchableOpacity
                      style={localStyles.modalPickerButton}
                      onPress={() => {
                        const useKilometers = settings?.useKilometers !== undefined ? settings.useKilometers : true;
                        Alert.alert(
                          'Select Metric',
                          'Choose a metric type',
                          getMetricOptions(useKilometers).map(option => ({
                            text: option.label,
                            onPress: () =>
                              setCustomActivity({
                                ...customActivity,
                                metric: option.value as MetricType,
                              }),
                          }))
                        );
                      }}
                    >
                      <Text style={localStyles.modalPickerButtonText}>
                        {getMetricOptions(settings?.useKilometers !== undefined ? settings.useKilometers : true)
                          .find(opt => opt.value === customActivity.metric)?.label ||
                          'Select Metric'}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color="#666" />
                    </TouchableOpacity>
                  ) : (
                    <Picker
                      selectedValue={customActivity.metric}
                      onValueChange={(value) =>
                        setCustomActivity({
                          ...customActivity,
                          metric: value as MetricType,
                        })
                      }
                      style={localStyles.modalPicker}
                      mode="dropdown"
                    >
                      {getMetricOptions(settings?.useKilometers !== undefined ? settings.useKilometers : true).map((opt) => (
                        <Picker.Item
                          key={opt.value}
                          label={opt.label}
                          value={opt.value}
                          color="#333"
                        />
                      ))}
                    </Picker>
                  )}
                </View>
              </View>
              <View style={localStyles.modalInputGroup}>
                <Text style={localStyles.modalInputLabel}>Target Value</Text>
                <TextInput
                  style={localStyles.modalInput}
                  placeholder={`Enter target in ${getMetricLabel(customActivity.metric, settings?.useKilometers !== undefined ? settings.useKilometers : true)}`}
                  placeholderTextColor="#999"
                  value={customActivity.targetValue}
                  onChangeText={(text) => {
                    if (text === '' || !isNaN(Number(text))) {
                      setCustomActivity({ ...customActivity, targetValue: text });
                    } else {
                      Alert.alert('Error', 'Target must be a number');
                    }
                  }}
                  keyboardType="numeric"
                />
              </View>
              <View style={localStyles.modalInputGroup}>
                <Text style={localStyles.modalInputLabel}>Points</Text>
                <TextInput
                  style={localStyles.modalInput}
                  placeholder="e.g. 3"
                  placeholderTextColor="#999"
                  value={customActivity.points}
                  onChangeText={(text) => {
                    if (text === '' || !isNaN(Number(text))) {
                      setCustomActivity({ ...customActivity, points: text });
                    } else {
                      Alert.alert('Error', 'Points must be a number');
                    }
                  }}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={localStyles.modalFooter}>
              <TouchableOpacity
                style={localStyles.modalCancelButton}
                onPress={() => setShowCustomModal(false)}
              >
                <Text style={localStyles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  localStyles.modalAddButton,
                  (!customActivity.name || !customActivity.targetValue) &&
                    localStyles.modalAddButtonDisabled,
                ]}
                onPress={handleAddCustomActivity}
                disabled={!customActivity.name || !customActivity.targetValue}
              >
                <Text style={localStyles.modalAddButtonText}>Add Activity</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const localStyles = StyleSheet.create({
  // same as before, no functionality removed
  activitiesContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 50,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
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
  timeframeToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#ddd',
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  timeframeOption: {
    width: 80,
    overflow: 'hidden',
  },
  timeframeOptionSelected: {
    overflow: 'hidden',
  },
  timeframeSelected: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#000',
  },
  timeframeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textAlign: 'center',
  },
  timeframeTextSelected: {
    color: '#fff',
  },
  timeframeDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  activitiesListContainer: {
    marginTop: 8,
    flex: 1,
  },
  activityCard: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityCardGradient: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  activityHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  activityHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  activityCheckboxSelected: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  expandButton: {
    padding: 4,
  },
  activitySettings: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingLabel: {
    width: 70,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  pickerContainer: {
    flex: 1,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  metricPicker: {
    color: '#fff',
    height: 44,
  },
  settingInput: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  pointsInput: {
    maxWidth: 80,
    textAlign: 'center',
  },
  addCustomActivityCard: {
    borderRadius: 12,
    marginVertical: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#00000',
    borderStyle: 'dashed',
  },
  addCustomGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  addCustomActivityText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#00000',
  },
  noActivitiesWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4F4',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  warningText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#FF4B2B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalBody: {
    padding: 16,
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  modalPickerContainer: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  modalPickerButtonText: {
    fontSize: 16,
    color: '#333',
  },
  modalPicker: {
    height: 50,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 16,
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  modalCancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  modalAddButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#00000',
  },
  modalAddButtonDisabled: {
    backgroundColor: '#ccc',
  },
  modalAddButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});