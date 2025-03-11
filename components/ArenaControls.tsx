import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Dimensions } from 'react-native';
import { ChevronUp, ChevronDown, Dumbbell, Shield } from 'lucide-react-native';
import { useArenaStore } from '../lib/arenaStore';

const { width } = Dimensions.get('window');

export const ArenaControls = () => {
  const arenaStore = useArenaStore();
  const { currentUser, safeZoneRadius } = arenaStore;
  
  // Define the functions we'll use (implementation to match new Arena store structure)
  const moveUserTowardSafeZone = () => {
    // This would be implemented in arenaStore
    console.log('Moving user toward safe zone');
  };
  
  const shrinkSafeZone = () => {
    // This would be implemented in arenaStore
    console.log('Shrinking safe zone');
  };
  
  const expandSafeZone = () => {
    // This would be implemented in arenaStore
    console.log('Expanding safe zone');
  };
  
  // Determine if user is in danger zone
  const isInDanger = currentUser ? 
    currentUser.distance > safeZoneRadius : false;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button, 
          styles.primaryButton,
          isInDanger && styles.dangerButton
        ]}
        onPress={moveUserTowardSafeZone}
        activeOpacity={0.8}
      >
        <Dumbbell size={24} color="#ffffff" style={styles.buttonIcon} />
        <Text style={styles.buttonText}>
          {isInDanger ? 'Complete Workout Now!' : 'Complete Workout'}
        </Text>
      </TouchableOpacity>
      
      <View style={styles.zoneControls}>
        <TouchableOpacity
          style={[styles.zoneButton, styles.expandButton]}
          onPress={expandSafeZone}
          activeOpacity={0.8}
        >
          <Shield size={20} color="#ffffff" style={styles.buttonIcon} />
          <ChevronUp size={20} color="#ffffff" />
          <Text style={styles.zoneButtonText}>Expand Safe Zone</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.zoneButton, styles.shrinkButton]}
          onPress={shrinkSafeZone}
          activeOpacity={0.8}
        >
          <Shield size={20} color="#ffffff" style={styles.buttonIcon} />
          <ChevronDown size={20} color="#ffffff" />
          <Text style={styles.zoneButtonText}>Shrink Safe Zone</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {isInDanger 
            ? "⚠️ You're in the danger zone! Complete a workout to move to safety."
            : "✅ You're in the safe zone. Keep up the good work!"}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  button: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  primaryButton: {
    backgroundColor: '#22c55e',
    // Add subtle gradient effect with shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  dangerButton: {
    backgroundColor: '#ef4444',
    // Add pulsing animation effect (in real app, would use Animated API)
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  zoneControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  zoneButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  expandButton: {
    backgroundColor: '#3b82f6',
  },
  shrinkButton: {
    backgroundColor: '#ef4444',
  },
  zoneButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  infoContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    alignItems: 'center',
  },
  infoText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
  },
});