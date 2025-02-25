// app/(tabs)/joinchallenges/challengesettings.tsx
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput
} from 'react-native';
import { router } from 'expo-router';
import SharedLayout from '../../../components/SharedLayout';
import { getActiveChallenges } from '../../../lib/challenges'; // Your existing fetch
import { supabase } from '../../../lib/supabase';

type TabType = 'active' | 'upcoming' | 'completed' | 'invited';

export default function JoinChallengesScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- NEW: invited challenges & local invite state
  const [invitedChallenges, setInvitedChallenges] = useState<any[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);

  // --- NEW: Invite Friends modal
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [friendsList, setFriendsList] = useState<any[]>([]); // store result from 'friends' or 'profiles'
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);

  useEffect(() => {
    // Trigger relevant fetches whenever activeTab changes
    if (activeTab === 'active') {
      fetchActiveChallenges();
    } else if (activeTab === 'upcoming') {
      fetchUpcomingChallenges();
    } else if (activeTab === 'completed') {
      fetchCompletedChallenges();
    } else if (activeTab === 'invited') {
      fetchInvitedChallenges();
    }
  }, [activeTab]);

  // EXISTING: fetch active
  async function fetchActiveChallenges() {
    setLoading(true);
    try {
      const data = await getActiveChallenges(); // your existing code
      setChallenges(data);
    } catch (err) {
      console.error('Error fetching active challenges:', err);
    } finally {
      setLoading(false);
    }
  }

  // STUB: fetch upcoming
  async function fetchUpcomingChallenges() {
    setLoading(true);
    try {
      // Replace with your existing logic to fetch upcoming
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .gt('start_date', new Date().toISOString());
      if (error) throw error;
      setChallenges(data || []);
    } catch (err) {
      console.error('Error fetching upcoming challenges:', err);
    } finally {
      setLoading(false);
    }
  }

  // STUB: fetch completed
  async function fetchCompletedChallenges() {
    setLoading(true);
    try {
      // Replace with your existing logic for “completed”
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .eq('status', 'completed'); 
      if (error) throw error;
      setChallenges(data || []);
    } catch (err) {
      console.error('Error fetching completed challenges:', err);
    } finally {
      setLoading(false);
    }
  }

  // NEW: fetch invited challenges
  async function fetchInvitedChallenges() {
    setInviteLoading(true);
    try {
      // Example query from your “challenge_invites” table 
      // where receiver_id = current user & status='pending'
      const userId = supabase.auth.getUser().then((res) => res.data.user?.id);
      // Wait for userId
      const uid = await userId; 
      if (!uid) return;

      const { data, error } = await supabase
        .from('challenge_invites')
        .select(`
          *,
          challenges ( title, start_date, end_date, mode, creator_id )
        `)
        .eq('receiver_id', uid)
        .eq('status', 'pending'); // or however you track “invited”
      if (error) throw error;
      setInvitedChallenges(data || []);
    } catch (err) {
      console.error('Error fetching invites:', err);
    } finally {
      setInviteLoading(false);
    }
  }

  // NEW: accept invite
  async function acceptInvite(inviteId: string, challengeId: string) {
    try {
      // 1) Update challenge_invites row to 'accepted'
      const { error: e1 } = await supabase
        .from('challenge_invites')
        .update({ status: 'accepted' })
        .eq('id', inviteId);
      if (e1) throw e1;

      // 2) Insert row into challenge_participants or update existing
      const userRes = await supabase.auth.getUser();
      const userId = userRes.data.user?.id;
      if (userId) {
        // check if there's an existing participant row
        await supabase
          .from('challenge_participants')
          .upsert({
            challenge_id: challengeId,
            user_id: userId,
            status: 'active', // or 'pending' if not started yet
            joined_at: new Date().toISOString(),
          });
      }
      // Refresh list
      fetchInvitedChallenges();
    } catch (err) {
      console.error('Error accepting invite:', err);
    }
  }

  // NEW: reject invite
  async function rejectInvite(inviteId: string) {
    try {
      const { error } = await supabase
        .from('challenge_invites')
        .update({ status: 'rejected' })
        .eq('id', inviteId);
      if (error) throw error;
      fetchInvitedChallenges();
    } catch (err) {
      console.error('Error rejecting invite:', err);
    }
  }

  // OLD: after user creates challenge, they can open a friend-invite modal
  function openInviteModal() {
    setInviteModalVisible(true);
    setSearchQuery('');
    setFriendsList([]);
  }
  function closeInviteModal() {
    setInviteModalVisible(false);
  }

  // fetch friend list from “friends” or “profiles” table
  async function fetchFriends(query: string) {
    setIsFriendsLoading(true);
    try {
      // Example: search in “profiles” by nickname 
      const { data, error } = await supabase
        .from('profiles')
        .select(`id, nickname`)
        .ilike('nickname', `%${query}%`)
        .limit(20);
      if (error) throw error;

      // For each friend, check if they’re already invited 
      // In real code, you might do a left join or a separate check. 
      // For brevity, we’ll do a minimal approach.

      // Or store invited status in “challenge_invites” if needed
      const mapped = data.map((f: any) => ({
        ...f,
        invited: false, // you’d do logic to see if “challenge_invites” has them 
      }));

      setFriendsList(mapped);
    } catch (err) {
      console.error('Error fetching friends:', err);
    } finally {
      setIsFriendsLoading(false);
    }
  }

  // invite friend
  async function inviteFriend(friendId: string) {
    try {
      // Suppose we have a single challenge you’re inviting to
      // For multiple, you’d adapt 
      const challengeId = 'SOME_CHALLENGE_ID'; // or store it from your context
      const userRes = await supabase.auth.getUser();
      const senderId = userRes.data.user?.id;
      if (!senderId) return;

      // Insert into challenge_invites
      const { error } = await supabase
        .from('challenge_invites')
        .insert({
          challenge_id: challengeId,
          sender_id: senderId,
          receiver_id: friendId,
          status: 'pending',
        });
      if (error) throw error;

      // Mark local
      const updatedFriends = friendsList.map((f) => {
        if (f.id === friendId) {
          return { ...f, invited: true };
        }
        return f;
      });
      setFriendsList(updatedFriends);
    } catch (err) {
      console.error('Error inviting friend:', err);
    }
  }

  // RENDERING: same structure as your existing code
  function renderActiveTab() {
    if (loading) {
      return (
        <View style={styles.loaderContainer}>
          <ActivityIndicator />
        </View>
      );
    }
    if (challenges.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No current challenges</Text>
          <Text style={styles.emptyStateText}>
            Join a new challenge or create{'\n'}your own challenge!
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => router.push('/joinchallenges/discover')}
            >
              <Text style={styles.joinButtonText}>Join challenge</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createButton2}
              onPress={() => router.push('/joinchallenges/create')}
            >
              <Text style={styles.createButtonText2}>Create challenge</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    // Render a list of active challenges
    return (
      <FlatList
        data={challenges}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.challengeCard}
            onPress={() => goToChallengeDetails(item.id)}
          >
            <Text style={styles.challengeTitle}>{item.title}</Text>
            <Text style={styles.challengeMode}>
              Mode: {item.challenge_type?.toUpperCase() || '(none)'}
            </Text>
            <Text style={styles.challengeDescription}>{item.description}</Text>
            <Text style={styles.challengeDates}>
              Start: {item.start_date || 'N/A'} | End: {item.end_date || 'Open-Ended'}
            </Text>
          </TouchableOpacity>
        )}
      />
    );
  }

  // If you want a simpler approach for upcoming/completed, you can do similarly or replicate your existing approach

  function renderEmptyState(tab: TabType) {
    if (tab === 'upcoming') {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No upcoming challenges</Text>
          <Text style={styles.emptyStateText}>
            Discover new challenges and{'\n'}plan your future goals!
          </Text>
          <TouchableOpacity
            style={styles.findButton}
            onPress={() => router.push('/joinchallenges/discover')}
          >
            <Text style={styles.findButtonText}>Find challenges</Text>
          </TouchableOpacity>
        </View>
      );
    } else if (tab === 'completed') {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No completed challenges</Text>
          <Text style={styles.emptyStateText}>
            Join challenges to track your{'\n'}achievements and progress!
          </Text>
          <TouchableOpacity
            style={styles.findButton}
            onPress={() => router.push('/joinchallenges/discover')}
          >
            <Text style={styles.findButtonText}>Find challenges</Text>
          </TouchableOpacity>
        </View>
      );
    }
    // fallback
    return null;
  }

  function goToChallengeDetails(challengeId: number | string) {
    router.push(`/joinchallenges/challengedetails?challenge_id=${challengeId}`);
  }

  // RENDER: upcoming/completed
  function renderGenericTab() {
    if (loading) {
      return (
        <View style={styles.loaderContainer}>
          <ActivityIndicator />
        </View>
      );
    }
    if (challenges.length === 0) {
      return renderEmptyState(activeTab);
    }
    return (
      <FlatList
        data={challenges}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.challengeCard}
            onPress={() => goToChallengeDetails(item.id)}
          >
            <Text style={styles.challengeTitle}>{item.title}</Text>
            <Text style={styles.challengeMode}>
              Mode: {item.challenge_type?.toUpperCase() || '(none)'}
            </Text>
            <Text style={styles.challengeDescription}>{item.description}</Text>
            <Text style={styles.challengeDates}>
              Start: {item.start_date || 'N/A'} | End: {item.end_date || 'Open-Ended'}
            </Text>
          </TouchableOpacity>
        )}
      />
    );
  }

  // NEW: “Invited” tab
  function renderInvitedTab() {
    if (inviteLoading) {
      return (
        <View style={styles.loaderContainer}>
          <ActivityIndicator />
        </View>
      );
    }
    if (invitedChallenges.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No invitations</Text>
          <Text style={styles.emptyStateText}>
            You have no pending invites.
          </Text>
          <TouchableOpacity
            style={styles.createButton2}
            onPress={openInviteModal}
          >
            <Text style={styles.createButtonText2}>Invite Friends</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <FlatList
        data={invitedChallenges}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const challenge = item.challenges; // from your select 
          return (
            <View style={styles.inviteCard}>
              <Text style={styles.challengeTitle}>{challenge?.title || 'Untitled'}</Text>
              <Text style={styles.challengeDates}>
                Start: {challenge?.start_date || 'N/A'} | End: {challenge?.end_date || 'Open-Ended'}
              </Text>
              <View style={styles.inviteButtonRow}>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => acceptInvite(item.id, item.challenge_id)}
                >
                  <Text style={{ color: '#fff' }}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => rejectInvite(item.id)}
                >
                  <Text style={{ color: '#fff' }}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />
    );
  }

  return (
    <SharedLayout style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Challenges</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/joinchallenges/create')}
        >
          <Text style={styles.addButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            Completed
          </Text>
        </TouchableOpacity>

        {/* NEW TAB: Invited */}
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'invited' && styles.activeTab]}
          onPress={() => setActiveTab('invited')}
        >
          <Text style={[styles.tabText, activeTab === 'invited' && styles.activeTabText]}>
            Invited
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'active' && renderActiveTab()}
        {activeTab === 'upcoming' && renderGenericTab()}
        {activeTab === 'completed' && renderGenericTab()}
        {activeTab === 'invited' && renderInvitedTab()}
      </View>

      {/* Invite Friends Modal */}
      <Modal
        visible={inviteModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeInviteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Friends</Text>
              <TouchableOpacity onPress={closeInviteModal}>
                <Text style={styles.modalClose}>X</Text>
              </TouchableOpacity>
            </View>

            {/* Search bar */}
            <TextInput
              style={styles.searchInput}
              placeholder="Search friends..."
              value={searchQuery}
              onChangeText={(txt) => {
                setSearchQuery(txt);
                fetchFriends(txt); // every time user types, search 
              }}
            />

            {isFriendsLoading ? (
              <ActivityIndicator style={{ marginTop: 10 }} />
            ) : (
              <FlatList
                data={friendsList}
                keyExtractor={(f) => f.id}
                style={{ marginTop: 10 }}
                renderItem={({ item }) => (
                  <View style={styles.friendRow}>
                    <Text style={styles.friendName}>{item.nickname || 'NoName'}</Text>
                    {item.invited ? (
                      <Text style={styles.alreadyInvitedText}>Invited</Text>
                    ) : (
                      <TouchableOpacity
                        style={styles.inviteButton}
                        onPress={() => inviteFriend(item.id)}
                      >
                        <Text style={{ color: '#fff' }}>Invite</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </SharedLayout>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20
  },
  title: { fontSize: 32, fontWeight: 'bold', color: '#333' },
  addButton: {
    backgroundColor: '#4A90E2', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  tabContainer: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee'
  },
  tabButton: {
    flex: 1, alignItems: 'center', paddingVertical: 15,
    borderBottomWidth: 2, borderBottomColor: 'transparent'
  },
  activeTab: { borderBottomColor: '#333' },
  tabText: { fontSize: 16, color: '#999', fontWeight: '500' },
  activeTabText: { color: '#333', fontWeight: '600' },
  content: { flex: 1 },
  emptyState: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, marginTop: 40
  },
  emptyStateTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  emptyStateText: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 30 },
  buttonContainer: { flexDirection: 'row', gap: 10 },
  joinButton: {
    backgroundColor: '#f5f5f5', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8
  },
  createButton2: {
    backgroundColor: '#4A90E2', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8
  },
  joinButtonText: { color: '#333', fontWeight: '600', fontSize: 16 },
  createButtonText2: { color: '#fff', fontWeight: '600', fontSize: 16 },
  findButton: {
    backgroundColor: '#4A90E2', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 8
  },
  findButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  challengeCard: {
    backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, marginBottom: 12
  },
  challengeTitle: {
    fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4
  },
  challengeMode: { fontSize: 14, color: '#888', marginBottom: 8 },
  challengeDescription: { fontSize: 14, color: '#666', marginBottom: 8 },
  challengeDates: { fontSize: 12, color: '#666' },

  // New styles for the “Invited” tab
  inviteCard: {
    backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, marginBottom: 12
  },
  inviteButtonRow: {
    flexDirection: 'row', gap: 10, marginTop: 10
  },
  acceptButton: {
    backgroundColor: '#4CAF50', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6
  },
  rejectButton: {
    backgroundColor: '#e74c3c', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6
  },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center'
  },
  modalContent: {
    backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 12,
    padding: 16, maxHeight: '80%'
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalClose: {
    fontSize: 18, color: '#e74c3c', fontWeight: '700'
  },
  searchInput: {
    backgroundColor: '#f2f2f2', borderRadius: 8, marginTop: 12,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 16
  },
  friendRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8
  },
  friendName: { fontSize: 16 },
  alreadyInvitedText: { color: '#666', fontStyle: 'italic' },
  inviteButton: {
    backgroundColor: '#4A90E2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8
  },
});

// For your final code, just copy/paste this entire file and adapt any table/column names as needed.