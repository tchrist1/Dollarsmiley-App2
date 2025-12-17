import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Shield, AlertTriangle, CheckCircle, TrendingUp, Clock } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import AdminModerationQueue from '@/components/AdminModerationQueue';
import AdminQueueItemReview from '@/components/AdminQueueItemReview';
import { getModerationStats, type ModerationStats, type QueueItem } from '@/lib/moderation';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export default function AdminModerationScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    if (profile?.user_type !== 'Admin') {
      router.back();
      return;
    }

    loadStats();
  }, [profile]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getModerationStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemPress = (item: QueueItem) => {
    setSelectedItem(item);
    setShowReviewModal(true);
  };

  const handleActionComplete = () => {
    loadStats();
  };

  if (profile?.user_type !== 'Admin') {
    return null;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Moderation Queue',
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.white,
          },
          headerTintColor: colors.text,
        }}
      />

      {/* Stats Header */}
      {loading ? (
        <View style={styles.loadingHeader}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : stats ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsContainer}
          contentContainerStyle={styles.statsContent}
        >
          <View style={[styles.statCard, { borderLeftColor: colors.error }]}>
            <Clock size={24} color={colors.error} />
            <Text style={styles.statValue}>{stats.queue_summary.total_pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: colors.primary }]}>
            <Shield size={24} color={colors.primary} />
            <Text style={styles.statValue}>{stats.queue_summary.in_review}</Text>
            <Text style={styles.statLabel}>In Review</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: colors.secondary }]}>
            <AlertTriangle size={24} color={colors.secondary} />
            <Text style={styles.statValue}>{stats.queue_summary.high_priority}</Text>
            <Text style={styles.statLabel}>High Priority</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: colors.success }]}>
            <CheckCircle size={24} color={colors.success} />
            <Text style={styles.statValue}>{stats.actions_summary.total_today}</Text>
            <Text style={styles.statLabel}>Actions Today</Text>
          </View>

          <View style={[styles.statCard, { borderLeftColor: colors.textSecondary }]}>
            <TrendingUp size={24} color={colors.textSecondary} />
            <Text style={styles.statValue}>{stats.reports_summary.total_today}</Text>
            <Text style={styles.statLabel}>Reports Today</Text>
          </View>
        </ScrollView>
      ) : null}

      {/* Moderation Queue */}
      <AdminModerationQueue onItemPress={handleItemPress} />

      {/* Review Modal */}
      {selectedItem && showReviewModal && (
        <AdminQueueItemReview
          queueId={selectedItem.id}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedItem(null);
          }}
          onActionComplete={handleActionComplete}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingHeader: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  statsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statsContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  statCard: {
    width: 120,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    gap: spacing.xs,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
