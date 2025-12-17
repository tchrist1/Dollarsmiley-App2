import { supabase } from './supabase';

export interface QueueItem {
  id: string;
  report_id: string;
  content_type: string;
  content_id: string;
  content_author_id: string;
  content_snapshot: any;
  total_reports: number;
  unique_reporters: number;
  auto_flagged: boolean;
  auto_flag_reason?: string;
  priority_score: number;
  assigned_to?: string;
  status: 'pending' | 'in_review' | 'resolved' | 'escalated';
  created_at: string;
  updated_at: string;
  author_profile: {
    id: string;
    full_name: string;
    avatar_url?: string;
    user_type: string;
    is_verified: boolean;
  };
  report_categories: Array<{
    category_name: string;
    category_icon: string;
    severity: string;
    report_count: number;
  }>;
}

export interface QueueItemDetails {
  queue_item: QueueItem;
  author: any;
  reports: Array<{
    id: string;
    reporter_id: string;
    category: any;
    reason: string;
    description?: string;
    evidence_urls: string[];
    created_at: string;
  }>;
  previous_actions: Array<{
    id: string;
    moderator_id: string;
    moderator_name: string;
    action_type: string;
    reason: string;
    created_at: string;
  }>;
  author_history: {
    total_reports: number;
    total_strikes: number;
    active_strikes: number;
    recent_violations: Array<{
      violation_category: string;
      severity: string;
      created_at: string;
    }>;
  };
}

export interface ModerationStats {
  queue_summary: {
    total_pending: number;
    in_review: number;
    escalated: number;
    high_priority: number;
    auto_flagged: number;
  };
  reports_summary: {
    total_today: number;
    pending: number;
    by_category: Record<string, number>;
  };
  actions_summary: {
    total_today: number;
    by_type: Record<string, number>;
  };
  moderator_activity: Array<{
    moderator_id: string;
    moderator_name: string;
    actions_today: number;
  }>;
}

export interface ModeratorWorkload {
  assigned_items: number;
  completed_today: number;
  completed_this_week: number;
  average_response_time_minutes: number;
}

export async function getModerationQueue(
  filters: {
    status?: string;
    contentType?: string;
    priorityMin?: number;
    assignedTo?: string;
    autoFlagged?: boolean;
  } = {},
  limit: number = 20,
  offset: number = 0
): Promise<QueueItem[]> {
  try {
    const { data, error } = await supabase.rpc('get_moderation_queue', {
      p_status: filters.status || null,
      p_content_type: filters.contentType || null,
      p_priority_min: filters.priorityMin || 0,
      p_assigned_to: filters.assignedTo || null,
      p_auto_flagged: filters.autoFlagged ?? null,
      result_limit: limit,
      result_offset: offset,
    });

    if (error) throw error;

    return (data || []) as QueueItem[];
  } catch (error) {
    console.error('Error fetching moderation queue:', error);
    return [];
  }
}

export async function getQueueItemDetails(
  queueId: string
): Promise<QueueItemDetails | null> {
  try {
    const { data, error } = await supabase.rpc('get_queue_item_details', {
      p_queue_id: queueId,
    });

    if (error) throw error;

    return data as QueueItemDetails;
  } catch (error) {
    console.error('Error fetching queue item details:', error);
    return null;
  }
}

export async function assignQueueItem(
  queueId: string,
  moderatorId?: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('assign_queue_item', {
      p_queue_id: queueId,
      p_moderator_id: moderatorId || null,
    });

    if (error) throw error;

    return data as boolean;
  } catch (error) {
    console.error('Error assigning queue item:', error);
    return false;
  }
}

export async function takeModerationAction(
  queueId: string,
  actionType: 'dismiss' | 'warn' | 'remove_content' | 'suspend_user' | 'ban_user' | 'escalate',
  reason: string,
  internalNotes?: string,
  strikeSeverity?: 'minor' | 'moderate' | 'severe' | 'critical',
  strikeCount: number = 1
): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('take_moderation_action', {
      p_queue_id: queueId,
      p_action_type: actionType,
      p_reason: reason,
      p_internal_notes: internalNotes || null,
      p_strike_severity: strikeSeverity || null,
      p_strike_count: strikeCount,
    });

    if (error) throw error;

    return data as string;
  } catch (error) {
    console.error('Error taking moderation action:', error);
    return null;
  }
}

export async function getModerationStats(): Promise<ModerationStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_moderation_stats');

    if (error) throw error;

    return data as ModerationStats;
  } catch (error) {
    console.error('Error fetching moderation stats:', error);
    return null;
  }
}

export async function getModeratorWorkload(
  moderatorId: string
): Promise<ModeratorWorkload | null> {
  try {
    const { data, error } = await supabase.rpc('get_moderator_workload', {
      p_moderator_id: moderatorId,
    });

    if (error) throw error;

    return data as ModeratorWorkload;
  } catch (error) {
    console.error('Error fetching moderator workload:', error);
    return null;
  }
}

export async function bulkDismissQueueItems(
  queueIds: string[],
  reason: string
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('bulk_dismiss_queue_items', {
      p_queue_ids: queueIds,
      p_reason: reason,
    });

    if (error) throw error;

    return data as number;
  } catch (error) {
    console.error('Error bulk dismissing items:', error);
    return 0;
  }
}

export function subscribeToModerationQueue(callback: () => void) {
  const channel = supabase
    .channel('moderation_queue_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'moderation_queue',
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToContentReports(callback: () => void) {
  const channel = supabase
    .channel('content_reports_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'content_reports',
      },
      callback
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// Moderation History Types
export interface ModerationActionHistory {
  id: string;
  action_type: string;
  moderator_name: string;
  target_user_name: string;
  content_type: string;
  reason: string;
  severity?: string;
  strike_count: number;
  response_time_seconds?: number;
  created_at: string;
}

export interface UserModerationHistory {
  id: string;
  action_type: string;
  moderator_name: string;
  content_type: string;
  reason: string;
  severity?: string;
  strike_count: number;
  created_at: string;
}

export interface ContentModerationTimeline {
  id: string;
  action_type: string;
  moderator_name: string;
  reason: string;
  severity?: string;
  strike_count: number;
  response_time_seconds?: number;
  created_at: string;
}

export interface ModeratorPerformanceSummary {
  total_actions: number;
  total_dismiss: number;
  total_warn: number;
  total_remove_content: number;
  total_suspend_user: number;
  total_ban_user: number;
  total_escalate: number;
  total_restore: number;
  average_response_time_seconds: number;
  days_active: number;
  actions_per_day: number;
}

export interface AuditLogEntry {
  id: string;
  event_type: string;
  entity_type: string;
  actor_name: string;
  target_name?: string;
  description: string;
  metadata: any;
  created_at: string;
}

// Get user moderation history
export async function getUserModerationHistory(
  userId: string,
  limit: number = 50
): Promise<UserModerationHistory[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_moderation_history', {
      p_user_id: userId,
      p_limit: limit,
    });

    if (error) throw error;

    return (data || []) as UserModerationHistory[];
  } catch (error) {
    console.error('Error fetching user moderation history:', error);
    return [];
  }
}

// Get moderator action history
export async function getModeratorActionHistory(
  moderatorId: string,
  startDate?: string,
  endDate?: string,
  limit: number = 100
): Promise<ModerationActionHistory[]> {
  try {
    const { data, error } = await supabase.rpc('get_moderator_action_history', {
      p_moderator_id: moderatorId,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
      p_limit: limit,
    });

    if (error) throw error;

    return (data || []) as ModerationActionHistory[];
  } catch (error) {
    console.error('Error fetching moderator action history:', error);
    return [];
  }
}

// Get content moderation timeline
export async function getContentModerationTimeline(
  contentType: string,
  contentId: string
): Promise<ContentModerationTimeline[]> {
  try {
    const { data, error } = await supabase.rpc('get_content_moderation_timeline', {
      p_content_type: contentType,
      p_content_id: contentId,
    });

    if (error) throw error;

    return (data || []) as ContentModerationTimeline[];
  } catch (error) {
    console.error('Error fetching content moderation timeline:', error);
    return [];
  }
}

// Get moderator performance summary
export async function getModeratorPerformanceSummary(
  moderatorId: string,
  startDate?: string,
  endDate?: string
): Promise<ModeratorPerformanceSummary | null> {
  try {
    const { data, error } = await supabase.rpc('get_moderator_performance_summary', {
      p_moderator_id: moderatorId,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    if (error) throw error;

    return data as ModeratorPerformanceSummary;
  } catch (error) {
    console.error('Error fetching moderator performance summary:', error);
    return null;
  }
}

// Get moderation audit log
export async function getModerationAuditLog(
  filters: {
    eventType?: string;
    entityType?: string;
    actorId?: string;
    startDate?: string;
    endDate?: string;
  } = {},
  limit: number = 100
): Promise<AuditLogEntry[]> {
  try {
    const { data, error } = await supabase.rpc('get_moderation_audit_log', {
      p_event_type: filters.eventType || null,
      p_entity_type: filters.entityType || null,
      p_actor_id: filters.actorId || null,
      p_start_date: filters.startDate || null,
      p_end_date: filters.endDate || null,
      p_limit: limit,
    });

    if (error) throw error;

    return (data || []) as AuditLogEntry[];
  } catch (error) {
    console.error('Error fetching moderation audit log:', error);
    return [];
  }
}

// Export user moderation history as CSV
export function exportUserHistoryToCSV(history: UserModerationHistory[]): string {
  const headers = [
    'Date',
    'Action Type',
    'Moderator',
    'Content Type',
    'Reason',
    'Severity',
    'Strike Count',
  ];

  const rows = history.map((item) => [
    new Date(item.created_at).toLocaleString(),
    item.action_type,
    item.moderator_name,
    item.content_type,
    item.reason,
    item.severity || '',
    item.strike_count.toString(),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

// Export moderator performance to CSV
export function exportModeratorPerformanceToCSV(
  history: ModerationActionHistory[]
): string {
  const headers = [
    'Date',
    'Action Type',
    'Target User',
    'Content Type',
    'Reason',
    'Severity',
    'Response Time (seconds)',
  ];

  const rows = history.map((item) => [
    new Date(item.created_at).toLocaleString(),
    item.action_type,
    item.target_user_name,
    item.content_type,
    item.reason,
    item.severity || '',
    item.response_time_seconds?.toString() || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

// Format action type for display
export function formatActionType(actionType: string): string {
  return actionType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Get severity color
export function getSeverityColor(severity?: string): string {
  switch (severity) {
    case 'critical':
      return '#DC2626'; // red-600
    case 'severe':
      return '#EA580C'; // orange-600
    case 'moderate':
      return '#F59E0B'; // amber-500
    case 'minor':
      return '#10B981'; // green-500
    default:
      return '#6B7280'; // gray-500
  }
}

// Format response time for display
export function formatResponseTime(seconds?: number): string {
  if (!seconds) return 'N/A';

  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
