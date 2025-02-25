import { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedLayout from '../../../components/SharedLayout';
import { useUser } from '../../../components/UserContext';

type PrivacyOption = 'public' | 'private';

export default function PrivacySettings() {
  const { settings, updateSettings } = useUser();
  const [loading, setLoading] = useState(false);

  const handleSave = async (mode: PrivacyOption) => {
    try {
      setLoading(true);
      await updateSettings({ privacyMode: mode });
    } catch (e) {
      console.error('Error updating privacy mode:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SharedLayout style={styles.container}>
      <View style={styles.content}>
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.option,
              settings.privacyMode === 'public' && styles.optionSelected,
            ]}
            onPress={() => handleSave('public')}
            disabled={loading}
          >
            <View style={styles.optionHeader}>
              <Text style={styles.optionTitle}>Public</Text>
              {settings.privacyMode === 'public' && (
                <Ionicons name="checkmark-circle" size={24} color="#4A90E2" />
              )}
            </View>
            <Text style={styles.optionDescription}>
              Everyone can see your profile.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.option,
              settings.privacyMode === 'private' && styles.optionSelected,
            ]}
            onPress={() => handleSave('private')}
            disabled={loading}
          >
            <View style={styles.optionHeader}>
              <Text style={styles.optionTitle}>Private</Text>
              {settings.privacyMode === 'private' && (
                <Ionicons name="checkmark-circle" size={24} color="#4A90E2" />
              )}
            </View>
            <Text style={styles.optionDescription}>
              No one can find your profile via search.
            </Text>
          </TouchableOpacity>
        </View>
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
    padding: 16,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  option: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginBottom: 12,
  },
  optionSelected: {
    backgroundColor: '#EBF5FF',
    borderColor: '#4A90E2',
    borderWidth: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
  },
});