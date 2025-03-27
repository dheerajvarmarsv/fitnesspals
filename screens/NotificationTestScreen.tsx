import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { registerForPushNotifications, unregisterFromPushNotifications, sendTestNotification } from '../lib/notificationService';
import { logNotificationEvent } from '../lib/notificationDebug';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import SharedLayout from '../components/SharedLayout';

export default function NotificationTestScreen() {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchCurrentStatus();
    fetchRecentLogs();
  }, []);

  const fetchCurrentStatus = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profile_settings')
        .select('push_token, notifications_enabled, notification_settings')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setSettings(data);
      setToken(data?.push_token);
      setLoading(false);
    } catch (e) {
      console.error('Error fetching status:', e);
      setLoading(false);
    }
  };

  const fetchRecentLogs = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('notification_debug')
        .select('*')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (error) throw error;
      setLogs(data || []);
      setLoading(false);
    } catch (e) {
      console.error('Error fetching logs:', e);
      setLoading(false);
    }
  };

  const registerToken = async () => {
    setLoading(true);
    try {
      const newToken = await registerForPushNotifications();
      setToken(newToken);
      Alert.alert('Success', newToken ? 'Token registered' : 'Failed to register token');
      fetchCurrentStatus();
      fetchRecentLogs();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const unregisterToken = async () => {
    setLoading(true);
    try {
      await unregisterFromPushNotifications();
      setToken(null);
      Alert.alert('Success', 'Token unregistered');
      fetchCurrentStatus();
      fetchRecentLogs();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const checkPermission = async () => {
    setLoading(true);
    try {
      const { status } = await Notifications.getPermissionsAsync();
      await logNotificationEvent('permission_check', `Current permission status: ${status}`);
      Alert.alert('Permission Status', `Current status: ${status}`);
      fetchRecentLogs();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const sendLocalTest = async () => {
    setLoading(true);
    try {
      await logNotificationEvent('local_test_start', 'Starting local notification test');
      await sendTestNotification();
      await logNotificationEvent('local_test_success', 'Local notification sent successfully');
      Alert.alert('Success', 'Local notification sent');
      fetchRecentLogs();
    } catch (e: any) {
      await logNotificationEvent('local_test_error', 'Error sending local notification', {
        error: e.message
      });
      Alert.alert('Error', e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const sendDirectTest = async () => {
    setLoading(true);
    try {
      if (!token) {
        Alert.alert('Error', 'No push token available');
        return;
      }

      await logNotificationEvent('direct_test_start', 'Starting direct push test', {
        pushToken: token
      });

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          title: 'Direct Test',
          body: 'This is a direct test notification',
          data: { screen: 'friends' },
          sound: 'default',
          channelId: 'default',
        }),
      });

      const result = await response.json();
      
      await logNotificationEvent('direct_test_complete', 'Completed direct push test', {
        response: result
      });

      Alert.alert(
        'Test Result', 
        `Status: ${result?.data?.status || 'unknown'}\n\nDetails: ${JSON.stringify(result, null, 2)}`
      );
      
      fetchRecentLogs();
    } catch (e: any) {
      await logNotificationEvent('direct_test_error', 'Error in direct test', {
        error: e.message
      });
      Alert.alert('Error', e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SharedLayout>
      <View style={styles.container}>
        <Text style={styles.title}>Notification Testing</Text>
        
        <View style={styles.statusContainer}>
          <Text style={styles.sectionTitle}>Current Status</Text>
          <Text style={styles.statusText}>Push Token: {token ? '✅' : '❌'}</Text>
          <Text style={styles.statusText}>Token: {token || 'Not registered'}</Text>
          <Text style={styles.statusText}>Notifications Enabled: {settings?.notifications_enabled ? '✅' : '❌'}</Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.button}
            onPress={registerToken}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Register Token</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={unregisterToken}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Unregister Token</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={checkPermission}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Check Permission</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={sendLocalTest}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Send Local Test</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={sendDirectTest}
            disabled={loading || !token}
          >
            <Text style={styles.buttonText}>Send Direct Test</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={fetchRecentLogs}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Refresh Logs</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.sectionTitle}>Recent Logs</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#000" />
        ) : (
          <ScrollView style={styles.logsContainer}>
            {logs.map((log, index) => (
              <View key={index} style={styles.logItem}>
                <Text style={styles.logTime}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </Text>
                <Text style={styles.logType}>{log.event_type}</Text>
                <Text style={styles.logDesc}>{log.description}</Text>
                {log.error && <Text style={styles.logError}>Error: {log.error}</Text>}
              </View>
            ))}
            {logs.length === 0 && (
              <Text style={styles.emptyText}>No logs found</Text>
            )}
          </ScrollView>
        )}
      </View>
    </SharedLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    marginBottom: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    width: '48%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  logsContainer: {
    flex: 1,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
  },
  logItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  logTime: {
    fontSize: 12,
    color: '#666',
  },
  logType: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  logDesc: {
    fontSize: 14,
  },
  logError: {
    fontSize: 14,
    color: 'red',
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
    color: '#666',
  }
});