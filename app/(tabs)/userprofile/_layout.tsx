import { Stack } from 'expo-router';
import { useTheme } from '../../../lib/ThemeContext';

export default function UserProfileLayout() {
  const { theme } = useTheme();

  return (
    <Stack 
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTitleStyle: {
          color: theme.colors.textPrimary,
        },
        headerTintColor: theme.colors.primary,
        headerBackTitle: "Back",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{
          headerShown: false,
        }}
      />
      {/* <Stack.Screen
        name="fitness-connections"
        options={{
          title: "Health Services",
          headerTitle: "Health Services",
        }}
      /> */}
      <Stack.Screen
        name="profilesettings"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="device"
        options={{
          title: 'Connect Device',
          headerTitle: 'Connect Device',
        }}
      />
      <Stack.Screen
        name="privacy"
        options={{
          title: 'Privacy Settings',
          headerTitle: 'Privacy Settings',
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          headerTitle: 'Notifications',
        }}
      />
      <Stack.Screen
        name="password"
        options={{
          title: 'Password',
          headerTitle: 'Password',
        }}
      />
      <Stack.Screen
        name="units"
        options={{
          title: 'Distance Units',
          headerTitle: 'Distance Units',
        }}
      />
      <Stack.Screen
        name="nickname"
        options={{
          title: "Edit Nickname",
          headerTitle: "Edit Nickname",
        }}
      />
    </Stack>
  );
}