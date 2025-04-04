// components/FriendSelectionModal.tsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
  Modal,
  Animated,
  Easing,
  ScrollView,
  ImageSourcePropType
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { sendChallengeInviteNotification } from '../lib/notificationService';
import { generateAvatarUrl } from '../lib/utils';

interface DatabaseFriend {
  friend: {
    id: string;
    nickname: string;
    avatar_url: string | null;
  };
}

interface ChallengeInvite {
  receiver_id: string;
  status: string;
}

interface Friend {
  id: string;
  nickname: string;
  avatar_url: string | null;
  selected: boolean;
  inviteStatus: string | null;
}

interface FriendSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  challengeId: string;
}

export default function FriendSelectionModal({ 
  visible, 
  onClose,
  challengeId
}: FriendSelectionModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Animation for spinner
  const spinValue = useRef(new Animated.Value(0)).current;
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  // Start spinning animation when inviting
  useEffect(() => {
    if (inviting) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true
        })
      ).start();
    } else {
      spinValue.setValue(0);
    }
  }, [inviting, spinValue]);

  // Load friends list and their invite status separately
  const loadFriends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // First, get friends list
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select(`
          friend:profiles!friends_friend_id_fkey (
            id,
            nickname,
            avatar_url
          )
        `)
        .eq('user_id', user.id);

      if (friendsError) throw friendsError;

      // Then, get existing invites for this challenge
      const { data: invitesData, error: invitesError } = await supabase
        .from('challenge_invites')
        .select('receiver_id, status')
        .eq('challenge_id', challengeId)
        .eq('sender_id', user.id);

      if (invitesError) throw invitesError;

      // Create a map of friend ID to invite status
      const inviteStatusMap = new Map(
        (invitesData || []).map((invite: ChallengeInvite) => [invite.receiver_id, invite.status])
      );

      // Combine friends data with invite status
      const processedFriends = (friendsData || []).reduce<Friend[]>((acc, item: any) => {
        if (item?.friend?.id && item?.friend?.nickname) {
          acc.push({
            id: item.friend.id,
            nickname: item.friend.nickname,
            avatar_url: item.friend.avatar_url || null,
            selected: false,
            inviteStatus: inviteStatusMap.get(item.friend.id) || null
          });
        }
        return acc;
      }, []);

      setFriends(processedFriends);
    } catch (e: any) {
      console.error('Error loading friends:', e);
      setError(e.message || 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  }, [challengeId]);

  useEffect(() => {
    if (visible) {
      loadFriends();
    } else {
      // Reset state when modal closes
      setSearchQuery('');
      setError(null);
    }
  }, [visible, loadFriends]);

  // Toggle friend selection
  const toggleFriendSelection = useCallback((friendId: string) => {
    setFriends(prev => 
      prev.map(friend => 
        friend.id === friendId 
          ? { ...friend, selected: !friend.selected }
          : friend
      )
    );
  }, []);

  // Filter friends based on search
  const filteredFriends = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return friends.filter(friend => 
      friend.nickname.toLowerCase().includes(query)
    );
  }, [friends, searchQuery]);

  // Invite selected friends
  const handleInvite = async () => {
    const selectedFriends = friends.filter(f => f.selected);
    
    if (!challengeId) {
      Alert.alert('Error', 'Challenge ID is missing');
      return;
    }
    
    if (selectedFriends.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one friend to invite');
      return;
    }

    try {
      setInviting(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get challenge details for notification
      const { data: challenge } = await supabase
        .from('challenges')
        .select('title, challenge_type')
        .eq('id', challengeId)
        .single();

      if (!challenge) throw new Error('Challenge not found');

      // Get sender's profile for notification
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', user.id)
        .single();

      const senderNickname = senderProfile?.nickname || 'Someone';
      const challengeName = challenge.title || `${challenge.challenge_type} Challenge`;

      // Create invites
      const invites = selectedFriends.map(friend => ({
        challenge_id: challengeId,
        sender_id: user.id,
        receiver_id: friend.id,
        status: 'pending'
      }));

      const { error: inviteError } = await supabase
        .from('challenge_invites')
        .insert(invites);

      if (inviteError) throw inviteError;

      // Send notifications
      for (const friend of selectedFriends) {
        try {
          await sendChallengeInviteNotification(
            friend.id,
            senderNickname,
            challengeId,
            challengeName
          );
        } catch (notifError) {
          console.error(`Failed to send notification to ${friend.nickname}:`, notifError);
          // Continue with other notifications even if one fails
        }
      }

      // Update local state
      setFriends(prev => 
        prev.map(friend => ({
          ...friend,
          selected: false,
          inviteStatus: friend.selected ? 'pending' : friend.inviteStatus
        }))
      );

      Alert.alert(
        'Success', 
        `Invitations sent to ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}!`
      );

      onClose();
    } catch (e: any) {
      setError(e.message || 'Failed to send invitations');
      Alert.alert('Error', 'Failed to send invitations. Please try again.');
    } finally {
      setInviting(false);
    }
  };

  // Get the appropriate button text based on invite status
  const getInviteStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Invited';
      case 'accepted':
        return 'Joined';
      case 'rejected':
        return 'Declined';
      default:
        return status;
    }
  };

  // Render each friend item
  const renderFriendItem = ({ item }: { item: Friend }) => {
    const isInvited = item.inviteStatus === 'pending' || item.inviteStatus === 'accepted';
    const isSelectable = !isInvited;
    
    return (
      <TouchableOpacity
        style={[
          styles.friendItem,
          !isSelectable && styles.friendItemDisabled,
          item.selected && styles.friendItemSelected // Add this line to add background color
        ]}
        onPress={() => isSelectable && toggleFriendSelection(item.id)}
        disabled={!isSelectable}
      >
        <View style={styles.friendInfo}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ 
                uri: item.avatar_url || generateAvatarUrl(item.nickname)
              }}
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              <View style={styles.header}>
                <Text style={styles.title}>Invite Friends</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={onClose}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search friends..."
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                  {error === 'Not authenticated' ? (
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={onClose}
                    >
                      <Text style={styles.retryButtonText}>Close</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={loadFriends}
                    >
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#00000" />
                  <Text style={styles.loadingText}>Loading friends...</Text>
                </View>
              ) : friends.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    You don't have any friends yet.{'\n'}
                    Add friends to invite them to your challenge!
                  </Text>
                </View>
              ) : filteredFriends.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    No friends found matching "{searchQuery}"
                  </Text>
                </View>
              ) : (
                <ScrollView style={styles.friendsList}>
                  {filteredFriends.map(friend => (
                    <TouchableOpacity
                      key={friend.id}
                      style={[
                        styles.friendItem,
                        friend.selected && styles.friendItemSelected,
                        friend.inviteStatus && styles.friendItemDisabled
                      ]}
                      onPress={() => {
                        if (!friend.inviteStatus) {
                          toggleFriendSelection(friend.id);
                        }
                      }}
                      disabled={!!friend.inviteStatus}
                    >
                      <Image
                        source={{ 
                          uri: friend.avatar_url || generateAvatarUrl(friend.nickname)
                        }}
                        style={styles.avatar}
                      />
                      <Text style={styles.friendName}>{friend.nickname}</Text>
                      {friend.inviteStatus ? (
                        <View style={[styles.statusBadge, getStatusStyle(friend.inviteStatus)]}>
                          <Text style={styles.statusText}>
                            {getInviteStatusDisplay(friend.inviteStatus)}
                          </Text>
                        </View>
                      ) : (
                        <View style={[styles.checkbox, friend.selected && styles.checkboxSelected]}>
                          {friend.selected && (
                            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <View style={styles.footer}>
                <Text style={styles.selectedCount}>
                  {friends.filter(f => f.selected).length} friend(s) selected
                </Text>
                
                <TouchableOpacity
                  style={[
                    styles.inviteButton,
                    friends.some(f => f.selected) ? styles.inviteButtonActive : styles.inviteButtonInactive,
                    inviting && styles.inviteButtonDisabled
                  ]}
                  onPress={handleInvite}
                  disabled={!friends.some(f => f.selected) || inviting}
                >
                  <Text style={[
                    styles.inviteButtonText,
                    friends.some(f => f.selected) ? styles.inviteButtonTextActive : styles.inviteButtonTextInactive
                  ]}>
                    {inviting ? 'Sending Invites...' : 'Send Invites'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.8,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    margin: 16,
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  friendsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  friendItemSelected: {
    backgroundColor: '#EBF5FF', // Light blue background
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  friendItemDisabled: {
    opacity: 0.6,
    backgroundColor: '#F0F0F0',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  pendingText: {
    fontSize: 13,
    color: '#F59E0B',
    marginTop: 4,
  },
  acceptedText: {
    fontSize: 13,
    color: '#10B981',
    marginTop: 4,
  },
  rejectedText: {
    fontSize: 13,
    color: '#EF4444',
    marginTop: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginLeft: 'auto',
  },
  checkboxSelected: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  selectedCount: {
    textAlign: 'center',
    color: '#666666',
    marginBottom: 12,
    fontSize: 14,
  },
  inviteButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  inviteButtonActive: {
    backgroundColor: '#000000',
  },
  inviteButtonInactive: {
    backgroundColor: '#666666',
  },
  inviteButtonDisabled: {
    opacity: 0.5,
  },
  inviteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  inviteButtonTextActive: {
    color: '#FFFFFF',
  },
  inviteButtonTextInactive: {
    color: '#FFFFFF',
    opacity: 0.8,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  selectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invitedText: {
    fontSize: 13,
    color: '#F59E0B',
    marginLeft: 8,
  },
});

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'pending':
      return { backgroundColor: '#FFA000' };
    case 'accepted':
      return { backgroundColor: '#4CAF50' };
    case 'rejected':
      return { backgroundColor: '#F44336' };
    default:
      return { backgroundColor: '#666' };
  }
};