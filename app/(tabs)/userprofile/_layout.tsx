import { Stack } from 'expo-router';
import { TouchableOpacity, Image } from 'react-native';

export default function UserProfileLayout() {
  return (
    <Stack>
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
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="privacy"
        options={{
          title: 'Privacy Settings',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="password"
        options={{
          title: 'Password',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="units"
        options={{
          title: 'Distance Units',
          headerBackTitle: 'Back',
        }}
      />
      <Stack.Screen
        name="nickname"
        options={{
          title: 'Edit Nickname',
          headerBackTitle: 'Back',
        }}
      />
    </Stack>
  );
}