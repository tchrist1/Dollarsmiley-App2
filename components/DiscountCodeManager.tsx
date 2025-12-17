import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  Download,
  Trash2,
  BarChart3,
  Filter,
} from 'lucide-react-native';
import { type DiscountCode } from '@/lib/promotional-campaigns';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface DiscountCodeManagerProps {
  codes: DiscountCode[];
  onToggleCode?: (codeId: string, isActive: boolean) => void;
  onDeleteCode?: (codeId: string) => void;
  onExportCodes?: () => void;
  showUsage?: boolean;
}

type SortOption = 'code' | 'usage' | 'status' | 'date';
type FilterOption = 'all' | 'active' | 'inactive';

export default function DiscountCodeManager({
  codes,
  onToggleCode,
  onDeleteCode,
  onExportCodes,
  showUsage = true,
}: DiscountCodeManagerProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showCodes, setShowCodes] = useState(true);

  const copyToClipboard = (code: string) => {
    // In a real app, this would use Clipboard API
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleToggleCode = (codeId: string, currentStatus: boolean) => {
    Alert.alert(
      currentStatus ? 'Deactivate Code' : 'Activate Code',
      `Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this code?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: currentStatus ? 'Deactivate' : 'Activate',
          style: currentStatus ? 'destructive' : 'default',
          onPress: () => onToggleCode?.(codeId, !currentStatus),
        },
      ]
    );
  };

  const handleDeleteCode = (codeId: string, code: string) => {
    Alert.alert('Delete Code', `Are you sure you want to delete code "${code}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDeleteCode?.(codeId),
      },
    ]);
  };

  const getSortedAndFilteredCodes = () => {
    let filtered = codes;

    // Apply filter
    if (filterBy === 'active') {
      filtered = filtered.filter(c => c.is_active);
    } else if (filterBy === 'inactive') {
      filtered = filtered.filter(c => !c.is_active);
    }

    // Apply sort
    const sorted = [...filtered];
    switch (sortBy) {
      case 'code':
        sorted.sort((a, b) => a.code.localeCompare(b.code));
        break;
      case 'usage':
        sorted.sort((a, b) => b.usage_count - a.usage_count);
        break;
      case 'status':
        sorted.sort((a, b) => {
          if (a.is_active === b.is_active) return 0;
          return a.is_active ? -1 : 1;
        });
        break;
      case 'date':
        sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }

    return sorted;
  };

  const getStats = () => {
    const active = codes.filter(c => c.is_active).length;
    const totalUsage = codes.reduce((sum, c) => sum + c.usage_count, 0);
    const mostUsed = codes.reduce((max, c) => (c.usage_count > max ? c.usage_count : max), 0);

    return { total: codes.length, active, totalUsage, mostUsed };
  };

  const stats = getStats();
  const displayCodes = getSortedAndFilteredCodes();

  return (
    <View style={styles.container}>
      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total Codes</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.success }]}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>

        {showUsage && (
          <>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{stats.totalUsage}</Text>
              <Text style={styles.statLabel}>Total Uses</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.warning }]}>{stats.mostUsed}</Text>
              <Text style={styles.statLabel}>Most Used</Text>
            </View>
          </>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <View style={styles.controlRow}>
          <View style={styles.sortFilter}>
            <Text style={styles.controlLabel}>Sort by:</Text>
            <View style={styles.segmentedControl}>
              {(['code', 'usage', 'status', 'date'] as SortOption[]).map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.segmentButton,
                    sortBy === option && styles.segmentButtonActive,
                  ]}
                  onPress={() => setSortBy(option)}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      sortBy === option && styles.segmentButtonTextActive,
                    ]}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.sortFilter}>
            <Text style={styles.controlLabel}>Filter:</Text>
            <View style={styles.segmentedControl}>
              {(['all', 'active', 'inactive'] as FilterOption[]).map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.segmentButton,
                    filterBy === option && styles.segmentButtonActive,
                  ]}
                  onPress={() => setFilterBy(option)}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      filterBy === option && styles.segmentButtonTextActive,
                    ]}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.controlButton} onPress={() => setShowCodes(!showCodes)}>
            {showCodes ? <EyeOff size={18} color={colors.primary} /> : <Eye size={18} color={colors.primary} />}
            <Text style={styles.controlButtonText}>
              {showCodes ? 'Hide Codes' : 'Show Codes'}
            </Text>
          </TouchableOpacity>

          {onExportCodes && (
            <TouchableOpacity style={styles.controlButton} onPress={onExportCodes}>
              <Download size={18} color={colors.primary} />
              <Text style={styles.controlButtonText}>Export</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Codes List */}
      <ScrollView style={styles.codesList} showsVerticalScrollIndicator={false}>
        {displayCodes.length === 0 ? (
          <View style={styles.emptyState}>
            <Filter size={48} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No codes found</Text>
            <Text style={styles.emptyText}>
              {filterBy !== 'all'
                ? 'No codes match the selected filter'
                : 'No discount codes have been created yet'}
            </Text>
          </View>
        ) : (
          displayCodes.map(code => (
            <View
              key={code.id}
              style={[
                styles.codeCard,
                !code.is_active && styles.codeCardInactive,
              ]}
            >
              <View style={styles.codeHeader}>
                <View style={styles.codeInfo}>
                  {showCodes ? (
                    <Text style={styles.codeText}>{code.code}</Text>
                  ) : (
                    <Text style={styles.codeHidden}>••••••••</Text>
                  )}
                  {!code.is_active && (
                    <View style={styles.inactiveBadge}>
                      <Text style={styles.inactiveBadgeText}>Inactive</Text>
                    </View>
                  )}
                </View>

                <View style={styles.codeActions}>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => copyToClipboard(code.code)}
                  >
                    {copiedCode === code.code ? (
                      <Check size={18} color={colors.success} />
                    ) : (
                      <Copy size={18} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>

                  {onToggleCode && (
                    <Switch
                      value={code.is_active}
                      onValueChange={() => handleToggleCode(code.id, code.is_active)}
                      trackColor={{ false: colors.border, true: colors.success + '50' }}
                      thumbColor={code.is_active ? colors.success : colors.textSecondary}
                    />
                  )}

                  {onDeleteCode && (
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleDeleteCode(code.id, code.code)}
                    >
                      <Trash2 size={18} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {showUsage && (
                <View style={styles.codeStats}>
                  <View style={styles.codeStat}>
                    <BarChart3 size={14} color={colors.textSecondary} />
                    <Text style={styles.codeStatText}>
                      {code.usage_count} use{code.usage_count !== 1 ? 's' : ''}
                    </Text>
                  </View>

                  <Text style={styles.codeDate}>
                    Created {new Date(code.created_at).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Results Summary */}
      {displayCodes.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Showing {displayCodes.length} of {codes.length} code
            {codes.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  controls: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  controlRow: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sortFilter: {
    gap: spacing.xs,
  },
  controlLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 2,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md - 2,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentButtonText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  segmentButtonTextActive: {
    color: colors.white,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary + '10',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  controlButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  codesList: {
    flex: 1,
  },
  codeCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeCardInactive: {
    opacity: 0.6,
    backgroundColor: colors.surface,
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  codeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  codeText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  codeHidden: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  inactiveBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  inactiveBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.warning,
  },
  codeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 32,
    height: 32,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  codeStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  codeStatText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  codeDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  footerText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
});
