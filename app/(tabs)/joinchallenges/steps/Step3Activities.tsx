// app/(tabs)/joinchallenges/steps/Step3Activities.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons'; // <-- Use FontAwesome5 for those exercise icons
import { LinearGradient } from 'expo-linear-gradient';

export interface ActivityRule {
  activityType: string;
  threshold: string;
  points: number;
  isSelected: boolean;
  isCustom?: boolean;
}

interface Step3ActivitiesProps {
  activities: ActivityRule[];
  setActivities: (activities: ActivityRule[]) => void;
  details: { globalTimeframe: 'day' | 'week' };
  handleTimeframeChange: (timeframe: 'day' | 'week') => void;
  showCustomModal: boolean;
  setShowCustomModal: (value: boolean) => void;
  customActivity: { name: string; threshold: string; points: string };
  setCustomActivity: (activity: { name: string; threshold: string; points: string }) => void;
  handleAddCustomActivity: () => void;
  styles: any;
}

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
  Stretching: ['#4568DC', '#B06AB3'],
  'Bonus Points': ['#8A2387', '#F27121'],
  Custom: ['#654ea3', '#eaafc8'],
};

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
  styles,
}: Step3ActivitiesProps) {
  const [expandedActivity, setExpandedActivity] = useState<number | null>(null);

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

  const updateActivityRule = (index: number, field: keyof ActivityRule, value: string | number) => {
    const updated = [...activities];
    (updated[index] as any)[field] = value;
    setActivities(updated);
  };

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
          {/* Pressable to toggle selection */}
          <Pressable style={styles.activityHeader} onPress={() => toggleActivitySelection(index)}>
            <View style={styles.activityHeaderContent}>
              <View style={styles.activityIconContainer}>
                {/* Use FontAwesome5 for these icons */}
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
                {item.isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              {item.isSelected && (
                <TouchableOpacity
                  style={styles.expandButton}
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

          {/* Expanded settings */}
          {item.isSelected && isExpanded && (
            <View style={styles.activitySettings}>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Target:</Text>
                <TextInput
                  style={styles.settingInput}
                  placeholder={
                    item.activityType === 'Walking' || item.activityType === 'Steps'
                      ? '5000 steps'
                      : '30 min'
                  }
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
    <View style={styles.activitiesContainer}>
      <Text style={styles.mainTitle}>Select Activities</Text>
      <Text style={styles.subtitle}>Choose activities to include in your challenge</Text>

      {/* Global Timeframe Setting */}
      <View style={styles.globalTimeframeContainer}>
        <Text style={styles.globalTimeframeLabel}>Activity Tracking Frequency:</Text>
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
          keyExtractor={(item, idx) => `${item.activityType}-${idx}`}
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
              <TouchableOpacity onPress={() => setShowCustomModal(false)}>
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
                  onChangeText={(text) => setCustomActivity({ ...customActivity, name: text })}
                />
              </View>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Target</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. 30 min, 5 games"
                  value={customActivity.threshold}
                  onChangeText={(text) => setCustomActivity({ ...customActivity, threshold: text })}
                />
              </View>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Points</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="3"
                  value={customActivity.points}
                  onChangeText={(text) => setCustomActivity({ ...customActivity, points: text })}
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
              <TouchableOpacity style={styles.modalAddButton} onPress={handleAddCustomActivity}>
                <Text style={styles.modalAddButtonText}>Add Activity</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}