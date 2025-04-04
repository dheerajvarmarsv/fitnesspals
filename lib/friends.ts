import { supabase } from './supabase';
import { 
  sendFriendRequestNotification, 
  sendFriendRequestAcceptedNotification 
} from './notificationService';

/**
 * friend_requests table
 */
export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  sender?: {
    id?: string;
    nickname: string;
    avatar_url: string;
  };
  receiver?: {
    id?: string;
    nickname: string;
    avatar_url: string;
  };
}

/**
 * friends table
 */
export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
  friend?: {
    id?: string;
    nickname: string;
    avatar_url: string;
    email: string;
  };
}

/**
 * 1) Get the current user's friends.
 */
export const getFriends = async (): Promise<Friend[]> => {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('friends')
    .select(`
      *,
      friend:profiles!friends_friend_id_fkey (
        id,
        nickname,
        avatar_url,
        email
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * 2) Get friend requests that the current user is RECEIVING (so the user is the receiver).
 *    We only show 'pending' requests for that user.
 *    => This ensures the SENDER does NOT see the request in their friend-requests list.
 */
export const getFriendRequests = async (): Promise<FriendRequest[]> => {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr) throw authErr;
  if (!user) throw new Error('Not authenticated');

  // Only show pending requests where the current user is the receiver.
  const { data, error } = await supabase
    .from('friend_requests')
    .select(`
      *,
      sender:profiles!friend_requests_sender_id_fkey (
        id,
        nickname,
        avatar_url
      ),
      receiver:profiles!friend_requests_receiver_id_fkey (
        id,
        nickname,
        avatar_url
      )
    `)
    .eq('receiver_id', user.id)       // <--- only if user is the receiver
    .eq('status', 'pending')         // <--- only pending
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * 3) Send a friend request by EXACT nickname (sender sees no request in their own list).
 */
export const sendFriendRequest = async (receiverNickname: string): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get the target user's profile
    const { data: targetUser, error: targetUserError } = await supabase
      .from('profiles')
      .select('id, nickname')
      .eq('nickname', receiverNickname)
      .single();

    if (targetUserError) throw targetUserError;
    if (!targetUser) throw new Error('User not found');

    // Check if users are already friends
    const { data: existingFriend } = await supabase
      .from('friends')
      .select('*')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${user.id})`)
      .maybeSingle();

    if (existingFriend) {
      throw new Error('You are already friends with this user');
    }

    // Check if a friend request already exists (in either direction)
    const { data: existingRequest, error: checkError } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetUser.id}),and(sender_id.eq.${targetUser.id},receiver_id.eq.${user.id})`)
      .not('status', 'eq', 'rejected')
      .maybeSingle();

    if (checkError) throw checkError;
    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        throw new Error(existingRequest.sender_id === user.id 
          ? 'Friend request already sent' 
          : 'This user has already sent you a friend request');
      } else if (existingRequest.status === 'blocked') {
        throw new Error('Unable to send friend request');
      }
    }

    // Get sender's profile for notification
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', user.id)
      .single();

    // Create the friend request
    const { data: requestData, error: insertError } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: user.id,
        receiver_id: targetUser.id,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Send notification
    try {
      await sendFriendRequestNotification(
        targetUser.id,
        senderProfile?.nickname || 'Someone'
      );
    } catch (notifError) {
      console.error('Failed to send notification:', notifError);
      // Don't fail the request if notification fails
    }

    return requestData;
  } catch (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }
};

/**
 * 4) Respond to a friend request (accept/reject/block).
 *    => Only the receiver can accept or reject. The sender does not see it in their friend-requests.
 *    => If accepted => symmetrical rows in 'friends' + remove from friend_requests
 *    => If rejected => remove from friend_requests
 *    => If blocked => update request row to 'blocked'
 */
export const respondToFriendRequest = async (
  requestId: string,
  status: 'accepted' | 'rejected' | 'blocked'
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Find the friend request
  const { data: friendReq, error: fetchErr } = await supabase
    .from('friend_requests')
    .select('*, sender:profiles!friend_requests_sender_id_fkey(nickname)')
    .eq('id', requestId)
    .single();

  if (fetchErr) throw fetchErr;
  if (!friendReq) throw new Error('Friend request not found');

  // Ensure the current user is the receiver if accepting/rejecting
  if (status !== 'blocked' && friendReq.receiver_id !== user.id) {
    throw new Error('Only the receiver can accept or reject this request');
  }

  try {
    if (status === 'accepted') {
      // Start a transaction
      // 1. Insert symmetrical friend rows
      const { error: insertErr } = await supabase.from('friends').insert([
        { user_id: friendReq.sender_id, friend_id: friendReq.receiver_id },
        { user_id: friendReq.receiver_id, friend_id: friendReq.sender_id },
      ]);
      if (insertErr) throw insertErr;

      // 2. Remove from friend_requests
      const { error: deleteErr } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId);
      if (deleteErr) throw deleteErr;

      // 3. Send notification to sender
      try {
        const { data: receiverProfile } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', user.id)
          .single();

        await sendFriendRequestAcceptedNotification(
          friendReq.sender_id,
          receiverProfile?.nickname || 'Someone'
        );
      } catch (notifError) {
        console.error('Failed to send acceptance notification:', notifError);
      }
    } else if (status === 'rejected') {
      // Simply delete the request
      const { error: deleteErr } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId);
      if (deleteErr) throw deleteErr;
    } else if (status === 'blocked') {
      // Update status to blocked
      const { error: updateErr } = await supabase
        .from('friend_requests')
        .update({ status: 'blocked' })
        .eq('id', requestId);
      if (updateErr) throw updateErr;
    }
  } catch (error) {
    console.error('Error responding to friend request:', error);
    throw error;
  }
};

/**
 * 5) Unfriend => remove symmetrical rows from 'friends'.
 */
export const removeFriend = async (friendId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('friends')
    .delete()
    .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);
  if (error) throw error;
};

/**
 * 6) Block => remove from 'friends' + set row to 'blocked'.
 */
export const blockUser = async (targetId: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Remove from friends
  await supabase
    .from('friends')
    .delete()
    .or(`and(user_id.eq.${user.id},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${user.id})`);

  // Check existing friend_requests row
  const { data: existingReq, error: existingErr } = await supabase
    .from('friend_requests')
    .select('*')
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${targetId}),and(sender_id.eq.${targetId},receiver_id.eq.${user.id})`)
    .single();
  if (existingErr && existingErr.code !== 'PGRST116') throw existingErr;

  if (!existingReq) {
    // Insert a blocked row
    const { error: insertErr } = await supabase.from('friend_requests').insert({
      sender_id: user.id,
      receiver_id: targetId,
      status: 'blocked',
    });
    if (insertErr) throw insertErr;
  } else {
    // Update existing to blocked
    const { error: updateErr } = await supabase
      .from('friend_requests')
      .update({ status: 'blocked' })
      .eq('id', existingReq.id);
    if (updateErr) throw updateErr;
  }
};

/**
 * 7) EXACT match search => excludes current user, existing friends, pending requests, private profiles.
 *    SENDER sees "Pending" if they've sent a request. RECEIVER won't see it in 'friend_requests' because we only fetch if user=receiver.
 */
export const searchUsers = async (query: string): Promise<any[]> => {
  try {
    const searchTerm = query.trim().toLowerCase();
    if (!searchTerm) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // 1) Exact nickname match
    const { data: found, error: searchErr } = await supabase
      .from('profiles')
      .select(`
        id,
        nickname,
        avatar_url,
        profile_settings (
          privacy_mode
        )
      `)
      .eq('nickname', searchTerm)
      .neq('id', user.id)
      .limit(10);
    if (searchErr) throw searchErr;
    if (!found || !found.length) return [];

    // 2) Non-rejected friend requests for the current user
    const { data: requests } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .not('status', 'eq', 'rejected');

    // 3) Existing friends for the current user
    const { data: friendRows } = await supabase
      .from('friends')
      .select('friend_id')
      .eq('user_id', user.id);

    // 4) Filter out private, existing friends, or pending requests
    return found.filter((u) => {
      const mode = (Array.isArray(u.profile_settings)
        ? u.profile_settings[0]?.privacy_mode
        : u.profile_settings?.privacy_mode) || 'public';
      if (mode === 'private') return false;

      const isFriend = friendRows?.some((f) => f.friend_id === u.id);
      const hasActiveRequest = requests?.some(
        (r) =>
          (r.sender_id === u.id || r.receiver_id === u.id) &&
          r.status !== 'rejected'
      );
      return !isFriend && !hasActiveRequest;
    });
  } catch (err) {
    console.error('searchUsers error:', err);
    throw err;
  }
};