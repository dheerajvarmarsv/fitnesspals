import { supabase } from './supabase';

export interface ProfileSettings {
  timezone: string;
  privacyMode: 'public' | 'friends' | 'private';
  useKilometers: boolean;
  notificationSettings: {
    challenges: boolean;
    chat: boolean;
    sync: boolean;
    friends: boolean;
    badges: boolean;
  };
}

export const updateProfileSettings = async (settings: Partial<ProfileSettings>) => {
  const { error } = await supabase.rpc('update_profile_settings', {
    p_timezone: settings.timezone,
    p_privacy_mode: settings.privacyMode,
    p_use_kilometers: settings.useKilometers,
    p_notification_settings: settings.notificationSettings ? {
      challenges: settings.notificationSettings.challenges,
      chat: settings.notificationSettings.chat,
      sync: settings.notificationSettings.sync,
      friends: settings.notificationSettings.friends,
      badges: settings.notificationSettings.badges,
    } : undefined,
  });

  if (error) throw error;
};

export const updatePassword = async (currentPassword: string, newPassword: string) => {
  // First verify current password
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });

  if (signInError) {
    throw new Error('Current password is incorrect');
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) throw updateError;
};

export const updateAvatar = async (avatarUrl: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarUrl })
    .eq('id', user.id);

  if (error) throw error;
};

export const updateNickname = async (nickname: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if nickname is already taken
  const { data: existingUsers, error: checkError } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', nickname.toLowerCase())
    .neq('id', user.id);

  if (checkError) throw checkError;

  if (existingUsers && existingUsers.length > 0) {
    throw new Error('This nickname is already taken');
  }

  const { error } = await supabase
    .from('profiles')
    .update({ nickname: nickname.toLowerCase() })
    .eq('id', user.id);

  if (error) throw error;
};

export const getProfileSettings = async (): Promise<ProfileSettings> => {
  const { data, error } = await supabase
    .from('profile_settings')
    .select('*')
    .single();

  if (error) throw error;

  return {
    timezone: data.timezone,
    privacyMode: data.privacy_mode,
    useKilometers: data.use_kilometers,
    notificationSettings: data.notification_settings,
  };
};