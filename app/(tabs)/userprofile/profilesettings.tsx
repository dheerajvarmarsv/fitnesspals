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
  Platform,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SharedLayout from '../../../components/SharedLayout';
import { useUser } from '../../../components/UserContext';
import { useTheme } from '../../../lib/ThemeContext';
import { supabase } from '../../../lib/supabase';
import DeleteAccountModal from '../../../components/DeleteAccountModal';
import { router } from 'expo-router';

export default function ProfileSettings() {
  const { settings, handleLogout } = useUser();
  const { theme, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

  // SETTINGS SECTIONS (Unified health connection UI)
  const SETTINGS_SECTIONS = [
    {
      title: 'ACCOUNT',
      items: [
        {
          id: 'nickname',
          icon: 'person',
          iconBgColor: theme.colors.primary,
          iconColor: '#fff',
          title: 'Profile Name',
          description: settings.nickname || 'Set a nickname',
          path: '/nickname',
          hasChevron: true,
        },
        {
          id: 'password',
          icon: 'key',
          iconBgColor: theme.colors.warning,
          iconColor: '#fff',
          title: 'Password',
          description: 'Update your password',
          path: '/password',
          hasChevron: true,
        },
      ],
    },
    // Health & Fitness section temporarily hidden
    // {
    //   title: 'HEALTH & FITNESS',
    //   items: [
    //     {
    //       id: 'fitness-connections',
    //       icon: 'fitness',
    //       iconBgColor: theme.colors.success,
    //       iconColor: '#fff',
    //       title: 'Health Services',
    //       description: 'Connect to Apple Health or Google Fit',
    //       path: '/fitness-connections',
    //       hasChevron: true,
    //     },
    //   ],
    // },
    {
      title: 'PREFERENCES',
      items: [
        {
          id: 'notifications',
          icon: 'notifications',
          iconBgColor: theme.colors.primary,
          iconColor: '#fff',
          title: 'Notifications',
          description: 'Customize your alerts',
          path: '/notifications',
          hasChevron: true,
        },
        {
          id: 'privacy',
          icon: 'shield',
          iconBgColor: theme.colors.success,
          iconColor: '#fff',
          title: 'Privacy Settings',
          description: `Profile is ${settings.privacyMode}`,
          path: '/privacy',
          hasChevron: true,
        },
        {
          id: 'units',
          icon: 'speedometer',
          iconBgColor: theme.colors.info,
          iconColor: '#fff',
          title: 'Distance Display',
          description: settings.useKilometers ? 'Using kilometers' : 'Using miles',
          path: '/units',
          hasChevron: true,
        },
      ],
    },
  ];

  const renderSettingItem = (item: any) => {
    const itemContent = (
      <View style={[styles.settingRow, { borderBottomColor: theme.colors.divider }]}>
        <View style={[styles.iconContainer, { backgroundColor: item.iconBgColor }]}>
          <Ionicons name={item.icon} size={22} color={item.iconColor} />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: theme.colors.textPrimary }]}>{item.title}</Text>
          {item.description && (
            <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
              {item.description}
            </Text>
          )}
        </View>
        {item.hasChevron && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.textTertiary}
            style={styles.chevron}
          />
        )}
      </View>
    );

    // If path is provided, wrap in a Link; otherwise, use onPress
    if (item.path) {
      return (
        <Link key={item.id} href={`/userprofile${item.path}`} asChild>
          <TouchableOpacity disabled={loading}>{itemContent}</TouchableOpacity>
        </Link>
      );
    }
    return (
      <TouchableOpacity
        key={item.id}
        disabled={loading}
        onPress={() => {
          // Handle any non-link item actions here
        }}
      >
        {itemContent}
      </TouchableOpacity>
    );
  };

  const renderSection = (section: any, index: number) => (
    <View key={`section-${index}`} style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{section.title}</Text>
      <View
        style={[
          styles.sectionContent,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.border,
            ...theme.elevation.small,
          },
        ]}
      >
        {section.items.map(renderSettingItem)}
      </View>
    </View>
  );

  return (
    <SharedLayout style={{ backgroundColor: theme.colors.background }}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileContainer}>
          <TouchableOpacity style={styles.avatarContainer}>
            <Image source={{ uri: settings.avatarUrl }} style={styles.avatar} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/userprofile/nickname')} style={styles.nameContainer}>
            <Text style={[styles.username, { color: theme.colors.textPrimary }]}>{settings.nickname || 'Set Nickname'}</Text>
            <Text style={[styles.handle, { color: theme.colors.textSecondary }]}>{settings.nickname?.toLowerCase() || 'user'}</Text>
          </TouchableOpacity>
          <Text style={[styles.email, { color: theme.colors.textTertiary }]}>{settings.email}</Text>
        </View>

        {/* Settings Sections */}
        <View style={styles.settingsContainer}>
          {SETTINGS_SECTIONS.map(renderSection)}
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.signOutButton, loading && styles.buttonDisabled, { backgroundColor: theme.colors.card }]}
            onPress={confirmLogout}
            disabled={loading}
          >
            <Text style={[styles.signOutText, { color: theme.colors.textPrimary }]}>{loading ? 'Signing out...' : 'Sign Out'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.deleteButton,
              loading && styles.buttonDisabled,
              { backgroundColor: isDark ? 'rgba(220, 38, 38, 0.15)' : '#FEE2E2' },
            ]}
            onPress={() => setShowDeleteModal(true)}
            disabled={loading}
          >
            <Text style={[styles.deleteText, { color: theme.colors.danger }]}>Delete Account</Text>
          </TouchableOpacity>
          <View style={styles.versionContainer}>
            <Text style={[styles.versionText, { color: theme.colors.textTertiary }]}>Version 1.0.0</Text>
            <TouchableOpacity>
              <Text style={{ color: theme.colors.primary }}>Rate Us!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Delete Account Modal */}
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
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  profileContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  nameContainer: { alignItems: 'center', marginBottom: 4 },
  username: { fontSize: 24, fontWeight: '600', marginBottom: 4, textAlign: 'center' },
  handle: { fontSize: 16, marginBottom: 4, textAlign: 'center' },
  email: { fontSize: 14, marginTop: 4 },
  settingsContainer: { marginBottom: 24 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 16 },
  sectionContent: {
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
    borderWidth: Platform.OS === 'ios' ? 0 : 1,
  },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  settingTextContainer: { flex: 1, justifyContent: 'center' },
  settingTitle: { fontSize: 16, fontWeight: '500' },
  settingDescription: { fontSize: 14, marginTop: 2 },
  chevron: { marginLeft: 8 },
  actionsContainer: { paddingHorizontal: 16, marginTop: 8 },
  signOutButton: { paddingVertical: 16, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  signOutText: { fontSize: 16, fontWeight: '500' },
  deleteButton: { paddingVertical: 16, borderRadius: 8, alignItems: 'center' },
  deleteText: { fontSize: 16, fontWeight: '500' },
  buttonDisabled: { opacity: 0.6 },
  versionContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  versionText: { marginRight: 8 },
});