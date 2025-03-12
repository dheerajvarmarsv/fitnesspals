// app/(tabs)/joinchallenges/challengesettingscomponents/InvitesList.tsx

import React from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { generateAvatarUrl } from '../../../../components/UserContext';

interface InviteItem {
  id: string;
  challenge_id: string;
  sender_id: string;
  status: string;
  created_at: string;
  challenge: {
    id: string;
    title: string;
    description: string;
    challenge_type: string;
    start_date: string | null;
    end_date: string | null;
    is_private: boolean;
  };
  sender: {
    nickname: string;
    avatar_url: string | null;
  };
}

interface InvitesListProps {
  invitedChallenges: InviteItem[];
  loading: boolean;
  onRefresh: () => void;
  acceptInvite: (inviteId: string, challengeId: string) => void;
  rejectInvite: (inviteId: string) => void;
}

export default function InvitesList({
  invitedChallenges,
  loading,
  onRefresh,
  acceptInvite,
  rejectInvite,
}: InvitesListProps) {
  const renderInviteCard = ({ item }: { item: InviteItem }) => {
    if (!item.challenge) return null;
    const startDate = item.challenge.start_date
      ? new Date(item.challenge.start_date).toLocaleDateString()
      : 'N/A';
    const endDate = item.challenge.end_date
      ? new Date(item.challenge.end_date).toLocaleDateString()
      : 'Open-ended';

    return (
      <View
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
          marginBottom: 12,
        }}
      >
        <LinearGradient
          colors={['#F76B1C', '#FAD961']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 16 }}
        >
          <View style={{ padding: 16 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Image
                  source={{ uri: generateAvatarUrl(item.sender?.nickname || 'User') }}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    marginRight: 8,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.5)',
                  }}
                />
                <Text style={{ fontSize: 14, color: '#fff' }}>
                  <Text style={{ fontWeight: 'bold' }}>{item.sender?.nickname}</Text> invited you
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 12,
                  color: '#fff',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 12,
                  overflow: 'hidden',
                  fontWeight: '600',
                }}
              >
                {item.challenge.challenge_type?.toUpperCase()}
              </Text>
            </View>

            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 }}>
              {item.challenge.title}
            </Text>
            {item.challenge.description && (
              <Text
                style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', marginBottom: 12 }}
                numberOfLines={2}
              >
                {item.challenge.description}
              </Text>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Ionicons name="calendar-outline" size={14} color="#fff" />
              <Text style={{ fontSize: 12, color: '#fff', marginLeft: 6 }}>
                {startDate} - {endDate}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#4CAF50',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                }}
                onPress={() => acceptInvite(item.id, item.challenge.id)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                }}
                onPress={() => rejectInvite(item.id)}
              >
                <Text style={{ color: '#fff' }}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const renderEmptyInvitesState = () => {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 40,
          paddingVertical: 60,
        }}
      >
        <MaterialCommunityIcons name="email-outline" size={70} color="#ddd" />
        <Text
          style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: '#333',
            marginTop: 16,
            marginBottom: 10,
          }}
        >
          No Invitations
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: '#666',
            textAlign: 'center',
            marginBottom: 30,
            lineHeight: 22,
          }}
        >
          You don't have any pending challenge invitations
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, paddingVertical: 40, alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={{ marginTop: 10, color: '#666', fontSize: 16 }}>Loading invitations...</Text>
      </View>
    );
  }

  if (!invitedChallenges || invitedChallenges.length === 0) {
    return renderEmptyInvitesState();
  }

  return (
    <View style={{ flex: 1, paddingTop: 20 }}>
      <Text
        style={{
          fontSize: 14,
          fontWeight: 'bold',
          color: '#666',
          marginHorizontal: 20,
          marginBottom: 10,
        }}
      >
        PENDING INVITATIONS
      </Text>
      <FlatList
        data={invitedChallenges}
        renderItem={renderInviteCard}
        keyExtractor={(item) => `invite-${item.id}`}
        // Turn off child scrolling to avoid nested VirtualizedLists
        scrollEnabled={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
      />
    </View>
  );
}