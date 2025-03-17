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
import { useTheme } from '../../lib/ThemeContext';

const { width } = Dimensions.get('window');

export default function TabLayout() {
  const [showAddActivity, setShowAddActivity] = useState(false);
  const { theme, isDark } = useTheme();

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
  const { theme, isDark } = useTheme();
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
      ? theme.iconColors.tab.active 
      : theme.iconColors.tab.inactive;

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
          size={24} 
          color={iconColor} 
        />
        <Text 
          style={[
            styles.navLabel, 
            { 
              color: iconColor,
              fontFamily: theme.typography.small.fontFamily
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
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          ...theme.elevation.small
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
            colors={theme.colors.gradientButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientButton}
          >
            <Ionicons 
              name="add" 
              size={32}
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
  },
  tabBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    maxWidth: 100,
  },
  navLabel: {
    marginTop: 4,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '500',
  },
  gradientButtonWrapper: {
    marginHorizontal: 10,
    transform: [{ translateY: -20 }],
  },
  gradientButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
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