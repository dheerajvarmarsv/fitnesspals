// app/(tabs)/joinchallenges/joincreate.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import PagerView from 'react-native-pager-view';

import SharedLayout from '../../../components/SharedLayout';
import { supabase } from '../../../lib/supabase';

// Re-use sub-components:
import FilterModal from './challengesettingscomponents/FilterModal';
import FeaturedChallenges from './challengesettingscomponents/FeaturedChallenges';
import ChallengesList from './challengesettingscomponents/ChallengesList';

const { height } = Dimensions.get('window');

type ChallengeTab = 'active' | 'upcoming' | 'completed';
type FilterOption = 'all' | 'race' | 'survival' | 'streak' | 'custom';

export default function JoinCreateScreen() {
  const [activeChallengeTab, setActiveChallengeTab] = useState<ChallengeTab>('active');
  const challengePagerRef = useRef<PagerView>(null);

  // Challenge data
  const [activeChallenges, setActiveChallenges] = useState<any[]>([]);
  const [upcomingChallenges, setUpcomingChallenges] = useState<any[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<any[]>([]);
  const [featuredChallenges, setFeaturedChallenges] = useState<any[]>([]);

  // Filter state
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Loading states
  const [loading, setLoading] = useState({
    active: true,
    upcoming: true,
    completed: true,
  });
  const [refreshing, setRefreshing] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const translateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });

  const challengeTabs: ChallengeTab[] = ['active', 'upcoming', 'completed'];
  const filterOptions: FilterOption[] = ['all', 'race', 'survival', 'streak', 'custom'];

  useEffect(() => {
    fetchPublicChallenges();
  }, []);

  // Fetch all public challenges
  const fetchPublicChallenges = async () => {
    setLoading((prev) => ({ ...prev, active: true, upcoming: true, completed: true }));
    try {
      const now = new Date().toISOString();

      // 1) Active => status=active, is_private=false, start_date<= now, end_date not passed
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

      // Sort by participant count => featured
      const sortedActive = [...(active || [])].sort((a, b) => {
        const countA = a.participant_count?.[0]?.count || 0;
        const countB = b.participant_count?.[0]?.count || 0;
        return countB - countA;
      });
      setActiveChallenges(active || []);
      setFeaturedChallenges(sortedActive.slice(0, 5));

      // 2) Upcoming => status=active, is_private=false, start_date> now
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

      // 3) Completed => status=completed, is_private=false
      const { data: completed, error: completedError } = await supabase
        .from('challenges')
        .select(`
          *,
          creator:profiles!challenges_creator_id_fkey (nickname, avatar_url),
          participant_count:challenge_participants (count)
        `)
        .eq('status', 'completed')
        .eq('is_private', false);
      if (completedError) throw completedError;
      setCompletedChallenges(completed || []);
    } catch (err) {
      console.error('Error fetching public challenges:', err);
    } finally {
      setLoading((prev) => ({ ...prev, active: false, upcoming: false, completed: false }));
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

  const handleChallengeTabChange = (index: number) => {
    setActiveChallengeTab(challengeTabs[index]);
    challengePagerRef.current?.setPage(index);
    setActiveFilter('all');
    setSearchQuery('');
  };

  const renderEmptyChallengeState = (tabType: ChallengeTab) => {
    const messages = {
      active: 'No active public challenges at the moment',
      upcoming: 'No upcoming public challenges',
      completed: 'No completed public challenges yet',
    };
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name={tabType === 'completed' ? 'trophy-outline' : 'run-fast'}
          size={70}
          color="#ddd"
        />
        <Text style={styles.emptyTitle}>{messages[tabType]}</Text>
        <Text style={styles.emptyText}>
          {tabType === 'active'
            ? 'Check back later or create your own challenge'
            : tabType === 'upcoming'
            ? 'No upcoming challenges found'
            : 'No completed challenges to show'}
        </Text>
      </View>
    );
  };

  return (
    <SharedLayout style={styles.container}>
      {/* Animated Header */}
      <Animated.View style={[styles.header, { transform: [{ translateY }] }]}>
        <Text style={styles.title}>Join / Create</Text>
        {/* Top create button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/joinchallenges/create')}
        >
          <LinearGradient
            colors={['#FF416C', '#FF4B2B']}
            style={styles.createButtonGradient}
          >
            <Text style={styles.createButtonText}>+ Create</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Sub-Tabs: Active, Upcoming, Completed (Public) */}
      <View style={styles.challengeTabsContainer}>
        <View style={styles.challengeTabHeader}>
          {challengeTabs.map((tab, index) => (
            <TouchableOpacity
              key={tab}
              style={[styles.challengeTabButton]}
              onPress={() => handleChallengeTabChange(index)}
            >
              <Text
                style={[
                  styles.challengeTabText,
                  tab === challengeTabs[index] && styles.activeChallengeTabText
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              {tab === challengeTabs[index] && (
                <View style={styles.challengeTabIndicator} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

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
        <PagerView
          ref={challengePagerRef}
          style={styles.challengePagerView}
          initialPage={0}
          onPageSelected={(e) => setActiveChallengeTab(challengeTabs[e.nativeEvent.position])}
        >
          {/* Active tab => show featured + search/filter + list */}
          <View key="active" style={styles.pagerPage}>
            {featuredChallenges.length > 0 && (
              <FeaturedChallenges
                featuredChallenges={featuredChallenges}
                goToChallengeDetails={goToChallengeDetails}
              />
            )}
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
              renderEmptyChallengeState={renderEmptyChallengeState}
            />
          </View>

          {/* Upcoming */}
          <View key="upcoming" style={styles.pagerPage}>
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
              renderEmptyChallengeState={renderEmptyChallengeState}
            />
          </View>

          {/* Completed */}
          <View key="completed" style={styles.pagerPage}>
            <ChallengesList
              tabType="completed"
              challenges={completedChallenges}
              loading={loading.completed}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              activeFilter={activeFilter}
              setActiveFilter={setActiveFilter}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              showFilterModal={() => setShowFilterModal(true)}
              goToChallengeDetails={goToChallengeDetails}
              renderEmptyChallengeState={renderEmptyChallengeState}
            />
          </View>
        </PagerView>

        {/* BOTTOM create button */}
        <View style={{ margin: 20, marginTop: 30 }}>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    zIndex: 10,
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 6,
  },

  challengeTabsContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  challengeTabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  challengeTabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  challengeTabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#999',
  },
  activeChallengeTabText: {
    color: '#333',
    fontWeight: '700',
  },
  challengeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 2,
    backgroundColor: '#333',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },

  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 60,
  },
  challengePagerView: {
    minHeight: height * 0.7,
  },
  pagerPage: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
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