// app/(tabs)/joinchallenges/challengesettings.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  Dimensions,
  RefreshControl,
  ScrollView,
  Animated,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import SharedLayout from '../../../components/SharedLayout';
import { supabase } from '../../../lib/supabase';
import PagerView from 'react-native-pager-view';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = height * 0.25;
const SPACING = 12;

// Main tabs
type MainTab = 'challenges' | 'invites';

// Challenge sub-tabs
type ChallengeTab = 'active' | 'upcoming' | 'completed';

// Filter options
type FilterOption = 'all' | 'race' | 'survival' | 'streak' | 'custom';

const GRADIENT_COLORS = {
  active: ['#FF416C', '#FF4B2B'],
  upcoming: ['#4776E6', '#8E54E9'],
  completed: ['#11998e', '#38ef7d'],
  invites: ['#F76B1C', '#FAD961'],
  race: ['#FF416C', '#FF4B2B'],
  survival: ['#4776E6', '#8E54E9'],
  streak: ['#FF8008', '#FFC837'],
  custom: ['#11998e', '#38ef7d'],
};

export default function JoinChallengesScreen() {
  // Main tab state
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('challenges');
  
  // Challenge sub-tab state
  const [activeChallengeTab, setActiveChallengeTab] = useState<ChallengeTab>('active');
  const challengePagerRef = useRef<PagerView>(null);
  
  // Challenge data
  const [activeChallenges, setActiveChallenges] = useState<any[]>([]);
  const [upcomingChallenges, setUpcomingChallenges] = useState<any[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<any[]>([]);
  const [invitedChallenges, setInvitedChallenges] = useState<any[]>([]);
  
  // Featured challenges (sorted by participant count)
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
    invites: true,
  });
  const [refreshing, setRefreshing] = useState(false);
  
  // Animation values
  const scrollY = useRef(new Animated.Value(0)).current;
  const translateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -50],
    extrapolate: 'clamp',
  });

  // Challenge sub-tabs array
  const challengeTabs: ChallengeTab[] = ['active', 'upcoming', 'completed'];
  
  // Filter options for the modal
  const filterOptions: FilterOption[] = ['all', 'race', 'survival', 'streak', 'custom'];

  // Current active carousel item
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  
  // Load data on mount
  useEffect(() => {
    fetchChallenges();
    fetchInvitedChallenges();
  }, []);

  // Fetch all challenge data
  const fetchChallenges = async () => {
    setLoading(prev => ({ ...prev, active: true, upcoming: true, completed: true }));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const now = new Date().toISOString();
      
      // Fetch active challenges (started, not completed)
      const { data: active, error: activeError } = await supabase
        .from('challenges')
        .select(`
          *,
          creator:profiles!challenges_creator_id_fkey (nickname, avatar_url),
          participant_count:challenge_participants (count)
        `)
        .lte('start_date', now)
        .or(`end_date.gt.${now},end_date.is.null`)
        .eq('status', 'active');
        
      if (activeError) throw activeError;
      
      // Sort challenges by participant count for featured section
      const sortedActive = [...(active || [])].sort((a, b) => {
        const countA = a.participant_count?.[0]?.count || 0;
        const countB = b.participant_count?.[0]?.count || 0;
        return countB - countA; // Sort in descending order
      });
      
      setActiveChallenges(active || []);
      setFeaturedChallenges(sortedActive.slice(0, 5)); // Get top 5 by participants
      
      // Fetch upcoming challenges (not started yet)
      const { data: upcoming, error: upcomingError } = await supabase
        .from('challenges')
        .select(`
          *,
          creator:profiles!challenges_creator_id_fkey (nickname, avatar_url),
          participant_count:challenge_participants (count)
        `)
        .gt('start_date', now)
        .eq('status', 'active');
      
      if (upcomingError) throw upcomingError;
      setUpcomingChallenges(upcoming || []);
      
      // Fetch completed challenges
      const { data: completed, error: completedError } = await supabase
        .from('challenges')
        .select(`
          *,
          creator:profiles!challenges_creator_id_fkey (nickname, avatar_url),
          participant_count:challenge_participants (count)
        `)
        .eq('status', 'completed');
        
      if (completedError) throw completedError;
      setCompletedChallenges(completed || []);
    } catch (err) {
      console.error('Error fetching challenges:', err);
    } finally {
      setLoading(prev => ({ ...prev, active: false, upcoming: false, completed: false }));
    }
  };

  // Fetch invited challenges
  const fetchInvitedChallenges = async () => {
    setLoading(prev => ({ ...prev, invites: true }));
    
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
      setLoading(prev => ({ ...prev, invites: false }));
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchChallenges(), fetchInvitedChallenges()]);
    setRefreshing(false);
  };

  // Accept a challenge invitation
  const acceptInvite = async (inviteId: string, challengeId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Update invite status
      const { error: updateError } = await supabase
        .from('challenge_invites')
        .update({ status: 'accepted' })
        .eq('id', inviteId);
        
      if (updateError) throw updateError;
      
      // Add user as participant
      const { error: participantError } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: challengeId,
          user_id: user.id,
          status: 'active',
        });
        
      if (participantError) throw participantError;
      
      // Refresh invites and challenges
      fetchInvitedChallenges();
      fetchChallenges();
    } catch (err) {
      console.error('Error accepting invitation:', err);
    }
  };

  // Reject a challenge invitation
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

  // Go to challenge details
  const goToChallengeDetails = (challengeId: string) => {
    router.push(`/joinchallenges/challengedetails?challenge_id=${challengeId}`);
  };

  // Handle challenge sub-tab change
  const handleChallengeTabChange = (index: number) => {
    setActiveChallengeTab(challengeTabs[index]);
    challengePagerRef.current?.setPage(index);
    // Reset filter when changing tabs
    setActiveFilter('all');
    setSearchQuery('');
  };

  // Handle filter change
  const handleFilterChange = (filter: FilterOption) => {
    setActiveFilter(filter);
    setShowFilterModal(false);
  };

  // Handle card viewport change
  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveCardIndex(viewableItems[0].index);
    }
  }, []);

  // Filter challenges based on current filter and search query
  const getFilteredChallenges = (challenges: any[], filter: FilterOption, query: string) => {
    return challenges.filter(challenge => {
      const matchesFilter = filter === 'all' || challenge.challenge_type === filter;
      const matchesSearch = query.trim() === '' || 
        challenge.title.toLowerCase().includes(query.toLowerCase()) ||
        (challenge.description && challenge.description.toLowerCase().includes(query.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  };

  // Render a featured challenge card
  const renderFeaturedCard = ({ item, index }: { item: any; index: number }) => {
    if (!item) return null;
    
    const startDate = item.start_date ? new Date(item.start_date).toLocaleDateString() : 'N/A';
    const endDate = item.end_date ? new Date(item.end_date).toLocaleDateString() : 'Open-ended';
    const participantCount = item.participant_count?.[0]?.count || 0;
    const isActive = index === activeCardIndex;
    
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[
          styles.featuredCard, 
          { width: CARD_WIDTH },
          isActive && styles.featuredCardActive
        ]}
        onPress={() => goToChallengeDetails(item.id)}
      >
        <LinearGradient
          colors={GRADIENT_COLORS[item.challenge_type] || GRADIENT_COLORS.active}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardBadgeContainer}>
            <Text style={styles.cardBadge}>{item.challenge_type?.toUpperCase()}</Text>
          </View>
          
          <View style={styles.cardContent}>
            <View style={styles.cardTitleContainer}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              {item.description && (
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
            </View>
            
            <View style={styles.cardParticipants}>
              <Ionicons name="people-outline" size={16} color="#fff" />
              <Text style={styles.participantText}>
                {participantCount} participant{participantCount !== 1 ? 's' : ''}
              </Text>
            </View>
            
            {item.creator && (
              <View style={styles.creatorInfo}>
                <Image 
                  source={{ uri: item.creator.avatar_url || 'https://via.placeholder.com/40' }} 
                  style={styles.creatorAvatar} 
                />
                <Text style={styles.creatorName} numberOfLines={1}>by {item.creator.nickname}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.cardFooter}>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={14} color="#fff" />
              <Text style={styles.dateText}>{startDate} - {endDate}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.detailsButton}
              onPress={() => goToChallengeDetails(item.id)}
            >
              <Text style={styles.detailsButtonText}>View Details</Text>
              <Ionicons name="chevron-forward" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // Render an invite card
  const renderInviteCard = ({ item }: { item: any }) => {
    if (!item.challenge) return null;
    
    const startDate = item.challenge.start_date 
      ? new Date(item.challenge.start_date).toLocaleDateString() 
      : 'N/A';
    const endDate = item.challenge.end_date 
      ? new Date(item.challenge.end_date).toLocaleDateString() 
      : 'Open-ended';
    
    return (
      <View style={styles.inviteCard}>
        <LinearGradient
          colors={GRADIENT_COLORS.invites}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.inviteCardGradient}
        >
          <View style={styles.inviteCardContent}>
            <View style={styles.inviteCardHeader}>
              <View style={styles.senderInfo}>
                <Image 
                  source={{ uri: item.sender?.avatar_url || 'https://via.placeholder.com/40' }} 
                  style={styles.senderAvatar} 
                />
                <Text style={styles.inviteText}>
                  <Text style={styles.senderName}>{item.sender?.nickname}</Text> invited you
                </Text>
              </View>
              <Text style={styles.challengeBadge}>
                {item.challenge.challenge_type?.toUpperCase()}
              </Text>
            </View>
            
            <Text style={styles.inviteChallengeTitle}>{item.challenge.title}</Text>
            
            {item.challenge.description && (
              <Text style={styles.inviteDescription} numberOfLines={2}>
                {item.challenge.description}
              </Text>
            )}
            
            <View style={styles.inviteDates}>
              <Ionicons name="calendar-outline" size={14} color="#fff" />
              <Text style={styles.inviteDateText}>{startDate} - {endDate}</Text>
            </View>
            
            <View style={styles.inviteActions}>
              <TouchableOpacity 
                style={styles.acceptButton}
                onPress={() => acceptInvite(item.id, item.challenge_id)}
              >
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.rejectButton}
                onPress={() => rejectInvite(item.id)}
              >
                <Text style={styles.rejectButtonText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  // Render empty state for a challenge tab
  const renderEmptyChallengeState = (tabType: ChallengeTab) => {
    const messages = {
      active: 'You have no active challenges',
      upcoming: 'No upcoming challenges',
      completed: 'No completed challenges yet'
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
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => tabType !== 'completed' 
            ? router.push('/joinchallenges/discover') 
            : handleChallengeTabChange(0)}
        >
          <LinearGradient
            colors={GRADIENT_COLORS[tabType]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.emptyButtonGradient}
          >
            <Text style={styles.emptyButtonText}>
              {tabType === 'completed' ? 'View Active Challenges' : 'Discover Challenges'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  // Render empty state for invites tab
  const renderEmptyInvitesState = () => {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="email-outline" size={70} color="#ddd" />
        <Text style={styles.emptyTitle}>No Invitations</Text>
        <Text style={styles.emptyText}>
          You don't have any pending challenge invitations
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => setActiveMainTab('challenges')}
        >
          <LinearGradient
            colors={GRADIENT_COLORS.invites}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.emptyButtonGradient}
          >
            <Text style={styles.emptyButtonText}>View Challenges</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  // Get challenges based on the active tab
  const getTabChallenges = (tabType: ChallengeTab) => {
    switch (tabType) {
      case 'active':
        return activeChallenges;
      case 'upcoming':
        return upcomingChallenges;
      case 'completed':
        return completedChallenges;
      default:
        return [];
    }
  };

  // Render pagination dots for featured carousel
  const renderPaginationDots = () => {
    return (
      <View style={styles.paginationContainer}>
        {featuredChallenges.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === activeCardIndex && styles.paginationDotActive
            ]}
          />
        ))}
      </View>
    );
  };

  // Render challenge list item
  const renderChallengeItem = ({ item }: { item: any }) => {
    const startDate = item.start_date ? new Date(item.start_date).toLocaleDateString() : 'N/A';
    const endDate = item.end_date ? new Date(item.end_date).toLocaleDateString() : 'Open-ended';
    const participantCount = item.participant_count?.[0]?.count || 0;
    
    return (
      <TouchableOpacity
        style={styles.challengeListItem}
        onPress={() => goToChallengeDetails(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.listItemLeft}>
          <View style={[
            styles.challengeTypeIndicator, 
            { backgroundColor: GRADIENT_COLORS[item.challenge_type] 
              ? GRADIENT_COLORS[item.challenge_type][0] 
              : GRADIENT_COLORS.active[0] 
            }
          ]} />
          <View style={styles.listItemContent}>
            <Text style={styles.listItemTitle} numberOfLines={1}>{item.title}</Text>
            {item.description && (
              <Text style={styles.listItemDescription} numberOfLines={1}>
                {item.description}
              </Text>
            )}
            <View style={styles.listItemMeta}>
              <Text style={styles.listItemDate}>
                {startDate} - {endDate}
              </Text>
              <Text style={styles.listItemParticipants}>
                {participantCount} participant{participantCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    );
  };

  // Render the filter options modal
  const renderFilterModal = () => {
    return (
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Filter Challenges</Text>
              
              {filterOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.filterOption,
                    activeFilter === option && styles.filterOptionActive
                  ]}
                  onPress={() => handleFilterChange(option)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    activeFilter === option && styles.filterOptionTextActive
                  ]}>
                    {option === 'all' ? 'All Types' : option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                  {activeFilter === option && (
                    <Ionicons name="checkmark" size={20} color="#4A90E2" />
                  )}
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.modalCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <SharedLayout style={styles.container}>
      {/* Animated Header */}
      <Animated.View 
        style={[
          styles.header,
          { transform: [{ translateY }] }
        ]}
      >
        <Text style={styles.title}>Challenges</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/joinchallenges/create')}
        >
          <LinearGradient
            colors={['#FF416C', '#FF4B2B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createButtonGradient}
          >
            <Text style={styles.createButtonText}>+ Create</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Main Tabs (Challenges/Invites) */}
      <View style={styles.mainTabsContainer}>
        <View style={styles.mainTabHeader}>
          <TouchableOpacity
            style={[
              styles.mainTabButton,
              activeMainTab === 'challenges' && styles.activeMainTabButton
            ]}
            onPress={() => setActiveMainTab('challenges')}
          >
            <Text style={[
              styles.mainTabText,
              activeMainTab === 'challenges' && styles.activeMainTabText
            ]}>
              Challenges
            </Text>
            {activeMainTab === 'challenges' && (
              <View style={styles.mainTabIndicator} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.mainTabButton,
              activeMainTab === 'invites' && styles.activeMainTabButton
            ]}
            onPress={() => setActiveMainTab('invites')}
          >
            <Text style={[
              styles.mainTabText,
              activeMainTab === 'invites' && styles.activeMainTabText
            ]}>
              Invites
              {invitedChallenges.length > 0 && (
                <Text style={styles.inviteBadge}> {invitedChallenges.length}</Text>
              )}
            </Text>
            {activeMainTab === 'invites' && (
              <View style={styles.mainTabIndicator} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
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
        {activeMainTab === 'challenges' ? (
          <>
            {/* Challenge Sub-Tabs */}
            <View style={styles.challengeTabsContainer}>
              <View style={styles.challengeTabHeader}>
                {challengeTabs.map((tab, index) => (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.challengeTabButton,
                      activeChallengeTab === tab && styles.activeChallengeTabButton
                    ]}
                    onPress={() => handleChallengeTabChange(index)}
                  >
                    <Text style={[
                      styles.challengeTabText,
                      activeChallengeTab === tab && styles.activeChallengeTabText
                    ]}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                    {activeChallengeTab === tab && (
                      <View style={styles.challengeTabIndicator} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Challenge Tab Content */}
            <PagerView
              ref={challengePagerRef}
              style={styles.challengePagerView}
              initialPage={0}
              onPageSelected={(e) => setActiveChallengeTab(challengeTabs[e.nativeEvent.position])}
            >
              {challengeTabs.map((tab) => {
                const challenges = getTabChallenges(tab);
                const isLoading = loading[tab];
                const filteredChallenges = getFilteredChallenges(challenges, activeFilter, searchQuery);
                
                // Special case for active tab with featured challenges
                if (tab === 'active') {
                  return (
                    <View key={tab} style={styles.pagerPage}>
                      {isLoading ? (
                        <View style={styles.loaderContainer}>
                          <ActivityIndicator size="large" color="#4A90E2" />
                          <Text style={styles.loaderText}>Loading challenges...</Text>
                        </View>
                      ) : challenges.length === 0 ? (
                        renderEmptyChallengeState(tab)
                      ) : (
                        <View style={styles.challengesContainer}>
                          {/* Featured section - only for active tab */}
                          {featuredChallenges.length > 0 && (
                            <View style={styles.featuredSection}>
                              <View style={styles.sectionTitleRow}>
                                <Text style={styles.sectionTitle}>FEATURED CHALLENGES</Text>
                                <Text style={styles.sectionSubtitle}>Most Popular</Text>
                              </View>
                              
                              <FlatList
                                ref={flatListRef}
                                data={featuredChallenges}
                                renderItem={renderFeaturedCard}
                                keyExtractor={(item) => `featured-${item.id}`}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                pagingEnabled
                                snapToInterval={CARD_WIDTH + SPACING}
                                decelerationRate="fast"
                                contentContainerStyle={styles.featuredList}
                                onViewableItemsChanged={handleViewableItemsChanged}
                                viewabilityConfig={{
                                  itemVisiblePercentThreshold: 50
                                }}
                              />
                              
                              {renderPaginationDots()}
                            </View>
                          )}
                          
                          {/* Search and filter section */}
                          <View style={styles.searchFilterSection}>
                            <View style={styles.searchContainer}>
                              <Ionicons name="search" size={18} color="#999" />
                              <TextInput
                                style={styles.searchInput}
                                placeholder="Search challenges..."
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholderTextColor="#999"
                              />
                            </View>
                            
                            <TouchableOpacity
                              style={styles.filterButton}
                              onPress={() => setShowFilterModal(true)}
                            >
                              <Ionicons name="filter" size={18} color="#fff" />
                              <Text style={styles.filterButtonText}>
                                {activeFilter === 'all' ? 'All' : activeFilter}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          
                          {/* All challenges list */}
                          <View style={styles.allChallengesSection}>
                            <View style={styles.sectionTitleRow}>
                              <Text style={styles.sectionTitle}>ALL CHALLENGES</Text>
                              {filteredChallenges.length > 0 && (
                                <Text style={styles.challengeCount}>
                                  {filteredChallenges.length} found
                                </Text>
                              )}
                            </View>
                            
                            {filteredChallenges.length === 0 ? (
                              <View style={styles.noResultsContainer}>
                                <MaterialCommunityIcons name="magnify-close" size={50} color="#ddd" />
                                <Text style={styles.noResultsText}>
                                  No challenges match your search
                                </Text>
                                <TouchableOpacity 
                                  style={styles.clearFilterButton}
                                  onPress={() => {
                                    setActiveFilter('all');
                                    setSearchQuery('');
                                  }}
                                >
                                  <Text style={styles.clearFilterButtonText}>Clear Filters</Text>
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <FlatList
                                data={filteredChallenges}
                                keyExtractor={(item) => `list-${item.id}`}
                                renderItem={renderChallengeItem}
                                scrollEnabled={false}
                                contentContainerStyle={styles.challengesList}
                              />
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                }
                
                // Upcoming and Completed tabs just show all challenges with search/filter
                return (
                  <View key={tab} style={styles.pagerPage}>
                    {isLoading ? (
                      <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color="#4A90E2" />
                        <Text style={styles.loaderText}>Loading challenges...</Text>
                      </View>
                    ) : challenges.length === 0 ? (
                      renderEmptyChallengeState(tab)
                    ) : (
                      <View style={styles.challengesContainer}>
                        {/* Search and filter section */}
                        <View style={styles.searchFilterSection}>
                          <View style={styles.searchContainer}>
                            <Ionicons name="search" size={18} color="#999" />
                            <TextInput
                              style={styles.searchInput}
                              placeholder="Search challenges..."
                              value={searchQuery}
                              onChangeText={setSearchQuery}
                              placeholderTextColor="#999"
                            />
                          </View>
                          
                          <TouchableOpacity
                            style={styles.filterButton}
                            onPress={() => setShowFilterModal(true)}
                          >
                            <Ionicons name="filter" size={18} color="#fff" />
                            <Text style={styles.filterButtonText}>
                              {activeFilter === 'all' ? 'All' : activeFilter}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        
                        <View style={styles.allChallengesSection}>
                          <View style={styles.sectionTitleRow}>
                            <Text style={styles.sectionTitle}>ALL CHALLENGES</Text>
                            {filteredChallenges.length > 0 && (
                              <Text style={styles.challengeCount}>
                                {filteredChallenges.length} found
                              </Text>
                            )}
                          </View>
                          
                          {filteredChallenges.length === 0 ? (
                            <View style={styles.noResultsContainer}>
                              <MaterialCommunityIcons name="magnify-close" size={50} color="#ddd" />
                              <Text style={styles.noResultsText}>
                                No challenges match your search
                              </Text>
                              <TouchableOpacity 
                                style={styles.clearFilterButton}
                                onPress={() => {
                                  setActiveFilter('all');
                                  setSearchQuery('');
                                }}
                              >
                                <Text style={styles.clearFilterButtonText}>Clear Filters</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <FlatList
                              data={filteredChallenges}
                              keyExtractor={(item) => `list-${item.id}`}
                              renderItem={renderChallengeItem}
                              scrollEnabled={false}
                              contentContainerStyle={styles.challengesList}
                            />
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </PagerView>
          </>
        ) : (
          // Invites Tab Content
          <View style={styles.invitesTabContent}>
            {loading.invites ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#4A90E2" />
                <Text style={styles.loaderText}>Loading invitations...</Text>
              </View>
            ) : invitedChallenges.length === 0 ? (
              renderEmptyInvitesState()
            ) : (
              <View style={styles.invitesContainer}>
                <Text style={styles.sectionTitle}>PENDING INVITATIONS</Text>
                <FlatList
                  data={invitedChallenges}
                  renderItem={renderInviteCard}
                  keyExtractor={(item) => `invite-${item.id}`}
                  scrollEnabled={false}
                  contentContainerStyle={styles.invitesList}
                />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      {renderFilterModal()}
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
    fontFamily: Platform.select({
      ios: 'Avenir-Heavy',
      android: 'sans-serif-medium',
    }),
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
  
  // Main Tabs (Challenges/Invites)
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
  
  // Challenge Sub-Tabs
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
  
  // Scroll Content
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
  
  // Tab Content
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loaderText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  challengesContainer: {
    flex: 1,
    paddingTop: 20,
  },
  invitesTabContent: { 
    flex: 1, 
    paddingTop: 20,
  },
  invitesContainer: {
    flex: 1,
  },
  
  // Empty State
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
  emptyButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  
  // Search and Filter
  searchFilterSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
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
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 20,
  },
  clearFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  clearFilterButtonText: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  
  // Featured Cards
  featuredSection: {
    marginBottom: 30,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    letterSpacing: 1,
    fontFamily: Platform.select({
      ios: 'Avenir-Black',
      android: 'sans-serif-black',
    }),
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  challengeCount: {
    fontSize: 12,
    color: '#888',
  },
  featuredList: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  featuredCard: {
    borderRadius: 16,
    height: CARD_HEIGHT,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginRight: SPACING,
  },
  featuredCardActive: {
    transform: [{ scale: 1.02 }],
  },
  cardGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  cardBadgeContainer: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  cardBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
    fontFamily: Platform.select({
      ios: 'Avenir-Medium',
      android: 'sans-serif-medium',
    }),
  },
  cardContent: {
    flex: 1,
  },
  cardTitleContainer: {
    flex: 1,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
    fontFamily: Platform.select({
      ios: 'Avenir-Black',
      android: 'sans-serif-black',
    }),
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  cardParticipants: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  participantText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  creatorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  creatorName: {
    fontSize: 12,
    color: '#fff',
    maxWidth: 150,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 6,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
  },
  detailsButtonText: {
    fontSize: 12,
    color: '#fff',
    marginRight: 2,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#4A90E2',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  
  // List Challenges
  allChallengesSection: {
    flex: 1,
  },
  challengesList: {
    paddingHorizontal: 20,
  },
  challengeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  listItemLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 10,
  },
  challengeTypeIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  listItemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  listItemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemDate: {
    fontSize: 12,
    color: '#888',
  },
  listItemParticipants: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: '500',
  },
  
  // Invited Challenges
  invitesList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  inviteCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
  },
  inviteCardGradient: {
    borderRadius: 16,
  },
  inviteCardContent: {
    padding: 16,
  },
  inviteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  inviteText: {
    fontSize: 14,
    color: '#fff',
  },
  senderName: {
    fontWeight: 'bold',
  },
  challengeBadge: {
    fontSize: 12,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  inviteChallengeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  inviteDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
  },
  inviteDates: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inviteDateText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 6,
  },
  inviteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  acceptButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  rejectButton: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rejectButtonText: {
    color: '#fff',
  },
  
  // Filter Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterOptionActive: {
    backgroundColor: '#f0f8ff',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#333',
  },
  filterOptionTextActive: {
    color: '#4A90E2',
    fontWeight: '600',
  },
  modalCloseButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  modalCloseButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
}); 