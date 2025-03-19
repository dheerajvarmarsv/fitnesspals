import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { initHealthKit, initAndroidHealth } from '../lib/fitness';

interface HealthPermissionsGuideProps {
  onPermissionsGranted?: () => void;
  visible: boolean;
  onClose: () => void;
}

export const HealthPermissionsGuide: React.FC<HealthPermissionsGuideProps> = ({
  onPermissionsGranted,
  visible,
  onClose
}) => {
  const [permissionStatus, setPermissionStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

  const requestHealthPermissions = async () => {
    setPermissionStatus('processing');
    try {
      let result = false;
      if (Platform.OS === 'ios') {
        result = await initHealthKit();
      } else if (Platform.OS === 'android') {
        result = await initAndroidHealth();
      }

      if (result) {
        setPermissionStatus('success');
        onPermissionsGranted?.();
      } else {
        setPermissionStatus('error');
      }
    } catch (error) {
      console.error('Health permissions error:', error);
      setPermissionStatus('error');
    }
  };

  return (
    <Modal 
      transparent 
      visible={visible} 
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Ionicons 
              name="fitness" 
              size={64} 
              color="#4A90E2" 
            />
          </View>

          <Text style={styles.title}>
            {Platform.OS === 'ios' 
              ? 'Enable HealthKit Access' 
              : 'Connect Health Services'}
          </Text>

          <Text style={styles.description}>
            Allow CTP to read your daily fitness metrics like steps, 
            distance, and calories to provide personalized insights 
            and track your progress.
          </Text>

          <View style={styles.permissionsList}>
            <View style={styles.permissionItem}>
              <Ionicons name="walk" size={24} color="#4A90E2" />
              <Text style={styles.permissionText}>Steps Tracking</Text>
            </View>
            <View style={styles.permissionItem}>
              <Ionicons name="pin" size={24} color="#4A90E2" />
              <Text style={styles.permissionText}>Distance Metrics</Text>
            </View>
            <View style={styles.permissionItem}>
              <Ionicons name="flame" size={24} color="#4A90E2" />
              <Text style={styles.permissionText}>Calorie Burn</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[
              styles.actionButton, 
              permissionStatus === 'processing' && styles.buttonDisabled
            ]}
            onPress={requestHealthPermissions}
            disabled={permissionStatus === 'processing'}
          >
            <Text style={styles.actionButtonText}>
              {permissionStatus === 'processing' 
                ? 'Processing...' 
                : 'Grant Permissions'}
            </Text>
          </TouchableOpacity>

          {permissionStatus === 'error' && (
            <Text style={styles.errorText}>
              Failed to connect health services. Please try again.
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  iconContainer: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 50,
    backgroundColor: 'rgba(74,144,226,0.1)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionsList: {
    width: '100%',
    marginBottom: 20,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  permissionText: {
    marginLeft: 10,
    fontSize: 16,
  },
  actionButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: 'red',
    marginTop: 10,
  },
});