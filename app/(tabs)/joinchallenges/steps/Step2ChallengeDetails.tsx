// app/(tabs)/joinchallenges/steps/Step2ChallengeDetails.tsx
import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as Haptics from 'expo-haptics';

export interface ChallengeDetails {
  name: string;
  description: string;
  startDate: Date | null;
  endDate: Date | null;
  isOpenEnded: boolean;
  globalTimeframe: 'day' | 'week';
  isPrivate: boolean;
}

interface Step2ChallengeDetailsProps {
  details: ChallengeDetails;
  setDetails: (details: ChallengeDetails) => void;
  showStartPicker: boolean;
  setShowStartPicker: (value: boolean) => void;
  showEndPicker: boolean;
  setShowEndPicker: (value: boolean) => void;
  selectedMode: string;
  styles: any;
}

export default function Step2ChallengeDetails({
  details,
  setDetails,
  showStartPicker,
  setShowStartPicker,
  showEndPicker,
  setShowEndPicker,
  selectedMode,
  styles,
}: Step2ChallengeDetailsProps) {
  return (
    <View style={styles.detailsContainer}>
      <Text style={styles.mainTitle}>Challenge Details</Text>
      <Text style={styles.subtitle}>
        Set the basic information for your {selectedMode} challenge
      </Text>

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
        <Text style={styles.characterCount}>{details.name.length}/40</Text>
      </View>

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
        <Text style={styles.characterCount}>{details.description.length}/200</Text>
      </View>

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
          <Text style={styles.toggleLabel}>
            Open-ended challenge (no end date)
          </Text>
        </Pressable>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Challenge Visibility</Text>
        <Pressable
          style={styles.toggleContainer}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setDetails({ ...details, isPrivate: !details.isPrivate });
          }}
        >
          <View
            style={[
              styles.toggleTrack,
              details.isPrivate && styles.toggleTrackActive,
            ]}
          >
            <Animated.View
              style={[
                styles.toggleThumb,
                details.isPrivate && styles.toggleThumbActive,
              ]}
            />
          </View>
          <Text style={styles.toggleLabel}>
            {details.isPrivate ? 'Private - Invite Only' : 'Public - Visible to All'}
          </Text>
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
          details.endDate ||
          new Date(new Date().setDate(new Date().getDate() + 14))
        }
        onConfirm={(date) => {
          setShowEndPicker(false);
          setDetails({ ...details, endDate: date });
        }}
        onCancel={() => setShowEndPicker(false)}
        minimumDate={details.startDate || new Date()}
      />
    </View>
  );
}