import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Get screen dimensions for responsive sizing
const { width } = Dimensions.get('window');

// Calculate card size based on screen width (show about 2.5 cards at once)
const CARD_MARGIN = 8;
const CARD_WIDTH = (width - 40) / 2.5; // 40px for container padding

interface Activity {
  id: string;
  activity_type: string;
  duration?: number;
  distance?: number;
  calories?: number;
  steps?: number;
  count?: number;
  created_at: string;
  metric?: string;
}

interface ActivityCardsCarouselProps {
  activities: Activity[];
  onActivityPress?: (activity: Activity) => void;
}

// Map activity types to FontAwesome5 icon names
const ACTIVITY_ICONS: Record<string, string> = {
  'Walking': 'walking',
  'Running': 'running',
  'Cycling': 'biking',
  'Swimming': 'swimmer',
  'Workout': 'dumbbell',
  'Yoga': 'pray',
  'Hiking': 'mountain',
  'Sleep Quality': 'bed',
  'Steps': 'shoe-prints',
  'Meditation': 'brain',
  'Weight Training': 'dumbbell',
  'Cardio Workout': 'heartbeat',
  'High-Intensity': 'fire',
  'Stretching': 'child',
  'Custom': 'star',
};

// Generate pastel colors for cards that don't have predefined colors
const ACTIVITY_COLORS: Record<string, string> = {
  'Walking': '#FFE0B2',    // Light orange
  'Running': '#FFCDD2',    // Light red
  'Cycling': '#BBDEFB',    // Light blue
  'Swimming': '#B3E5FC',   // Lighter blue
  'Workout': '#C8E6C9',    // Light green
  'Yoga': '#F8BBD0',       // Light pink
  'Meditation': '#D1C4E9', // Light purple
  'Stretching': '#E0F2F1', // Light teal
  'Hiking': '#DCEDC8',     // Light lime
  'Steps': '#F0F4C3',      // Light yellow
  'Sleep Quality': '#D1C4E9', // Light purple
  'Weight Training': '#B2DFDB', // Light teal
  'Cardio Workout': '#FFCCBC', // Light deep orange
  'High-Intensity': '#FFAB91', // Deeper light orange
  'Custom': '#00000',     // Light blue grey
};

// Get a color for an activity type, with fallback
function getActivityColor(activityType: string): string {
  return ACTIVITY_COLORS[activityType] || 
    // Generate a consistent pastel color based on activity name
    `hsl(${activityType.charCodeAt(0) * 5 % 360}, 70%, 90%)`;
}

// Format display value based on metric type
const formatMetricValue = (activity: any, useKilometers: boolean): string => {
  let displayValue = '';
  
  switch (activity.metric) {
    case 'time':
      if (activity.duration) displayValue = `${Math.round(activity.duration / 60)} min`;
      break;
    case 'distance_km':
    case 'distance_miles':
      if (activity.distance !== null) {
        // Distance is stored in kilometers in the database
        if (useKilometers) {
          displayValue = `${activity.distance.toFixed(2)} km`;
        } else {
          // Convert kilometers to miles
          const miles = activity.distance * 0.621371;
          displayValue = `${miles.toFixed(2)} mi`;
        }
      }
      break;
    case 'calories':
      if (activity.calories) displayValue = `${activity.calories} cal`;
      break;
    case 'steps':
      if (activity.steps) displayValue = `${activity.steps} steps`;
      break;
    case 'count':
      if (activity.count) displayValue = `${activity.count} count`;
      break;
    default:
      displayValue = 'No data';
      break;
  }
  return displayValue;
};

// Format relative time (e.g., "2h ago") without external dependencies
const formatRelativeTime = (dateString: string): string => {
  try {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    // Check for invalid date
    if (isNaN(seconds)) {
      return 'recently';
    }
    
    // Less than a minute
    if (seconds < 60) {
      return 'just now';
    }
    
    // Less than an hour
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m ago`;
    }
    
    // Less than a day
    if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      return `${hours}h ago`;
    }
    
    // Less than a week
    if (seconds < 604800) {
      const days = Math.floor(seconds / 86400);
      return `${days}d ago`;
    }
    
    // Format date as month/day
    return `${date.getMonth() + 1}/${date.getDate()}`;
  } catch (error) {
    return 'recently';
  }
};

const ActivityCardsCarousel: React.FC<ActivityCardsCarouselProps> = ({
  activities,
  onActivityPress
}) => {
  const router = useRouter();

  // Render each activity card
  const renderItem = ({ item }: { item: Activity }) => {
    const iconName = ACTIVITY_ICONS[item.activity_type] || 'star';
    const cardColor = getActivityColor(item.activity_type);
    const metricValue = formatMetricValue(item);
    const timeAgo = formatRelativeTime(item.created_at);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: cardColor }]}
        onPress={() => onActivityPress ? onActivityPress(item) : null}
        activeOpacity={0.8}
      >
        <View style={styles.iconContainer}>
          <FontAwesome5 name={iconName} size={24} color="#333" solid />
        </View>
        <Text style={styles.activityType} numberOfLines={1}>
          {item.activity_type}
        </Text>
        {metricValue ? (
          <Text style={styles.metricValue} numberOfLines={1}>
            {metricValue}
          </Text>
        ) : null}
        <Text style={styles.timeAgo} numberOfLines={1}>
          {timeAgo}
        </Text>
      </TouchableOpacity>
    );
  };

  // If no activities, return null
  if (!activities || activities.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Today's Logged Activities</Text>
     
      <FlatList
        data={activities}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carouselContainer}
        snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
        snapToAlignment="start"
        decelerationRate="fast"
        initialNumToRender={4}
        maxToRenderPerBatch={8}
        windowSize={5}
        // Show "View All" button after cards if there are more than 4 activities
        ListFooterComponent={activities.length > 4 ? (
          <TouchableOpacity
            style={styles.viewAllCard}
            onPress={() => router.push('/activities')}
          >
            <View style={styles.viewAllContent}>
              <FontAwesome5 name="list" size={24} color="#00000" solid />
              <Text style={styles.viewAllText}>View All</Text>
              <Text style={styles.viewAllCount}>{activities.length}</Text>
            </View>
          </TouchableOpacity>
        ) : null}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  carouselContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  card: {
    width: CARD_WIDTH,
    aspectRatio: 1, // Make it square
    borderRadius: 16,
    padding: 16,
    marginHorizontal: CARD_MARGIN,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    }),
    justifyContent: 'space-between',
  },
  iconContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  activityType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
  },
  timeAgo: {
    fontSize: 12,
    color: '#777',
    marginTop: 'auto',
  },
  viewAllCard: {
    width: CARD_WIDTH * 0.8,
    aspectRatio: 1,
    borderRadius: 16,
    marginHorizontal: CARD_MARGIN,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    }),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderWidth: 2,
    borderColor: '#E0E7FF',
    borderStyle: 'dashed',
  },
  viewAllContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00000',
    marginTop: 8,
  },
  viewAllCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00000',
    marginTop: 4,
  },
});

export default ActivityCardsCarousel;