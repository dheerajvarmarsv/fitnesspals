import { useState } from 'react';
import { StyleSheet, View, Text, Switch, Alert, Platform, TouchableOpacity } from 'react-native';
import SharedLayout from '../../../components/SharedLayout';
import { useUser } from '../../../components/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../lib/ThemeContext';
export default function NotificationSettings() {
  const { settings, updateSettings } = useUser();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);

  // Derive a single "enabled" state from the notification settings
  const allNotificationsEnabled = Object.values(settings.notificationSettings).some(value => value);

  const toggleAllNotifications = async (enabled: boolean) => {
    try {
      setLoading(true);
      
      // Create a new notification settings object
      const newNotificationSettings = {
        challenges: enabled,
        friends: enabled,
        badges: false, // Always disable badges as per requirement
        chat: false,   // Always disable chat as per requirement
        sync: false,   // Always disable sync as per requirement
      };
      
      // Only try to register for push notifications on native platforms
      if (Platform.OS !== 'web') {
        try {
          // Import notification services dynamically to prevent issues on web
          const notificationService = await import('../../../lib/notificationService');
          
          if (enabled) {
            // Register for push notifications
            const token = await notificationService.registerForPushNotifications();
            if (token) {
              console.log('Push notification token:', token);
            } else {
              console.log('Failed to get push notification token');
            }
          } else {
            // Unregister from push notifications
            await notificationService.unregisterFromPushNotifications();
          }
        } catch (error) {
          console.error('Error with push notification registration:', error);
          // Continue with saving settings even if notification registration fails
        }
      }
      
      // Update user settings in the database
      await updateSettings({
        notificationSettings: newNotificationSettings,
      });
      
      // Show confirmation
      if (Platform.OS !== 'web') {
        if (enabled) {
          Alert.alert(
            'Notifications Enabled',
            'You will now receive notifications for friend requests, challenge invites, and challenge activity.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Notifications Disabled',
            'You will no longer receive any notifications.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (e) {
      console.error('Error updating notification settings:', e);
      Alert.alert('Error', 'Failed to update notification settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SharedLayout style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {/* Main toggle for all notifications */}
        <View style={[styles.mainToggleContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={styles.mainToggleContent}>
            <Ionicons 
              name={allNotificationsEnabled ? "notifications" : "notifications-off"} 
              size={32} 
              color={allNotificationsEnabled ? theme.colors.primary : theme.colors.textTertiary} 
              style={styles.icon}
            />
            <View style={styles.toggleTextContainer}>
              <Text style={[styles.toggleTitle, { color: theme.colors.textPrimary }]}>
                {allNotificationsEnabled ? "Notifications Enabled" : "Notifications Disabled"}
              </Text>
              <Text style={[styles.toggleDescription, { color: theme.colors.textSecondary }]}>
                {allNotificationsEnabled 
                  ? "You will receive important notifications" 
                  : "You won't receive any notifications"}
              </Text>
            </View>
          </View>
          <Switch
            value={allNotificationsEnabled}
            onValueChange={toggleAllNotifications}
            trackColor={{ false: '#ddd', true: theme.colors.primary }}
            thumbColor="#fff"
            disabled={loading}
          />
        </View>

        {/* Info about what notifications you'll get when enabled */}
        {allNotificationsEnabled && (
          <View style={[styles.infoContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.infoTitle, { color: theme.colors.textPrimary }]}>When Enabled, You'll Receive:</Text>
            
            <View style={styles.infoItem}>
              <Ionicons name="person-add" size={22} color={theme.colors.primary} style={styles.infoIcon} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                Friend request notifications
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="mail" size={22} color={theme.colors.primary} style={styles.infoIcon} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                Challenge invitation notifications
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="checkmark-circle" size={22} color={theme.colors.primary} style={styles.infoIcon} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                Challenge activity notifications when participants complete their logs
              </Text>
            </View>
            
            <View style={styles.infoItem}>
              <Ionicons name="alarm" size={22} color={theme.colors.primary} style={styles.infoIcon} />
              <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                Daily reminders if you haven't added your activity to an active challenge
              </Text>
            </View>
          </View>
        )}
        
        {/* Privacy note */}
        {/* Testing button (visible only in development mode) */}
        {__DEV__ && allNotificationsEnabled && Platform.OS !== 'web' && (
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: theme.colors.info }]}
            onPress={async () => {
              try {
                const { scheduleTestNotification } = await import('../../../lib/notificationService');
                await scheduleTestNotification(
                  'Test Notification',
                  'This is a test notification from the app'
                );
                Alert.alert('Test Notification', 'Sent a test notification');
              } catch (e) {
                console.error('Error sending test notification:', e);
                Alert.alert('Error', 'Failed to send test notification');
              }
            }}
          >
            <Text style={styles.testButtonText}>Test Notification</Text>
          </TouchableOpacity>
        )}

        <View style={styles.privacyNote}>
          <Text style={[styles.privacyText, { color: theme.colors.textTertiary }]}>
            All notifications are delivered according to your device settings. You can change these settings at any time.
          </Text>
        </View>
      </View>
    </SharedLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  mainToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: Platform.OS === 'ios' ? 0 : 1,
  },
  mainToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 16,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 14,
  },
  infoContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: Platform.OS === 'ios' ? 0 : 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    marginRight: 12,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
  privacyNote: {
    padding: 16,
    marginTop: 8,
  },
  privacyText: {
    fontSize: 12,
    textAlign: 'center',
  },
  testButton: {
    marginVertical: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});