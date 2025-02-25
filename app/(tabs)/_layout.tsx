import { Tabs } from 'expo-router';
import { Platform, useWindowDimensions, Image } from 'react-native';

export default function TabLayout() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isSmallDevice = height < 700;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#eee',
          height: Platform.select({
            ios: isSmallDevice ? 75 : 85,
            android: 70,
            default: 70,
          }),
          paddingBottom: Platform.select({
            ios: isSmallDevice ? 25 : 30,
            android: 20,
            default: 20,
          }),
          paddingTop: 12,
        },
        tabBarActiveTintColor: '#FF4B4B',
        tabBarInactiveTintColor: '#666',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <Image
              source={{ uri: 'https://cdn-icons-png.flaticon.com/128/9187/9187555.png' }}
              style={{
                width: 18,
                height: 18,
                tintColor: color,
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="joinchallenges"
        options={{
          title: 'Challenges',
          tabBarIcon: ({ focused, color }) => (
            <Image
              source={{ uri: 'https://cdn-icons-png.flaticon.com/128/2620/2620498.png' }}
              style={{
                width: 18,
                height: 18,
                tintColor: color,
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ focused, color }) => (
            <Image
              source={{ uri: 'https://cdn-icons-png.flaticon.com/128/1057/1057089.png' }}
              style={{
                width: 18,
                height: 18,
                tintColor: color,
              }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="userprofile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <Image
              source={{ uri: 'https://cdn-icons-png.flaticon.com/128/1077/1077063.png' }}
              style={{
                width: 18,
                height: 18,
                tintColor: color,
              }}
            />
          ),
        }}
      />
    </Tabs>
  );
}