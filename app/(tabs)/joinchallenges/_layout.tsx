import { Stack } from 'expo-router';
import { TouchableOpacity, Text, Image } from 'react-native';
import { router } from 'expo-router';

export default function JoinChallengesLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="challengesettings"
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
              <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/128/2223/2223615.png' }}
                style={{ width: 24, height: 24, tintColor: '#333' }}
              />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              style={{
                backgroundColor: '#4A90E2',
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
    </Stack>
  );
}