import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HealthConnectionStatusProps {
  status: 'connected' | 'disconnected' | 'pending';
}

export const HealthConnectionStatus: React.FC<HealthConnectionStatusProps> = ({ 
  status 
}) => {
  const getStatusConfig = () => {
    switch(status) {
      case 'connected':
        return { 
          color: '#4CAF50', 
          icon: 'checkmark-circle', 
          text: 'Health Services Connected' 
        };
      case 'disconnected':
        return { 
          color: '#F44336', 
          icon: 'alert-circle', 
          text: 'Health Services Disconnected' 
        };
      case 'pending':
        return { 
          color: '#FFC107', 
          icon: 'sync', 
          text: 'Connecting Health Services...' 
        };
    }
  };

  const { color, icon, text } = getStatusConfig();

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={[styles.text, { color }]}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
  },
  text: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
  },
});