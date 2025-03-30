import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Shield, Trophy, AlertTriangle } from 'lucide-react-native';
import { useArenaStore } from '../lib/arenaStore';
import { DEFAULT_SURVIVAL_SETTINGS } from '../lib/survivalUtils';
import { supabase } from '../lib/supabase';

interface ArenaHeaderProps {
  title?: string;
}

export const ArenaHeader = ({ title = "Survival Challenge" }: ArenaHeaderProps) => {
  const { 
    currentDay, 
    totalDays, 
    currentUser, 
    loading,
    safeZoneRadius,
    challengeId,
    currentUserParticipant,
  } = useArenaStore();
  
  // Force a data refresh on component mount
  useEffect(() => {
    if (challengeId && currentUserParticipant?.user_id) {
      const refreshData = async () => {
        try {
          const { data, error } = await supabase
            .from('challenge_participants')
            .select('total_points')
            .eq('id', currentUserParticipant.id)
            .single();
            
          if (!error && data) {
            useArenaStore.getState().refreshParticipant({
              ...currentUserParticipant,
              total_points: data.total_points
            });
          }
        } catch (err) {
          console.error('Error refreshing points:', err);
        }
      };
      
      refreshData();
    }
  }, [challengeId, currentUserParticipant?.id]);
  
  // Get points directly from the participant data
  const userPoints = currentUserParticipant?.total_points ?? 0;
  
  // Calculate progress percentage
  const progressPercentage = totalDays > 0 ? Math.min(100, (currentDay / totalDays) * 100) : 0;
  
  // Determine user status
  const isEliminated = currentUserParticipant?.is_eliminated ?? currentUser?.isEliminated ?? false;
  let isInDanger = false;
  if (!isEliminated && currentUser) {
    isInDanger = currentUser.distance > safeZoneRadius;
  }
  
  // Set status color and text
  let statusColor = '#22c55e';
  let statusText = 'Safe';
  if (isEliminated) {
    statusColor = '#9ca3af';
    statusText = 'Eliminated';
  } else if (isInDanger) {
    statusColor = '#ef4444';
    statusText = 'Danger';
  }

  const daysInDanger = currentUserParticipant?.days_in_danger ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.challengeInfo}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.dayContainer}>
          <Text style={styles.subtitle}>Day {currentDay} of {totalDays}</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progressPercentage}%` }]} />
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading challenge data...</Text>
        </View>
      ) : currentUser ? (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Trophy size={18} color="#fbbf24" style={styles.statIcon} />
            <Text style={styles.statLabel}>Points</Text>
            <Text style={styles.statValue}>{userPoints}</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statItem}>
            {isEliminated ? (
              <AlertTriangle size={18} color={statusColor} style={styles.statIcon} />
            ) : (
              <Shield size={18} color={statusColor} style={styles.statIcon} />
            )}
            <Text style={styles.statLabel}>Status</Text>
            <Text style={[styles.statValue, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>
        </View>
      ) :
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load user data</Text>
        </View>
      }
      
      {isInDanger && !isEliminated && (
        <View style={styles.dangerAlert}>
          <AlertTriangle size={16} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.dangerText}>
            In danger zone! Log activity now to survive
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  challengeInfo: {
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  dayContainer: {
    width: '100%',
  },
  subtitle: {
    fontSize: 16,
    color: '#d1d5db',
    marginBottom: 4,
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
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
    marginBottom: 2,
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
    marginHorizontal: 12,
  },
  loadingContainer: {
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    alignItems: 'center',
  },
  loadingText: {
    color: '#d1d5db',
    fontSize: 14,
  },
  errorContainer: {
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    alignItems: 'center',
  },
  errorText: {
    color: '#ffffff',
    fontSize: 14,
  },
  dangerAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.7)',
    borderRadius: 8,
  },
  dangerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});