import { Stack } from 'expo-router';
import { TouchableOpacity, Text, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function JoinChallengesLayout() {
  return (
    <Stack initialRouteName="index">
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="challengesettings"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="joincreate"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="discover"
        options={({ navigation }) => ({
          title: 'Join or create challenge',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginLeft: 16 }}
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              style={{
                backgroundColor: '#00000',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginRight: 16,
              }}
              onPress={() => router.push('/joinchallenges/create')}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>+ Create</Text>
            </TouchableOpacity>
          ),
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerShadowVisible: false,
        })}
      />
      <Stack.Screen
        name="create"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="challengedetails"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}