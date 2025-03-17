import { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SharedLayout from '../../../components/SharedLayout';
import { supabase } from '../../../lib/supabase';
import { useUser } from '../../../components/UserContext';

interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: 'race' | 'survival' | 'streak' | 'custom';
  start_date: string;
  end_date: string | null;
  is_private: boolean;
  status: 'active' | 'completed' | 'cancelled';
  rules: {
    allowed_activities: string[];
    points_per_activity: Record<string, number>;
    finish_line?: number;
    minimum_threshold?: number;
    streak_bonus?: number;
    custom_rules?: any;
  };
  creator: {
    nickname: string;
    avatar_url: string;
  };
  participant_count: number;
}

export default function DiscoverChallenges() {
  const { isOnline } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [joiningChallenge, setJoiningChallenge] = useState(false);

  const loadChallenges = async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('challenges')
        .select(`
          *,
          creator:profiles!challenges_creator_id_fkey (
            nickname,
            avatar_url
          ),
          participant_count:challenge_participants (count)
        `)
        .eq('status', 'active')
        .eq('is_private', false)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setChallenges(data as Challenge[]);
    } catch (e: any) {
      console.error('Error loading challenges:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallenges();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadChallenges();
    setRefreshing(false);
  };

  const handleJoinChallenge = async () => {
    if (!selectedChallenge || !isOnline) return;

    try {
      setJoiningChallenge(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check if already joined
      const { data: existingParticipant, error: checkError } = await supabase
        .from('challenge_participants')
        .select('id')
        .eq('challenge_id', selectedChallenge.id)
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;
      if (existingParticipant) throw new Error('You have already joined this challenge');

      // Join challenge
      const { error: joinError } = await supabase
        .from('challenge_participants')
        .insert({
          challenge_id: selectedChallenge.id,
          user_id: user.id,
        });

      if (joinError) throw joinError;

      // Update local state
      setChallenges(prev => prev.map(c => 
        c.id === selectedChallenge.id 
          ? { ...c, participant_count: (c.participant_count || 0) + 1 }
          : c
      ));

      setSelectedChallenge(null);
      router.push('/joinchallenges');
    } catch (e: any) {
      console.error('Error joining challenge:', e);
      setError(e.message);
    } finally {
      setJoiningChallenge(false);
    }
  };

  if (loading) {
    return (
      <SharedLayout style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00000" />
          <Text style={styles.loadingText}>Loading challenges...</Text>
        </View>
      </SharedLayout>
    );
  }

  return (
    <SharedLayout style={styles.container}>
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={loadChallenges}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : challenges.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Challenges Found</Text>
            <Text style={styles.emptyText}>
              Be the first to create a challenge and invite others to join!
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/joinchallenges/create')}
            >
              <Text style={styles.createButtonText}>Create Challenge</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>FEATURED</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.featuredSection}
            >
              {challenges.slice(0, 3).map((challenge) => (
                <TouchableOpacity
                  key={challenge.id}
                  style={styles.featuredCard}
                  onPress={() => setSelectedChallenge(challenge)}
                >
                  <View style={styles.cardOverlay} />
                  <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                      <View style={styles.creatorInfo}>
                        <Image
                          source={{ uri: challenge.creator.avatar_url }}
                          style={styles.creatorAvatar}
                        />
                        <Text style={styles.creatorName}>
                          {challenge.creator.nickname}
                        </Text>
                      </View>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>
                          {challenge.challenge_type.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle}>{challenge.title}</Text>
                      <Text style={styles.cardDescription} numberOfLines={2}>
                        {challenge.description}
                      </Text>
                    </View>
                    <View style={styles.cardFooter}>
                      <Text style={styles.participantCount}>
                        {challenge.participant_count || 0} joined
                      </Text>
                      <Text style={styles.dateInfo}>
                        {new Date(challenge.start_date).toLocaleDateString()}
                        {challenge.end_date ? ` - ${new Date(challenge.end_date).toLocaleDateString()}` : ' (Open-ended)'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>MORE TO EXPLORE</Text>
            <View style={styles.moreSection}>
              {challenges.slice(3).map((challenge) => (
                <TouchableOpacity
                  key={challenge.id}
                  style={styles.regularCard}
                  onPress={() => setSelectedChallenge(challenge)}
                >
                  <View style={styles.regularCardContent}>
                    <View style={styles.regularCardLeft}>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeText}>
                          {challenge.challenge_type.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.regularCardTitle}>{challenge.title}</Text>
                      <Text style={styles.regularCardDescription} numberOfLines={1}>
                        {challenge.description}
                      </Text>
                    </View>
                    <View style={styles.regularCardRight}>
                      <Text style={styles.participantCount}>
                        {challenge.participant_count || 0} joined
                      </Text>
                      <Ionicons name="chevron-forward" size={20} color="#666" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <Modal
        visible={selectedChallenge !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedChallenge(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedChallenge(null)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>

            {selectedChallenge && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.challengeHeader}>
                  <View style={styles.creatorInfo}>
                    <Image
                      source={{ uri: selectedChallenge.creator.avatar_url }}
                      style={styles.creatorAvatar}
                    />
                    <Text style={styles.creatorName}>
                      {selectedChallenge.creator.nickname}
                    </Text>
                  </View>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeText}>
                      {selectedChallenge.challenge_type.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.challengeTitle}>
                  {selectedChallenge.title}
                </Text>
                <Text style={styles.challengeDescription}>
                  {selectedChallenge.description}
                </Text>

                <View style={styles.detailsSection}>
                  <Text style={styles.detailsTitle}>Challenge Details</Text>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedChallenge.start_date).toLocaleDateString()}
                      {selectedChallenge.end_date 
                        ? ` - ${new Date(selectedChallenge.end_date).toLocaleDateString()}`
                        : ' (Open-ended)'
                      }
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Allowed Activities</Text>
                    <Text style={styles.detailValue}>
                      {selectedChallenge.rules.allowed_activities.join(', ')}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Points System</Text>
                    <View style={styles.pointsList}>
                      {Object.entries(selectedChallenge.rules.points_per_activity)
                        .map(([activity, points]) => (
                          <Text key={activity} style={styles.pointsItem}>
                            {activity}: {points} points
                          </Text>
                        ))
                      }
                    </View>
                  </View>

                  {selectedChallenge.rules.finish_line && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Finish Line</Text>
                      <Text style={styles.detailValue}>
                        {selectedChallenge.rules.finish_line} points
                      </Text>
                    </View>
                  )}

                  {selectedChallenge.rules.minimum_threshold && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Daily Minimum</Text>
                      <Text style={styles.detailValue}>
                        {selectedChallenge.rules.minimum_threshold} points
                      </Text>
                    </View>
                  )}

                  {selectedChallenge.rules.streak_bonus && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Streak Bonus</Text>
                      <Text style={styles.detailValue}>
                        +{selectedChallenge.rules.streak_bonus} points per day
                      </Text>
                    </View>
                  )}
                </View>

                {error && (
                  <View style={styles.modalError}>
                    <Text style={styles.modalErrorText}>{error}</Text>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[
                  styles.joinButton,
                  (joiningChallenge || !isOnline) && styles.joinButtonDisabled,
                ]}
                onPress={handleJoinChallenge}
                disabled={joiningChallenge || !isOnline}
              >
                <Text style={styles.joinButtonText}>
                  {joiningChallenge ? 'Joining...' : 'Join Challenge'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SharedLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#00000',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 15,
  },
  featuredSection: {
    paddingLeft: 20,
    marginBottom: 30,
  },
  featuredCard: {
    width: 300,
    height: 200,
    marginRight: 15,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cardContent: {
    flex: 1,
    padding: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  creatorName: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  typeBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantCount: {
    fontSize: 14,
    color: '#fff',
  },
  dateInfo: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
  },
  moreSection: {
    paddingHorizontal: 20,
  },
  regularCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  regularCardContent: {
    flexDirection: 'row',
    padding: 15,
  },
  regularCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  regularCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 8,
  },
  regularCardDescription: {
    fontSize: 14,
    color: '#666',
  },
  regularCardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
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
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
  },
  modalScroll: {
    padding: 20,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  challengeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  challengeDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 24,
  },
  detailsSection: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
  },
  pointsList: {
    marginTop: 4,
  },
  pointsItem: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  modalError: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  modalErrorText: {
    color: '#DC2626',
    textAlign: 'center',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  joinButton: {
    backgroundColor: '#00000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.5,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});