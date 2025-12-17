import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Shield, Plus, Edit, Trash2, TrendingUp, TrendingDown } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface AutoModerationRule {
  id: string;
  name: string;
  description: string;
  rule_type: 'keyword' | 'pattern' | 'spam_detection' | 'rate_limit' | 'ml_model';
  content_types: string[];
  rule_config: any;
  action: 'flag' | 'auto_remove' | 'shadow_ban' | 'require_review';
  severity: string;
  is_active: boolean;
  false_positive_count: number;
  true_positive_count: number;
  created_at: string;
}

export default function AutoModerationScreen() {
  const { profile } = useAuth();
  const [rules, setRules] = useState<AutoModerationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (profile) {
      loadRules();
    }
  }, [profile]);

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from('auto_moderation_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRules((data || []) as AutoModerationRule[]);
    } catch (error) {
      console.error('Error loading rules:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadRules();
  };

  const handleToggleRule = async (ruleId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('auto_moderation_rules')
        .update({ is_active: !currentStatus })
        .eq('id', ruleId);

      if (error) throw error;

      setRules((prev) =>
        prev.map((rule) =>
          rule.id === ruleId ? { ...rule, is_active: !currentStatus } : rule
        )
      );
    } catch (error) {
      console.error('Error toggling rule:', error);
      Alert.alert('Error', 'Failed to update rule status');
    }
  };

  const handleDeleteRule = (ruleId: string, ruleName: string) => {
    Alert.alert(
      'Delete Rule',
      `Are you sure you want to delete "${ruleName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('auto_moderation_rules')
                .delete()
                .eq('id', ruleId);

              if (error) throw error;

              setRules((prev) => prev.filter((rule) => rule.id !== ruleId));
              Alert.alert('Success', 'Rule deleted successfully');
            } catch (error) {
              console.error('Error deleting rule:', error);
              Alert.alert('Error', 'Failed to delete rule');
            }
          },
        },
      ]
    );
  };

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case 'keyword':
        return 'Keyword';
      case 'pattern':
        return 'Pattern';
      case 'spam_detection':
        return 'Spam Detection';
      case 'rate_limit':
        return 'Rate Limit';
      case 'ml_model':
        return 'ML Model';
      default:
        return type;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'flag':
        return 'Flag for Review';
      case 'auto_remove':
        return 'Auto Remove';
      case 'shadow_ban':
        return 'Shadow Ban';
      case 'require_review':
        return 'Require Review';
      default:
        return action;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'flag':
        return colors.secondary;
      case 'auto_remove':
        return colors.error;
      case 'shadow_ban':
        return '#EA580C';
      case 'require_review':
        return '#F59E0B';
      default:
        return colors.textSecondary;
    }
  };

  const getAccuracyRate = (rule: AutoModerationRule) => {
    const total = rule.true_positive_count + rule.false_positive_count;
    if (total === 0) return null;
    return ((rule.true_positive_count / total) * 100).toFixed(1);
  };

  const renderRule = ({ item }: { item: AutoModerationRule }) => {
    const accuracyRate = getAccuracyRate(item);

    return (
      <View style={[styles.ruleCard, !item.is_active && styles.ruleCardInactive]}>
        <View style={styles.ruleHeader}>
          <View style={styles.ruleHeaderLeft}>
            <Text style={styles.ruleName}>{item.name}</Text>
            <View
              style={[
                styles.ruleTypeBadge,
                { backgroundColor: colors.surface },
              ]}
            >
              <Text style={styles.ruleTypeText}>{getRuleTypeLabel(item.rule_type)}</Text>
            </View>
          </View>
          <Switch
            value={item.is_active}
            onValueChange={() => handleToggleRule(item.id, item.is_active)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        <Text style={styles.ruleDescription}>{item.description}</Text>

        <View style={styles.ruleDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Content Types:</Text>
            <Text style={styles.detailValue}>
              {item.content_types.join(', ')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Action:</Text>
            <View
              style={[
                styles.actionBadge,
                { backgroundColor: getActionColor(item.action) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.actionText,
                  { color: getActionColor(item.action) },
                ]}
              >
                {getActionLabel(item.action)}
              </Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Severity:</Text>
            <Text style={styles.detailValue}>{item.severity}</Text>
          </View>
        </View>

        {accuracyRate && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <TrendingUp size={16} color={colors.success} />
              <Text style={styles.statLabel}>True Positives</Text>
              <Text style={styles.statValue}>{item.true_positive_count}</Text>
            </View>
            <View style={styles.statItem}>
              <TrendingDown size={16} color={colors.error} />
              <Text style={styles.statLabel}>False Positives</Text>
              <Text style={styles.statValue}>{item.false_positive_count}</Text>
            </View>
            <View style={styles.statItem}>
              <Shield size={16} color={colors.primary} />
              <Text style={styles.statLabel}>Accuracy</Text>
              <Text style={styles.statValue}>{accuracyRate}%</Text>
            </View>
          </View>
        )}

        <View style={styles.ruleActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => Alert.alert('Edit Rule', 'Rule editing coming soon')}
          >
            <Edit size={16} color={colors.primary} />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteRule(item.id, item.name)}
          >
            <Trash2 size={16} color={colors.error} />
            <Text style={[styles.actionButtonText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Auto-Moderation</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Auto-Moderation</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => Alert.alert('Add Rule', 'Rule creation coming soon')}
        >
          <Plus size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{rules.length}</Text>
            <Text style={styles.statText}>Total Rules</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: colors.success }]}>
              {rules.filter((r) => r.is_active).length}
            </Text>
            <Text style={styles.statText}>Active</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNumber, { color: colors.textSecondary }]}>
              {rules.filter((r) => !r.is_active).length}
            </Text>
            <Text style={styles.statText}>Inactive</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={rules}
        renderItem={renderRule}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Shield size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Rules Yet</Text>
            <Text style={styles.emptyText}>
              Create auto-moderation rules to automatically detect and handle problematic
              content.
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  addButton: {
    padding: spacing.xs,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.md,
  },
  ruleCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  ruleCardInactive: {
    opacity: 0.6,
  },
  ruleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ruleHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginRight: spacing.md,
  },
  ruleName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  ruleTypeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  ruleTypeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  ruleDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  ruleDetails: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  actionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  actionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.md,
  },
  statItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  ruleActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  deleteButton: {
    backgroundColor: colors.error + '10',
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
