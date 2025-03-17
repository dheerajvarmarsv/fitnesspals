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
import { lightTheme as theme } from '../../../../lib/theme';

interface ChallengesListProps {
  tabType: 'active' | 'upcoming' | 'completed';
  challenges: any[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  // Removed filter references
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  // Removed showFilterModal
  goToChallengeDetails: (challengeId: string) => void;
  // Slightly adjusted signature of renderEmptyChallengeState
  renderEmptyChallengeState: () => JSX.Element;
  isEditMode?: boolean;
  selectedChallenges?: string[];
  onToggleSelectChallenge?: (challengeId: string) => void;
  onEnterEditMode?: () => void;
}

const ChallengesList: React.FC<ChallengesListProps> = ({
  tabType,
  challenges,
  loading,
  refreshing,
  onRefresh,
  searchQuery,
  setSearchQuery,
  goToChallengeDetails,
  renderEmptyChallengeState,
  isEditMode = false,
  selectedChallenges = [],
  onToggleSelectChallenge = () => {},
  onEnterEditMode = () => {},
}) => {
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

  // Filter logic is now purely search-based
  const getSearchedChallenges = useCallback(
    (all: any[], query: string) => {
      const lowerQuery = query.trim().toLowerCase();
      if (!lowerQuery) return all;

      return all.filter((challenge) => {
        const lowerTitle = challenge.title?.toLowerCase() || '';
        const lowerDesc = challenge.description?.toLowerCase() || '';
        return lowerTitle.includes(lowerQuery) || lowerDesc.includes(lowerQuery);
      });
    },
    []
  );

  const filteredChallenges = getSearchedChallenges(challenges, searchQuery);

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
              color="#666666"
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
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading challenges...</Text>
      </View>
    );
  }

  if (challenges.length === 0) {
    return renderEmptyChallengeState();
  }

  return (
    <View style={{ flex: 1 }}>
      {/** Single search container occupying full width */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search challenges..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
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
};

const styles = StyleSheet.create({
  cardContainer: {
    marginBottom: 8,
  },
  challengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F8FF',
    borderRadius: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
    marginRight: 8,
    flex: 1,
  },
  challengeTypeBadge: {
    backgroundColor: 'rgba(74,144,226,0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  challengeTypeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666666',
  },
  datesText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  participantsText: {
    fontSize: 14,
    color: '#666666',
  },
  checkboxContainer: {
    marginRight: 16,
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
    backgroundColor: '#000',
    borderColor: '#000',
  },
  chevron: {
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666666',
    fontSize: 16,
  },

  // Single search container occupying full width
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },

  flatListContainer: {
    paddingHorizontal: 16,
  },
});

export default ChallengesList;