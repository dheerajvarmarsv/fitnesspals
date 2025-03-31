import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../components/UserContext';
import SharedLayout from '../../components/SharedLayout';
import { 
  leaveChallenge, 
  canJoinNewChallenge 
} from '../../lib/challenges';
import { Ionicons } from '@expo/vector-icons';

interface Friend {
  id: string;
  nickname: string;
  avatar_url: string;
  selected?: boolean;
  inviteStatus?: 'pending' | 'accepted' | 'rejected' | 'not_invited';
}

export default function ChallengeDetailsScreen() {
  return (
    <SharedLayout style={styles.container}>
      <ChallengeDetailsContent />
    </SharedLayout>
  );
}

function ChallengeDetailsContent() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const challenge_id = params.challenge_id as string;
  const { settings, isOnline } = useUser();
  const currentUserId = settings?.nickname ? supabase.auth.getUser().then(res => res.data.user?.id) : null;
  
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [userParticipant, setUserParticipant] = useState<any>(null);
  const [isUserParticipant, setIsUserParticipant] = useState(false);
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);

  // Load challenge data
  useEffect(() => {
    if (challenge_id) {
      loadChallengeData();
    }
  }, [challenge_id]);

  const loadChallengeData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch challenge
      const { data: challengeData, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challenge_id)
        .single();
        
      if (challengeError) throw challengeError;
      setChallenge(challengeData);
      
      // 2. Check if user is a participant
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const { data: participantData, error: participantError } = await supabase
          .from('challenge_participants')
          .select('*, profile:profiles(id, nickname, avatar_url)')
          .eq('challenge_id', challenge_id)
          .eq('user_id', user.id);
          
        if (participantError) throw participantError;
        
        if (participantData && participantData.length > 0) {
          setUserParticipant(participantData[0]);
          setIsUserParticipant(true);
          setMyParticipantId(participantData[0].id);
        }
      }
      
      // 3. Fetch all participants
      const { data: allParticipants, error: participantsError } = await supabase
        .from('challenge_participants')
        .select(`
          *,
          profile:profiles(id, nickname, avatar_url)
        `)
        .eq('challenge_id', challenge_id);
        
      if (participantsError) throw participantsError;
      setParticipants(allParticipants || []);
      
    } catch (error) {
      console.error('Error loading challenge:', error);
      Alert.alert('Error', 'Failed to load challenge details');
    } finally {
      setLoading(false);
    }
  };

  // Handle leaving the challenge
  const handleLeaveChallenge = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id || !myParticipantId) return;
    
    try {
      setLoading(true);
      
      // Confirm with the user
      Alert.alert(
        'Leave Challenge',
        'Are you sure you want to leave this challenge? Your progress will be lost.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: async () => {
              try {
                // Call the leaveChallenge function to delete all user data
                const result = await leaveChallenge(myParticipantId);
                
                if (result.success) {
                  // Update local state
                  setUserParticipant(null);
                  setIsUserParticipant(false);
                  
                  // Show success message
                  Alert.alert(
                    'Left Challenge',
                    'You have successfully left the challenge.'
                  );
                }
              } catch (error) {
                console.error('Error leaving challenge:', error);
                Alert.alert('Error', 'Failed to leave the challenge. Please try again.');
              } finally {
                setLoading(false);
              }
            },
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Error initiating leave challenge:', error);
      Alert.alert('Error', 'An error occurred. Please try again.');
      setLoading(false);
    }
  }, [myParticipantId]);

  // Handle joining the challenge
  const handleJoinChallenge = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id || !challenge_id) return;
    
    try {
      setLoading(true);
      
      // Check if user can join new challenges
      const { canJoin } = await canJoinNewChallenge(user.id);
      
      if (!canJoin) {
        Alert.alert(
          'Cannot Join',
          'You can only participate in 2 active challenges at a time.'
        );
        setLoading(false);
        return;
      }
      
      // Create new participant record
      const { data, error } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id,
          user_id: user.id,
          status: 'active',
          joined_at: new Date().toISOString(),
          total_points: 0,
          current_streak: 0,
          longest_streak: 0,
          map_position: 0
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Update local state
      setUserParticipant(data);
      setIsUserParticipant(true);
      setMyParticipantId(data.id);
      
      // Show success message
      Alert.alert(
        'Joined Challenge',
        'You have successfully joined the challenge.'
      );
    } catch (error) {
      console.error('Error joining challenge:', error);
      Alert.alert('Error', 'Failed to join the challenge. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [challenge_id]);

  // Toggle friend selection
  const toggleFriendSelection = (id: string) => {
    setFriends(prev => 
      prev.map(friend => {
        if (friend.id === id && friend.inviteStatus !== 'pending' && friend.inviteStatus !== 'accepted') {
          return { ...friend, selected: !friend.selected };
        }
        return friend;
      })
    );
  };

  const renderFriendItem = ({ item }: { item: Friend }) => {
    const isInvited = item.inviteStatus === 'pending' || item.inviteStatus === 'accepted';
    const isSelectable = !isInvited;
    
    return (
      <TouchableOpacity
        style={[
          styles.friendItem,
          !isSelectable && styles.friendItemDisabled
        ]}
        onPress={() => isSelectable && toggleFriendSelection(item.id)}
        disabled={!isSelectable}
      >
        <View style={styles.friendInfo}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: item.avatar_url }}
              style={styles.avatar}
            />
          </View>
          <Text style={styles.friendName}>{item.nickname}</Text>
        </View>
        <View style={styles.selectionContainer}>
          {isInvited ? (
            <Text style={styles.invitedText}>
              {item.inviteStatus === 'pending' ? 'Invited' : 'Joined'}
            </Text>
          ) : (
            <View style={[
              styles.checkbox,
              item.selected && styles.checkboxSelected
            ]}>
              {item.selected && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !challenge) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading challenge details...</Text>
      </View>
    );
  }

  if (!challenge) {
    return (
      <View style={styles.errorContainer}>
        <Text>Challenge not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.challengeHeader}>
        <Text style={styles.challengeTitle}>{challenge.title}</Text>
        <View style={styles.badgeContainer}>
          <Text style={styles.badge}>{challenge.challenge_type?.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{challenge.description || 'No description provided'}</Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Start Date:</Text>
          <Text style={styles.detailValue}>
            {challenge.start_date ? new Date(challenge.start_date).toLocaleDateString() : 'Not set'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>End Date:</Text>
          <Text style={styles.detailValue}>
            {challenge.end_date ? new Date(challenge.end_date).toLocaleDateString() : 'Open-ended'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Participants:</Text>
          <Text style={styles.detailValue}>{participants.length}</Text>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Participants</Text>
        <View style={styles.participantsList}>
          {participants.map((participant, index) => (
            <View key={participant.id} style={styles.participantCard}>
              <View style={styles.participantInfo}>
                <Text style={styles.participantName}>
                  {participant.profile?.nickname || 'User'} 
                  {participant.user_id === currentUserId && ' (You)'}
                </Text>
                <Text style={styles.participantStatus}>
                  {participant.status === 'left' ? 'Left' : 'Active'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      
      {!isUserParticipant ? (
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.joinButton]}
            onPress={handleJoinChallenge}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>Join Challenge</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.actionButtonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.leaveButton]}
            onPress={handleLeaveChallenge}
            disabled={loading}
            activeOpacity={0.7}
            pressRetentionOffset={{ top: 10, left: 10, bottom: 10, right: 10 }}
            delayPressIn={0}
          >
            <Text style={styles.actionButtonText}>Leave Challenge</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
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
  backLink: {
    color: '#00000',
    marginTop: 16,
    fontSize: 16,
  },
  challengeHeader: {
    marginBottom: 24,
  },
  challengeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  badge: {
    backgroundColor: '#E0E0FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    color: '#5050FF',
    fontWeight: '600',
    fontSize: 12,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  participantsList: {
    gap: 12,
  },
  participantCard: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  participantInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  participantStatus: {
    fontSize: 14,
    color: '#666',
  },
  actionButtonContainer: {
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  actionButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveButton: {
    backgroundColor: '#F44336',
  },
  joinButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  friendItemDisabled: {
    opacity: 0.8,
    backgroundColor: '#f0f0f0',
  },
  friendInfo: {
    flex: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    backgroundColor: '#4CAF50',
  },
  invitedText: {
    fontSize: 13,
    color: '#F59E0B',
    marginLeft: 8,
  },
}); 