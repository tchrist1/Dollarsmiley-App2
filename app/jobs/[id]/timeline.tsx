import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Download, Filter } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import JobStatusTimeline from '@/components/JobStatusTimeline';
import {
  getJobTimeline,
  getTimelineSummary,
  exportTimelineData,
  JobTimelineEvent,
} from '@/lib/job-timeline';
import { supabase } from '@/lib/supabase';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export default function JobTimelineScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<JobTimelineEvent[]>([]);
  const [jobTitle, setJobTitle] = useState('');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadTimeline();
  }, [id]);

  const loadTimeline = async () => {
    setLoading(true);

    try {
      // Get job details
      const { data: jobData } = await supabase
        .from('jobs')
        .select('title')
        .eq('id', id)
        .single();

      if (jobData) {
        setJobTitle(jobData.title);
      }

      // Get timeline
      const timelineEvents = await getJobTimeline(String(id));
      setEvents(timelineEvents);
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const exportData = exportTimelineData(events, jobTitle);
      const fileName = `job-timeline-${id}.txt`;
      const fileUri = (FileSystem.documentDirectory || FileSystem.cacheDirectory) + fileName;

      await FileSystem.writeAsStringAsync(fileUri, exportData);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri);
      }
    } catch (error) {
      console.error('Error exporting timeline:', error);
    }
  };

  const summary = events.length > 0 ? getTimelineSummary(events) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Job Timeline</Text>
          {jobTitle && <Text style={styles.headerSubtitle}>{jobTitle}</Text>}
        </View>
        <TouchableOpacity
          onPress={handleExport}
          style={styles.exportButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Download size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {summary && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.total_events}</Text>
              <Text style={styles.summaryLabel}>Events</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.milestones}</Text>
              <Text style={styles.summaryLabel}>Milestones</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.quotes_received}</Text>
              <Text style={styles.summaryLabel}>Quotes</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{summary.days_active}</Text>
              <Text style={styles.summaryLabel}>Days Active</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.filterBar}>
        <View style={styles.filterLeft}>
          <Filter size={16} color={colors.textSecondary} />
          <Text style={styles.filterLabel}>Show all events</Text>
        </View>
        <Switch
          value={showAll}
          onValueChange={setShowAll}
          trackColor={{ false: colors.border, true: colors.primary + '40' }}
          thumbColor={showAll ? colors.primary : colors.textLight}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading timeline...</Text>
        </View>
      ) : (
        <JobStatusTimeline events={events} showAllEvents={showAll} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  exportButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary + '20',
  },
  summaryCard: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});
