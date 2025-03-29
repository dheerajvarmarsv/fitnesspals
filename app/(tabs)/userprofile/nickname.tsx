import { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import SharedLayout from '../../../components/SharedLayout';
import { useUser, generateAvatarUrl } from '../../../components/UserContext';
import { supabase } from '../../../lib/supabase';

const MAX_LENGTH = 30;

export default function EditNickname() {
  // Pull the current nickname + the update function from your UserContext
  const { settings, updateSettings } = useUser();

  // Initialize the local state to the existing nickname
  const [nickname, setNickname] = useState(settings.nickname || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Called when user presses "Update Nickname"
  const handleSave = async () => {
    // Basic client-side checks
    if (!nickname) {
      setError('Please enter a nickname');
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(nickname)) {
      setError('Nickname must be 3-30 characters long and can only contain letters, numbers, and underscores');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1) Check if nickname is taken
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Look for any other profile with the same nickname
      const { data: existingUsers, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('nickname', nickname.toLowerCase())
        .neq('id', user.id); // exclude the current user's row

      if (checkError) throw checkError;

      if (existingUsers && existingUsers.length > 0) {
        setError('This nickname is already taken. Please choose another one.');
        return;
      }

      // 2) Update in Supabase + local state
      
      // Generate avatar URL based on the new nickname
      const avatarUrl = generateAvatarUrl(nickname);
      
      // Update the database directly to ensure avatar gets updated
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          nickname: nickname.toLowerCase(),
          avatar_url: avatarUrl
        })
        .eq('id', user.id);
      if (updateError) throw updateError;
      
      // Also update local state through the UserContext
      await updateSettings({ 
        nickname: nickname.toLowerCase(),
        avatarUrl: avatarUrl
      });

      // 3) Go back to the previous screen
      router.back();
    } catch (e: any) {
      console.error('Nickname update error:', e);
      setError(e.message || 'Failed to update nickname');
    } finally {
      setLoading(false);
    }
  };

  // For enabling/disabling the "Update Nickname" button
  const isValid = nickname.length >= 3 && nickname.length <= MAX_LENGTH;
  const hasChanged = nickname.toLowerCase() !== settings.nickname.toLowerCase();

  return (
    <SharedLayout style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>Nickname</Text>

        <TextInput
          style={styles.input}
          value={nickname}
          onChangeText={(text) => {
            setNickname(text);
            setError(null);
          }}
          placeholder="Enter your nickname"
          placeholderTextColor="#999"
          maxLength={MAX_LENGTH}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />

        <Text style={styles.counter}>
          {nickname.length}/{MAX_LENGTH} characters
        </Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[
            styles.saveButton,
            (!isValid || !hasChanged || loading) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={!isValid || !hasChanged || loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Updating...' : 'Update Nickname'}
          </Text>
        </TouchableOpacity>
      </View>
    </SharedLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  counter: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginBottom: 12,
  },
  errorText: {
    color: '#FF4444',
    fontSize: 14,
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#000000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#333333',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});