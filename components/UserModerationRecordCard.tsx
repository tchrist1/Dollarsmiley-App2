import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { AlertTriangle, X, Download } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import {
  getUserModerationHistory,
  exportUserHistoryToCSV,
  type UserModerationHistory,
} from '@/lib/moderation';
import ModerationHistoryTimeline from './ModerationHistoryTimeline';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface UserModerationRecordCardProps {
  userId: string;
  userName: string;
  visible: boolean;
  onClose: () => void;
}

export default function UserModerationRecordCard({
  userId,
  userName,
  visible,
  onClose,
}: UserModerationRecordCardProps) {
  const [history, setHistory] = useState<UserModerationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadHistory();
    }
  }, [visible, userId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getUserModerationHistory(userId);
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (history.length === 0) return;

    setExporting(true);
    try {
      const csvContent = exportUserHistoryToCSV(history);
      const fileName = `moderation-history-${userName.replace(/\s+/g, '-')}-${Date.now()}.csv`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, csvContent);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Moderation History',
        });
      }
    } catch (error) {
      console.error('Error exporting:', error);
    } finally {
      setExporting(false);
    }
  };

  const getTotalStrikes = () => {
    return history.reduce((sum, item) => sum + item.strike_count, 0);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <AlertTriangle size={24} color={colors.error} />
            <View>
              <Text style={styles.headerTitle}>Moderation Record</Text>
              <Text style={styles.headerSubtitle}>{userName}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{history.length}</Text>
                <Text style={styles.summaryLabel}>Total Actions</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{getTotalStrikes()}</Text>
                <Text style={styles.summaryLabel}>Total Strikes</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {history.filter((h) => h.action_type === 'warn').length}
                </Text>
                <Text style={styles.summaryLabel}>Warnings</Text>
              </View>
            </View>

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

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
            >
              <ModerationHistoryTimeline
                history={history}
                emptyMessage="This user has a clean moderation record"
              />
            </ScrollView>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  closeButton: {
    padding: spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryValue: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
