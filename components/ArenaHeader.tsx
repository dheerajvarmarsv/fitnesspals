import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Shield, Heart, Trophy, AlertTriangle } from 'lucide-react-native';
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
  
  // Get other user data
  const userLives = currentUserParticipant?.lives ?? currentUser?.lives ?? DEFAULT_SURVIVAL_SETTINGS.start_lives;
  const maxLives = DEFAULT_SURVIVAL_SETTINGS.start_lives;
  
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
  const daysUntilLifeLoss = DEFAULT_SURVIVAL_SETTINGS.elimination_threshold - daysInDanger;

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
            <Heart size={18} color={isEliminated ? "#9ca3af" : "#ef4444"} style={styles.statIcon} />
            <Text style={styles.statLabel}>Lives</Text>
            <Text style={styles.statValue}>{userLives}/{maxLives}</Text>
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
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load user data</Text>
        </View>
      )}
      
      {isInDanger && !isEliminated && (
        <View style={styles.dangerAlert}>
          <AlertTriangle size={16} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.dangerText}>
            {daysUntilLifeLoss > 1
              ? `In danger zone! ${daysUntilLifeLoss} day(s) until losing a life`
              : 'FINAL WARNING! Log enough activities now to survive'}
          </Text>
        </View>
      )}
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
  loadingContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#ffffff',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 16,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 8,
  },
  dangerAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.7)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    justifyContent: 'center',
  },
  dangerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});