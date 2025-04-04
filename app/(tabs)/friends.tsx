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
  ActivityIndicator,
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

  const uniqueProfileLink = `https://ctp.app/friend/${settings.nickname}`;

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

  const renderSearchResult = ({ item }: { item: any }) => {
    const getStatusDisplay = () => {
      switch (item.status) {
        case 'friend':
          return (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Already Friends</Text>
            </View>
          );
        case 'request_sent':
          return (
            <View style={[styles.statusBadge, { backgroundColor: '#F59E0B' }]}>
              <Text style={styles.statusText}>Request Sent</Text>
            </View>
          );
        case 'request_received':
          return (
            <View style={[styles.statusBadge, { backgroundColor: '#10B981' }]}>
              <Text style={styles.statusText}>Request Received</Text>
            </View>
          );
        default:
          return (
            <TouchableOpacity
              style={[styles.addFriendButton, { backgroundColor: '#4776E6' }]}
              onPress={() => handleSendRequest(item.nickname)}
              disabled={loading}
            >
              <Text style={styles.addFriendButtonText}>Add Friend</Text>
            </TouchableOpacity>
          );
      }
    };

    return (
      <View style={styles.searchResultItem}>
        <View style={styles.userInfo}>
          <Image
            source={{ uri: item.avatar_url || generateAvatarUrl(item.nickname) }}
            style={styles.searchAvatar}
          />
          <Text style={styles.searchNickname}>{item.nickname}</Text>
        </View>
        {getStatusDisplay()}
      </View>
    );
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
            <Text style={styles.addButtonText}>+ Invite</Text>
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

      {/* Search bar => now a button to avoid focus issues on macOS */}
      <TouchableOpacity 
        style={styles.searchContainer}
        onPress={() => setShowSearchModal(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <Text style={[styles.searchInput, { color: searchQuery ? '#333' : '#999' }]}>
          {searchQuery || "Search friends"}
        </Text>
      </TouchableOpacity>

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

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Find Friends</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSearchModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by exact nickname..."
                value={searchQuery}
                onChangeText={handleSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#4776E6" />
              </View>
            ) : searchResults.length === 0 && searchQuery.trim() !== '' ? (
              <View style={styles.centerContainer}>
                <Text style={styles.noResultsText}>No users found</Text>
              </View>
            ) : (
              <ScrollView style={styles.searchResults}>
                {searchResults.map((result) => (
                  <View key={result.id}>
                    {renderSearchResult({ item: result })}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
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
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  searchResults: {
    flex: 1,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  searchNickname: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#666666',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  addFriendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#4776E6',
  },
  addFriendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});