import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Share,
  Image,
  TouchableWithoutFeedback,
  ScrollView,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import SharedLayout from '../../components/SharedLayout';
import { useUser, generateAvatarUrl } from '../../components/UserContext';
import {
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
  blockUser,
  searchUsers,
  Friend,
  FriendRequest
} from '../../lib/friends';
import { supabase } from '../../lib/supabase';

export default function Friends() {
  const { settings, isOnline } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uniqueProfileLink = `https://stridekick.app/friend/${settings.nickname}`;

  // Load data
  const loadData = useCallback(async () => {
    try {
      setError(null);
      // getFriends + getFriendRequests (pending only, receiver = current user)
      const [friendsData, requestsData] = await Promise.all([
        getFriends(),
        getFriendRequests(), // only pending + receiver=me
      ]);
      setFriends(friendsData);
      setFriendRequests(requestsData);
    } catch (e: any) {
      console.error('Error loading data:', e);
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Accept/Reject/Block request
  const handleRequestResponse = async (requestId: string, status: 'accepted' | 'rejected' | 'blocked') => {
    if (!isOnline) {
      Alert.alert('Offline', 'You must be online to respond to friend requests.');
      return;
    }
    try {
      setLoading(true);
      await respondToFriendRequest(requestId, status);
      await loadData();
      Alert.alert('Success', `Friend request ${status}!`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Searching
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setLoading(true);
      const found = await searchUsers(query.trim());
      setSearchResults(found);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (nickname: string) => {
    if (!isOnline) {
      Alert.alert('Offline', 'You must be online to send friend requests.');
      return;
    }
    try {
      setLoading(true);
      await sendFriendRequest(nickname);
      Alert.alert('Success', 'Friend request sent!');
      setShowSearchModal(false);
      setSearchQuery('');
      setSearchResults([]);
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Unfriend
  const handleUnfriend = async (friendId: string) => {
    if (!isOnline) {
      Alert.alert('Offline', 'You must be online to unfriend.');
      return;
    }
    try {
      setLoading(true);
      await removeFriend(friendId);
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Block
  const handleBlock = async (friendId: string) => {
    if (!isOnline) {
      Alert.alert('Offline', 'You must be online to block.');
      return;
    }
    try {
      setLoading(true);
      await blockUser(friendId);
      await loadData();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // Share
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on Stridekick! ${uniqueProfileLink}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  // Copy link
  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(uniqueProfileLink);
    Alert.alert('Success', 'Profile link copied to clipboard!');
  };

  return (
    <SharedLayout style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowShareModal(true)}
        >
          {/* Make button more visible with gradient background */}
          <LinearGradient
            colors={['#4776E6', '#8E54E9']}
            style={styles.gradientButton}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Tab with friend count */}
      <View style={styles.tabContainer}>
        <View style={styles.tabButton}>
          <Text style={styles.tabButtonText}>{friends.length} friends</Text>
          <View style={styles.activeIndicator} />
        </View>
      </View>

      {/* Search bar => opens modal on focus */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search friends"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => setShowSearchModal(true)}
        />
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Show errors */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pending friend requests (only if user is receiver) */}
        {friendRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FRIEND REQUESTS</Text>
            {friendRequests.map((req) => (
              <View key={req.id} style={styles.requestItem}>
                <Image
                  source={{ uri: generateAvatarUrl(req.sender?.nickname || 'User') }}
                  style={styles.avatar}
                />
                <View style={styles.requestInfo}>
                  <Text style={styles.requestName}>{req.sender?.nickname}</Text>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => handleRequestResponse(req.id, 'accepted')}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={['#4CAF50', '#2E7D32']}
                        style={styles.actionButtonGradient}
                      >
                        <Ionicons name="checkmark" size={16} color="#fff" style={{ marginRight: 4 }} />
                        <Text style={styles.actionButtonText}>Accept</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleRequestResponse(req.id, 'rejected')}
                      disabled={loading}
                    >
                      <LinearGradient
                        colors={['#F44336', '#C62828']}
                        style={styles.actionButtonGradient}
                      >
                        <Ionicons name="close" size={16} color="#fff" style={{ marginRight: 4 }} />
                        <Text style={styles.actionButtonText}>Reject</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Friend list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>YOUR FRIENDS</Text>
          {friends.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                You haven't added any friends yet.{'\n'}
                Share your profile or search for friends to get started!
              </Text>
            </View>
          ) : (
            friends.map((friend) => (
              <View key={friend.id} style={styles.friendItem}>
                <Image
                  source={{ uri: generateAvatarUrl(friend.friend?.nickname || 'User') }}
                  style={styles.avatar}
                />
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{friend.friend?.nickname}</Text>
                  <Text style={styles.friendEmail}>{friend.friend?.email}</Text>
                </View>
                {/* 3-dot menu: Unfriend / Block */}
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() =>
                    Alert.alert(
                      'Friend Options',
                      `Choose an action for ${friend.friend?.nickname}`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Unfriend',
                          style: 'destructive',
                          onPress: () => {
                            if (friend.friend?.id) handleUnfriend(friend.friend.id);
                          },
                        },
                        {
                          text: 'Block',
                          style: 'destructive',
                          onPress: () => {
                            if (friend.friend?.id) handleBlock(friend.friend.id);
                          },
                        },
                      ]
                    )
                  }
                >
                  <Ionicons name="ellipsis-vertical" size={20} color="#666" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* SHARE MODAL */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowShareModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowShareModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Share Profile Link</Text>
                  <TouchableOpacity
                    onPress={() => setShowShareModal(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color="#000" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalText}>
                  Share this unique link with friends to connect on CTP:
                </Text>
                <View style={styles.linkContainer}>
                  <Text style={styles.link} numberOfLines={1}>
                    {uniqueProfileLink}
                  </Text>
                  <TouchableOpacity 
                    style={styles.copyButton} 
                    onPress={copyToClipboard}
                  >
                    <LinearGradient
                      colors={['#4776E6', '#8E54E9']}
                      style={styles.copyButtonGradient}
                    >
                      <Text style={styles.copyButtonText}>Copy</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                  <LinearGradient
                    colors={['#4776E6', '#8E54E9']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.shareButtonGradient}
                  >
                    <Ionicons name="share-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.shareButtonText}>Share Link</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* SEARCH MODAL */}
      {showSearchModal && (
        <TouchableWithoutFeedback onPress={() => setShowSearchModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Find Friends</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setShowSearchModal(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color="#000" />
                  </TouchableOpacity>
                </View>
                <View style={styles.searchModalContainer}>
                  <TextInput
                    style={styles.searchModalInput}
                    placeholder="Search by nickname"
                    value={searchQuery}
                    onChangeText={(text) => {
                      setSearchQuery(text);
                      handleSearch(text);
                    }}
                    autoFocus
                  />
                </View>
                <ScrollView style={styles.searchResults}>
                  {loading ? (
                    <Text style={styles.searchMessage}>Searching...</Text>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((user) => {
                      // Already a friend?
                      const isFriend = friends.some((f) => f.friend_id === user.id);
                      // Pending request? (the SENDER sees "Pending")
                      const isPending = friendRequests.some(
                        (r) =>
                          (r.sender_id === user.id || r.receiver_id === user.id) &&
                          r.status === 'pending'
                      );
                      let actionComponent: JSX.Element | null = null;
                      if (isFriend) {
                        actionComponent = <Text style={styles.friendStatus}>Friends</Text>;
                      } else if (isPending) {
                        actionComponent = <Text style={styles.pendingStatus}>Pending</Text>;
                      } else {
                        actionComponent = (
                          <TouchableOpacity
                            style={styles.inviteButton}
                            onPress={() => handleSendRequest(user.nickname)}
                            disabled={loading}
                          >
                            <Text style={styles.inviteButtonText}>Invite</Text>
                          </TouchableOpacity>
                        );
                      }
                      return (
                        <View key={user.id} style={styles.searchResultItem}>
                          <Image
                            source={{ uri: generateAvatarUrl(user.nickname || 'User') }}
                            style={styles.searchResultAvatar}
                          />
                          <Text style={styles.searchResultName}>{user.nickname}</Text>
                          {isFriend ? (
                            <View style={styles.friendBadge}>
                              <Text style={styles.friendStatus}>Friends</Text>
                            </View>
                          ) : isPending ? (
                            <View style={styles.pendingBadge}>
                              <Text style={styles.pendingStatus}>Pending</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.inviteButton}
                              onPress={() => handleSendRequest(user.nickname)}
                              disabled={loading}
                            >
                              <LinearGradient
                                colors={['#4776E6', '#8E54E9']}
                                style={styles.inviteButtonGradient}
                              >
                                <Ionicons name="person-add" size={16} color="#fff" style={{ marginRight: 4 }} />
                                <Text style={styles.inviteButtonText}>Add Friend</Text>
                              </LinearGradient>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })
                  ) : searchQuery ? (
                    <Text style={styles.searchMessage}>No users found</Text>
                  ) : null}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}
    </SharedLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: { fontSize: 32, fontWeight: 'bold', color: '#333' },
  addButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  gradientButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  tabButton: {
    flex: 1, alignItems: 'center', paddingVertical: 15,
  },
  tabButtonText: { fontSize: 16, fontWeight: '600', color: '#333' },
  activeIndicator: {
    position: 'absolute', bottom: 0, width: '100%', height: 2, backgroundColor: '#333',
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    margin: 20, paddingHorizontal: 15, height: 45,
    backgroundColor: '#f5f5f5', borderRadius: 22.5,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#333' },
  content: { flex: 1 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 14, fontWeight: '600', color: '#666',
    marginHorizontal: 20, marginBottom: 10,
  },
  requestItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  requestInfo: { flex: 1, marginLeft: 15 },
  requestName: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  requestActions: { flexDirection: 'row', gap: 10 },
  actionButton: { 
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
  },
  actionButtonGradient: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: { 
    color: '#fff', 
    fontSize: 14,
    fontWeight: '600' 
  },
  acceptButton: {
    shadowColor: 'rgba(76, 175, 80, 0.5)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 3,
  },
  rejectButton: {
    shadowColor: 'rgba(244, 67, 54, 0.5)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 3,
  },
  friendItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  friendInfo: { flex: 1, marginLeft: 15 },
  friendName: { fontSize: 16, fontWeight: '600', color: '#333' },
  friendEmail: { fontSize: 14, color: '#666' },
  emptyState: { padding: 20, alignItems: 'center' },
  emptyStateText: { textAlign: 'center', color: '#666', lineHeight: 20 },
  errorContainer: {
    margin: 20, padding: 20, backgroundColor: '#FEE2E2', borderRadius: 10, alignItems: 'center',
  },
  errorText: { color: '#DC2626', marginBottom: 10, textAlign: 'center' },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
  },
  retryButtonText: { color: '#fff', fontWeight: '600' },
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  closeButton: { padding: 5 },
  modalText: { fontSize: 16, color: '#666', marginBottom: 20 },
  linkContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  link: { flex: 1, fontSize: 16, color: '#333', marginRight: 10 },
  copyButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  copyButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  copyButtonText: { color: '#fff', fontWeight: '600' },
  shareButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },
  shareButtonGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  shareButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  searchModalContainer: { marginBottom: 20 },
  searchModalInput: {
    backgroundColor: '#f5f5f5', borderRadius: 10, padding: 15, fontSize: 16, color: '#333',
  },
  searchResults: { maxHeight: 300 },
  searchMessage: { textAlign: 'center', color: '#666', padding: 20 },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchResultAvatar: { 
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 16,
  },
  searchResultName: { 
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  friendBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  friendStatus: { 
    color: '#4CAF50',
    fontWeight: '600',
    fontSize: 14,
  },
  pendingBadge: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pendingStatus: { 
    color: '#FF9800',
    fontWeight: '600',
    fontSize: 14,
  },
  inviteButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  inviteButtonGradient: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inviteButtonText: { 
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});