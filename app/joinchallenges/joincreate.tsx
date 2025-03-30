import { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SharedLayout from '../../components/SharedLayout';
import { useUser } from '../../components/UserContext';
import { canJoinNewChallenge } from '../../lib/challenges';

export default function JoinCreateScreen() {
  const router = useRouter();
  const { currentUser } = useUser();
  const [loading, setLoading] = useState(false);

  const checkChallengeLimit = useCallback(async (action: 'join' | 'create') => {
    try {
      setLoading(true);
      
      if (!currentUser?.id) {
        Alert.alert("Error", "You must be logged in to join or create a challenge.");
        return;
      }
      
      const { canJoin, activeCount } = await canJoinNewChallenge(currentUser.id);
      
      if (!canJoin) {
        Alert.alert(
          "Challenge Limit Reached",
          "You can only participate in 2 active challenges at a time. Please leave an existing challenge before joining or creating a new one.",
          [{ text: "OK" }]
        );
      } else {
        // They can join, navigate to the appropriate screen
        if (action === 'join') {
          router.push('/joinchallenges/discover');
        } else {
          router.push('/joinchallenges/create');
        }
      }
    } catch (error) {
      console.error('Error checking challenge limit:', error);
      Alert.alert("Error", "An error occurred while checking your active challenges.");
    } finally {
      setLoading(false);
    }
  }, [currentUser, router]);

  return (
    <SharedLayout style={styles.container} showBackButton>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Join or Create a Challenge</Text>
        <Text style={styles.subtitle}>
          Challenge yourself and friends to reach fitness goals together
        </Text>

        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={styles.optionCard}
            onPress={() => checkChallengeLimit('join')}
            disabled={loading}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="people" size={48} color="#4A90E2" />
            </View>
            <Text style={styles.optionTitle}>Join a Challenge</Text>
            <Text style={styles.optionDescription}>
              Browse available challenges and join one that interests you
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionCard}
            onPress={() => checkChallengeLimit('create')}
            disabled={loading}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="create" size={48} color="#50C878" />
            </View>
            <Text style={styles.optionTitle}>Create a Challenge</Text>
            <Text style={styles.optionDescription}>
              Set up your own custom challenge and invite friends to join
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionCard}
            onPress={() => router.push('/joinchallenges')}
          >
            <View style={styles.iconContainer}>
              <Ionicons name="trophy" size={48} color="#F5A623" />
            </View>
            <Text style={styles.optionTitle}>View Your Challenges</Text>
            <Text style={styles.optionDescription}>
              See challenges you're currently participating in
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SharedLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  optionsContainer: {
    gap: 20,
  },
  optionCard: {
    backgroundColor: '#F5F8FF',
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
}); 