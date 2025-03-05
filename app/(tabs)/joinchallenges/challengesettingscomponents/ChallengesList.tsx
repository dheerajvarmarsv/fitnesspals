import React, { useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChallengesListProps {
  tabType: 'active' | 'upcoming' | 'completed';
  challenges: any[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showFilterModal: () => void;
  goToChallengeDetails: (challengeId: string) => void;
  renderEmptyChallengeState: (tabType: 'active' | 'upcoming' | 'completed') => JSX.Element;
  // New props for edit mode
  isEditMode?: boolean;
  selectedChallenges?: string[];
  onToggleSelectChallenge?: (challengeId: string) => void;
  onEnterEditMode?: () => void;
}

export default function ChallengesList({
  tabType,
  challenges,
  loading,
  refreshing,
  onRefresh,
  activeFilter,
  setActiveFilter,
  searchQuery,
  setSearchQuery,
  showFilterModal,
  goToChallengeDetails,
  renderEmptyChallengeState,
  isEditMode = false,
  selectedChallenges = [],
  onToggleSelectChallenge = () => {},
  onEnterEditMode = () => {},
}: ChallengesListProps) {
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  if (isEditMode) {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnimation, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: -1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ])
    ).start();
  } else {
    shakeAnimation.stopAnimation();
    shakeAnimation.setValue(0);
  }

  const getFilteredChallenges = useCallback(
    (all: any[], filter: string, query: string) => {
      return all.filter((challenge) => {
        const matchesFilter = filter === 'all' || challenge.challenge_type === filter;
        const lowerTitle = challenge.title?.toLowerCase() || '';
        const lowerDesc = challenge.description?.toLowerCase() || '';
        const lowerQuery = query.toLowerCase();
        return matchesFilter && (!query.trim() || lowerTitle.includes(lowerQuery) || lowerDesc.includes(lowerQuery));
      });
    },
    []
  );

  const filteredChallenges = getFilteredChallenges(challenges, activeFilter, searchQuery);

  const renderChallengeItem = ({ item }: { item: any }) => {
    const startDate = item.start_date ? new Date(item.start_date).toLocaleDateString() : 'N/A';
    const endDate = item.end_date ? new Date(item.end_date).toLocaleDateString() : 'Open-ended';
    // Safely extract participant count (if it's an array with a "count" key, use that)
    const participantCount =
      Array.isArray(item.participant_count) && item.participant_count.length > 0
        ? item.participant_count[0].count
        : item.participant_count || 0;
    const isSelected = selectedChallenges.includes(item.id);

    const onItemPress = () => {
      if (isEditMode) {
        onToggleSelectChallenge(item.id);
      } else {
        goToChallengeDetails(item.id);
      }
    };

    return (
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f8f9fa',
            padding: 16,
            borderRadius: 12,
            marginBottom: 12,
          },
          isEditMode && {
            transform: [
              {
                rotate: shakeAnimation.interpolate({
                  inputRange: [-1, 1],
                  outputRange: ['-2deg', '2deg'],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          onPress={onItemPress}
          onLongPress={() => {
            if (!isEditMode) {
              onEnterEditMode();
              onToggleSelectChallenge(item.id);
            }
          }}
          delayLongPress={300}
          activeOpacity={0.7}
          style={{ flexDirection: 'row', flex: 1, marginRight: 10 }}
        >
          {isEditMode && (
            <View style={{ marginRight: 12 }}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: '#ddd',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isSelected ? '#4A90E2' : '#fff',
                }}
              >
                {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {item.description && (
              <Text style={styles.itemDesc} numberOfLines={1}>
                {item.description}
              </Text>
            )}
            <View style={styles.itemInfo}>
              <Text style={styles.itemDates}>
                {startDate} - {endDate}
              </Text>
              <Text style={styles.itemParticipants}>
                {participantCount} participant{participantCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        {!isEditMode && <Ionicons name="chevron-forward" size={20} color="#999" />}
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>Loading challenges...</Text>
      </View>
    );
  }

  if (challenges.length === 0) {
    return renderEmptyChallengeState(tabType);
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search challenges..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={showFilterModal}>
          <Ionicons name="filter" size={18} color="#fff" />
          <Text style={styles.filterButtonText}>
            {activeFilter === 'all' ? 'All' : activeFilter}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1 }}>
        <FlatList
          data={filteredChallenges}
          keyExtractor={(item) => `list-${item.id}`}
          renderItem={renderChallengeItem}
          scrollEnabled={false}
          contentContainerStyle={styles.flatListContainer}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  itemDesc: { fontSize: 14, color: '#666', marginBottom: 6 },
  itemInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemDates: { fontSize: 12, color: '#888' },
  itemParticipants: { fontSize: 12, color: '#4A90E2', fontWeight: '500' },
  loadingContainer: { flex: 1, paddingVertical: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666', fontSize: 16 },
  searchFilterContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, alignItems: 'center' },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#333', marginLeft: 8, paddingVertical: 2 },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A90E2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  filterButtonText: { color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 6, textTransform: 'capitalize' },
  flatListContainer: { paddingHorizontal: 20 },
  loadingContainer: { flex: 1, paddingVertical: 40, alignItems: 'center' },
});