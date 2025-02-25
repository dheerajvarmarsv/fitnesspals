import { useState } from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SharedLayout from '../../../components/SharedLayout';
import { useUser } from '../../../components/UserContext';

const DEFAULT_AVATARS = [
  {
    id: '1',
    url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400',
  },
  {
    id: '2',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
  },
  {
    id: '3',
    url: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=400',
  },
  {
    id: '4',
    url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
  },
  {
    id: '5',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
  },
  {
    id: '6',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
  },
];

export default function AvatarSelection() {
  const { settings, updateSettings } = useUser();
  const [selectedAvatar, setSelectedAvatar] = useState(
    DEFAULT_AVATARS.find(avatar => avatar.url === settings.avatarUrl) || DEFAULT_AVATARS[0]
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      await updateSettings({ avatarUrl: selectedAvatar.url });
      router.back();
    } catch (e) {
      console.error('Error updating avatar:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SharedLayout style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.subtitle}>Selected Avatar</Text>
        <View style={styles.selectedContainer}>
          <Image
            source={{ uri: selectedAvatar.url }}
            style={styles.selectedAvatar}
          />
        </View>

        <Text style={styles.subtitle}>Choose an Avatar</Text>
        <View style={styles.gridContainer}>
          {DEFAULT_AVATARS.map((avatar) => (
            <TouchableOpacity
              key={avatar.id}
              style={[
                styles.avatarContainer,
                selectedAvatar.id === avatar.id && styles.avatarContainerSelected,
              ]}
              onPress={() => setSelectedAvatar(avatar)}
              disabled={loading}
            >
              <Image
                source={{ uri: avatar.url }}
                style={styles.avatarImage}
              />
              {selectedAvatar.id === avatar.id && (
                <View style={styles.checkmarkContainer}>
                  <Ionicons name="checkmark-circle" size={24} color="#4A90E2" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            (selectedAvatar.url === settings.avatarUrl || loading) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={selectedAvatar.url === settings.avatarUrl || loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Updating...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </View>
    </SharedLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  selectedContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  selectedAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  avatarContainer: {
    width: '33.33%',
    padding: 8,
    position: 'relative',
  },
  avatarContainerSelected: {
    backgroundColor: '#EBF5FF',
    borderRadius: 12,
  },
  avatarImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
  },
  checkmarkContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});