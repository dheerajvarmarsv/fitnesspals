import { useState } from 'react';
import { StyleSheet, View, Text, Switch } from 'react-native';
import SharedLayout from '../../../components/SharedLayout';
import { useUser } from '../../../components/UserContext';

export default function NotificationSettings() {
  const { settings, updateSettings } = useUser();
  const [loading, setLoading] = useState(false);

  const toggleSetting = async (key: keyof typeof settings.notificationSettings) => {
    try {
      setLoading(true);
      await updateSettings({
        notificationSettings: {
          ...settings.notificationSettings,
          [key]: !settings.notificationSettings[key],
        },
      });
    } catch (e) {
      console.error('Error updating notification settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const NOTIFICATIONS = [
    {
      id: 'challenges' as const,
      title: 'Challenge Activity',
      description: 'Updates about your ongoing challenges',
    },
    {
      id: 'chat' as const,
      title: 'Chat Notifications',
      description: 'Messages from community & team chats',
    },
    {
      id: 'sync' as const,
      title: 'Sync Reminder',
      description: 'Alerts if not synced for 3/7 days',
    },
    {
      id: 'friends' as const,
      title: 'Friend Requests & Invites',
      description: 'New friend requests and challenge invites',
    },
    {
      id: 'badges' as const,
      title: 'Badge Activity',
      description: 'When you unlock new achievements',
    },
  ];

  return (
    <SharedLayout style={styles.container}>
      <View style={styles.content}>
        {NOTIFICATIONS.map(notification => (
          <View key={notification.id} style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>{notification.title}</Text>
              <Text style={styles.settingDescription}>
                {notification.description}
              </Text>
            </View>
            <Switch
              value={settings.notificationSettings[notification.id]}
              onValueChange={() => toggleSetting(notification.id)}
              trackColor={{ false: '#ddd', true: '#4A90E2' }}
              thumbColor="#fff"
              disabled={loading}
            />
          </View>
        ))}
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