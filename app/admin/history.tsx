import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { History, Search, User, Download } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '@/contexts/AuthContext';
import ModeratorPerformanceCard from '@/components/ModeratorPerformanceCard';
import ModerationHistoryTimeline from '@/components/ModerationHistoryTimeline';
import {
  getModeratorActionHistory,
  getModeratorPerformanceSummary,
  exportModeratorPerformanceToCSV,
  type ModerationActionHistory,
  type ModeratorPerformanceSummary,
} from '@/lib/moderation';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export default function AdminHistoryScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<ModerationActionHistory[]>([]);
  const [performance, setPerformance] = useState<ModeratorPerformanceSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (profile?.user_type !== 'Admin') {
      router.back();
      return;
    }

    loadData();
  }, [profile, dateRange]);

  const getDateRange = () => {
    const end = new Date().toISOString();
    let start: string | undefined;

    switch (dateRange) {
      case 'today':
        start = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
        break;
      case 'week':
        start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'month':
        start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case 'all':
        start = undefined;
        break;
    }

    return { start, end };
  };

  const loadData = async () => {
    if (!profile?.id) return;

    setLoading(true);
    try {
      const { start, end } = getDateRange();

      const [historyData, perfData] = await Promise.all([
        getModeratorActionHistory(profile.id, start, end),
        getModeratorPerformanceSummary(profile.id, start, end),
      ]);

      setHistory(historyData);
      setPerformance(perfData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (history.length === 0) return;

    setExporting(true);
    try {
      const csvContent = exportModeratorPerformanceToCSV(history);
      const fileName = `moderator-history-${Date.now()}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent);

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Export Moderation History',
          });
        }
      }
    } catch (error) {
      console.error('Error exporting:', error);
    } finally {
      setExporting(false);
    }
  };

  const filteredHistory = history.filter(
    (item) =>
      item.target_user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const historyForTimeline = filteredHistory.map((item) => ({
    id: item.id,
    action_type: item.action_type,
    moderator_name: profile?.full_name || 'You',
    content_type: item.content_type,
    reason: item.reason,
    severity: item.severity,
    strike_count: item.strike_count,
    created_at: item.created_at,
  }));

  if (profile?.user_type !== 'Admin') {
    return null;
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Moderation History',
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.white,
          },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Date Range Selector */}
        <View style={styles.filtersContainer}>
          {(['today', 'week', 'month', 'all'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.filterButton,
                dateRange === range && styles.filterButtonActive,
              ]}
              onPress={() => setDateRange(range)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  dateRange === range && styles.filterButtonTextActive,
                ]}
              >
                {range === 'all'
                  ? 'All Time'
                  : range.charAt(0).toUpperCase() + range.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Performance Summary */}
            {performance && profile && (
              <View style={styles.performanceSection}>
                <ModeratorPerformanceCard
                  performance={performance}
                  moderatorName={profile.full_name || 'Unknown'}
                />
              </View>
            )}

            {/* Export Button */}
            {history.length > 0 && (
              <TouchableOpacity
                style={styles.exportButton}
                onPress={handleExport}
                disabled={exporting}
              >
                {exporting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Download size={20} color={colors.white} />
                    <Text style={styles.exportButtonText}>Export History</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Search size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by user, content type, or reason..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* History Timeline */}
            <View style={styles.timelineSection}>
              <View style={styles.sectionHeader}>
                <History size={20} color={colors.text} />
                <Text style={styles.sectionTitle}>Action History</Text>
                <Text style={styles.sectionCount}>
                  ({filteredHistory.length} {filteredHistory.length === 1 ? 'action' : 'actions'})
                </Text>
              </View>

              <ModerationHistoryTimeline
                history={historyForTimeline}
                emptyMessage={
                  searchQuery
                    ? 'No actions found matching your search'
                    : 'No moderation actions in this time period'
                }
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  performanceSection: {
    padding: spacing.lg,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  exportButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  timelineSection: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  sectionCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
