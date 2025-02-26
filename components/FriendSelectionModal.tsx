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
    if (visible) {
      loadFriends();
    } else {
      // Reset when closing
      setSearchQuery('');
      setFriends([]);
    }
  }, [visible]);

  // Filter friends based on search query
  const filteredFriends = searchQuery.trim() !== ''
    ? friends.filter(friend => 
        friend.nickname.toLowerCase().includes(searchQuery.toLowerCase()))
    : friends;

  // Load user's friends from database
  const loadFriends = async () => {
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
      const { data, error } = await supabase
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

      if (error) throw error;

      // Format friend data
      if (data && data.length > 0) {
        const formattedFriends = data
          .filter(item => item.friend) // Make sure friend data exists
          .map(item => ({
            id: item.friend_id,
            nickname: item.friend?.nickname || 'Unknown',
            avatar_url: item.friend?.avatar_url || 'https://via.placeholder.com/40',
            selected: false
          }));
          
        setFriends(formattedFriends);
      }
    } catch (e: any) {
      console.error('Error loading friends:', e);
      setError(e.message || 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  // Toggle friend selection
  const toggleFriendSelection = (id: string) => {
    setFriends(prev => 
      prev.map(friend => 
        friend.id === id 
          ? { ...friend, selected: !friend.selected } 
          : friend
      )
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
      
      // Success
      Alert.alert(
        'Success', 
        `Invitations sent to ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}!`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (e: any) {
      setError(e.message || 'Failed to send invitations');
    } finally {
      setInviting(false);
    }
  };

  // Render each friend item
  const renderFriendItem = ({ item }: { item: Friend }) => (
    <TouchableOpacity
      style={[
        styles.friendItem,
        item.selected && styles.friendItemSelected
      ]}
      onPress={() => toggleFriendSelection(item.id)}
      activeOpacity={0.7}
    >
      <Image 
        source={{ uri: item.avatar_url }} 
        style={styles.avatar} 
      />
      <Text style={styles.friendName}>{item.nickname}</Text>
      <View style={[
        styles.checkbox,
        item.selected && styles.checkboxSelected
      ]}>
        {item.selected && (
          <Ionicons name="checkmark" size={18} color="#fff" />
        )}
      </View>
    </TouchableOpacity>
  );

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
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  friendName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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