import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useUser } from '../../../../components/UserContext';
import { supabase } from '../../../../lib/supabase';
import { FitnessDataSource } from '../../../../lib/fitness';

export default function FitnessConnections() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Initialize user ID on mount
  useEffect(() => {
    const initUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        console.log('[Debug] Auth user from getUser:', authUser);
        console.log('[Debug] Auth user ID:', authUser?.id);
        if (authUser?.id) {
          console.log('[Debug] Setting currentUserId to:', authUser.id);
          setCurrentUserId(authUser.id);
        } else {
          console.warn('[Debug] No auth user ID available');
        }
      } catch (error) {
        console.error('[Debug] Error getting auth user:', error);
      }
    };

    initUser();
  }, []);

  // Log changes in user state
  useEffect(() => {
    console.log('[Debug] Context user:', user);
    console.log('[Debug] Context user ID:', user?.id);
    console.log('[Debug] Current user ID state:', currentUserId);
  }, [user, currentUserId]);

  const handleConnect = async (source: FitnessDataSource) => {
    console.log('[Debug] Starting handleConnect');
    console.log('[Debug] Current user context:', user);
    console.log('[Debug] Current user ID from state:', currentUserId);
    
    // Get current session
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[Debug] Current session:', session);
    console.log('[Debug] Session user:', session?.user);
    
    const userId = session?.user?.id;
    console.log('[Debug] Using user ID:', userId);
    
    if (!userId) {
      console.error('[Debug] No user ID available');
      Alert.alert('Error', 'Please login to connect health services');
      return;
    }

    try {
      setLoading(true);
      console.log('[Debug] Attempting connection for user:', userId, 'source:', source);

      // First check if a connection already exists
      const { data: existingConnection, error: checkError } = await supabase
        .from('user_fitness_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('type', source)
        .single();

      console.log('[Debug] Existing connection check result:', { existingConnection, checkError });

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('[Debug] Error checking existing connection:', checkError);
        throw checkError;
      }

      const connectionData = {
        user_id: userId,
        type: source,
        connected: true,
        status: 'connected',
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        permissions: [],
        last_synced: null,
        device_info: null,
        last_sync_status: null,
        last_sync_error: null,
        last_sync_count: 0
      };

      console.log('[Debug] Connection data to insert/update:', connectionData);

      let result;
      if (existingConnection) {
        console.log('[Debug] Updating existing connection:', existingConnection.id);
        // Update existing connection
        result = await supabase
          .from('user_fitness_connections')
          .update({
            connected: true,
            status: 'connected',
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConnection.id)
          .eq('user_id', userId)
          .select()
          .single();
      } else {
        console.log('[Debug] Creating new connection with data:', connectionData);
        // Insert new connection
        const { data: insertedData, error: insertError } = await supabase
          .from('user_fitness_connections')
          .insert([connectionData])
          .select()
          .single();

        console.log('[Debug] Insert result:', { insertedData, insertError });

        if (insertError) {
          console.error('[Debug] Insert error:', insertError);
          throw insertError;
        }

        result = { data: insertedData, error: null };
      }

      if (result.error) {
        console.error('[Debug] Database operation failed:', result.error);
        throw result.error;
      }

      console.log('[Debug] Connection successful:', result.data);

    } catch (err) {
      console.error('[Debug] Error connecting:', err);
      Alert.alert('Error', 'Failed to connect to health services. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return null; // Add your UI components here
} 