// app/(tabs)/joinchallenges/steps/Step1ModeSelection.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type ChallengeMode = 'race' | 'survival' | 'streak' | 'custom';

interface ModeInfo {
  id: ChallengeMode;
  title: string;
  icon: string;
  description: string;
  gradient: string[];
}

interface Step1ModeSelectionProps {
  CHALLENGE_MODES: ModeInfo[];
  onSelectMode: (mode: ChallengeMode) => void;
  styles: any;
}

export default function Step1ModeSelection({
  CHALLENGE_MODES,
  onSelectMode,
  styles,
}: Step1ModeSelectionProps) {
  return (
    <View style={styles.modeSelectionContainer}>
      <Text style={styles.mainTitle}>Choose Your Challenge Type</Text>
      <Text style={styles.subtitle}>Select the type of challenge you want to create</Text>

      <View style={styles.modeCardsContainer}>
        {CHALLENGE_MODES.map((mode) => (
          <Pressable
            key={mode.id}
            onPress={() => onSelectMode(mode.id)}
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
  );
}