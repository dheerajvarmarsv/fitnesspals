import { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

const MAX_LENGTH = 20;

export default function SetupNickname() {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateNickname = (nickname: string) => {
    return /^[a-zA-Z0-9_]{3,20}$/.test(nickname);
  };

  const handleSetNickname = async () => {
    try {
      if (!nickname) {
        setError('Please enter a nickname');
        return;
      }

      if (!validateNickname(nickname)) {
        setError('Nickname must be 3-20 characters long and can only contain letters, numbers, and underscores');
        return;
      }

      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Check if nickname is available
      const { data: isAvailable, error: checkError } = await supabase
        .rpc('check_nickname_available', { p_nickname: nickname });

      if (checkError) throw checkError;

      if (!isAvailable) {
        setError('This nickname is already taken. Please choose another one.');
        return;
      }

      // Update profile with nickname and set default avatar if not already set
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
        
      if (profileError) throw profileError;
      
      // Only set avatar if not already set
      const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400';
      const avatarUrl = profileData.avatar_url || defaultAvatar;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          nickname: nickname.toLowerCase(),
          avatar_url: avatarUrl
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      router.replace('/(tabs)');
    } catch (e: any) {
      console.error('Nickname setup error:', e);
      setError(e.message || 'Failed to set nickname');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Choose your nickname</Text>
      
      <Text style={styles.description}>
        Pick a unique nickname that will identify you on CTP. This will be permanent and cannot be changed later.
      </Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="Enter nickname"
        placeholderTextColor="#666"
        value={nickname}
        onChangeText={(text) => {
          setNickname(text);
          setError(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={MAX_LENGTH}
        editable={!loading}
      />

      <Text style={styles.counter}>
        {nickname.length}/{MAX_LENGTH} characters
      </Text>

      <View style={styles.requirements}>
        <Text style={styles.requirementsTitle}>Nickname requirements:</Text>
        <Text style={styles.requirementItem}>• 3-20 characters long</Text>
        <Text style={styles.requirementItem}>• Letters, numbers, and underscores only</Text>
        <Text style={styles.requirementItem}>• Must be unique</Text>
        <Text style={styles.requirementItem}>• Cannot be changed later</Text>
      </View>

      <TouchableOpacity
        style={[styles.continueButton, loading && styles.continueButtonDisabled]}
        onPress={handleSetNickname}
        disabled={loading}
      >
        <Text style={styles.continueButtonText}>
          {loading ? 'Setting up...' : 'Continue'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 60,
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    lineHeight: 24,
  },
  errorContainer: {
    backgroundColor: '#FF4444',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 14,
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  counter: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginBottom: 24,
  },
  requirements: {
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  requirementsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  requirementItem: {
    color: '#666',
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  continueButton: {
    backgroundColor: '#FC4C02',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});