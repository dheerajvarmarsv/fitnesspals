// components/FriendSelectionModal.tsx
import React, { useEffect, useState, useRef } from 'react';
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
  Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';

interface Friend {
  id: string;
  nickname: string;
  avatar_url: string;
  selected?: boolean;
  inviteStatus?: 'pending' | 'accepted' | 'rejected' | 'not_invited';
}

interface FriendSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  challengeId: string | null;
}

export default function FriendSelectionModal({ 
  visible, 
  onClose,
  challengeId
}: FriendSelectionModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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

  // Load friends when modal becomes visible
  useEffect(() => {
    if (visible && challengeId) {
      loadFriendsWithInviteStatus();
    } else {
      // Reset when closing
      setSearchQuery('');
      setFriends([]);
    }
  }, [visible, challengeId]);

  // Filter friends based on search query
  const filteredFriends = searchQuery.trim() !== ''
    ? friends.filter(friend => 
        friend.nickname.toLowerCase().includes(searchQuery.toLowerCase()))
    : friends;

  // Load user's friends from database and check their invitation status
  const loadFriendsWithInviteStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }

      // Fetch friends
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select(`
          id,
          friend_id,
          friend:profiles!friends_friend_id_fkey (
            id,
            nickname,
            avatar_url
          )
        `)
        .eq('user_id', user.id);

      if (friendsError) throw friendsError;

      if (!friendsData || friendsData.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // If we have a challengeId, fetch existing invites for this challenge
      let invitesMap = new Map();
      
      if (challengeId) {
        const { data: invitesData, error: invitesError } = await supabase
          .from('challenge_invites')
          .select('receiver_id, status')
          .eq('challenge_id', challengeId)
          .eq('sender_id', user.id);
          
        if (invitesError) throw invitesError;
        
        // Create a map of receiver_id -> status
        if (invitesData) {
          invitesData.forEach(invite => {
            invitesMap.set(invite.receiver_id, invite.status);
          });
        }
      }
      
      // Format friend data with invite status
      const formattedFriends = friendsData
        .filter(item => item.friend) // Make sure friend data exists
        .map(item => {
          const friendId = item.friend_id;
          const inviteStatus = invitesMap.has(friendId) 
            ? invitesMap.get(friendId) 
            : 'not_invited';
            
          return {
            id: friendId,
            nickname: item.friend?.nickname || 'Unknown',
            avatar_url: item.friend?.avatar_url || 'https://via.placeholder.com/40',
            selected: false,
            inviteStatus: inviteStatus
          };
        });
        
      setFriends(formattedFriends);
    } catch (e: any) {
      console.error('Error loading friends:', e);
      setError(e.message || 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  // Toggle friend selection (only for those who haven't been invited or rejected the invite)
  const toggleFriendSelection = (id: string) => {
    setFriends(prev => 
      prev.map(friend => {
        // Only toggle if the friend is not already invited and pending
        if (friend.id === id && friend.inviteStatus !== 'pending' && friend.inviteStatus !== 'accepted') {
          return { ...friend, selected: !friend.selected };
        }
        return friend;
      })
    );
  };

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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create invites for each selected friend
      const invites = selectedFriends.map(friend => ({
        challenge_id: challengeId,
        sender_id: user.id,
        receiver_id: friend.id,
        status: 'pending'
      }));

      const { error } = await supabase
        .from('challenge_invites')
        .insert(invites);

      if (error) throw error;
      
      // Update local state to reflect the new invites
      setFriends(prev => 
        prev.map(friend => {
          if (friend.selected) {
            return { ...friend, selected: false, inviteStatus: 'pending' };
          }
          return friend;
        })
      );
      
      // Success
      Alert.alert(
        'Success', 
        `Invitations sent to ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}!`
      );
    } catch (e: any) {
      setError(e.message || 'Failed to send invitations');
    } finally {
      setInviting(false);
    }
  };

  // Get the appropriate button text based on invite status
  const getInviteStatusDisplay = (status: string | undefined) => {
    switch(status) {
      case 'pending': 
        return 'Invited';
      case 'accepted': 
        return 'Joined';
      case 'rejected': 
        return 'Invite Again';
      default: 
        return '';
    }
  };

  // Render each friend item
  const renderFriendItem = ({ item }: { item: Friend }) => {
    const isPending = item.inviteStatus === 'pending';
    const isAccepted = item.inviteStatus === 'accepted';
    const isRejected = item.inviteStatus === 'rejected';
    const isNotInvited = item.inviteStatus === 'not_invited';
    
    // Determine if this friend can be selected
    const isSelectable = isNotInvited || isRejected;
    
    return (
      <TouchableOpacity
        style={[
          styles.friendItem,
          item.selected && styles.friendItemSelected,
          (isPending || isAccepted) && styles.friendItemDisabled
        ]}
        onPress={() => isSelectable ? toggleFriendSelection(item.id) : null}
        activeOpacity={isSelectable ? 0.7 : 1}
      >
        <Image 
          source={{ uri: item.avatar_url }} 
          style={styles.avatar} 
        />
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.nickname}</Text>
          {isPending && (
            <Text style={styles.pendingText}>Invited</Text>
          )}
          {isAccepted && (
            <Text style={styles.acceptedText}>Already joined</Text>
          )}
          {isRejected && (
            <Text style={styles.rejectedText}>Declined previously</Text>
          )}
        </View>
        
        {isSelectable ? (
          <View style={[
            styles.checkbox,
            item.selected && styles.checkboxSelected
          ]}>
            {item.selected && (
              <Ionicons name="checkmark" size={18} color="#fff" />
            )}
          </View>
        ) : (
          <View style={[
            styles.statusBadge,
            isPending && styles.pendingBadge,
            isAccepted && styles.acceptedBadge
          ]}>
            <Text style={styles.statusBadgeText}>
              {getInviteStatusDisplay(item.inviteStatus)}
            </Text>
          </View>
        )}
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
                      onPress={loadFriendsWithInviteStatus}
                    >
                      <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4A90E2" />
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
                <FlatList
                  data={filteredFriends}
                  renderItem={renderFriendItem}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.friendsList}
                  showsVerticalScrollIndicator={false}
                />
              )}

              <View style={styles.footer}>
                <Text style={styles.selectedCount}>
                  {friends.filter(f => f.selected).length} friend(s) selected
                </Text>
                
                <TouchableOpacity
                  style={[
                    styles.inviteButton,
                    (inviting || !friends.some(f => f.selected)) && 
                      styles.inviteButtonDisabled
                  ]}
                  onPress={handleInvite}
                  disabled={inviting || !friends.some(f => f.selected)}
                >
                  <LinearGradient
                    colors={['#FF416C', '#FF4B2B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.inviteButtonGradient}
                  >
                    {inviting ? (
                      <View style={styles.invitingContainer}>
                        <Animated.View style={{ transform: [{ rotate: spin }] }}>
                          <Ionicons name="refresh" size={20} color="#fff" />
                        </Animated.View>
                        <Text style={styles.inviteButtonText}>Sending Invites...</Text>
                      </View>
                    ) : (
                      <Text style={styles.inviteButtonText}>
                        Send Invitations
                      </Text>
                    )}
                  </LinearGradient>
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
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  friendItemSelected: {
    backgroundColor: '#EBF5FF',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  friendItemDisabled: {
    opacity: 0.8,
    backgroundColor: '#f0f0f0',
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
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
  },
  acceptedBadge: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  selectedCount: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 12,
  },
  inviteButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  inviteButtonDisabled: {
    opacity: 0.5,
  },
  inviteButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invitingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});