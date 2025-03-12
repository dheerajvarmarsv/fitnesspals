// app/(tabs)/userprofile/profilesettings.tsx
import { useState } from 'react';
import { 
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SharedLayout from '../../../components/SharedLayout';
import { useUser } from '../../../components/UserContext';
import { supabase } from '../../../lib/supabase';
import DeleteAccountModal from '../../../components/DeleteAccountModal';
import { router } from 'expo-router';

export default function ProfileSettings() {
  const { settings, handleLogout } = useUser();
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // If needed, determine if settings are loaded
  const isLoaded = !!settings?.nickname;

  const confirmLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await handleLogout();
            } catch (e) {
              console.error('Error during logout:', e);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      const { error: deleteError } = await supabase.rpc('delete_user');
      if (deleteError) throw deleteError;
      await handleLogout();
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setLoading(false);
    }
  };

  const SETTINGS_ITEMS = [
    {
      id: 'fitness-connections',
      icon: '💪',
      title: 'Fitness Connections',
      description: 'Connect Apple Health, Google Fit, etc.',
      path: '/fitness-connections',
    },
    {
      id: 'device',
      icon: '📱',
      title: 'Connect a Device',
      description: 'Sync with your fitness tracker',
      path: '/device',
    },
    {
      id: 'privacy',
      icon: '🛡️',
      title: 'Privacy Settings',
      description: `Profile is ${settings.privacyMode}`,
      path: '/privacy',
    },
    {
      id: 'notifications',
      icon: '🔔',
      title: 'Push Notifications',
      description: 'Customize your alerts',
      path: '/notifications',
    },
    {
      id: 'password',
      icon: '🔑',
      title: 'Password',
      description: 'Update your password',
      path: '/password',
    },
    {
      id: 'units',
      icon: '📏',
      title: 'Distance Display',
      description: settings.useKilometers ? 'Using kilometers' : 'Using miles',
      path: '/units',
    },
  ];

  return (
    <SharedLayout style={styles.container}>
      {/* ScrollView to ensure the page expands on tall screens but can scroll on smaller ones */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: settings.avatarUrl }}
              style={styles.avatar}
            />
          </View>
          
          <View style={styles.nameContainer}>
            <TouchableOpacity onPress={() => router.push('/userprofile/nickname')}>
              <Text style={styles.name}>{isLoaded ? settings.nickname : 'Loading...'}</Text>
              <Text style={styles.nickname}>@{isLoaded ? settings.nickname : 'Loading...'}</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.email}>{isLoaded ? settings.email : 'Loading...'}</Text>
        </View>

        <View style={styles.settingsList}>
          {SETTINGS_ITEMS.map((item) => (
            <Link
              key={item.id}
              href={`/userprofile${item.path}`}
              asChild
            >
              <TouchableOpacity
                style={styles.settingsItem}
                disabled={loading}
              >
                <View style={styles.settingsItemLeft}>
                  <Text style={styles.settingsItemIcon}>{item.icon}</Text>
                  <View style={styles.settingsItemContent}>
                    <Text style={styles.settingsItemTitle}>{item.title}</Text>
                    <Text style={styles.settingsItemDescription}>
                      {item.description}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            </Link>
          ))}
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity 
            style={[styles.logoutButton, loading && styles.buttonDisabled]}
            onPress={confirmLogout}
            disabled={loading}
          >
            <Text style={styles.logoutButtonText}>
              {loading ? 'Signing out...' : 'Sign Out'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.deleteButton, loading && styles.buttonDisabled]}
            onPress={() => setShowDeleteModal(true)}
            disabled={loading}
          >
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>

          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>Version 1.0.0</Text>
            <TouchableOpacity>
              <Text style={styles.rateText}>Rate Us!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        loading={loading}
      />
    </SharedLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  // Allows the content to fill the screen or scroll if it exceeds
  scrollContent: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editIconContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#4A90E2',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  nameContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  nickname: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#999',
  },
  settingsList: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  settingsItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  settingsItemContent: {
    flex: 1,
  },
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingsItemDescription: {
    fontSize: 14,
    color: '#666',
  },
  bottomSection: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  logoutButton: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoutButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    marginBottom: 24,
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  versionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  versionText: {
    color: '#999',
    marginRight: 8,
  },
  rateText: {
    color: '#4A90E2',
    fontWeight: '600',
  },
});