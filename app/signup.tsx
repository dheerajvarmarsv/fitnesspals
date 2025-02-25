import { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image, SafeAreaView, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const validateEmail = (email: string) => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleSignUp = async (isRetry = false) => {
    try {
      setError(null);

      if (!email || !password || !confirmPassword) {
        setError('Please fill in all fields');
        return;
      }

      const trimmedEmail = email.toLowerCase().trim();
      
      if (!validateEmail(trimmedEmail)) {
        setError('Please enter a valid email address');
        return;
      }

      if (!validatePassword(password)) {
        setError('Password must be at least 6 characters long');
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      if (!isRetry) {
        setLoading(true);
        setRetryCount(0);
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            email: trimmedEmail
          }
        }
      });

      if (signUpError) {
        if (signUpError.name === 'AuthRetryableFetchError' && retryCount < 3) {
          setRetryCount(prev => prev + 1);
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          return handleSignUp(true);
        }

        if (signUpError.message.includes('unique constraint')) {
          throw new Error('An account with this email already exists');
        }

        if (signUpError.name === 'AuthRetryableFetchError') {
          throw new Error('Network error. Please check your connection and try again');
        }

        throw signUpError;
      }

      if (!signUpData?.user) {
        throw new Error('Failed to create account');
      }

      router.replace('/setup-nickname');
    } catch (e: any) {
      console.error('Signup error:', e);
      setError(e.message || 'An error occurred during sign up');
    } finally {
      if (!isRetry) {
        setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Image 
          source={{ uri: 'https://cdn-icons-png.flaticon.com/128/2223/2223615.png' }}
          style={styles.backIcon}
        />
      </TouchableOpacity>

      <Text style={styles.title}>Create an Account</Text>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          {error.includes('Network error') && (
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => handleSignUp()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#666"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setError(null);
        }}
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#666"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setError(null);
        }}
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        placeholderTextColor="#666"
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        value={confirmPassword}
        onChangeText={(text) => {
          setConfirmPassword(text);
          setError(null);
        }}
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.signupButton, loading && styles.signupButtonDisabled]}
        onPress={() => handleSignUp()}
        disabled={loading}
      >
        <Text style={styles.signupButtonText}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.terms}>
        By signing up you are agreeing to our{' '}
        <Text style={styles.link}>Terms of Service</Text>. View our{' '}
        <Text style={styles.link}>Privacy Policy</Text>.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 80,
    marginBottom: 30,
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
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  signupButton: {
    backgroundColor: '#FC4C02',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  signupButtonDisabled: {
    opacity: 0.7,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  terms: {
    color: '#666',
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
  },
  link: {
    color: '#fff',
    textDecorationLine: 'underline',
  },
});