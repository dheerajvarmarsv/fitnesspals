import { useState, useEffect } from 'react';
import { 
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  TextInput,
  Modal,
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SharedLayout from '../../components/SharedLayout';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../components/UserContext';

interface Activity {
  id: string;
  user_id: string;
  activity_type: string;
  duration: number;
  distance: number | null;
  calories: number | null;
  notes: string | null;
  created_at: string;
  source: 'manual' | 'device';
  device_type: string | null;
}

interface DeviceInfo {
  type: 'apple' | 'google' | 'fitbit';
  name: string;
  icon: string;
  platform: 'ios' | 'android' | 'all';
}

const DEVICES: DeviceInfo[] = [
  {
    type: 'apple',
    name: 'Apple Health',
    icon: 'https://cdn-icons-png.flaticon.com/128/831/831515.png',
    platform: 'ios',
  },
  {
    type: 'google',
    name: 'Google Fit',
    icon: 'https://cdn-icons-png.flaticon.com/128/2702/2702154.png',
    platform: 'android',
  },
  {
    type: 'fitbit',
    name: 'Fitbit',
    icon: 'https://cdn-icons-png.flaticon.com/128/2702/2702134.png',
    platform: 'all',
  },
];

const ACTIVITY_TYPES = [
  { id: 'walking', name: 'Walking', icon: '🚶‍♂️' },
  { id: 'running', name: 'Running', icon: '🏃‍♂️' },
  { id: 'cycling', name: 'Cycling', icon: '🚴‍♂️' },
  { id: 'swimming', name: 'Swimming', icon: '🏊‍♂️' },
  { id: 'hiking', name: 'Hiking', icon: '🏃‍♂️' },
  { id: 'yoga', name: 'Yoga', icon: '🧘‍♂️' },
];

export default function Home() {
  const { settings, isOnline, hasLoadedInitialSettings } = useUser();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Activity logging
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Device connection
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (hasLoadedInitialSettings) {
      loadActivities();
    }
  }, [hasLoadedInitialSettings]);

  const loadActivities = async () => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      setActivities(data as Activity[]);
    } catch (e: any) {
      if (e.message !== 'Not authenticated') {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddActivity = async () => {
    if (!selectedActivity || !duration) {
      setError('Activity type and duration are required');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: insertError } = await supabase
        .from('activities')
        .insert({
          user_id: user.id,
          activity_type: selectedActivity,
          duration: parseInt(duration),
          distance: distance ? parseFloat(distance) : null,
          calories: calories ? parseInt(calories) : null,
          notes: notes || null,
          source: 'manual',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setActivities((prev) => [data as Activity, ...prev]);
      setShowAddActivity(false);
      resetForm();
    } catch (e: any) {
      console.error('Error adding activity:', e);
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedActivity(null);
    setDuration('');
    setDistance('');
    setCalories('');
    setNotes('');
    setError(null);
  };

  const handleConnectDevice = async (device: DeviceInfo) => {
    if (!isOnline) {
      setError('You need to be online to connect a device');
      return;
    }

    try {
      setSelectedDevice(device);
      setConnecting(true);
      setError(null);

      // Simulate device connection
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Real app would do OAuth or SDK init here
      setShowDeviceModal(false);
    } catch (e: any) {
      console.error('Error connecting device:', e);
      setError(e.message);
    } finally {
      setConnecting(false);
      setSelectedDevice(null);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDistance = (km: number) => {
    return settings.useKilometers
      ? `${km.toFixed(2)} km`
      : `${(km * 0.621371).toFixed(2)} mi`;
  };

  if (!hasLoadedInitialSettings || loading) {
    return (
      <SharedLayout style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF4B4B" />
          <Text style={styles.loadingText}>Loading your activities...</Text>
        </View>
      </SharedLayout>
    );
  }

  return (
    <SharedLayout style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Ionicons name="menu" size={24} color="#fff" />
        </TouchableOpacity>
        <Image
          source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Strava_Logo.svg/2560px-Strava_Logo.svg.png' }}
          style={styles.logo}
          resizeMode="contain"
        />
        <TouchableOpacity>
          <Ionicons name="sync" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>YOUR ACTIVITY</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddActivity(true)}
          >
            <Text style={styles.addButtonText}>+ Add activity</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.deviceCard}
          onPress={() => setShowDeviceModal(true)}
        >
          <View style={styles.deviceHeader}>
            <Ionicons name="warning" size={20} color="#FF4B4B" />
            <Text style={styles.deviceText}>No device connected</Text>
            <TouchableOpacity>
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.deviceContent}>
            <Text style={styles.deviceTitle}>CONNECT YOUR DEVICE</Text>
            <Text style={styles.deviceDescription}>
              Connect your fitness tracker to automatically sync your activities.
            </Text>
            <TouchableOpacity
              style={styles.connectButton}
              onPress={() => setShowDeviceModal(true)}
            >
              <Text style={styles.connectButtonText}>Connect device</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <ScrollView
          style={styles.activitiesList}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {activities.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No activities yet</Text>
              <Text style={styles.emptyText}>
                Start tracking your fitness journey by adding your first activity!
              </Text>
            </View>
          ) : (
            activities.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={styles.activityIcon}>
                  <Text style={styles.activityEmoji}>
                    {ACTIVITY_TYPES.find((t) => t.id === activity.activity_type)?.icon}
                  </Text>
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityType}>
                    {ACTIVITY_TYPES.find((t) => t.id === activity.activity_type)?.name}
                  </Text>
                  <Text style={styles.activityMeta}>
                    {formatDuration(activity.duration)}
                    {activity.distance && ` • ${formatDistance(activity.distance)}`}
                    {activity.calories && ` • ${activity.calories} cal`}
                  </Text>
                  {activity.notes && (
                    <Text style={styles.activityNotes}>{activity.notes}</Text>
                  )}
                </View>
                <Text style={styles.activityTime}>
                  {new Date(activity.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Add Activity Modal */}
      <Modal
        visible={showAddActivity}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddActivity(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Activity</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddActivity(false);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Activity Type</Text>
              <View style={styles.activityTypes}>
                {ACTIVITY_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.activityTypeButton,
                      selectedActivity === type.id && styles.activityTypeSelected,
                    ]}
                    onPress={() => setSelectedActivity(type.id)}
                  >
                    <Text style={styles.activityTypeEmoji}>{type.icon}</Text>
                    <Text
                      style={[
                        styles.activityTypeName,
                        selectedActivity === type.id && styles.activityTypeNameSelected,
                      ]}
                    >
                      {type.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Duration (minutes)</Text>
              <TextInput
                style={styles.input}
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
                placeholder="Enter duration"
              />

              <Text style={styles.inputLabel}>Distance (km)</Text>
              <TextInput
                style={styles.input}
                value={distance}
                onChangeText={setDistance}
                keyboardType="numeric"
                placeholder="Optional"
              />

              <Text style={styles.inputLabel}>Calories</Text>
              <TextInput
                style={styles.input}
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
                placeholder="Optional"
              />

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional"
                multiline
              />

              {error && (
                <View style={styles.modalError}>
                  <Text style={styles.modalErrorText}>{error}</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!selectedActivity || !duration || submitting) && styles.saveButtonDisabled,
                ]}
                onPress={handleAddActivity}
                disabled={!selectedActivity || !duration || submitting}
              >
                <Text style={styles.saveButtonText}>
                  {submitting ? 'Saving...' : 'Save Activity'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Device Connection Modal */}
      <Modal
        visible={showDeviceModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDeviceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Connect Device</Text>
              <TouchableOpacity onPress={() => setShowDeviceModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {DEVICES.filter((device) =>
                device.platform === 'all' || device.platform === Platform.OS
              ).map((device) => (
                <TouchableOpacity
                  key={device.type}
                  style={[
                    styles.deviceOption,
                    connecting && selectedDevice?.type === device.type && styles.deviceOptionConnecting,
                  ]}
                  onPress={() => handleConnectDevice(device)}
                  disabled={connecting}
                >
                  <Image source={{ uri: device.icon }} style={styles.deviceIcon} />
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceStatus}>
                      {connecting && selectedDevice?.type === device.type
                        ? 'Connecting...'
                        : 'Tap to connect'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#666" />
                </TouchableOpacity>
              ))}

              {error && (
                <View style={styles.modalError}>
                  <Text style={styles.modalErrorText}>{error}</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SharedLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FF4B4B',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FF4B4B',
  },
  logo: {
    width: 120,
    height: 30,
    tintColor: '#fff',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#FF4B4B',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  deviceCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deviceText: {
    flex: 1,
    marginLeft: 10,
    color: '#FF4B4B',
    fontWeight: '600',
  },
  deviceContent: {
    padding: 16,
    alignItems: 'center',
  },
  deviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  deviceDescription: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  connectButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
  },
  connectButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
  },
  activitiesList: {
    flex: 1,
    marginTop: 8,
    marginHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityEmoji: {
    fontSize: 20,
  },
  activityInfo: {
    flex: 1,
  },
  activityType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  activityMeta: {
    fontSize: 14,
    color: '#666',
  },
  activityNotes: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  activityTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  activityTypeButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  activityTypeSelected: {
    backgroundColor: '#FF4B4B',
  },
  activityTypeEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  activityTypeName: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  activityTypeNameSelected: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalError: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  modalErrorText: {
    color: '#DC2626',
    textAlign: 'center',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  saveButton: {
    backgroundColor: '#FF4B4B',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deviceOptionConnecting: {
    opacity: 0.5,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    marginRight: 16,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  deviceStatus: {
    fontSize: 14,
    color: '#666',
  },
});