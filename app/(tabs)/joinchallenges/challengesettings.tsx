// challengesettings.tsx
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import SharedLayout from '../../../components/SharedLayout';
import { getActiveChallenges } from '../../../lib/challenges';

type TabType = 'active' | 'upcoming' | 'completed';

export default function JoinChallengesScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'active') {
      fetchActiveChallenges();
    }
  }, [activeTab]);

  async function fetchActiveChallenges() {
    setLoading(true);
    try {
      const data = await getActiveChallenges();
      setChallenges(data);
    } catch (err) {
      console.error('Error fetching active challenges:', err);
    } finally {
      setLoading(false);
    }
  }

  function goToChallengeDetails(challengeId: number) {
    console.log('Go to challenge details:', challengeId);
    // e.g. router.push(`/challenge/${challengeId}`);
  }

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
              style={styles.createButton}
              onPress={() => router.push('/joinchallenges/create')}
            >
              <Text style={styles.createButtonText}>Create challenge</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
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
              Mode: {item.mode?.toUpperCase() || '(none)'}
            </Text>
            <Text style={styles.challengeDescription}>{item.description}</Text>
            <Text style={styles.challengeDates}>
              Start: {item.start_date || 'N/A'}  |  End: {item.end_date || 'Open-Ended'}
            </Text>
          </TouchableOpacity>
        )}
      />
    );
  }

  function renderEmptyState() {
    switch (activeTab) {
      case 'upcoming':
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
      case 'completed':
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
      default:
        return null;
    }
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
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'active' ? renderActiveTab() : renderEmptyState()}
      </View>
    </SharedLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#333' },
  addButton: { backgroundColor: '#4A90E2', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: 15 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#333' },
  tabText: { fontSize: 16, color: '#999', fontWeight: '500' },
  activeTabText: { color: '#333', fontWeight: '600' },
  content: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, marginTop: 40 },
  emptyStateTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  emptyStateText: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 30 },
  buttonContainer: { flexDirection: 'row', gap: 10 },
  joinButton: { backgroundColor: '#f5f5f5', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  createButton: { backgroundColor: '#4A90E2', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  joinButtonText: { color: '#333', fontWeight: '600', fontSize: 16 },
  createButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  findButton: { backgroundColor: '#4A90E2', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 8 },
  findButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  challengeCard: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, marginBottom: 12 },
  challengeTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  challengeMode: { fontSize: 14, color: '#888', marginBottom: 8 },
  challengeDescription: { fontSize: 14, color: '#666', marginBottom: 8 },
  challengeDates: { fontSize: 12, color: '#666' },
});

//this is the stable version