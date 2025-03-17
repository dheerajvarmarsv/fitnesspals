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
import { lightTheme as theme } from '../../../lib/theme';

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

      // Active challenges
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

      // Upcoming challenges
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

      // Featured challenges: union of active + upcoming sorted by participant count
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
          <MaterialCommunityIcons name="run-fast" size={70} color={theme.colors.textSecondary} />
          <Text style={styles.emptyTitle} adjustsFontSizeToFit>
            No active public challenges
          </Text>
          <Text style={styles.emptyText} adjustsFontSizeToFit>
            Check back later or create your own!
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="timer-outline" size={70} color={theme.colors.textSecondary} />
        <Text style={styles.emptyTitle} adjustsFontSizeToFit>
          No upcoming public challenges
        </Text>
        <Text style={styles.emptyText} adjustsFontSizeToFit>
          Nothing scheduled yet, create your own!
        </Text>
      </View>
    );
  };

  return (
    <SharedLayout style={styles.container}>
      <Animated.View style={[styles.header, { transform: [{ translateY }] }]}>
        <View style={styles.leftHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace('/(tabs)/joinchallenges/challengesettings')}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text style={styles.title} adjustsFontSizeToFit>
            Join / Create
          </Text>
        </View>
        <TouchableOpacity style={styles.createButton} onPress={() => router.push('/joinchallenges/create')}>
          <LinearGradient
            colors={theme.colors.gradientButton}
            style={styles.createButtonGradient}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.createButtonText} adjustsFontSizeToFit>
              Create
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        scrollEventThrottle={16}
        onScroll={(event) => {
          Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: false,
          })(event);
        }}
      >
        {featuredChallenges.length > 0 && (
          <FeaturedChallenges
            featuredChallenges={featuredChallenges}
            goToChallengeDetails={goToChallengeDetails}
          />
        )}

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, listTab === 'active' && styles.toggleButtonActive]}
            onPress={() => setListTab('active')}
          >
            <Text style={[styles.toggleButtonText, listTab === 'active' && styles.toggleButtonTextActive]} adjustsFontSizeToFit>
              Active
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, listTab === 'upcoming' && styles.toggleButtonActive]}
            onPress={() => setListTab('upcoming')}
          >
            <Text style={[styles.toggleButtonText, listTab === 'upcoming' && styles.toggleButtonTextActive]} adjustsFontSizeToFit>
              Upcoming
            </Text>
          </TouchableOpacity>
        </View>

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

        <View style={styles.bottomCreateContainer}>
          <TouchableOpacity style={styles.bottomCreateButton} onPress={() => router.push('/joinchallenges/create')}>
            <LinearGradient
              colors={theme.colors.gradientButton}
              style={styles.bottomCreateGradient}
            >
              <Ionicons name="add-circle-outline" size={20} color="#fff" />
              <Text style={styles.bottomCreateText} adjustsFontSizeToFit>
                Create a Challenge
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.medium,
    paddingTop: Platform.OS === 'ios' ? theme.spacing.medium : theme.spacing.medium,
    paddingBottom: theme.spacing.medium,
    backgroundColor: theme.colors.background,
    zIndex: 10,
  },
  leftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: theme.spacing.small,
  },
  title: {
    fontSize: theme.typography.heading.fontSize,
    fontWeight: theme.typography.heading.fontWeight,
    color: theme.colors.textPrimary,
  },
  createButton: {
    borderRadius: theme.radius.button,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.small,
    paddingHorizontal: theme.spacing.medium,
    borderRadius: theme.radius.button,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: theme.typography.body.fontSize,
    marginLeft: theme.spacing.small,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: theme.spacing.large,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: theme.spacing.small,
    borderRadius: theme.radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  toggleButton: {
    paddingHorizontal: theme.spacing.medium,
    paddingVertical: theme.spacing.small,
    backgroundColor: theme.colors.background,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleButtonText: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.large,
  },
  emptyTitle: {
    fontSize: theme.typography.heading.fontSize,
    fontWeight: theme.typography.heading.fontWeight,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.medium,
    marginBottom: theme.spacing.small,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: theme.typography.body.fontSize * 1.5,
    marginHorizontal: theme.spacing.medium,
  },
  bottomCreateContainer: {
    marginHorizontal: theme.spacing.medium,
    marginVertical: theme.spacing.large,
  },
  bottomCreateButton: {
    borderRadius: theme.radius.card,
    overflow: 'hidden',
  },
  bottomCreateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.medium,
    paddingHorizontal: theme.spacing.medium,
    borderRadius: theme.radius.card,
  },
  bottomCreateText: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: '#fff',
    marginLeft: theme.spacing.small,
  },
});

export default JoinCreateScreen;