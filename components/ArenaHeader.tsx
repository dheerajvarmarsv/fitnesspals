import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Shield, Heart, Trophy } from 'lucide-react-native';
import { useArenaStore } from '../lib/arenaStore';

export const ArenaHeader = () => {
  const { currentDay, totalDays, currentUser } = useArenaStore();
  
  // Calculate progress percentage
  const progressPercentage = (currentDay / totalDays) * 100;
  
  // Determine user status
  const isInDanger = currentUser ? 
    currentUser?.distance > useArenaStore.getState().safeZoneRadius : false;
  
  const statusColor = isInDanger ? '#ef4444' : '#22c55e';
  const statusText = isInDanger ? 'Danger' : 'Safe';

  return (
    <View style={styles.container}>
      <View style={styles.challengeInfo}>
        <Text style={styles.title}>Fitness Battle Royale</Text>
        <View style={styles.dayContainer}>
          <Text style={styles.subtitle}>Day {currentDay} of {totalDays}</Text>
          
          {/* Progress bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
          </View>
        </View>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Trophy size={18} color="#fbbf24" style={styles.statIcon} />
          <Text style={styles.statLabel}>Points</Text>
          <Text style={styles.statValue}>{currentUser?.points}</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Heart size={18} color="#ef4444" style={styles.statIcon} />
          <Text style={styles.statLabel}>Lives</Text>
          <Text style={styles.statValue}>{currentUser?.lives}</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Shield size={18} color={statusColor} style={styles.statIcon} />
          <Text style={styles.statLabel}>Status</Text>
          <Text style={[styles.statValue, { color: statusColor }]}>
            {statusText}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  challengeInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    // Add text shadow for better visibility
    ...Platform.select({
      web: {
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  dayContainer: {
    width: '100%',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#d1d5db',
    marginBottom: 8,
  },
  progressBarContainer: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 16,
    // Add subtle shadow for depth
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
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#d1d5db',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 8,
  },
});