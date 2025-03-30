import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useUser } from '../../../../components/UserContext';
import { supabase } from '../../../../lib/supabase';
import { FitnessDataSource, saveFitnessConnection } from '../../../../lib/fitness';

export default function FitnessConnections() {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

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
    try {
      setLoading(true);
      setPermissionError(null);

      // IMPORTANT: Get user ID first and verify it exists
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !user.id) {
        setPermissionError('User authentication required. Please log in again.');
        return;
      }

      // Store the user ID in a local variable to ensure it's available
      const userId = user.id;
      console.log('Current user ID:', userId); // Debug log

      // Save the connection
      await saveFitnessConnection(userId, {
        type: source,
        connected: true,
        status: 'connected',
        permissions: [],
      });

      console.log('[Debug] Connection successful');

    } catch (err) {
      console.error('[Debug] Error connecting:', err);
      Alert.alert('Error', 'Failed to connect to health services. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return null; // Add your UI components here
} 