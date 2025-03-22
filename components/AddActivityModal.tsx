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
  Dimensions,
} from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { useUser } from './UserContext';
import {
  getChallengeActivityTypes,
  saveUserActivity,
  updateChallengesWithActivity,
} from '../lib/challengeUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const ACTIVITY_COLORS: { [key: string]: { light: string; primary: string; gradient: string[]; text: string } } = {
  Workout:        { light: '#E1F5FE', primary: '#2196F3', gradient: ['#2196F3', '#0D47A1'], text: '#0D47A1' },
  Steps:          { light: '#E8F5E9', primary: '#4CAF50', gradient: ['#4CAF50', '#1B5E20'], text: '#1B5E20' },
  Sleep:          { light: '#E0F7FA', primary: '#00BCD4', gradient: ['#00BCD4', '#006064'], text: '#006064' },
  'Screen Time':  { light: '#FFF3E0', primary: '#FF9800', gradient: ['#FF9800', '#E65100'], text: '#E65100' },
  'No Sugars':    { light: '#FCE4EC', primary: '#F06292', gradient: ['#F06292', '#880E4F'], text: '#880E4F' },
  'High Intensity': { light: '#FFEBEE', primary: '#F44336', gradient: ['#F44336', '#B71C1C'], text: '#B71C1C' },
  Yoga:           { light: '#F3E5F5', primary: '#9C27B0', gradient: ['#9C27B0', '#4A148C'], text: '#4A148C' },
  Count:          { light: '#ECEFF1', primary: '#607D8B', gradient: ['#607D8B', '#263238'], text: '#263238' },
  Custom:         { light: '#E8EAF6', primary: '#3F51B5', gradient: ['#3F51B5', '#1A237E'], text: '#1A237E' },
};

const ACTIVITY_ICONS: { [key: string]: string } = {
  Workout: 'dumbbell',
  Steps: 'shoe-prints',
  Sleep: 'bed',
  'Screen Time': 'mobile',
  'No Sugars': 'cookie-bite',
  'High Intensity': 'fire',
  Yoga: 'pray',
  Count: 'hashtag',
  Custom: 'plus-circle',
};

const CUSTOM_ACTIVITIES_STORAGE_KEY = 'stridekick_custom_activities';

interface ActivityData {
  id: string;
  activityType: string;
  metrics: { [key in MetricType]?: string };
  isExpanded: boolean;
  isCustom: boolean;
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
  const [challengeActivities, setChallengeActivities] = useState<ActivityData[]>([]);
  const [generalActivities, setGeneralActivities] = useState<ActivityData[]>([]);
  const [customActivities, setCustomActivities] = useState<ActivityData[]>([]);
  const [challengeMetricsMap, setChallengeMetricsMap] = useState<{ [actName: string]: Set<MetricType> }>({});
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [selectedCustomMetrics, setSelectedCustomMetrics] = useState<MetricType[]>([]);
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
      loadActivities(userId);
      loadCustomActivitiesFromStorage();
    } else {
      resetForm();
    }
  }, [visible, userId]);

  const loadCustomActivitiesFromStorage = async () => {
    try {
      const stored = await AsyncStorage.getItem(CUSTOM_ACTIVITIES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ActivityData[];
        const closed = parsed.map(act => ({ ...act, isExpanded: false }));
        setCustomActivities(closed);
      }
    } catch (err) {
      console.error('Error loading custom activities:', err);
    }
  };

  const saveCustomActivitiesToStorage = async (activities: ActivityData[]) => {
    try {
      await AsyncStorage.setItem(CUSTOM_ACTIVITIES_STORAGE_KEY, JSON.stringify(activities));
    } catch (err) {
      console.error('Error saving custom activities:', err);
    }
  };

  const resetForm = () => {
    setChallengeActivities([]);
    setGeneralActivities([]);
    setChallengeMetricsMap({});
    setShowCustomForm(false);
    setCustomName('');
    setSelectedCustomMetrics([]);
    setError(null);
    setFormErrors({});
  };

  const loadActivities = async (uid: string) => {
    try {
      setFetchingActivities(true);
      setError(null);

      const challengeActivityTypes = await getChallengeActivityTypes(uid);
      const metricsMap: { [actName: string]: Set<MetricType> } = {};

      challengeActivityTypes.forEach(entry => {
        const actName = entry.activityType;
        if (!metricsMap[actName]) {
          metricsMap[actName] = new Set<MetricType>();
        }
        entry.metrics.forEach(metricObj => {
          const metric = metricObj.metric as MetricType;
          metricsMap[actName].add(metric);
        });
      });
      setChallengeMetricsMap(metricsMap);

      const challengeActs: ActivityData[] = Object.keys(metricsMap).map((actName, index) => {
        const metrics: { [key in MetricType]?: string } = {};
        Array.from(metricsMap[actName]).forEach(metric => {
          if (metric === 'distance_km' || metric === 'distance_miles') {
            const preferred = settings.useKilometers ? 'distance_km' : 'distance_miles';
            if (!metrics[preferred]) {
              metrics[preferred] = '';
            }
          } else {
            if (!metrics[metric]) {
              metrics[metric] = '';
            }
          }
        });
        return {
          id: `challenge-${actName}-${index}`,
          activityType: actName,
          metrics,
          isExpanded: false,
          isCustom: false,
        };
      });
      setChallengeActivities(challengeActs);

      const allMetrics: MetricType[] = ['time', 'steps', 'calories', 'count'];
      const preferredDistance = settings.useKilometers ? 'distance_km' : 'distance_miles';
      allMetrics.push(preferredDistance);

      const generalActs: ActivityData[] = GLOBAL_ACTIVITIES
        .filter(actName => {
          const used = metricsMap[actName] || new Set<MetricType>();
          const challengeHasDistance = used.has('distance_km') || used.has('distance_miles');
          const remaining = allMetrics.filter(m => {
            if (challengeHasDistance && (m === 'distance_km' || m === 'distance_miles')) return false;
            return !used.has(m);
          });
          return remaining.length > 0;
        })
        .map((actName, index) => {
          const used = metricsMap[actName] || new Set<MetricType>();
          const challengeHasDistance = used.has('distance_km') || used.has('distance_miles');
          const metrics: { [key in MetricType]?: string } = {};
          allMetrics.forEach(metric => {
            if (challengeHasDistance && (metric === 'distance_km' || metric === 'distance_miles')) return;
            if (!used.has(metric)) {
              metrics[metric] = '';
            }
          });
          return {
            id: `general-${actName}-${index}`,
            activityType: actName,
            metrics,
            isExpanded: false,
            isCustom: false,
          };
        });
      setGeneralActivities(generalActs);
    } catch (err: any) {
      setError(err.message || 'Failed to load activities');
      console.error('Error loading activities:', err);
    } finally {
      setFetchingActivities(false);
    }
  };

  const toggleActivityExpansion = (id: string, isChallenge: boolean, isCustom: boolean = false) => {
    if (isChallenge) {
      setChallengeActivities(prev => prev.map(act => act.id === id ? { ...act, isExpanded: !act.isExpanded } : act));
    } else if (isCustom) {
      setCustomActivities(prev => prev.map(act => act.id === id ? { ...act, isExpanded: !act.isExpanded } : act));
    } else {
      setGeneralActivities(prev => prev.map(act => act.id === id ? { ...act, isExpanded: !act.isExpanded } : act));
    }
  };

  const updateMetricValue = (id: string, isChallenge: boolean, isCustom: boolean = false, metric: MetricType, value: string) => {
    const updateActivity = (activities: ActivityData[]) =>
      activities.map(act => act.id === id ? { ...act, metrics: { ...act.metrics, [metric]: value } } : act);
    if (isChallenge) {
      setChallengeActivities(updateActivity(challengeActivities));
    } else if (isCustom) {
      const updated = updateActivity(customActivities);
      setCustomActivities(updated);
      saveCustomActivitiesToStorage(updated);
    } else {
      setGeneralActivities(updateActivity(generalActivities));
    }
    if (formErrors[`${id}-${metric}`]) {
      const newErrors = { ...formErrors };
      delete newErrors[`${id}-${metric}`];
      setFormErrors(newErrors);
    }
  };

  const toggleCustomMetric = (metric: MetricType) => {
    if (selectedCustomMetrics.includes(metric)) {
      setSelectedCustomMetrics(prev => prev.filter(m => m !== metric));
    } else {
      setSelectedCustomMetrics(prev => [...prev, metric]);
    }
  };

  const handleAddCustomActivity = async () => {
    const name = customName.trim();
    if (!name) {
      setFormErrors(prev => ({ ...prev, custom: 'Please enter a name for the custom activity' }));
      return;
    }
    const allActivityNames = [
      ...challengeActivities.map(a => a.activityType.toLowerCase()),
      ...generalActivities.map(a => a.activityType.toLowerCase()),
      ...customActivities.map(a => a.activityType.toLowerCase()),
    ];
    if (allActivityNames.includes(name.toLowerCase())) {
      setFormErrors(prev => ({ ...prev, custom: 'This activity name already exists' }));
      return;
    }
    if (selectedCustomMetrics.length === 0) {
      setFormErrors(prev => ({ ...prev, custom: 'Please select at least one metric' }));
      return;
    }
    const metrics: { [key in MetricType]?: string } = {};
    selectedCustomMetrics.forEach(metric => {
      if (metric === 'distance_km' || metric === 'distance_miles') {
        const preferred = settings.useKilometers ? 'distance_km' : 'distance_miles';
        if (!metrics[preferred]) {
          metrics[preferred] = '';
        }
      } else {
        metrics[metric] = '';
      }
    });
    const newActivity: ActivityData = {
      id: `custom-${name}-${Date.now()}`,
      activityType: name,
      metrics,
      isExpanded: false,
      isCustom: true,
    };
    const updatedCustom = [...customActivities, newActivity];
    setCustomActivities(updatedCustom);
    await saveCustomActivitiesToStorage(updatedCustom);
    setCustomName('');
    setSelectedCustomMetrics([]);
    setShowCustomForm(false);
    setFormErrors(prev => {
      const newErr = { ...prev };
      delete newErr.custom;
      return newErr;
    });
  };

  const handleDeleteCustomActivity = async (id: string) => {
    const act = customActivities.find(a => a.id === id);
    if (!act) return;
    Alert.alert(
      'Delete Custom Activity',
      `Are you sure you want to delete "${act.activityType}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = customActivities.filter(a => a.id !== id);
            setCustomActivities(updated);
            await saveCustomActivitiesToStorage(updated);
          },
        },
      ],
      { cancelable: true }
    );
  };

  const validateForm = () => {
    const newErr: { [key: string]: string } = {};
    let hasValue = false;
    [challengeActivities, generalActivities, customActivities].forEach(group => {
      group.forEach(act => {
        Object.entries(act.metrics).forEach(([metric, val]) => {
          if (val && val.trim() !== '') {
            if (isNaN(Number(val))) {
              newErr[`${act.id}-${metric}`] = 'Must be a number';
            } else {
              hasValue = true;
            }
          }
        });
      });
    });
    if (!hasValue) {
      newErr.general = 'Please enter at least one value';
    }
    setFormErrors(newErr);
    return Object.keys(newErr).length === 0;
  };

  const handleSave = async () => {
    if (!userId) {
      setError('User not logged in');
      return;
    }
    if (!validateForm()) return;
    setLoading(true);
    setError(null);
    try {
      const activitiesToSave = [
        ...challengeActivities.filter(a => Object.values(a.metrics).some(v => v && v.trim() !== '')),
        ...generalActivities.filter(a => Object.values(a.metrics).some(v => v && v.trim() !== '')),
        ...customActivities.filter(a => Object.values(a.metrics).some(v => v && v.trim() !== '')),
      ];
      
      for (const act of activitiesToSave) {
        for (const [metricKey, rawVal] of Object.entries(act.metrics)) {
          if (!rawVal || rawVal.trim() === '') continue;
          const metric = metricKey as MetricType;
          const numericValue = Number(rawVal);
          
          // Initialize values
          let duration = 0;
          let distance = 0;
          let calories = 0;
          let steps = 0;
          let count = 0;
    
          switch (metric) {
            case 'time':
              duration = numericValue * 60; // Convert hours to minutes
              break;
            case 'distance_km':
              // Store distance in kilometers directly
              distance = numericValue;
              break;
            case 'distance_miles':
              // Convert miles to kilometers for storage
              distance = numericValue * 1.60934;
              break;
            case 'calories':
              calories = numericValue;
              break;
            case 'steps':
              steps = numericValue;
              break;
            case 'count':
              count = numericValue;
              break;
            default:
              break;
          }
    
          // Save activity with the appropriate metric
          // Store the original metric type so UI knows how to display it
          await saveUserActivity(
            {
              activityType: act.activityType,
              duration,
              distance,
              calories,
              steps,
              count,
              metric, // This is important - store the original input metric type
            },
            userId
          ).then(async (result) => {
            if (result.success && result.data) {
              await updateChallengesWithActivity(result.data.id, userId);
            }
          });
        }
      }
      Alert.alert('Success', 'Activities saved successfully!', [
        {
          text: 'OK',
          onPress: () => {
            onClose();
            if (onSaveComplete) onSaveComplete();
          },
        },
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to save activities');
      console.error('Error saving activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMetricLabel = (metric: MetricType, useKilometers: boolean): string => {
    switch (metric) {
      case 'time': return 'Time (hours)';
      case 'distance_km': return useKilometers ? 'Distance (km)' : 'Distance (miles)';
      case 'distance_miles': return 'Distance (miles)';
      case 'steps': return 'Steps';
      case 'calories': return 'Calories';
      case 'count': return 'Quantity';
      default: return metric;
    }
  };

  const getActivitiesWithValues = () => {
    const countGroup = (group: ActivityData[]) =>
      group.filter(act => Object.values(act.metrics).some(v => v && v.trim() !== '')).length;
    return countGroup(challengeActivities) + countGroup(generalActivities) + countGroup(customActivities);
  };

  const renderActivity = (activity: ActivityData, isChallenge: boolean, isCustom: boolean = false) => {
    const colorSet = ACTIVITY_COLORS[activity.activityType] || ACTIVITY_COLORS.Custom;
    return (
      <View key={activity.id} style={styles.activityContainer}>
        <TouchableOpacity onPress={() => toggleActivityExpansion(activity.id, isChallenge, isCustom)} activeOpacity={0.7}>
          <LinearGradient
            colors={activity.isExpanded ? colorSet.gradient : ['#f5f5f5', '#e0e0e0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.activityChip, activity.isExpanded && styles.activityChipExpanded]}
          >
            <FontAwesome5
              name={ACTIVITY_ICONS[activity.activityType] || ACTIVITY_ICONS.Custom}
              size={16}
              color={activity.isExpanded ? '#fff' : colorSet.primary}
              style={styles.activityIcon}
            />
            <Text style={[styles.activityName, activity.isExpanded && styles.activityNameExpanded]}>
              {activity.activityType}
            </Text>
            {activity.isExpanded && (
              <Ionicons name="checkmark-circle" size={18} color="#fff" style={styles.checkIcon} />
            )}
          </LinearGradient>
        </TouchableOpacity>
        {activity.isExpanded && (
          <View style={[styles.expandedContent, { backgroundColor: colorSet.light, borderColor: colorSet.primary }]}>
            <View style={styles.metricsGrid}>
              {Object.entries(activity.metrics).map(([metricKey, value]) => {
                const metric = metricKey as MetricType;
                if ((metric === 'distance_km' && !settings.useKilometers) || (metric === 'distance_miles' && settings.useKilometers)) {
                  return null;
                }
                const label = getMetricLabel(metric, settings.useKilometers);
                return (
                  <View key={`${activity.id}-${metric}`} style={styles.metricInputContainer}>
                    <Text style={[styles.metricLabel, { color: colorSet.text }]}>{label}</Text>
                    <TextInput
                      style={[
                        styles.metricInput,
                        { borderColor: colorSet.primary },
                        formErrors[`${activity.id}-${metric}`] && styles.inputError,
                      ]}
                      value={value}
                      onChangeText={(text) => {
                        if (text === '' || !isNaN(Number(text))) {
                          updateMetricValue(activity.id, isChallenge, isCustom, metric, text);
                        }
                      }}
                      placeholder="0"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                    />
                    {formErrors[`${activity.id}-${metric}`] && (
                      <Text style={styles.errorText}>{formErrors[`${activity.id}-${metric}`]}</Text>
                    )}
                  </View>
                );
              })}
            </View>
            {(activity.isCustom || isCustom) && (
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteCustomActivity(activity.id)}>
                <Ionicons name="trash-outline" size={16} color="#E53935" />
                <Text style={styles.deleteButtonText}>Delete Activity</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <LinearGradient colors={['#4A90E2', '#5C38ED']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
            <Text style={styles.headerTitle}>Add Activity</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {formErrors.general && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{formErrors.general}</Text>
              </View>
            )}
            <View style={styles.sectionHeader}>
              <Ionicons name="trophy" size={20} color="#00000" />
              <Text style={styles.sectionTitle}>Your Challenge Activities</Text>
            </View>
            {fetchingActivities ? (
              <ActivityIndicator size="small" color="#00000" style={styles.loader} />
            ) : challengeActivities.length === 0 ? (
              <Text style={styles.emptyText}>No activities from challenges</Text>
            ) : (
              <View style={styles.activitiesGrid}>
                {challengeActivities.map(activity => renderActivity(activity, true))}
              </View>
            )}
            <View style={styles.sectionHeader}>
              <Ionicons name="star" size={20} color="#FF9800" />
              <Text style={styles.sectionTitle}>Your Custom Activities</Text>
            </View>
            {customActivities.length > 0 && (
              <View style={styles.activitiesGrid}>
                {customActivities.map(activity => renderActivity(activity, false, true))}
              </View>
            )}
            <View style={styles.sectionHeader}>
              <Ionicons name="fitness" size={20} color="#4CAF50" />
              <Text style={styles.sectionTitle}>General Activities</Text>
            </View>
            <View style={styles.activitiesGrid}>
              {generalActivities.map(activity => renderActivity(activity, false))}
              {!showCustomForm && (
                <TouchableOpacity style={styles.customActivityButtonContainer} onPress={() => setShowCustomForm(true)} activeOpacity={0.7}>
                  <LinearGradient colors={['#3F51B5', '#1A237E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.customActivityButton}>
                    <Ionicons name="add-circle" size={20} color="#fff" style={styles.customActivityIcon} />
                    <Text style={styles.customActivityButtonText}>+ Custom Activity</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
            {showCustomForm && (
              <View style={styles.customForm}>
                <Text style={styles.customFormTitle}>Add Custom Activity</Text>
                <TextInput
                  style={[styles.customNameInput, formErrors.custom && styles.inputError]}
                  placeholder="Activity Name"
                  placeholderTextColor="#999"
                  value={customName}
                  onChangeText={setCustomName}
                />
                {formErrors.custom && (
                  <Text style={styles.errorText}>{formErrors.custom}</Text>
                )}
                <Text style={styles.customFormLabel}>Select Metrics</Text>
                <View style={styles.metricsSelection}>
                  {['time', 'steps', 'calories', 'count'].map(metricKey => {
                    const metric = metricKey as MetricType;
                    const isSelected = selectedCustomMetrics.includes(metric);
                    const label = getMetricLabel(metric, settings.useKilometers);
                    return (
                      <TouchableOpacity
                        key={metric}
                        style={[styles.metricToggle, isSelected && styles.metricToggleSelected]}
                        onPress={() => toggleCustomMetric(metric)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.metricToggleText, isSelected && styles.metricToggleTextSelected]}>{label}</Text>
                        {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </TouchableOpacity>
                    );
                  })}
                  {(() => {
                    const metric = settings.useKilometers ? 'distance_km' : 'distance_miles';
                    const isSelected = selectedCustomMetrics.includes(metric);
                    const label = getMetricLabel(metric, settings.useKilometers);
                    return (
                      <TouchableOpacity
                        key={metric}
                        style={[styles.metricToggle, isSelected && styles.metricToggleSelected]}
                        onPress={() => toggleCustomMetric(metric)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.metricToggleText, isSelected && styles.metricToggleTextSelected]}>{label}</Text>
                        {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </TouchableOpacity>
                    );
                  })()}
                </View>
                <View style={styles.customFormButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={() => {
                    setShowCustomForm(false);
                    setCustomName('');
                    setSelectedCustomMetrics([]);
                    setFormErrors({ ...formErrors, custom: undefined });
                  }}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.addButton, (!customName.trim() || selectedCustomMetrics.length === 0) && styles.addButtonDisabled]}
                    onPress={handleAddCustomActivity}
                    disabled={!customName.trim() || selectedCustomMetrics.length === 0}
                  >
                    <Text style={styles.addButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
          <View style={styles.footer}>
            <LinearGradient
              colors={['#4A90E2', '#5C38ED']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.saveButton, (loading || getActivitiesWithValues() === 0) && styles.saveButtonDisabled]}
            >
              <TouchableOpacity onPress={handleSave} disabled={loading || getActivitiesWithValues() === 0} style={styles.saveButtonTouchable}>
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    Save {getActivitiesWithValues() > 0 ? getActivitiesWithValues() : 'All'} Activities
                  </Text>
                )}
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '90%', paddingBottom: Platform.OS === 'ios' ? 34 : 0, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.2)' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  closeButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginLeft: 8 },
  activitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  activityContainer: { width: '48%', marginBottom: 12 },
  activityChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  activityChipExpanded: { elevation: 3, shadowOpacity: 0.2 },
  activityIcon: { marginRight: 8 },
  activityName: { fontSize: 14, fontWeight: '500', color: '#333', flex: 1 },
  activityNameExpanded: { color: '#fff', fontWeight: '600' },
  checkIcon: { marginLeft: 4 },
  expandedContent: { borderRadius: 12, padding: 12, marginTop: 8, borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metricInputContainer: { width: '48%', marginBottom: 12 },
  metricLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  metricInput: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 8, fontSize: 16, textAlign: 'center' },
  customActivityButtonContainer: { width: '48%', borderRadius: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2 },
  customActivityButton: { paddingVertical: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  customActivityIcon: { marginRight: 6 },
  customActivityButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  customForm: { width: '100%', backgroundColor: '#f8f9fa', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e0e0e0' },
  customFormTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12, textAlign: 'center' },
  customNameInput: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 8 },
  customFormLabel: { fontSize: 14, fontWeight: '500', color: '#333', marginTop: 8, marginBottom: 6 },
  metricsSelection: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  metricToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  metricToggleSelected: { backgroundColor: '#00000' },
  metricToggleText: { fontSize: 13, color: '#333', marginRight: 4 },
  metricToggleTextSelected: { color: '#fff' },
  customFormButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cancelButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#f0f0f0', flex: 1, marginRight: 8, alignItems: 'center' },
  cancelButtonText: { color: '#333', fontSize: 14, fontWeight: '500' },
  addButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#00000', flex: 1, alignItems: 'center' },
  addButtonDisabled: { opacity: 0.5 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  deleteButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#FFEBEE', borderRadius: 8, marginTop: 8 },
  deleteButtonText: { color: '#E53935', fontSize: 13, fontWeight: '500', marginLeft: 6 },
  errorContainer: { backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8, marginBottom: 16, flexDirection: 'row', alignItems: 'center' },
  errorText: { color: '#DC2626', fontSize: 12, marginLeft: 4 },
  emptyText: { color: '#666', fontStyle: 'italic', fontSize: 14, marginBottom: 16, textAlign: 'center' },
  inputError: { borderColor: '#DC2626' },
  footer: { paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#eee' },
  saveButton: { borderRadius: 12, overflow: 'hidden' },
  saveButtonTouchable: { width: '100%', paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loader: { marginVertical: 20 },
});