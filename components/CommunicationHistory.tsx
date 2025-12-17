import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { MessageCircle, Phone, Video, Clock, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface Props {
  bookingId: string;
  currentUserId: string;
}

interface CallLog {
  id: string;
  call_type: string;
  caller_id: string;
  receiver_id: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  caller?: { full_name: string };
  receiver?: { full_name: string };
}

interface Message {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  message_type: string;
  sender?: { full_name: string };
}

export default function CommunicationHistory({ bookingId, currentUserId }: Props) {
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [bookingId]);

  async function loadHistory() {
    setLoading(true);

    const { data: calls } = await supabase
      .from('call_logs')
      .select(`
        *,
        caller:profiles!call_logs_caller_id_fkey(full_name),
        receiver:profiles!call_logs_receiver_id_fkey(full_name)
      `)
      .eq('booking_id', bookingId)
      .order('started_at', { ascending: false })
      .limit(10);

    if (calls) {
      setCallLogs(calls as any);
    }

    const { data: messages } = await supabase
      .from('order_communications')
      .select(`
        *,
        sender:profiles!order_communications_sender_id_fkey(full_name)
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (messages) {
      setRecentMessages(messages as any);
    }

    setLoading(false);
  }

  function formatDuration(seconds: number | null): string {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (callLogs.length === 0 && recentMessages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No communication history yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Communication History</Text>

      {callLogs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Calls</Text>
          {callLogs.map((call) => {
            const isOutgoing = call.caller_id === currentUserId;
            const otherParty = isOutgoing ? call.receiver : call.caller;

            return (
              <View key={call.id} style={styles.historyItem}>
                <View style={styles.itemIcon}>
                  {call.call_type === 'Video' ? (
                    <Video size={20} color={colors.primary} />
                  ) : (
                    <Phone size={20} color={colors.success} />
                  )}
                </View>

                <View style={styles.itemContent}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>
                      {call.call_type} Call {isOutgoing ? 'to' : 'from'} {otherParty?.full_name}
                    </Text>
                    {isOutgoing ? (
                      <ArrowUpRight size={14} color={colors.textSecondary} />
                    ) : (
                      <ArrowDownLeft size={14} color={colors.textSecondary} />
                    )}
                  </View>
                  <View style={styles.itemMeta}>
                    <Clock size={12} color={colors.textSecondary} />
                    <Text style={styles.itemMetaText}>
                      {formatTimestamp(call.started_at)} • {formatDuration(call.duration_seconds)}
                    </Text>
                  </View>
                  <Text style={[styles.itemStatus, getStatusStyle(call.status)]}>
                    {call.status}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {recentMessages.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Messages</Text>
          {recentMessages.map((msg) => {
            const isOutgoing = msg.sender_id === currentUserId;

            return (
              <View key={msg.id} style={styles.historyItem}>
                <View style={styles.itemIcon}>
                  <MessageCircle size={20} color={colors.primary} />
                </View>

                <View style={styles.itemContent}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle}>
                      {isOutgoing ? 'You' : msg.sender?.full_name}
                    </Text>
                  </View>
                  <Text style={styles.messagePreview} numberOfLines={2}>
                    {msg.message}
                  </Text>
                  <Text style={styles.itemTimestamp}>{formatTimestamp(msg.created_at)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'Completed':
      return { color: colors.success };
    case 'Missed':
    case 'Failed':
      return { color: colors.error };
    default:
      return { color: colors.textSecondary };
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  historyItem: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  itemTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    flex: 1,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  itemMetaText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  itemStatus: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  messagePreview: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  itemTimestamp: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
});
