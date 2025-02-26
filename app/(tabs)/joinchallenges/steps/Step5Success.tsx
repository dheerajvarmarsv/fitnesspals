// app/(tabs)/joinchallenges/steps/Step5Success.tsx
import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface Step5SuccessProps {
  handleShareChallenge: () => void;
  handleInviteFriends: () => void;
  handleGoDashboard: () => void;
  styles: any;
}

export default function Step5Success({
  handleShareChallenge,
  handleInviteFriends,
  handleGoDashboard,
  styles,
}: Step5SuccessProps) {
  return (
    <View style={styles.successContainer}>
      <Image
        source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4436/4436481.png' }}
        style={styles.successImage}
      />
      <Text style={styles.successTitle}>Challenge Created!</Text>
      <Text style={styles.successMessage}>
        Your challenge is now live and ready for participants.
      </Text>
      <View style={styles.actionButtons}>
        <Pressable style={styles.actionButton} onPress={handleShareChallenge}>
          <LinearGradient
            colors={['#4776E6', '#8E54E9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionButtonGradient}
          >
            <Ionicons name="share-social" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Share Challenge</Text>
          </LinearGradient>
        </Pressable>

        <Pressable style={styles.actionButton} onPress={handleInviteFriends}>
          <LinearGradient
            colors={['#FF416C', '#FF4B2B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionButtonGradient}
          >
            <Ionicons name="people" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Invite Friends</Text>
          </LinearGradient>
        </Pressable>

        <Pressable style={styles.actionButton} onPress={handleGoDashboard}>
          <LinearGradient
            colors={['#11998e', '#38ef7d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionButtonGradient}
          >
            <Ionicons name="home" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Go to Dashboard</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}