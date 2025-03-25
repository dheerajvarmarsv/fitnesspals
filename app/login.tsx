import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reuse your original regex validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    try {
      setError(null);

      // Input validation
      if (!email || !password) {
        setError('Please fill in all fields');
        return;
      }

      const trimmedEmail = email.toLowerCase().trim();

      if (!validateEmail(trimmedEmail)) {
        setError('Please enter a valid email address');
        return;
      }

      setLoading(true);

      // Attempt login with Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password');
        }
        throw signInError;
      }

      if (!data?.user) {
        throw new Error('Login failed. Please try again.');
      }

      // Navigate after successful login
      router.replace('/(tabs)');
    } catch (e: any) {
      console.error('Login error:', e);
      setError(e.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

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

      <Text style={styles.title}>Log in</Text>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Form Container */}
      <View style={styles.formContainer}>
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

        {/* Gradient Log In Button */}
        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#F58529', '#DD2A7B']}
            style={styles.gradientBackground}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Logging in...' : 'Log In'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Forgot Password Link */}
      <TouchableOpacity
        style={styles.forgotPassword}
        onPress={() => router.push('/forgot-password')}
      >
        <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
      </TouchableOpacity>
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
    paddingHorizontal: 10, // Extra horizontal padding
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
    borderRadius: 8,
    padding: 16,
    color: '#000',
    fontSize: 16,
    fontFamily: 'System',
    fontWeight: 'normal',
    marginBottom: 16,
  },
  // Gradient login button
  loginButton: {
    borderRadius: 8,
    marginBottom: 24,
    overflow: 'hidden',
  },
  gradientBackground: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'System',
    fontWeight: 'normal',
  },
  forgotPassword: {
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#F58529',
    fontSize: 14,
    fontWeight: '600',
  },
});