import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import {
  Platform,
  Dimensions,
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import AddActivityModal from '../../components/AddActivityModal';

// Design tokens for consistent theming
const TAB_DESIGN = {
  colors: {
    activeIcon: '#000000',    // Dark blue for active state
    inactiveIcon: '#000000',  // Black for inactive state
    background: '#FFFFFF',
    border: '#E5E5EA',
  },
  typography: {
    labelSize: 10,
    labelWeight: '500',
  },
  spacing: {
    horizontal: 8,
    vertical: 3, // Reduced from 6 to 2 for less vertical padding
  },
  dimensions: {
    iconSize: 24,
    addButtonSize: 70, // Increased from 56 to 70 for a bigger plus button
  },
};

// Get screen dimensions
const { width, height } = Dimensions.get('window');

export default function TabLayout() {
  const [showAddActivity, setShowAddActivity] = useState(false);

  // Close the modal when activity is saved
  const handleActivitySaved = () => {
    setShowAddActivity(false);
    // You might want to refresh data or navigate after activity is saved
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
        }}
        tabBar={(props) => (
          <CustomTabBar
            {...props}
            onAddPress={() => setShowAddActivity(true)}
          />
        )}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="joinchallenges" options={{ title: 'Challenges' }} />
        <Tabs.Screen name="friends" options={{ title: 'Friends' }} />
        <Tabs.Screen name="userprofile" options={{ title: 'Profile' }} />
      </Tabs>

      {/* AddActivityModal */}
      <AddActivityModal
        visible={showAddActivity}
        onClose={() => setShowAddActivity(false)}
        onSaveComplete={handleActivitySaved}
      />
    </>
  );
}

function CustomTabBar({ state, descriptors, navigation, onAddPress }) {
  const routes = state.routes;
  const midIndex = Math.floor(routes.length / 2);

  const renderTab = (route, index) => {
    const { options } = descriptors[route.key];
    const isFocused = state.index === index;

    const getIconName = () => {
      switch (route.name) {
        case 'index': return isFocused ? 'home' : 'home-outline';
        case 'joinchallenges': return isFocused ? 'trophy' : 'trophy-outline';
        case 'friends': return isFocused ? 'people' : 'people-outline';
        case 'userprofile': return isFocused ? 'person' : 'person-outline';
        default: return 'help-circle';
      }
    };

    const iconColor = isFocused 
      ? TAB_DESIGN.colors.activeIcon 
      : TAB_DESIGN.colors.inactiveIcon;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        onPress={onPress}
        style={styles.navItem}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={getIconName()} 
          size={TAB_DESIGN.dimensions.iconSize} 
          color={iconColor} 
        />
        <Text 
          style={[
            styles.navLabel, 
            { 
              color: iconColor,
              fontSize: TAB_DESIGN.typography.labelSize,
              fontWeight: TAB_DESIGN.typography.labelWeight,
            }
          ]}
        >
          {options.title || route.name}
        </Text>
      </TouchableOpacity>
    );
  };

  // Minimal padding for a cleaner look
  const bottomPadding = Platform.OS === 'ios' ? 5 : 3;

  return (
    <View 
      style={[
        styles.tabBarContainer, 
        { 
          paddingBottom: bottomPadding,
          backgroundColor: TAB_DESIGN.colors.background,
          borderTopColor: TAB_DESIGN.colors.border
        }
      ]}
    >
      <View style={styles.tabBarInner}>
        {routes.slice(0, midIndex).map((route, index) => renderTab(route, index))}
        
        {/* Center Add Button */}
        <TouchableOpacity
          onPress={onAddPress}
          activeOpacity={0.8}
          style={styles.gradientButtonWrapper}
        >
          <LinearGradient
            colors={['#F58529', '#DD2A7B', '#8134AF', '#515BD4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientButton}
          >
            <Ionicons 
              name="add" 
              size={32} // Larger icon size for the plus button
              color="#FFFFFF" 
            />
          </LinearGradient>
        </TouchableOpacity>
        
        {routes.slice(midIndex).map((route, index) => renderTab(route, index + midIndex))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: TAB_DESIGN.spacing.horizontal,
    paddingVertical: TAB_DESIGN.spacing.vertical,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5, // Reduced from 10 to 5
    maxWidth: 100,
  },
  navLabel: {
    marginTop: 4,
    textAlign: 'center',
  },
  gradientButtonWrapper: {
    marginHorizontal: 10,
    transform: [{ translateY: -20 }], // Increased elevation for better visibility
  },
  gradientButton: {
    width: TAB_DESIGN.dimensions.addButtonSize,
    height: TAB_DESIGN.dimensions.addButtonSize,
    borderRadius: TAB_DESIGN.dimensions.addButtonSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});