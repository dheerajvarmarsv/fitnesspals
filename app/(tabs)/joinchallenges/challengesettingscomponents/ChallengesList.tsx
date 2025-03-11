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
// 1) Import your theme
import { theme } from '../../../../lib/theme'; // <-- Adjust the path as needed

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

  // If editing, start the shake animation
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

  // Filter logic is unchanged
  const getFilteredChallenges = useCallback(
    (all: any[], filter: string, query: string) => {
      return all.filter((challenge) => {
        const matchesFilter = filter === 'all' || challenge.challenge_type === filter;
        const lowerTitle = challenge.title?.toLowerCase() || '';
        const lowerDesc = challenge.description?.toLowerCase() || '';
        const lowerQuery = query.toLowerCase();
        return (
          matchesFilter &&
          (!query.trim() || lowerTitle.includes(lowerQuery) || lowerDesc.includes(lowerQuery))
        );
      });
    },
    []
  );

  const filteredChallenges = getFilteredChallenges(challenges, activeFilter, searchQuery);

  const renderChallengeItem = ({ item }: { item: any }) => {
    const startDate = item.start_date ? new Date(item.start_date).toLocaleDateString() : 'N/A';
    const endDate = item.end_date ? new Date(item.end_date).toLocaleDateString() : 'Open-ended';
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
          styles.cardContainer,
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
          style={styles.challengeCard}
        >
          {isEditMode && (
            <View style={styles.checkboxContainer}>
              <View
                style={[
                  styles.checkbox,
                  isSelected && styles.checkboxSelected,
                ]}
              >
                {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
            </View>
          )}

          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.challengeTitle}>{item.title}</Text>
              <View style={styles.challengeTypeBadge}>
                <Text style={styles.challengeTypeText}>
                  {item.challenge_type?.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.datesText}>
              {startDate} - {endDate}
            </Text>
            <Text style={styles.participantsText}>
              {participantCount} participant{participantCount !== 1 ? 's' : ''}
            </Text>
          </View>

          {!isEditMode && (
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textSecondary}
              style={styles.chevron}
            />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Loading / Empty states
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
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

// 2) Create styles referencing values from the theme
const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: theme.spacing.small, // e.g. 8
  },
  challengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.medium, // e.g. 16
    backgroundColor: theme.colors.glassCardBg, // e.g. '#E6F2FF'
    borderRadius: theme.radius.card, // e.g. 16
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    ...theme.card.challengeHeader,
    // e.g. {
    //   flexDirection: 'row',
    //   justifyContent: 'space-between',
    //   alignItems: 'center',
    //   marginBottom: 8,
    // }
  },
  challengeTitle: {
    ...theme.card.challengeTitle,
    // e.g. {
    //   fontSize: 16,
    //   fontWeight: '700',
    //   color: '#333333',
    //   marginRight: 8,
    //   flex: 1,
    // }
    // Override if you need bigger text:
    // fontSize: 20,
  },
  challengeTypeBadge: {
    ...theme.card.challengeTypeBadge,
    // e.g. {
    //   backgroundColor: 'rgba(74,144,226,0.1)',
    //   borderRadius: 12,
    //   paddingHorizontal: 8,
    //   paddingVertical: 4,
    // }
  },
  challengeTypeText: {
    ...theme.card.challengeTypeText,
    // e.g. { fontSize: 12, fontWeight: '700', color: '#666666' }
  },
  datesText: {
    ...theme.card.challengeMeta,
    // e.g. { fontSize: 14, color: '#666666', marginBottom: 4 }
  },
  participantsText: {
    ...theme.card.challengeMeta,
    // e.g. { fontSize: 14, color: '#666666', marginBottom: 4 }
    marginBottom: 0, // override if needed
  },
  checkboxContainer: {
    marginRight: theme.spacing.medium,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    backgroundColor: theme.colors.primary, // e.g. '#007AFF'
    borderColor: theme.colors.primary,
  },
  chevron: {
    marginLeft: theme.spacing.small,
  },
  // Search / Filter
  searchFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.medium, // e.g. 16
    marginBottom: theme.spacing.medium,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: theme.spacing.small, // e.g. 8
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: theme.spacing.small,
  },
  searchInput: {
    flex: 1,
    fontSize: theme.typography.small.fontSize, // e.g. 14 or 15
    color: theme.typography.small.color,       // e.g. '#666666'
    marginLeft: 8,
    paddingVertical: 2,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary, // e.g. '#007AFF'
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: theme.radius.button, // e.g. 20
  },
  filterButtonText: {
    color: '#fff',
    fontSize: theme.typography.small.fontSize,
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'capitalize',
  },
  flatListContainer: {
    paddingHorizontal: theme.spacing.medium,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.body,
    marginTop: 10,
    color: theme.colors.textSecondary,
  },
});