import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Switch, Alert, Platform, TouchableOpacity } from 'react-native';
import SharedLayout from '../../../components/SharedLayout';
import { useUser } from '../../../components/UserContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../lib/ThemeContext';
import { supabase } from '../../../lib/supabase';
export default function NotificationSettings() {
  const { settings, updateSettings } = useUser();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  
  // Check notification enabled status
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Get actual enabled status from database on load
  useEffect(() => {
    const checkNotificationStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profile_settings')
          .select('notifications_enabled')
          .eq('id', user.id)
          .single();
        
        setNotificationsEnabled(data?.notifications_enabled || false);
      }
    };
    
    checkNotificationStatus();
  }, []);

  const toggleAllNotifications = async (enabled: boolean) => {
    try {
      setLoading(true);
      setNotificationsEnabled(enabled);
      
      // Only try to register for push notifications on native platforms
      if (Platform.OS !== 'web') {
        try {
          // Import notification services dynamically to prevent issues on web
          const notificationService = await import('../../../lib/notificationService');
          
          if (enabled) {
            // Register for push notifications (which also updates the database)
            const token = await notificationService.registerForPushNotifications();
            if (token) {
              console.log('Push notification token registered successfully:', token);
            } else {
              console.log('Failed to get push notification token');
              // Reset UI state if registration failed
              setNotificationsEnabled(false);
              throw new Error('Could not register for push notifications');
            }
          } else {
            // Unregister from push notifications (which also updates the database)
            await notificationService.unregisterFromPushNotifications();
          }
        } catch (error) {
          console.error('Error with push notification registration:', error);
          // Reset UI state
          setNotificationsEnabled(!enabled);
          Alert.alert(
            'Notification Error', 
            'Could not register for push notifications. Please check your device settings.'
          );
          return; // Exit early on error
        }
      } else {
        // On web, just update the database directly
        try {
          const userId = (await supabase.auth.getUser()).data.user?.id;
          if (userId) {
            await supabase
              .from('profile_settings')
              .update({ notifications_enabled: enabled })
              .eq('id', userId);
          }
        } catch (error) {
          console.error('Error updating notifications_enabled in database:', error);
          setNotificationsEnabled(!enabled); // Reset UI state
          return; // Exit early
        }
      }
      
      // Update settings in UserContext (for UI consistency)
      await updateSettings({
        notificationSettings: {
          challenges: enabled,
          friends: enabled,
          badges: false, // Always disable badges as per requirement
          chat: false,   // Always disable chat as per requirement
          sync: false,   // Always disable sync as per requirement
        },
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
              name={notificationsEnabled ? "notifications" : "notifications-off"} 
              size={32} 
              color={notificationsEnabled ? theme.colors.primary : theme.colors.textTertiary} 
              style={styles.icon}
            />
            <View style={styles.toggleTextContainer}>
              <Text style={[styles.toggleTitle, { color: theme.colors.textPrimary }]}>
                {notificationsEnabled ? "Notifications Enabled" : "Notifications Disabled"}
              </Text>
              <Text style={[styles.toggleDescription, { color: theme.colors.textSecondary }]}>
                {notificationsEnabled 
                  ? "You will receive important notifications" 
                  : "You won't receive any notifications"}
              </Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleAllNotifications}
            trackColor={{ false: '#ddd', true: theme.colors.primary }}
            thumbColor="#fff"
            disabled={loading}
          />
        </View>

        {/* Info about what notifications you'll get when enabled */}
        {notificationsEnabled && (
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
        
        {/* Testing buttons (visible only in development mode) */}
        {__DEV__ && notificationsEnabled && Platform.OS !== 'web' && (
          <View style={styles.testButtonsContainer}>
            <Text style={[styles.testTitle, { color: theme.colors.textPrimary }]}>
              Testing Options (Development Only)
            </Text>
            
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: theme.colors.info }]}
              onPress={async () => {
                try {
                  const { sendTestNotification } = await import('../../../lib/notificationService');
                  await sendTestNotification();
                  Alert.alert('Test Notification', 'Sent a local test notification');
                } catch (e) {
                  console.error('Error sending test notification:', e);
                  Alert.alert('Error', 'Failed to send test notification');
                }
              }}
            >
              <Text style={styles.testButtonText}>Test Local Notification</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: theme.colors.primary }]}
              onPress={async () => {
                try {
                  const userId = (await supabase.auth.getUser()).data.user?.id;
                  if (!userId) throw new Error('User not logged in');
                  
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('nickname')
                    .eq('id', userId)
                    .single();
                  
                  const { sendFriendRequestNotification } = await import('../../../lib/notificationService');
                  const result = await sendFriendRequestNotification(
                    userId,
                    profile?.nickname || 'User'
                  );
                  
                  if (result) {
                    Alert.alert('Success', 'Sent a test push notification to your device');
                  } else {
                    Alert.alert('Failed', 'Could not send push notification, check console for details');
                  }
                } catch (e) {
                  console.error('Error sending remote test notification:', e);
                  Alert.alert('Error', 'Failed to send remote notification');
                }
              }}
            >
              <Text style={styles.testButtonText}>Test Push Notification</Text>
            </TouchableOpacity>
          </View>
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
  testButtonsContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  testTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  testButton: {
    marginVertical: 8,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});