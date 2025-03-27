import { Stack } from 'expo-router';

export default function DebugLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: "Debug Tools", 
          headerShown: true 
        }} 
      />
      <Stack.Screen 
        name="notifications" 
        options={{ 
          title: "Notification Debug", 
          headerShown: true 
        }} 
      />
    </Stack>
  );
}