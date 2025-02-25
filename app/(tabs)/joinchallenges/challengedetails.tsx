// app/(tabs)/joinchallenges/challengedetails.tsx
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  FlatList,
  Dimensions
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'; 
import { supabase } from '../../../lib/supabase';
import SharedLayout from '../../../components/SharedLayout';

const { width } = Dimensions.get('window');

// The shape of your "challenges" table
interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;  // e.g. 'race' | 'survival' | 'streak' | 'custom'
  status: string;          // e.g. 'active' | 'completed'
  start_date: string | null;
  end_date: string | null;
  is_private: boolean;
  rules: any;              // Or whatever field stores your rules/activities
  mode?: string;           // If you have a separate 'mode' column
}

// The shape of each participant row
interface Participant {
  id: string;
  user_id: string;
  status: string;          // e.g. 'active', 'pending', 'completed'
  joined_at: string;
  // We rename "profiles" => "profile" in our supabase query so we get a single object:
  profile: {
    nickname: string;
    avatar_url: string | null;
  };
}

export default function ChallengeDetailsScreen() {
  const router = useRouter();
  const { challenge_id } = useLocalSearchParams(); 

  const [loading, setLoading] = useState(true);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activities, setActivities] = useState<any[]>([]); // if you have a "challenge_activities" table

  useEffect(() => {
    if (!challenge_id) return;
    fetchChallengeDetails(challenge_id as string);
    fetchParticipants(challenge_id as string);
    fetchChallengeActivities(challenge_id as string);
  }, [challenge_id]);

  // --- Fetch the main challenge record
  async function fetchChallengeDetails(id: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;

      setChallenge(data as Challenge);
    } catch (err) {
      console.error('Error fetching challenge details:', err);
    } finally {
      setLoading(false);
    }
  }

  // --- Fetch participants joined to "profiles"
  async function fetchParticipants(challengeId: string) {
    try {
      const { data, error } = await supabase
        .from('challenge_participants')
        .select(`
          id,
          user_id,
          status,
          joined_at,
          profile:profiles (
            nickname,
            avatar_url
          )
        `)
        .eq('challenge_id', challengeId);

      if (error) throw error;
      setParticipants(data as Participant[]);
    } catch (err) {
      console.error('Error fetching participants:', err);
    }
  }

  // --- Fetch any "challenge_activities" if applicable
  async function fetchChallengeActivities(challengeId: string) {
    try {
      // Adjust columns as needed
      const { data, error } = await supabase
        .from('challenge_activities')
        .select('*')
        .eq('challenge_id', challengeId);
      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error('Error fetching challenge activities:', err);
    }
  }

  // Renders each participant row
  function renderParticipantItem({ item }: { item: Participant }) {
    const avatarUrl =
      item.profile.avatar_url || 'https://via.placeholder.com/80?text=Avatar';

    return (
      <View style={styles.participantRow}>
        <Image source={{ uri: avatarUrl }} style={styles.participantAvatar} />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.participantName}>
            {item.profile.nickname || 'Unknown'}
          </Text>
          <Text style={styles.participantStatus}>Status: {item.status}</Text>
        </View>
      </View>
    );
  }

  // Renders each activity row
  function renderActivityItem({ item }: { item: any }) {
    // e.g. item.activity_type, item.points, item.threshold, etc.
    return (
      <View style={styles.activityRow}>
        <Text style={styles.activityType}>
          {item.activity_type || 'Unknown'}
        </Text>
        <Text style={styles.activityPoints}>
          {item.points || 0} pts
        </Text>
      </View>
    );
  }

  if (loading && !challenge) {
    return (
      <SharedLayout>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#333" />
        </View>
      </SharedLayout>
    );
  }
  if (!challenge) {
    return (
      <SharedLayout>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Could not load challenge details.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SharedLayout>
    );
  }

  return (
    <SharedLayout style={styles.container}>
      {/* Custom header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
          <Text style={styles.headerBack}>{'←'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {challenge.title}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Challenge Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.challengeTitle}>{challenge.title}</Text>
          <Text style={styles.challengeType}>
            Type: {challenge.challenge_type?.toUpperCase() || 'N/A'}
            {challenge.is_private ? ' (Private)' : ' (Public)'}
          </Text>
          <Text style={styles.challengeDates}>
            {challenge.start_date
              ? `Starts: ${new Date(challenge.start_date).toLocaleDateString()}`
              : 'Starts: N/A'}
          </Text>
          <Text style={styles.challengeDates}>
            {challenge.end_date
              ? `Ends: ${new Date(challenge.end_date).toLocaleDateString()}`
              : 'Ends: Open-ended'}
          </Text>
          <Text style={styles.challengeDescription}>
            {challenge.description || 'No description provided.'}
          </Text>
        </View>

        {/* Activities Section */}
        {activities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Allowed Activities</Text>
            <FlatList
              data={activities}
              keyExtractor={(item) => String(item.id)}
              scrollEnabled={false}
              renderItem={renderActivityItem}
            />
          </View>
        )}

        {/* Participants Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Participants</Text>
          {participants.length === 0 ? (
            <Text style={styles.noParticipants}>No participants yet.</Text>
          ) : (
            <FlatList
              data={participants}
              keyExtractor={(item) => String(item.id)}
              scrollEnabled={false}
              renderItem={renderParticipantItem}
            />
          )}
        </View>
      </ScrollView>
    </SharedLayout>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  headerBack: {
    fontSize: 24,
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    color: '#333',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  challengeTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2c3e50',
    marginBottom: 6,
  },
  challengeType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    fontWeight: '600',
  },
  challengeDates: {
    fontSize: 13,
    color: '#999',
    marginBottom: 3,
  },
  challengeDescription: {
    fontSize: 14,
    color: '#444',
    marginTop: 8,
    lineHeight: 20,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 2,
  },
  activityType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
  activityPoints: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  noParticipants: {
    color: '#999',
    fontStyle: 'italic',
  },
  participantRow: {
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dfe6e9',
  },
  participantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  participantStatus: {
    fontSize: 13,
    color: '#666',
  },
});