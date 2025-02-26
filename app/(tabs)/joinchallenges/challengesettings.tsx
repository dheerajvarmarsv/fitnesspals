// app/(tabs)/joinchallenges/challengesettings.tsx

import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import PagerView from 'react-native-pager-view';

import SharedLayout from '../../../components/SharedLayout';
import { supabase } from '../../../lib/supabase';

import FilterModal from './challengesettingscomponents/FilterModal';
import InvitesList from './challengesettingscomponents/InvitesList';
import ChallengesList from './challengesettingscomponents/ChallengesList';

const { height } = Dimensions.get('window');

type MainTab = 'yourChallenges' | 'invites';
type ChallengeTab = 'active' | 'upcoming' | 'completed';
type FilterOption = 'all' | 'race' | 'survival' | 'streak' | 'custom';

export default function YourChallengesScreen() {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('yourChallenges');
  const [activeChallengeTab, setActiveChallengeTab] = useState<ChallengeTab>('active');
  const challengePagerRef = useRef<PagerView>(null);

  const [activeChallenges, setActiveChallenges] = useState<any[]>([]);
  const [upcomingChallenges, setUpcomingChallenges] = useState<any[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<any[]>([]);
  const [invitedChallenges, setInvitedChallenges] = useState<any[]>([]);

  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState({
    active: true,
    upcoming: true,
    completed: true,
    invites: true,
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
    fetchYourChallenges();
    fetchInvitedChallenges();
  }, []);

  /**
   * We do "two sub-queries per tab" for both creator & participant:
   *   1) For end_date > now
   *   2) For end_date is null
   * Then union those results. This avoids .or(...) with date logic,
   * so we won't get parse errors. 
   */

  const fetchYourChallenges = async () => {
    setLoading((prev) => ({ ...prev, active: true, upcoming: true, completed: true }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const userId = user.id;
      const now = new Date().toISOString();

      // ========== HELPER to union two arrays by 'id' ========== 
      function unionById(arrA: any[], arrB: any[]) {
        const map = new Map<string, any>();
        [...arrA, ...arrB].forEach((ch) => {
          if (ch && ch.id) map.set(ch.id, ch);
        });
        return Array.from(map.values());
      }

      // ========== 1) CREATOR QUERIES ==========

      // *** ACTIVE: we do "status=active AND start_date <= now"
      //     then sub-queries for (end_date > now) and (end_date IS NULL),
      //     union them in memory.

      // (A) activeCreatorWithEnd
      const { data: activeCreatorWithEnd } = await supabase
        .from('challenges')
        .select('*, participant_count:challenge_participants (count)')
        .eq('creator_id', userId)
        .eq('status', 'active')
        .lte('start_date', now)
        .gt('end_date', now); // end_date > now

      // (B) activeCreatorOpenEnded
      const { data: activeCreatorOpen } = await supabase
        .from('challenges')
        .select('*, participant_count:challenge_participants (count)')
        .eq('creator_id', userId)
        .eq('status', 'active')
        .lte('start_date', now)
        .is('end_date', null);

      const finalActiveCreator = unionById(activeCreatorWithEnd || [], activeCreatorOpen || []);

      // *** UPCOMING: "status=active, start_date> now"
      const { data: upcomingCreator } = await supabase
        .from('challenges')
        .select('*, participant_count:challenge_participants (count)')
        .eq('creator_id', userId)
        .eq('status', 'active')
        .gt('start_date', now);

      // *** COMPLETED: "status=completed"
      const { data: completedCreator } = await supabase
        .from('challenges')
        .select('*, participant_count:challenge_participants (count)')
        .eq('creator_id', userId)
        .eq('status', 'completed');

      // ========== 2) PARTICIPANT QUERIES ==========

      // We'll query challenge_participants, then do sub-queries for active/upcoming/completed,
      // also splitting "end_date> now" vs "end_date is null" for "active."

      // *** ACTIVE (participant)
      // (A) end_date> now
      const { data: activePartRowsWithEnd } = await supabase
        .from('challenge_participants')
        .select(`
          challenge:challenges(
            *,
            participant_count:challenge_participants (count)
          )
        `)
        .eq('user_id', userId)
        .eq('challenge.status', 'active')
        .lte('challenge.start_date', now)
        .gt('challenge.end_date', now);

      // (B) end_date is null
      const { data: activePartRowsOpen } = await supabase
        .from('challenge_participants')
        .select(`
          challenge:challenges(
            *,
            participant_count:challenge_participants (count)
          )
        `)
        .eq('user_id', userId)
        .eq('challenge.status', 'active')
        .lte('challenge.start_date', now)
        .is('challenge.end_date', null);

      const activeParticipantWithEnd = (activePartRowsWithEnd || []).map((row) => row.challenge);
      const activeParticipantOpen = (activePartRowsOpen || []).map((row) => row.challenge);
      const finalActiveParticipant = unionById(activeParticipantWithEnd, activeParticipantOpen);

      // *** UPCOMING (participant): start_date> now
      const { data: upcomingPartRows } = await supabase
        .from('challenge_participants')
        .select(`
          challenge:challenges(
            *,
            participant_count:challenge_participants (count)
          )
        `)
        .eq('user_id', userId)
        .eq('challenge.status', 'active')
        .gt('challenge.start_date', now);

      const upcomingParticipant = (upcomingPartRows || []).map((row) => row.challenge);

      // *** COMPLETED (participant): status=completed
      const { data: completedPartRows } = await supabase
        .from('challenge_participants')
        .select(`
          challenge:challenges(
            *,
            participant_count:challenge_participants (count)
          )
        `)
        .eq('user_id', userId)
        .eq('challenge.status', 'completed');

      const completedParticipant = (completedPartRows || []).map((row) => row.challenge);

      // ========== MERGE CREATOR + PARTICIPANT for each tab ==========

      // Active
      const finalActive = unionById(finalActiveCreator || [], finalActiveParticipant || []);
      // Upcoming
      const finalUpcoming = unionById(upcomingCreator || [], upcomingParticipant || []);
      // Completed
      const finalCompleted = unionById(completedCreator || [], completedParticipant || []);

      // ========== Sort in memory ==========

      // Active => sort by created_at desc
      finalActive.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Upcoming => sort by start_date asc
      finalUpcoming.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

      // Completed => sort by end_date desc
      finalCompleted.sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());

      // ========== Store ==========

      setActiveChallenges(finalActive);
      setUpcomingChallenges(finalUpcoming);
      setCompletedChallenges(finalCompleted);

    } catch (err) {
      console.error('Error fetching your challenges:', err);
    } finally {
      setLoading((prev) => ({ ...prev, active: false, upcoming: false, completed: false }));
    }
  };

  const fetchInvitedChallenges = async () => {
    setLoading((prev) => ({ ...prev, invites: true }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('challenge_invites')
        .select(`
          id,
          challenge_id,
          sender_id,
          status,
          created_at,
          challenge:challenges(
            id,
            title,
            description,
            challenge_type,
            start_date,
            end_date,
            is_private
          ),
          sender:profiles!challenge_invites_sender_id_fkey(
            nickname,
            avatar_url
          )
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending');
      if (error) throw error;

      setInvitedChallenges(data || []);
    } catch (err) {
      console.error('Error fetching invites:', err);
    } finally {
      setLoading((prev) => ({ ...prev, invites: false }));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchYourChallenges(), fetchInvitedChallenges()]);
    setRefreshing(false);
  };

  const acceptInvite = async (inviteId: string, challengeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: updateError } = await supabase
        .from('challenge_invites')
        .update({ status: 'accepted' })
        .eq('id', inviteId);
      if (updateError) throw updateError;

      const { error: participantError } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: challengeId,
          user_id: user.id,
          status: 'active',
        });
      if (participantError) throw participantError;

      fetchInvitedChallenges();
      fetchYourChallenges();
    } catch (err) {
      console.error('Error accepting invitation:', err);
    }
  };

  const rejectInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('challenge_invites')
        .update({ status: 'rejected' })
        .eq('id', inviteId);
      if (error) throw error;
      fetchInvitedChallenges();
    } catch (err) {
      console.error('Error rejecting invitation:', err);
    }
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
      active: 'You have no active challenges',
      upcoming: 'No upcoming challenges',
      completed: 'No completed challenges yet',
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
            ? 'Start a new challenge or join one'
            : tabType === 'upcoming'
            ? 'Join challenges to see them here'
            : 'Complete challenges to see your achievements'}
        </Text>
      </View>
    );
  };

  const renderEmptyInvitesState = () => {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="email-outline" size={70} color="#ddd" />
        <Text style={styles.emptyTitle}>No Invitations</Text>
        <Text style={styles.emptyText}>
          You don't have any pending challenge invitations
        </Text>
      </View>
    );
  };

  return (
    <SharedLayout style={styles.container}>
      {/* Animated Header */}
      <Animated.View style={[styles.header, { transform: [{ translateY }] }]}>
        <Text style={styles.title}>Your Challenges</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/joinchallenges/joincreate')}
        >
          <LinearGradient
            colors={['#FF416C', '#FF4B2B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createButtonGradient}
          >
            <Text style={styles.createButtonText}>Join / Create</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.mainTabsContainer}>
        <View style={styles.mainTabHeader}>
          <TouchableOpacity
            style={[
              styles.mainTabButton,
              activeMainTab === 'yourChallenges' && styles.activeMainTabButton,
            ]}
            onPress={() => setActiveMainTab('yourChallenges')}
          >
            <Text
              style={[
                styles.mainTabText,
                activeMainTab === 'yourChallenges' && styles.activeMainTabText,
              ]}
            >
              Your Challenges
            </Text>
            {activeMainTab === 'yourChallenges' && (
              <View style={styles.mainTabIndicator} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.mainTabButton,
              activeMainTab === 'invites' && styles.activeMainTabButton,
            ]}
            onPress={() => setActiveMainTab('invites')}
          >
            <Text
              style={[
                styles.mainTabText,
                activeMainTab === 'invites' && styles.activeMainTabText,
              ]}
            >
              Invites
              {invitedChallenges.length > 0 && (
                <Text style={styles.inviteBadge}> {invitedChallenges.length}</Text>
              )}
            </Text>
            {activeMainTab === 'invites' && <View style={styles.mainTabIndicator} />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        {activeMainTab === 'yourChallenges' ? (
          <>
            <View style={styles.challengeTabsContainer}>
              <View style={styles.challengeTabHeader}>
                {challengeTabs.map((tab, index) => (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.challengeTabButton,
                      activeChallengeTab === tab && styles.activeChallengeTabButton,
                    ]}
                    onPress={() => handleChallengeTabChange(index)}
                  >
                    <Text
                      style={[
                        styles.challengeTabText,
                        activeChallengeTab === tab && styles.activeChallengeTabText,
                      ]}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                    {activeChallengeTab === tab && (
                      <View style={styles.challengeTabIndicator} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <PagerView
              ref={challengePagerRef}
              style={styles.challengePagerView}
              initialPage={0}
              onPageSelected={(e) =>
                setActiveChallengeTab(challengeTabs[e.nativeEvent.position])
              }
            >
              {challengeTabs.map((tab) => {
                const isLoading = loading[tab];
                let challengesData: any[] = [];
                if (tab === 'active') challengesData = activeChallenges;
                if (tab === 'upcoming') challengesData = upcomingChallenges;
                if (tab === 'completed') challengesData = completedChallenges;

                return (
                  <View key={tab} style={styles.pagerPage}>
                    <ChallengesList
                      tabType={tab}
                      challenges={challengesData}
                      loading={isLoading}
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
                );
              })}
            </PagerView>
          </>
        ) : (
          <InvitesList
            invitedChallenges={invitedChallenges}
            loading={loading.invites}
            onRefresh={fetchInvitedChallenges}
            acceptInvite={acceptInvite}
            rejectInvite={rejectInvite}
          />
        )}
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
    backgroundColor: '#fff',
  },
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
    fontSize: 28,
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
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  mainTabsContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    zIndex: 5,
  },
  mainTabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  mainTabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  activeMainTabButton: {},
  mainTabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999',
  },
  activeMainTabText: {
    color: '#333',
    fontWeight: '700',
  },
  mainTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 3,
    backgroundColor: '#333',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  inviteBadge: {
    color: '#FF4B2B',
    fontWeight: 'bold',
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
  activeChallengeTabButton: {},
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
    paddingBottom: 40,
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
});