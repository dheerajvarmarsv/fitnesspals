// app/(tabs)/joinchallenges/joincreate.tsx

import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import SharedLayout from '../../../components/SharedLayout';
import { supabase } from '../../../lib/supabase';

import FilterModal from './challengesettingscomponents/FilterModal';
import FeaturedChallenges from './challengesettingscomponents/FeaturedChallenges';
import ChallengesList from './challengesettingscomponents/ChallengesList';

const { height } = Dimensions.get('window');

type ChallengeTab = 'active' | 'upcoming';
type FilterOption = 'all' | 'race' | 'survival' | 'streak' | 'custom';

export default function JoinCreateScreen() {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: false, // Hides the top bar
          }}
        />
        <JoinCreateContent />
      </>
    );
  }

function JoinCreateContent() {
  // 1) Define your filterOptions array
  const filterOptions: FilterOption[] = ['all', 'race', 'survival', 'streak', 'custom'];

  const [listTab, setListTab] = useState<ChallengeTab>('active');
  const [activeChallenges, setActiveChallenges] = useState<any[]>([]);
  const [upcomingChallenges, setUpcomingChallenges] = useState<any[]>([]);
  const [featuredChallenges, setFeaturedChallenges] = useState<any[]>([]);

  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState({ active: true, upcoming: true });
  const [refreshing, setRefreshing] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const translateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    fetchPublicChallenges();
  }, []);

  const fetchPublicChallenges = async () => {
    setLoading({ active: true, upcoming: true });
    try {
      const now = new Date().toISOString();

      // Active
      const { data: active, error: activeError } = await supabase
        .from('challenges')
        .select(`
          *,
          creator:profiles!challenges_creator_id_fkey (nickname, avatar_url),
          participant_count:challenge_participants (count)
        `)
        .eq('status', 'active')
        .eq('is_private', false)
        .lte('start_date', now)
        .or(`end_date.gt.${now},end_date.is.null`);
      if (activeError) throw activeError;
      setActiveChallenges(active || []);

      // Upcoming
      const { data: upcoming, error: upcomingError } = await supabase
        .from('challenges')
        .select(`
          *,
          creator:profiles!challenges_creator_id_fkey (nickname, avatar_url),
          participant_count:challenge_participants (count)
        `)
        .eq('status', 'active')
        .eq('is_private', false)
        .gt('start_date', now);
      if (upcomingError) throw upcomingError;
      setUpcomingChallenges(upcoming || []);

      // Featured => union active + upcoming, sort by participant_count desc
      const allFeatured = [...(active || []), ...(upcoming || [])];
      const sortedFeatured = allFeatured.sort((a, b) => {
        const countA = a.participant_count?.[0]?.count || 0;
        const countB = b.participant_count?.[0]?.count || 0;
        return countB - countA;
      });
      setFeaturedChallenges(sortedFeatured.slice(0, 5));
    } catch (err) {
      console.error('Error fetching public challenges:', err);
    } finally {
      setLoading({ active: false, upcoming: false });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPublicChallenges();
    setRefreshing(false);
  };

  const goToChallengeDetails = (challengeId: string) => {
    router.push(`/joinchallenges/challengedetails?challenge_id=${challengeId}`);
  };

  const renderEmptyChallengeState = (type: ChallengeTab) => {
    if (type === 'active') {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="run-fast" size={70} color="#ddd" />
          <Text style={styles.emptyTitle}>No active public challenges</Text>
          <Text style={styles.emptyText}>Check back later or create your own!</Text>
        </View>
      );
    }
    // upcoming
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="timer-outline" size={70} color="#ddd" />
        <Text style={styles.emptyTitle}>No upcoming public challenges</Text>
        <Text style={styles.emptyText}>Nothing scheduled yet, create your own!</Text>
      </View>
    );
  };

  return (
    <SharedLayout style={styles.container}>
<Animated.View style={[styles.header, { transform: [{ translateY }] }]}>
  {/* Left side: custom back button + title */}
  <View style={styles.leftHeader}>
    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
      <Ionicons name="chevron-back" size={24} color="#007AFF" />
    </TouchableOpacity>

    <Text style={styles.title}>Join / Create</Text>
  </View>

  {/* Right side: +Create button */}
  <TouchableOpacity
    style={styles.createButton}
    onPress={() => router.push('/joinchallenges/create')}
  >
    <LinearGradient
      colors={['#FF416C', '#FF4B2B']}
      style={styles.createButtonGradient}
    >
      <Ionicons name="add-circle-outline" size={20} color="#fff" />
      <Text style={styles.createButtonText}>Create</Text>
    </LinearGradient>
  </TouchableOpacity>
</Animated.View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {/* Featured */}
        {featuredChallenges.length > 0 && (
          <FeaturedChallenges
            featuredChallenges={featuredChallenges}
            goToChallengeDetails={goToChallengeDetails}
          />
        )}

        {/* Toggle row => 'active' or 'upcoming' */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, listTab === 'active' && styles.toggleButtonActive]}
            onPress={() => setListTab('active')}
          >
            <Text style={[styles.toggleButtonText, listTab === 'active' && styles.toggleButtonTextActive]}>
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, listTab === 'upcoming' && styles.toggleButtonActive]}
            onPress={() => setListTab('upcoming')}
          >
            <Text style={[styles.toggleButtonText, listTab === 'upcoming' && styles.toggleButtonTextActive]}>
              Upcoming
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search + Filter row */}


        {/* Bottom list => either active or upcoming */}
        {listTab === 'active' ? (
          <ChallengesList
            tabType="active"
            challenges={activeChallenges}
            loading={loading.active}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            showFilterModal={() => setShowFilterModal(true)}
            goToChallengeDetails={goToChallengeDetails}
            renderEmptyChallengeState={() => renderEmptyChallengeState('active')}
          />
        ) : (
          <ChallengesList
            tabType="upcoming"
            challenges={upcomingChallenges}
            loading={loading.upcoming}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            showFilterModal={() => setShowFilterModal(true)}
            goToChallengeDetails={goToChallengeDetails}
            renderEmptyChallengeState={() => renderEmptyChallengeState('upcoming')}
          />
        )}

        {/* bottom create button */}
        <View style={{ marginHorizontal: 20, marginVertical: 30 }}>
          <TouchableOpacity
            style={styles.bottomCreateButton}
            onPress={() => router.push('/joinchallenges/create')}
          >
            <LinearGradient
              colors={['#FF416C', '#FF4B2B']}
              style={styles.bottomCreateGradient}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.bottomCreateText}>Create a Challenge</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        // 2) Pass filterOptions array
        filterOptions={filterOptions}
        activeFilter={activeFilter}
        onChangeFilter={(f) => {
          setActiveFilter(f as FilterOption);
          setShowFilterModal(false);
        }}
      />
    </SharedLayout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Keep the create button on the far right
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    zIndex: 10,
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  createButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 6,
  },

  scrollContent: { flex: 1 },
  scrollContentContainer: { paddingBottom: 60 },

  toggleContainer: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  toggleButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
  },
  toggleButtonActive: {
    backgroundColor: '#4A90E2',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },

  searchFilterSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    marginLeft: 8,
    paddingVertical: 2,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  filterButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'capitalize',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginHorizontal: 40,
  },

  bottomCreateButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  bottomCreateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    justifyContent: 'center',
  },
  bottomCreateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});