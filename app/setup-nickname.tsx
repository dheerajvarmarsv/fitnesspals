import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useUser, generateAvatarUrl } from '../components/UserContext';

const MAX_LENGTH = 20;
const { width, height } = Dimensions.get('window');

export default function SetupNickname() {
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { updateSettings } = useUser();

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

      // Generate the avatar URL from the nickname
      const avatarUrl = generateAvatarUrl(nickname);

      // Update profile with nickname and generated avatar
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          nickname: nickname.toLowerCase(),
          avatar_url: avatarUrl
        })
        .eq('id', user.id);
      if (updateError) throw updateError;
      
      // Update the UserContext with the new nickname and avatar to reflect changes immediately
      await updateSettings({
        nickname: nickname.toLowerCase(),
        avatarUrl: avatarUrl
      });

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
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

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

          {/* Gradient "Continue" Button */}
          <TouchableOpacity
            style={[styles.continueButton, loading && styles.continueButtonDisabled]}
            onPress={handleSetNickname}
            disabled={loading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#F58529', '#DD2A7B', '#8134AF', '#515BD4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBackground}
            >
              <Text style={styles.continueButtonText}>
                {loading ? 'Setting up...' : 'Continue'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: Math.min(32, width * 0.08), // Responsive horizontal padding
    paddingVertical: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: height * 0.02,
    marginBottom: height * 0.02,
  },
  logo: {
    width: Math.min(280, width * 0.7),
    height: Math.min(180, height * 0.18),
    resizeMode: 'contain',
  },
  title: {
    fontSize: Math.min(24, width * 0.06),
    fontWeight: '600',
    color: '#000',
    marginTop: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: Math.min(16, width * 0.04),
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
    textAlign: 'center',
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
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    color: '#000',
    fontSize: 16,
    marginBottom: 8,
    height: 56,
  },
  counter: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginBottom: 24,
  },
  requirements: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: Math.max(24, height * 0.04),
  },
  requirementsTitle: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  requirementItem: {
    color: '#666',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
  continueButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  gradientBackground: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});