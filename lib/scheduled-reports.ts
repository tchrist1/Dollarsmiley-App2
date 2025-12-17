import { supabase } from './supabase';

/**
 * Scheduled Reports Management
 */

export type ReportType = 'users' | 'bookings' | 'revenue' | 'analytics' | 'disputes' | 'payouts' | 'listings';
export type ScheduleType = 'daily' | 'weekly' | 'monthly';
export type ReportFormat = 'csv' | 'html';
export type ReportStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface ScheduledReport {
  id: string;
  admin_id: string;
  report_type: ReportType;
  report_name: string;
  schedule_type: ScheduleType;
  schedule_day?: number;
  schedule_time: string;
  recipients: string[];
  format: ReportFormat;
  filters?: Record<string, any>;
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ReportRun {
  id: string;
  scheduled_report_id: string;
  status: ReportStatus;
  file_url?: string;
  row_count?: number;
  file_size?: number;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface CreateScheduledReportParams {
  admin_id: string;
  report_type: ReportType;
  report_name: string;
  schedule_type: ScheduleType;
  schedule_day?: number;
  schedule_time: string;
  recipients: string[];
  format: ReportFormat;
  filters?: Record<string, any>;
}

export interface UpdateScheduledReportParams {
  report_name?: string;
  schedule_type?: ScheduleType;
  schedule_day?: number;
  schedule_time?: string;
  recipients?: string[];
  format?: ReportFormat;
  filters?: Record<string, any>;
  is_active?: boolean;
}

/**
 * Get all scheduled reports for admin
 */
export async function getScheduledReports(adminId: string): Promise<ScheduledReport[]> {
  const { data, error } = await supabase
    .from('scheduled_reports')
    .select('*')
    .eq('admin_id', adminId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching scheduled reports:', error);
    throw error;
  }

  return (data || []).map((report) => ({
    ...report,
    recipients: report.recipients || [],
    filters: report.filters || {},
  }));
}

/**
 * Get a single scheduled report
 */
export async function getScheduledReport(reportId: string): Promise<ScheduledReport | null> {
  const { data, error } = await supabase
    .from('scheduled_reports')
    .select('*')
    .eq('id', reportId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching scheduled report:', error);
    throw error;
  }

  if (!data) return null;

  return {
    ...data,
    recipients: data.recipients || [],
    filters: data.filters || {},
  };
}

/**
 * Create a new scheduled report
 */
export async function createScheduledReport(
  params: CreateScheduledReportParams
): Promise<ScheduledReport> {
  const { data, error } = await supabase
    .from('scheduled_reports')
    .insert({
      admin_id: params.admin_id,
      report_type: params.report_type,
      report_name: params.report_name,
      schedule_type: params.schedule_type,
      schedule_day: params.schedule_day,
      schedule_time: params.schedule_time,
      recipients: params.recipients,
      format: params.format,
      filters: params.filters || {},
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating scheduled report:', error);
    throw error;
  }

  return {
    ...data,
    recipients: data.recipients || [],
    filters: data.filters || {},
  };
}

/**
 * Update a scheduled report
 */
export async function updateScheduledReport(
  reportId: string,
  params: UpdateScheduledReportParams
): Promise<ScheduledReport> {
  const { data, error } = await supabase
    .from('scheduled_reports')
    .update(params)
    .eq('id', reportId)
    .select()
    .single();

  if (error) {
    console.error('Error updating scheduled report:', error);
    throw error;
  }

  return {
    ...data,
    recipients: data.recipients || [],
    filters: data.filters || {},
  };
}

/**
 * Delete a scheduled report
 */
export async function deleteScheduledReport(reportId: string): Promise<void> {
  const { error } = await supabase.from('scheduled_reports').delete().eq('id', reportId);

  if (error) {
    console.error('Error deleting scheduled report:', error);
    throw error;
  }
}

/**
 * Toggle scheduled report active status
 */
export async function toggleScheduledReport(reportId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('scheduled_reports')
    .update({ is_active: isActive })
    .eq('id', reportId);

  if (error) {
    console.error('Error toggling scheduled report:', error);
    throw error;
  }
}

/**
 * Get report runs for a scheduled report
 */
export async function getReportRuns(scheduledReportId: string): Promise<ReportRun[]> {
  const { data, error } = await supabase
    .from('report_runs')
    .select('*')
    .eq('scheduled_report_id', scheduledReportId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching report runs:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get recent report runs across all reports
 */
export async function getRecentReportRuns(limit: number = 20): Promise<ReportRun[]> {
  const { data, error } = await supabase
    .from('report_runs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent report runs:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get schedule description
 */
export function getScheduleDescription(report: ScheduledReport): string {
  const time = formatTime(report.schedule_time);

  switch (report.schedule_type) {
    case 'daily':
      return `Daily at ${time}`;

    case 'weekly':
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[report.schedule_day || 0];
      return `Every ${dayName} at ${time}`;

    case 'monthly':
      const day = report.schedule_day || 1;
      const suffix = getOrdinalSuffix(day);
      return `Monthly on the ${day}${suffix} at ${time}`;

    default:
      return 'Unknown schedule';
  }
}

/**
 * Format time string (HH:MM:SS to hh:mm AM/PM)
 */
function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Get ordinal suffix (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;

  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

/**
 * Get report type display name
 */
export function getReportTypeDisplayName(reportType: ReportType): string {
  const names: Record<ReportType, string> = {
    users: 'Users Report',
    bookings: 'Bookings Report',
    revenue: 'Revenue Report',
    analytics: 'Analytics Report',
    disputes: 'Disputes Report',
    payouts: 'Payouts Report',
    listings: 'Listings Report',
  };
  return names[reportType];
}

/**
 * Get status badge color
 */
export function getStatusColor(status: ReportStatus): string {
  const colors: Record<ReportStatus, string> = {
    pending: '#FFA500',
    running: '#007AFF',
    completed: '#34C759',
    failed: '#FF3B30',
  };
  return colors[status];
}

/**
 * Format file size
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return 'N/A';

  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
}

/**
 * Validate schedule parameters
 */
export function validateSchedule(
  scheduleType: ScheduleType,
  scheduleDay?: number
): { valid: boolean; error?: string } {
  if (scheduleType === 'weekly') {
    if (scheduleDay === undefined || scheduleDay < 0 || scheduleDay > 6) {
      return { valid: false, error: 'Weekly schedule requires a day of week (0-6)' };
    }
  }

  if (scheduleType === 'monthly') {
    if (scheduleDay === undefined || scheduleDay < 1 || scheduleDay > 31) {
      return { valid: false, error: 'Monthly schedule requires a day of month (1-31)' };
    }
  }

  return { valid: true };
}

/**
 * Validate email addresses
 */
export function validateEmails(emails: string[]): { valid: boolean; error?: string } {
  if (emails.length === 0) {
    return { valid: false, error: 'At least one recipient email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  for (const email of emails) {
    if (!emailRegex.test(email)) {
      return { valid: false, error: `Invalid email address: ${email}` };
    }
  }

  return { valid: true };
}

/**
 * Get next run time description
 */
export function getNextRunDescription(nextRunAt?: string): string {
  if (!nextRunAt) return 'Not scheduled';

  const now = new Date();
  const nextRun = new Date(nextRunAt);
  const diffMs = nextRun.getTime() - now.getTime();

  if (diffMs < 0) return 'Overdue';

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `In ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }

  if (diffHours > 0) {
    return `In ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  }

  if (diffMins > 0) {
    return `In ${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
  }

  return 'Soon';
}

/**
 * Trigger manual report run
 */
export async function triggerManualReport(reportId: string): Promise<void> {
  // Create a report run entry
  const { error: runError } = await supabase.from('report_runs').insert({
    scheduled_report_id: reportId,
    status: 'pending',
  });

  if (runError) {
    console.error('Error creating report run:', runError);
    throw runError;
  }

  // Note: In production, this would trigger an edge function or background job
  // For now, we just create the pending run entry
  console.log('Manual report run triggered for report:', reportId);
}
