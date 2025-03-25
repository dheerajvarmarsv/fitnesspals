import { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://example.com/reset-password',
      });

      if (error) throw error;

      setSuccess(true);
    } catch (e: any) {
      setError(e.message);
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
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Image 
          source={{ uri: 'https://cdn-icons-png.flaticon.com/128/2223/2223615.png' }}
          style={styles.backIcon}
        />
      </TouchableOpacity>

      <Text style={styles.title}>Reset Password</Text>

      {success ? (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>
            Password reset instructions have been sent to your email.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.push('/login')} activeOpacity={0.9}>
            <LinearGradient colors={['#F58529', '#DD2A7B']} style={styles.gradientBackground}>
              <Text style={styles.buttonText}>Log in</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.description}>
            Enter your email address and we'll send you instructions to reset your password.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <TouchableOpacity style={styles.button} onPress={handleResetPassword} activeOpacity={0.9} disabled={loading}>
            <LinearGradient colors={['#F58529', '#DD2A7B']} style={styles.gradientBackground}>
              <Text style={styles.buttonText}>
                {loading ? 'Sending...' : 'Send Reset Instructions'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // White background
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  logo: {
    width: '80%',
    height: 180,
  },
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
  title: {
    fontSize: 28,
    fontWeight: 'normal',
    fontFamily: 'System',
    color: '#000',
    marginTop: 80,
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    color: '#666',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 30,
    fontFamily: 'System',
    fontWeight: 'normal',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    color: '#000',
    fontSize: 16,
    marginBottom: 16,
    fontFamily: 'System',
    fontWeight: 'normal',
  },
  button: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  gradientBackground: {
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
    fontFamily: 'System',
    fontWeight: 'normal',
  },
  successContainer: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  successText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    fontFamily: 'System',
    fontWeight: 'normal',
  },
});