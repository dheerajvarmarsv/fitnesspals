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
  Switch,
  Platform,
  SafeAreaView
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../../components/UserContext';
import { supabase } from '../../../lib/supabase';
import DeleteAccountModal from '../../../components/DeleteAccountModal';
import { router } from 'expo-router';

export default function ProfileSettings() {
  const { settings, handleLogout } = useUser();
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

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
    } catch (e) {
      Alert.alert('Error', e.message);
      setLoading(false);
    }
  };

  // Settings sections data
  const SETTINGS_SECTIONS = [
    {
      title: "ACCOUNT",
      items: [
        {
          id: 'nickname',
          icon: 'person',
          iconBgColor: '#E0F2FE',
          iconColor: '#0EA5E9',
          title: 'Profile Name',
          description: settings.nickname || 'Set a nickname',
          path: '/nickname',
          hasChevron: true,
        },
        {
          id: 'avatar',
          icon: 'image',
          iconBgColor: '#DBEAFE',
          iconColor: '#3B82F6',
          title: 'Avatar',
          description: 'Change your profile picture',
          path: '/avatar',
          hasChevron: true,
        },
        {
          id: 'password',
          icon: 'key',
          iconBgColor: '#FEF3C7',
          iconColor: '#F59E0B',
          title: 'Password',
          description: 'Update your password',
          path: '/password',
          hasChevron: true,
        },
      ]
    },
    {
      title: "CONNECTIONS",
      items: [
        {
          id: 'fitness-connections',
          icon: 'fitness',
          iconBgColor: '#FEF2F2',
          iconColor: '#EF4444',
          title: 'Fitness Connections',
          description: 'Connect Apple Health, Google Fit, etc.',
          path: '/fitness-connections',
          hasChevron: true,
        },
        {
          id: 'device',
          icon: 'watch',
          iconBgColor: '#F3F4F6',
          iconColor: '#6B7280',
          title: 'Connect a Device',
          description: 'Sync with your fitness tracker',
          path: '/device',
          hasChevron: true,
        },
      ]
    },
    {
      title: "PREFERENCES",
      items: [
        {
          id: 'language',
          icon: 'language',
          iconBgColor: '#FEEFE3',
          iconColor: '#F97316',
          title: 'Language',
          value: 'English',
          hasChevron: true,
          disabled: true,
        },
        {
          id: 'notifications',
          icon: 'notifications',
          iconBgColor: '#E0F2FE',
          iconColor: '#0EA5E9',
          title: 'Notifications',
          description: 'Customize your alerts',
          path: '/notifications',
          hasChevron: true,
        },
        {
          id: 'dark-mode',
          icon: 'moon',
          iconBgColor: '#EDE9FE',
          iconColor: '#8B5CF6',
          title: 'Dark Mode',
          component: (
            <Switch
              value={isDarkMode}
              onValueChange={setIsDarkMode}
              trackColor={{ false: '#E5E7EB', true: '#4A90E2' }}
              thumbColor="#FFFFFF"
            />
          ),
        },
        {
          id: 'privacy',
          icon: 'shield',
          iconBgColor: '#ECFDF5',
          iconColor: '#10B981',
          title: 'Privacy Settings',
          description: `Profile is ${settings.privacyMode}`,
          path: '/privacy',
          hasChevron: true,
        },
        {
          id: 'units',
          icon: 'speedometer',
          iconBgColor: '#E0F2FE',
          iconColor: '#0284C7',
          title: 'Distance Display',
          description: settings.useKilometers ? 'Using kilometers' : 'Using miles',
          path: '/units',
          hasChevron: true,
        },
      ]
    },
    {
      title: "SUPPORT",
      items: [
        {
          id: 'help',
          icon: 'help-circle',
          iconBgColor: '#FFEDD5',
          iconColor: '#F59E0B',
          title: 'Help',
          hasChevron: true,
          disabled: true,
        },
      ]
    }
  ];

  // Render a single setting item
  const renderSettingItem = (item) => {
    const itemContent = (
      <View style={styles.settingRow}>
        <View style={[styles.iconContainer, { backgroundColor: item.iconBgColor }]}>
          <Ionicons name={item.icon} size={22} color={item.iconColor} />
        </View>
        
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>{item.title}</Text>
          {item.description && (
            <Text style={styles.settingDescription}>{item.description}</Text>
          )}
          {item.value && (
            <Text style={styles.settingValue}>{item.value}</Text>
          )}
        </View>
        
        {item.component || (item.hasChevron && (
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color="#D1D5DB" 
            style={styles.chevron} 
          />
        ))}
      </View>
    );

    if (item.disabled) {
      return (
        <View key={item.id} style={[styles.settingItem, { opacity: 0.8 }]}>
          {itemContent}
        </View>
      );
    }

    if (item.path) {
      return (
        <Link key={item.id} href={`/userprofile${item.path}`} asChild>
          <TouchableOpacity style={styles.settingItem} disabled={loading}>
            {itemContent}
          </TouchableOpacity>
        </Link>
      );
    }

    return (
      <View key={item.id} style={styles.settingItem}>
        {itemContent}
      </View>
    );
  };

  // Render a section with title and items
  const renderSection = (section, index) => {
    return (
      <View key={`section-${index}`} style={styles.section}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <View style={styles.sectionContent}>
          {section.items.map(renderSettingItem)}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileContainer}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={() => router.push('/userprofile/avatar')}
          >
            <Image
              source={{ uri: settings.avatarUrl }}
              style={styles.avatar}
            />
            <View style={styles.cameraIconContainer}>
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => router.push('/userprofile/nickname')}
          >
            <Text style={styles.username}>{settings.nickname || 'Set Nickname'}</Text>
            <Text style={styles.handle}>@{settings.nickname?.toLowerCase() || 'user'}</Text>
          </TouchableOpacity>
          
          <Text style={styles.email}>{settings.email}</Text>
        </View>

        <View style={styles.settingsContainer}>
          {SETTINGS_SECTIONS.map(renderSection)}
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.signOutButton, loading && styles.buttonDisabled]}
            onPress={confirmLogout}
            disabled={loading}
          >
            <Text style={styles.signOutText}>
              {loading ? 'Signing out...' : 'Sign Out'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, loading && styles.buttonDisabled]}
            onPress={() => setShowDeleteModal(true)}
            disabled={loading}
          >
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        loading={loading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  profileContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
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
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4A90E2',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  username: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  handle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  settingsContainer: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    marginLeft: 16,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      }
    }),
  },
  settingItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  settingValue: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  chevron: {
    marginLeft: 8,
  },
  actionsContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  signOutButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#DC2626',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});