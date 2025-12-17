import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import {
  Calendar,
  Clock,
  Mail,
  Plus,
  Trash2,
  Play,
  Edit,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import {
  getScheduledReports,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  toggleScheduledReport,
  getReportRuns,
  triggerManualReport,
  getScheduleDescription,
  getReportTypeDisplayName,
  getStatusColor,
  getNextRunDescription,
  formatFileSize,
  validateSchedule,
  validateEmails,
  type ScheduledReport,
  type ReportRun,
  type ReportType,
  type ScheduleType,
  type ReportFormat,
} from '@/lib/scheduled-reports';

interface ScheduledReportsManagerProps {
  adminId: string;
}

export default function ScheduledReportsManager({ adminId }: ScheduledReportsManagerProps) {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ScheduledReport | null>(null);
  const [reportRuns, setReportRuns] = useState<ReportRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRunsModal, setShowRunsModal] = useState(false);

  // Form state
  const [reportName, setReportName] = useState('');
  const [reportType, setReportType] = useState<ReportType>('users');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('daily');
  const [scheduleDay, setScheduleDay] = useState<number>(1);
  const [scheduleTime, setScheduleTime] = useState('09:00:00');
  const [recipients, setRecipients] = useState('');
  const [format, setFormat] = useState<ReportFormat>('csv');

  useEffect(() => {
    loadReports();
  }, [adminId]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await getScheduledReports(adminId);
      setReports(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load scheduled reports');
    } finally {
      setLoading(false);
    }
  };

  const loadReportRuns = async (reportId: string) => {
    try {
      const runs = await getReportRuns(reportId);
      setReportRuns(runs);
    } catch (error) {
      Alert.alert('Error', 'Failed to load report runs');
    }
  };

  const handleCreateReport = async () => {
    const emailList = recipients
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e);

    const emailValidation = validateEmails(emailList);
    if (!emailValidation.valid) {
      Alert.alert('Validation Error', emailValidation.error);
      return;
    }

    const scheduleValidation = validateSchedule(scheduleType, scheduleDay);
    if (!scheduleValidation.valid) {
      Alert.alert('Validation Error', scheduleValidation.error);
      return;
    }

    if (!reportName.trim()) {
      Alert.alert('Validation Error', 'Report name is required');
      return;
    }

    try {
      await createScheduledReport({
        admin_id: adminId,
        report_name: reportName,
        report_type: reportType,
        schedule_type: scheduleType,
        schedule_day: scheduleType !== 'daily' ? scheduleDay : undefined,
        schedule_time: scheduleTime,
        recipients: emailList,
        format,
      });

      Alert.alert('Success', 'Scheduled report created successfully');
      setShowCreateModal(false);
      resetForm();
      loadReports();
    } catch (error) {
      Alert.alert('Error', 'Failed to create scheduled report');
    }
  };

  const handleDeleteReport = (reportId: string) => {
    Alert.alert('Delete Report', 'Are you sure you want to delete this scheduled report?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteScheduledReport(reportId);
            Alert.alert('Success', 'Report deleted successfully');
            loadReports();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete report');
          }
        },
      },
    ]);
  };

  const handleToggleReport = async (reportId: string, currentStatus: boolean) => {
    try {
      await toggleScheduledReport(reportId, !currentStatus);
      loadReports();
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle report status');
    }
  };

  const handleRunNow = async (reportId: string) => {
    Alert.alert('Run Report Now', 'Generate and send this report immediately?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Run',
        onPress: async () => {
          try {
            await triggerManualReport(reportId);
            Alert.alert('Success', 'Report generation started');
          } catch (error) {
            Alert.alert('Error', 'Failed to trigger report');
          }
        },
      },
    ]);
  };

  const handleViewRuns = async (report: ScheduledReport) => {
    setSelectedReport(report);
    await loadReportRuns(report.id);
    setShowRunsModal(true);
  };

  const resetForm = () => {
    setReportName('');
    setReportType('users');
    setScheduleType('daily');
    setScheduleDay(1);
    setScheduleTime('09:00:00');
    setRecipients('');
    setFormat('csv');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading scheduled reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scheduled Reports</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
          <Plus size={20} color={colors.white} />
          <Text style={styles.createButtonText}>New Report</Text>
        </TouchableOpacity>
      </View>

      {reports.length === 0 ? (
        <View style={styles.emptyState}>
          <Calendar size={48} color={colors.textLight} />
          <Text style={styles.emptyText}>No scheduled reports</Text>
          <Text style={styles.emptySubtext}>Create your first automated report</Text>
        </View>
      ) : (
        <ScrollView style={styles.reportsList} showsVerticalScrollIndicator={false}>
          {reports.map((report) => (
            <View key={report.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <View style={styles.reportInfo}>
                  <Text style={styles.reportName}>{report.report_name}</Text>
                  <Text style={styles.reportType}>{getReportTypeDisplayName(report.report_type)}</Text>
                </View>
                <Switch
                  value={report.is_active}
                  onValueChange={() => handleToggleReport(report.id, report.is_active)}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={report.is_active ? colors.primary : colors.textLight}
                />
              </View>

              <View style={styles.reportDetails}>
                <View style={styles.detailRow}>
                  <Calendar size={16} color={colors.textSecondary} />
                  <Text style={styles.detailText}>{getScheduleDescription(report)}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Clock size={16} color={colors.textSecondary} />
                  <Text style={styles.detailText}>
                    Next run: {getNextRunDescription(report.next_run_at)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Mail size={16} color={colors.textSecondary} />
                  <Text style={styles.detailText}>
                    {report.recipients.length} recipient{report.recipients.length !== 1 ? 's' : ''}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <FileText size={16} color={colors.textSecondary} />
                  <Text style={styles.detailText}>Format: {report.format.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.reportActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleRunNow(report.id)}
                >
                  <Play size={16} color={colors.primary} />
                  <Text style={styles.actionButtonText}>Run Now</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleViewRuns(report)}
                >
                  <FileText size={16} color={colors.secondary} />
                  <Text style={styles.actionButtonText}>History</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDeleteReport(report.id)}
                >
                  <Trash2 size={16} color={colors.error} />
                  <Text style={[styles.actionButtonText, { color: colors.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Create Report Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView>
              <Text style={styles.modalTitle}>Create Scheduled Report</Text>

              <Text style={styles.label}>Report Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Monthly Revenue Report"
                value={reportName}
                onChangeText={setReportName}
              />

              <Text style={styles.label}>Report Type</Text>
              <View style={styles.buttonGroup}>
                {(['users', 'bookings', 'revenue', 'analytics'] as ReportType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.buttonGroupItem,
                      reportType === type && styles.buttonGroupItemActive,
                    ]}
                    onPress={() => setReportType(type)}
                  >
                    <Text
                      style={[
                        styles.buttonGroupText,
                        reportType === type && styles.buttonGroupTextActive,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Schedule</Text>
              <View style={styles.buttonGroup}>
                {(['daily', 'weekly', 'monthly'] as ScheduleType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.buttonGroupItem,
                      scheduleType === type && styles.buttonGroupItemActive,
                    ]}
                    onPress={() => setScheduleType(type)}
                  >
                    <Text
                      style={[
                        styles.buttonGroupText,
                        scheduleType === type && styles.buttonGroupTextActive,
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {scheduleType === 'weekly' && (
                <>
                  <Text style={styles.label}>Day of Week</Text>
                  <View style={styles.dayPicker}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayButton,
                          scheduleDay === index && styles.dayButtonActive,
                        ]}
                        onPress={() => setScheduleDay(index)}
                      >
                        <Text
                          style={[
                            styles.dayButtonText,
                            scheduleDay === index && styles.dayButtonTextActive,
                          ]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {scheduleType === 'monthly' && (
                <>
                  <Text style={styles.label}>Day of Month</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1-31"
                    keyboardType="number-pad"
                    value={String(scheduleDay)}
                    onChangeText={(text) => setScheduleDay(parseInt(text) || 1)}
                  />
                </>
              )}

              <Text style={styles.label}>Time (HH:MM:SS)</Text>
              <TextInput
                style={styles.input}
                placeholder="09:00:00"
                value={scheduleTime}
                onChangeText={setScheduleTime}
              />

              <Text style={styles.label}>Recipients (comma-separated emails)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="admin@example.com, manager@example.com"
                value={recipients}
                onChangeText={setRecipients}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Format</Text>
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.buttonGroupItem, format === 'csv' && styles.buttonGroupItemActive]}
                  onPress={() => setFormat('csv')}
                >
                  <Text
                    style={[
                      styles.buttonGroupText,
                      format === 'csv' && styles.buttonGroupTextActive,
                    ]}
                  >
                    CSV
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.buttonGroupItem,
                    format === 'html' && styles.buttonGroupItemActive,
                  ]}
                  onPress={() => setFormat('html')}
                >
                  <Text
                    style={[
                      styles.buttonGroupText,
                      format === 'html' && styles.buttonGroupTextActive,
                    ]}
                  >
                    HTML
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.submitButton} onPress={handleCreateReport}>
                  <Text style={styles.submitButtonText}>Create Report</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Report Runs Modal */}
      <Modal visible={showRunsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report History</Text>
              <TouchableOpacity onPress={() => setShowRunsModal(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView>
              {reportRuns.length === 0 ? (
                <Text style={styles.emptyText}>No report runs yet</Text>
              ) : (
                reportRuns.map((run) => (
                  <View key={run.id} style={styles.runCard}>
                    <View style={styles.runHeader}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(run.status) + '20' },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: getStatusColor(run.status) }]}>
                          {run.status}
                        </Text>
                      </View>
                      <Text style={styles.runDate}>
                        {new Date(run.created_at).toLocaleString()}
                      </Text>
                    </View>

                    {run.status === 'completed' && (
                      <View style={styles.runDetails}>
                        <Text style={styles.runDetailText}>Rows: {run.row_count}</Text>
                        <Text style={styles.runDetailText}>Size: {formatFileSize(run.file_size)}</Text>
                      </View>
                    )}

                    {run.status === 'failed' && run.error_message && (
                      <Text style={styles.errorText}>{run.error_message}</Text>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  createButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  reportsList: {
    flex: 1,
    padding: spacing.lg,
  },
  reportCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  reportInfo: {
    flex: 1,
  },
  reportName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  reportType: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  reportDetails: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  reportActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  closeButton: {
    fontSize: fontSize.xxl,
    color: colors.textSecondary,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buttonGroupItem: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  buttonGroupItemActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  buttonGroupText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  buttonGroupTextActive: {
    color: colors.primary,
  },
  dayPicker: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  dayButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  dayButtonActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  dayButtonText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  dayButtonTextActive: {
    color: colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  submitButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  runCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  runHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
  },
  runDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  runDetails: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  runDetailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
