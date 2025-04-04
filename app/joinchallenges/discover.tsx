import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { canJoinNewChallenge } from '../../lib/challenges';
import { useNetInfo } from '@react-native-community/netinfo';
import { useTheme } from '../../lib/ThemeContext';
import SharedLayout from '../../components/SharedLayout';

interface Challenge {
  id: string;
  title: string;
  description: string;
  participant_count: number;
  start_date: string;
  end_date: string;
  activity_type: string;
  goal_type: string;
  goal_value: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export default function DiscoverScreen() {
  const router = useRouter();
  const { isConnected: isOnline } = useNetInfo();
  const { theme } = useTheme();
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [joiningChallenge, setJoiningChallenge] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  const handleJoinChallenge = async () => {
    if (!selectedChallenge || !isOnline) return;

    try {
      setJoiningChallenge(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if the user has reached their challenge limit (max 2 active challenges)
      const { canJoin, activeCount } = await canJoinNewChallenge(user.id);
      if (!canJoin) {
        Alert.alert(
          "Challenge Limit Reached",
          "You can only participate in 2 active challenges at a time. Please leave an existing challenge before joining a new one.",
          [{ text: "OK" }]
        );
        setJoiningChallenge(false);
        return;
      }

      // Check if already joined
      const { data: existingParticipant, error: checkError } = await supabase
        .from('challenge_participants')
        .select('id, status, left_at')
        .eq('challenge_id', selectedChallenge.id)
        .eq('user_id', user.id)
        .single();

      // If user had left this challenge before, allow them to rejoin
      if (existingParticipant && existingParticipant.status === 'left') {
        const { error: rejoinError } = await supabase
          .from('challenge_participants')
          .update({
            status: 'active',
            left_at: null,
            rejoined_at: new Date().toISOString()
          })
          .eq('id', existingParticipant.id);

        if (rejoinError) throw rejoinError;
        
        // Show success message for rejoining
        Alert.alert('Success', 'You have rejoined this challenge!');
        setSelectedChallenge(null);
        router.push('/joinchallenges');
        return;
      }

      // If user is already a participant (and not in left state)
      if (existingParticipant) {
        throw new Error('You have already joined this challenge');
      }

      // Join challenge (new participant)
      const { error: joinError } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: selectedChallenge.id,
          user_id: user.id,
          status: 'active',
          joined_at: new Date().toISOString()
        });

      if (joinError) throw joinError;

      // Update local state
      setChallenges(prev => prev.map(c => 
        c.id === selectedChallenge.id 
          ? { ...c, participant_count: (c.participant_count || 0) + 1 }
          : c
      ));

      Alert.alert('Success', 'You have joined the challenge!');
      setSelectedChallenge(null);
      router.push('/joinchallenges');
    } catch (e: any) {
      console.error('Error joining challenge:', e);
      setError(e.message);
    } finally {
      setJoiningChallenge(false);
    }
  };

  return (
    <SharedLayout>
      <ScrollView style={styles.container}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          Discover Challenges
        </Text>
        {/* Add your challenge list UI here */}
      </ScrollView>
    </SharedLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
}); 