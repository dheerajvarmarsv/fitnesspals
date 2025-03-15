import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const DAY_WIDTH = width / 7;
const ANIMATION_DURATION = 200;

interface Day {
  date: Date;
  dayName: string;
  dayNumber: string;
}

interface CalendarStripProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  style?: any;
  calendarAnimation?: { type: string; duration: number };
  daySelectionAnimation?: { type: string; duration: number; highlightColor: string };
  highlightDateNumberStyle?: any;
  highlightDateNameStyle?: any;
  iconContainer?: any;
  numDaysInView?: number;
}

const CalendarStrip: React.FC<CalendarStripProps> = ({
  selectedDate,
  onDateSelect,
  style = {},
  calendarAnimation = { type: 'sequence', duration: 30 },
  daySelectionAnimation = {
    type: 'background',
    duration: 300,
    // This value is no longer used directly because we are rendering a gradient on selection.
    highlightColor: '#4A90E2',
  },
  highlightDateNumberStyle = {},
  highlightDateNameStyle = {},
  iconContainer = { flex: 0.1 },
  numDaysInView = 7,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [daysArray, setDaysArray] = useState<Day[]>([]);
  const today = new Date();

  // Create array of dates to display
  useEffect(() => {
    const days: Day[] = [];
    const daysToShow = numDaysInView * 5; // Show 5 weeks total
    
    // Start 2 weeks before today
    const startDate = new Date();
    startDate.setDate(today.getDate() - (numDaysInView * 2));
    
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      days.push({
        date,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate().toString(),
      });
    }
    
    setDaysArray(days);
  }, [numDaysInView]);

  // Scroll to the selected date on mount
  useEffect(() => {
    if (scrollViewRef.current && daysArray.length > 0) {
      // Find index of today or the selectedDate in the array
      const todayIndex = daysArray.findIndex(
        (day) => day.date.toDateString() === today.toDateString()
      );
      
      const selectedIndex = daysArray.findIndex(
        (day) => day.date.toDateString() === selectedDate.toDateString()
      );
      
      const indexToScrollTo = selectedIndex >= 0 ? selectedIndex : todayIndex;
      
      if (indexToScrollTo >= 0) {
        // Calculate the scroll position - center the date
        const scrollXPosition = Math.max(0, (indexToScrollTo - 1) * DAY_WIDTH);
        
        // Scroll with a slight delay to ensure the view is ready
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ x: scrollXPosition, animated: true });
        }, 100);
      }
    }
  }, [daysArray, selectedDate]);

  const navigateWeek = (direction: 'left' | 'right') => {
    const newPage = direction === 'left' ? currentPage - 1 : currentPage + 1;
    if (scrollViewRef.current) {
      const scrollXPosition = newPage * (numDaysInView * DAY_WIDTH);
      scrollViewRef.current.scrollTo({ x: scrollXPosition, animated: true });
      setCurrentPage(newPage);
    }
  };

  const isDateToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const isDateSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const handleDateSelect = (day: Day) => {
    onDateSelect(day.date);
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigateWeek('left')}
          style={[styles.iconContainer, iconContainer]}
        >
          <Ionicons name="chevron-back" size={24} color="#666" />
        </TouchableOpacity>
        
        <View style={styles.calendarContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled={false}
            scrollEventThrottle={500}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
          >
            {daysArray.map((day, index) => {
              const isToday = isDateToday(day.date);
              const isSelected = isDateSelected(day.date);
              
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleDateSelect(day)}
                  activeOpacity={0.7}
                  style={styles.day}
                >
                  {isSelected ? (
                    <LinearGradient
                      colors={['#F58529', '#DD2A7B', '#8134AF', '#515BD4']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.dayGradient}
                    >
                      <Text
                        style={[
                          styles.dayName,
                          styles.selectedText,
                          highlightDateNameStyle,
                        ]}
                      >
                        {day.dayName}
                      </Text>
                      <View style={styles.dayNumberContainer}>
                        <Text
                          style={[
                            styles.dayNumber,
                            styles.selectedText,
                            highlightDateNumberStyle,
                          ]}
                        >
                          {day.dayNumber}
                        </Text>
                      </View>
                    </LinearGradient>
                  ) : (
                    <>
                      <Text style={styles.dayName}>{day.dayName}</Text>
                      <View style={styles.dayNumberContainer}>
                        <Text style={styles.dayNumber}>{day.dayNumber}</Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        
        <TouchableOpacity
          onPress={() => navigateWeek('right')}
          style={[styles.iconContainer, iconContainer]}
        >
          <Ionicons name="chevron-forward" size={24} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 90,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  iconContainer: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarContainer: {
    flex: 1,
    height: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    alignItems: 'center',
  },
  day: {
    width: DAY_WIDTH,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginHorizontal: 2,
  },
  dayGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  dayNumberContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  todayName: {
    fontWeight: '700',
    color: '#4A90E2',
  },
  todayNumber: {
    color: '#4A90E2',
  },
  selectedText: {
    color: 'white',
    fontWeight: '700',
  },
});

export default CalendarStrip;