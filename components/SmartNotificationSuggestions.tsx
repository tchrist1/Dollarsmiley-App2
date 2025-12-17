import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  Sparkles,
  Bell,
  X,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  getNotificationSuggestions,
  dismissNotificationSuggestion,
  formatSuggestionType,
  getPriorityColor,
  getPriorityLabel,
  formatTimeUntilSend,
  type NotificationSuggestion,
} from '@/lib/smart-notifications';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface SmartNotificationSuggestionsProps {
  onSuggestionPress?: (suggestion: NotificationSuggestion) => void;
}

export default function SmartNotificationSuggestions({
  onSuggestionPress,
}: SmartNotificationSuggestionsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<NotificationSuggestion[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSuggestions();
  }, [user]);

  const loadSuggestions = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const data = await getNotificationSuggestions(user.id, 'pending');
      setSuggestions(data);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (suggestionId: string) => {
    setDismissedIds(new Set(dismissedIds).add(suggestionId));

    const result = await dismissNotificationSuggestion(suggestionId);
    if (!result.success) {
      // Remove from dismissed if failed
      const newDismissed = new Set(dismissedIds);
      newDismissed.delete(suggestionId);
      setDismissedIds(newDismissed);
    }
  };

  const handlePress = (suggestion: NotificationSuggestion) => {
    if (onSuggestionPress) {
      onSuggestionPress(suggestion);
    }
  };

  const visibleSuggestions = suggestions.filter(
    (s) => !dismissedIds.has(s.id)
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Loading suggestions...</Text>
      </View>
    );
  }

  if (visibleSuggestions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <CheckCircle size={48} color={colors.success} />
        <Text style={styles.emptyTitle}>All caught up!</Text>
        <Text style={styles.emptyText}>No notification suggestions at the moment</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Sparkles size={20} color={colors.primary} />
        <Text style={styles.headerTitle}>Smart Suggestions</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{visibleSuggestions.length}</Text>
        </View>
      </View>

      {/* Suggestions List */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {visibleSuggestions.map((suggestion) => {
          const priorityColor = getPriorityColor(suggestion.priority_score);
          const priorityLabel = getPriorityLabel(suggestion.priority_score);
          const timeUntil = formatTimeUntilSend(suggestion.suggested_send_time);

          return (
            <TouchableOpacity
              key={suggestion.id}
              style={[styles.card, { borderLeftColor: priorityColor }]}
              onPress={() => handlePress(suggestion)}
              activeOpacity={0.7}
            >
              {/* Dismiss Button */}
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={() => handleDismiss(suggestion.id)}
              >
                <X size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Priority Badge */}
              <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
                <Text style={styles.priorityText}>{priorityLabel}</Text>
              </View>

              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: priorityColor + '20' }]}>
                <Bell size={24} color={priorityColor} />
              </View>

              {/* Content */}
              <View style={styles.cardContent}>
                <Text style={styles.suggestionType} numberOfLines={1}>
                  {formatSuggestionType(suggestion.suggestion_type)}
                </Text>

                {/* Score */}
                <View style={styles.scoreRow}>
                  <TrendingUp size={14} color={colors.textSecondary} />
                  <Text style={styles.scoreText}>
                    {suggestion.priority_score.toFixed(0)} priority
                  </Text>
                </View>

                {/* Send Time */}
                <View style={styles.timeRow}>
                  <Clock size={14} color={colors.textSecondary} />
                  <Text style={styles.timeText}>Send in {timeUntil}</Text>
                </View>

                {/* Context Info */}
                {suggestion.context_data && (
                  <View style={styles.contextInfo}>
                    {Object.entries(suggestion.context_data).slice(0, 2).map(
                      ([key, value]) => (
                        <Text
                          key={key}
                          style={styles.contextText}
                          numberOfLines={1}
                        >
                          {key}: {String(value)}
                        </Text>
                      )
                    )}
                  </View>
                )}
              </View>

              {/* Action Button */}
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: priorityColor }]}
              >
                <Text style={styles.actionText}>View</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.lg,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  card: {
    width: 240,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
  },
  dismissButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  priorityBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  priorityText: {
    fontSize: fontSize.xxs,
    fontWeight: fontWeight.bold,
    color: colors.white,
    textTransform: 'uppercase',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  cardContent: {
    marginBottom: spacing.sm,
  },
  suggestionType: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  scoreText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  timeText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  contextInfo: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.xs,
  },
  contextText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  actionButton: {
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
