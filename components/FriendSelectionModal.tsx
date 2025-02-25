import React, { useState, useEffect } from 'react';
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
import { supabase } from '../lib/supabase';
import { getFriends } from '../lib/friends';

interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  friend?: {
    id?: string;
    nickname: string;
    avatar_url: string;
    email: string;
  };
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
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation for loading spinner
  const spinValue = new Animated.Value(0);
  
  // Create the spinning animation when inviting
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
  }, [inviting]);
  
  // Interpolate the spin value to create the rotation
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  useEffect(() => {
    if (visible) {
      loadFriends();
    }
  }, [visible]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      setError(null);
      const friendsData = await getFriends();
      setFriends(friendsData);
    } catch (e: any) {
      console.error('Error loading friends:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId)
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleInvite = async () => {
    if (!challengeId || selectedFriends.length === 0) return;
    
    try {
      setInviting(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Create invite entries in the database
      const promises = selectedFriends.map(friendId => 
        supabase
          .from('challenge_invites')
          .insert({
            challenge_id: challengeId,
            sender_id: user.id,
            receiver_id: friendId,
            status: 'pending'
          })
      );
      
      await Promise.all(promises);
      
      Alert.alert(
        'Success', 
        `Invited ${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}!`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (e: any) {
      console.error('Error inviting friends:', e);
      setError(e.message);
    } finally {
      setInviting(false);
    }
  };

  const renderFriendItem = ({ item }: { item: Friend }) => {
    if (!item.friend) return null;
    
    const isSelected = selectedFriends.includes(item.friend_id);
    
    return (
      <TouchableOpacity 
        style={[styles.friendItem, isSelected && styles.friendItemSelected]} 
        onPress={() => handleToggleSelect(item.friend_id)}
      >
        <View style={styles.friendItemContent}>
          <Image 
            source={{ uri: item.friend.avatar_url }} 
            style={styles.avatar} 
          />
          <View style={styles.friendInfo}>
            <Text style={styles.friendName}>{item.friend.nickname}</Text>
            <Text style={styles.friendEmail}>{item.friend.email}</Text>
          </View>
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Ionicons name="checkmark" size={18} color="#fff" />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Filter friends based on search query
  const filteredFriends = friends.filter(friend => 
    friend.friend?.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.friend?.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Invite Friends</Text>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={onClose}
                  hitSlop={{ top: 15, right: 15, bottom: 15, left: 15 }}
                >
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search friends"
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              
              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4A90E2" />
                  <Text style={styles.loadingText}>Loading friends...</Text>
                </View>
              ) : friends.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>No Friends Yet</Text>
                  <Text style={styles.emptyStateText}>
                    You need to add friends before you can invite them to challenges.
                  </Text>
                </View>
              ) : filteredFriends.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    No results matching "{searchQuery}"
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredFriends}
                  renderItem={renderFriendItem}
                  keyExtractor={item => item.id}
                  style={styles.friendsList}
                  contentContainerStyle={styles.friendsListContent}
                />
              )}
              
              <View style={styles.footer}>
                {selectedFriends.length > 0 && (
                  <Text style={styles.selectionText}>
                    {selectedFriends.length} friend{selectedFriends.length > 1 ? 's' : ''} selected
                  </Text>
                )}
                <TouchableOpacity 
                  style={[
                    styles.inviteButton, 
                    (selectedFriends.length === 0 || inviting) && styles.inviteButtonDisabled
                  ]}
                  onPress={handleInvite}
                  disabled={selectedFriends.length === 0 || inviting}
                >
                  {inviting ? (
                    <View style={styles.inviteButtonContent}>
                      <Animated.View style={{ transform: [{ rotate: spin }] }}>
                        <Ionicons name="refresh" size={24} color="#fff" />
                      </Animated.View>
                      <Text style={styles.inviteButtonText}>Inviting...</Text>
                    </View>
                  ) : (
                    <Text style={styles.inviteButtonText}>Send Invites</Text>
                  )}
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
const isSmallDevice = height < 700;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.8,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 16,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    margin: 16,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyStateText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
  },
  friendsList: {
    flex: 1,
  },
  friendsListContent: {
    paddingHorizontal: 16,
  },
  friendItem: {
    marginBottom: 10,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
  },
  friendItemSelected: {
    backgroundColor: '#EBF5FF',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  friendItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ddd',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  friendEmail: {
    fontSize: 14,
    color: '#666',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    marginLeft: 8,
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
  selectionText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 12,
  },
  inviteButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteButtonDisabled: {
    backgroundColor: '#ccc',
  },
  inviteButtonContent: {
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