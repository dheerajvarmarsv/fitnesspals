import { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import LegalModal from '../components/LegalModal';
import { loadLegalContent } from '../lib/legalContent';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isPrivacyVisible, setPrivacyVisible] = useState(false);
  const [isTermsVisible, setTermsVisible] = useState(false);
  const [legalContent, setLegalContent] = useState('');

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
        // Retry logic for transient network issues
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

  const showPrivacyPolicy = useCallback(() => {
    const content = loadLegalContent('privacy-policy');
    setLegalContent(content);
    setPrivacyVisible(true);
  }, []);

  const showTermsOfService = useCallback(() => {
    const content = loadLegalContent('terms-of-service');
    setLegalContent(content);
    setTermsVisible(true);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Logo Section */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Back Button */}
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

      {/* Form Container for extra padding */}
      <View style={styles.formContainer}>
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

        {/* Legal Links */}
        <View style={styles.legalContainer}>
          <Text style={styles.legalText}>
            By signing up, you agree to our{' '}
            <Text style={styles.legalLink} onPress={showTermsOfService}>
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text style={styles.legalLink} onPress={showPrivacyPolicy}>
              Privacy Policy
            </Text>
          </Text>
        </View>

        {/* Gradient Sign-Up Button */}
        <TouchableOpacity
          style={styles.signupButton}
          onPress={() => handleSignUp()}
          disabled={loading}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#F58529', '#DD2A7B']}
            style={styles.gradientButton}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Legal Modals */}
      <LegalModal
        isVisible={isPrivacyVisible}
        onClose={() => setPrivacyVisible(false)}
        title="Privacy Policy"
        content={legalContent}
      />

      <LegalModal
        isVisible={isTermsVisible}
        onClose={() => setTermsVisible(false)}
        title="Terms & Conditions"
        content={legalContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Main container with white background
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20, // Base padding on all sides
  },
  // Large logo
  logoContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  logo: {
    width: '80%',
    height: 180,
  },
  // Back button
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: '#000',
  },
  // Title with normal font weight
  title: {
    fontSize: 28,
    fontWeight: 'normal',
    fontFamily: 'System',
    color: '#000',
    marginTop: 80,
    marginBottom: 30,
    textAlign: 'center',
  },
  // Additional padding around form elements
  formContainer: {
    marginVertical: 10,
  },
  // Error message container
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
  // Inputs
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    color: '#000',
    fontSize: 16,
    fontFamily: 'System',
    fontWeight: 'normal',
    marginBottom: 16,
  },
  // Gradient sign-up button
  signupButton: {
    borderRadius: 8,
    marginBottom: 24,
    overflow: 'hidden',
  },
  gradientButton: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'System',
    fontWeight: 'normal',
  },
  legalContainer: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  legalText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    lineHeight: 20,
  },
  legalLink: {
    color: '#4c669f',
    textDecorationLine: 'underline',
  },
});