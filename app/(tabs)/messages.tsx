import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { MessageCircle } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface Conversation {
  id: string;
  participant_one_id: string;
  participant_two_id: string;
  last_message: string;
  last_message_at: string;
  unread_count_one: number;
  unread_count_two: number;
  participant_one_typing: boolean;
  participant_two_typing: boolean;
  participant_one_last_seen: string;
  participant_two_last_seen: string;
  other_participant?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  unread_count?: number;
}

export default function MessagesScreen() {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchConversations();
      subscribeToConversations();
    }
  }, [profile]);

  const fetchConversations = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_one_id.eq.${profile.id},participant_two_id.eq.${profile.id}`)
      .order('last_message_at', { ascending: false });

    if (data && !error) {
      const conversationsWithParticipants = await Promise.all(
        data.map(async (conv) => {
          const isParticipantOne = conv.participant_one_id === profile.id;
          const otherParticipantId = isParticipantOne
            ? conv.participant_two_id
            : conv.participant_one_id;

          const { data: participant } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', otherParticipantId)
            .single();

          const unread_count = isParticipantOne
            ? conv.unread_count_one || 0
            : conv.unread_count_two || 0;

          return {
            ...conv,
            other_participant: participant,
            unread_count,
          };
        })
      );

      setConversations(conversationsWithParticipants);
    }

    setLoading(false);
  };

  const subscribeToConversations = () => {
    if (!profile) return;

    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant_one_id=eq.${profile.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `participant_two_id=eq.${profile.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const isUserTyping = (item: Conversation) => {
    const isParticipantOne = item.participant_one_id === profile?.id;
    return isParticipantOne ? item.participant_two_typing : item.participant_one_typing;
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherParticipant = item.other_participant;
    const hasUnread = (item.unread_count || 0) > 0;
    const typing = isUserTyping(item);

    return (
      <TouchableOpacity
        style={[
          styles.conversationCard,
          hasUnread && styles.conversationCardUnread,
        ]}
        onPress={() => router.push(`/chat/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          {otherParticipant?.avatar_url ? (
            <Image source={{ uri: otherParticipant.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {otherParticipant?.full_name.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          {hasUnread && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.participantName, hasUnread && styles.participantNameUnread]} numberOfLines={1}>
              {otherParticipant?.full_name || 'Unknown User'}
            </Text>
            <Text style={styles.timestamp}>{formatTimestamp(item.last_message_at)}</Text>
          </View>
          <View style={styles.lastMessageContainer}>
            <Text style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]} numberOfLines={2}>
              {typing ? 'Typing...' : item.last_message || 'No messages yet'}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Please sign in to view messages</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Loading conversations...</Text>
        </View>
      ) : conversations.length > 0 ? (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <MessageCircle size={64} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyText}>
            Start a conversation by contacting a provider from their service listing
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  listContainer: {
    padding: spacing.md,
  },
  conversationCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  conversationCardUnread: {
    backgroundColor: colors.primaryLight,
  },
  avatarContainer: {
    marginRight: spacing.md,
    position: 'relative',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.white,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  participantName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  participantNameUnread: {
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  timestamp: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  lastMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  lastMessageUnread: {
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    marginLeft: spacing.sm,
  },
  unreadBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
