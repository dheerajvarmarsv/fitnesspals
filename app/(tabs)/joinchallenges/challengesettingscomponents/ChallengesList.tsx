// app/(tabs)/joinchallenges/challengesettingscomponents/ChallengesList.tsx

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface ChallengesListProps {
  tabType: 'active' | 'upcoming' | 'completed';
  challenges: any[];
  loading: boolean;
  refreshing: boolean; // from parent, but we won't attach a child RefreshControl
  onRefresh: () => void;

  // Filter/search
  activeFilter: string; // 'all' | 'race' | 'survival' | ...
  setActiveFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  showFilterModal: () => void;

  // Navigation
  goToChallengeDetails: (challengeId: string) => void;

  // For empty states
  renderEmptyChallengeState: (tabType: 'active' | 'upcoming' | 'completed') => JSX.Element;
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
}: ChallengesListProps) {
  // Filter + search logic
  const getFilteredChallenges = useCallback(
    (all: any[], filter: string, query: string) => {
      return all.filter((challenge) => {
        const matchesFilter = filter === 'all' || challenge.challenge_type === filter;
        const lowerTitle = challenge.title?.toLowerCase() || '';
        const lowerDesc = challenge.description?.toLowerCase() || '';
        const lowerQuery = query.toLowerCase();
        const matchesSearch =
          !query.trim() || lowerTitle.includes(lowerQuery) || lowerDesc.includes(lowerQuery);
        return matchesFilter && matchesSearch;
      });
    },
    []
  );

  const filteredChallenges = getFilteredChallenges(challenges, activeFilter, searchQuery);

  // Render a single challenge row
  const renderChallengeItem = ({ item }: { item: any }) => {
    const startDate = item.start_date ? new Date(item.start_date).toLocaleDateString() : 'N/A';
    const endDate = item.end_date ? new Date(item.end_date).toLocaleDateString() : 'Open-ended';
    const participantCount = item.participant_count?.[0]?.count || 0;

    return (
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8f9fa',
          padding: 16,
          borderRadius: 12,
          marginBottom: 12,
        }}
        onPress={() => goToChallengeDetails(item.id)}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', flex: 1, marginRight: 10 }}>
          <View
            style={{
              width: 4,
              borderRadius: 2,
              marginRight: 12,
              backgroundColor: '#FF416C', // or dynamic color if you prefer
            }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 }}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {item.description && (
              <Text style={{ fontSize: 14, color: '#666', marginBottom: 6 }} numberOfLines={1}>
                {item.description}
              </Text>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#888' }}>
                {startDate} - {endDate}
              </Text>
              <Text style={{ fontSize: 12, color: '#4A90E2', fontWeight: '500' }}>
                {participantCount} participant{participantCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>
    );
  };

  // If still loading
  if (loading) {
    return (
      <View style={{ flex: 1, paddingVertical: 40, alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={{ marginTop: 10, color: '#666', fontSize: 16 }}>Loading challenges...</Text>
      </View>
    );
  }

  // If no challenges at all
  if (challenges.length === 0) {
    return renderEmptyChallengeState(tabType);
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Search + Filter row */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16, alignItems: 'center' }}>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#f5f5f5',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            marginRight: 10,
          }}
        >
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            style={{ flex: 1, fontSize: 15, color: '#333', marginLeft: 8, paddingVertical: 2 }}
            placeholder="Search challenges..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
        </View>

        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#4A90E2',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 8,
          }}
          onPress={showFilterModal}
        >
          <Ionicons name="filter" size={18} color="#fff" />
          <Text
            style={{
              color: '#fff',
              fontSize: 14,
              fontWeight: '600',
              marginLeft: 6,
              textTransform: 'capitalize',
            }}
          >
            {activeFilter === 'all' ? 'All' : activeFilter}
          </Text>
        </TouchableOpacity>
      </View>

      {/* The filtered list (non-scrollable) */}
      <View style={{ flex: 1 }}>
        {filteredChallenges.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <MaterialCommunityIcons name="magnify-close" size={50} color="#ddd" />
            <Text style={{ fontSize: 16, color: '#666', marginTop: 16, marginBottom: 20 }}>
              No challenges match your search
            </Text>
            <TouchableOpacity
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: '#f0f0f0',
                borderRadius: 8,
              }}
              onPress={() => {
                setActiveFilter('all');
                setSearchQuery('');
              }}
            >
              <Text style={{ color: '#4A90E2', fontWeight: '600' }}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredChallenges}
            keyExtractor={(item) => `list-${item.id}`}
            renderItem={renderChallengeItem}
            // Turn off child scrolling to avoid nested VirtualizedLists
            scrollEnabled={false}
            // No child refreshControl
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />
        )}
      </View>
    </View>
  );
}