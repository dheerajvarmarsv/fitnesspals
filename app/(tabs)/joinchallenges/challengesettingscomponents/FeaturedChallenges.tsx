// app/(tabs)/joinchallenges/challengesettingscomponents/FeaturedChallenges.tsx
import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = height * 0.25;
const SPACING = 12;

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

interface FeaturedChallengesProps {
  featuredChallenges: any[];
  goToChallengeDetails: (challengeId: string) => void;
}

/**
 * Renders the horizontal "featured challenges" carousel with pagination dots.
 */
export default function FeaturedChallenges({
  featuredChallenges,
  goToChallengeDetails,
}: FeaturedChallengesProps) {
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveCardIndex(viewableItems[0].index);
    }
  }, []);

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
          {
            borderRadius: 16,
            height: CARD_HEIGHT,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
            marginRight: SPACING,
            width: CARD_WIDTH,
          },
          isActive && { transform: [{ scale: 1.02 }] },
        ]}
        onPress={() => goToChallengeDetails(item.id)}
      >
        <LinearGradient
          colors={GRADIENT_COLORS[item.challenge_type] || GRADIENT_COLORS.active}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, padding: 20, justifyContent: 'space-between' }}
        >
          <View style={{ alignSelf: 'flex-start', marginBottom: 10 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: 'bold',
                color: 'rgba(255,255,255,0.8)',
                backgroundColor: 'rgba(255,255,255,0.15)',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4,
              }}
            >
              {item.challenge_type?.toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flex: 1, marginBottom: 10 }}>
              <Text
                style={{ fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 6 }}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              {item.description && (
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 18 }} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="people-outline" size={16} color="#fff" />
              <Text style={{ fontSize: 14, color: '#fff', marginLeft: 6, fontWeight: '600' }}>
                {participantCount} participant{participantCount !== 1 ? 's' : ''}
              </Text>
            </View>

            {item.creator && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Image
                  source={{ uri: item.creator.avatar_url || 'https://via.placeholder.com/40' }}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    marginRight: 6,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.5)',
                  }}
                />
                <Text style={{ fontSize: 12, color: '#fff', maxWidth: 150 }} numberOfLines={1}>
                  by {item.creator.nickname}
                </Text>
              </View>
            )}
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="calendar-outline" size={14} color="#fff" />
              <Text style={{ fontSize: 12, color: '#fff', marginLeft: 6 }}>
                {startDate} - {endDate}
              </Text>
            </View>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255,255,255,0.2)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 50,
              }}
              onPress={() => goToChallengeDetails(item.id)}
            >
              <Text style={{ fontSize: 12, color: '#fff', marginRight: 2 }}>View Details</Text>
              <Ionicons name="chevron-forward" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderPaginationDots = () => {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 }}>
        {featuredChallenges.map((_, index) => (
          <View
            key={index}
            style={{
              width: index === activeCardIndex ? 12 : 8,
              height: index === activeCardIndex ? 12 : 8,
              borderRadius: 6,
              backgroundColor: index === activeCardIndex ? '#4A90E2' : '#ddd',
              marginHorizontal: 4,
            }}
          />
        ))}
      </View>
    );
  };

  if (!featuredChallenges || featuredChallenges.length === 0) {
    return null; // No featured challenges
  }

  return (
    <View style={{ marginBottom: 30 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginBottom: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#666', letterSpacing: 1 }}>
          FEATURED CHALLENGES
        </Text>
        <Text style={{ fontSize: 12, color: '#999', fontStyle: 'italic' }}>Most Popular</Text>
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
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      />
      {renderPaginationDots()}
    </View>
  );
}