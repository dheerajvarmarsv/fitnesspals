import { useState } from 'react';
import { StyleSheet, View, Text, Switch } from 'react-native';
import SharedLayout from '../../../components/SharedLayout';
import { useUser } from '../../../components/UserContext';

export default function UnitsSettings() {
  const { settings, updateSettings } = useUser();
  const [loading, setLoading] = useState(false);

  const handleToggle = async (value: boolean) => {
    try {
      setLoading(true);
      await updateSettings({ useKilometers: value });
    } catch (e) {
      console.error('Error updating units:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SharedLayout style={styles.container}>
      <View style={styles.content}>
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Show distance in km</Text>
            <Text style={styles.settingDescription}>
              {settings.useKilometers ? 'Using kilometers' : 'Using miles'}
            </Text>
          </View>
          <Switch
            value={settings.useKilometers}
            onValueChange={handleToggle}
            trackColor={{ false: '#ddd', true: '#4A90E2' }}
            thumbColor="#fff"
            disabled={loading}
          />
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
  },
});