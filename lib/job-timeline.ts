import { supabase } from './supabase';

export interface JobTimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description?: string;
  actor: {
    id?: string;
    name: string;
    role: 'customer' | 'provider' | 'system';
  };
  timestamp: string;
  metadata?: Record<string, any>;
  is_milestone: boolean;
}

export interface JobStatusHistory {
  id: string;
  job_id: string;
  from_status?: string;
  to_status: string;
  changed_by?: string;
  changed_by_role: string;
  reason?: string;
  notes?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface StatusTransition {
  from_status: string;
  to_status: string;
  allowed_roles: string[];
  description: string;
}

// Get complete timeline for a job
export async function getJobTimeline(jobId: string): Promise<JobTimelineEvent[]> {
  try {
    const { data, error } = await supabase.rpc('get_job_timeline', {
      p_job_id: jobId,
    });

    if (error) throw error;

    return (data || []) as JobTimelineEvent[];
  } catch (error) {
    console.error('Error fetching job timeline:', error);
    return [];
  }
}

// Add custom timeline event
export async function addJobTimelineEvent(
  jobId: string,
  eventType: string,
  title: string,
  description?: string,
  metadata?: Record<string, any>,
  isMilestone: boolean = false
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('add_job_timeline_event', {
      p_job_id: jobId,
      p_event_type: eventType,
      p_title: title,
      p_description: description || null,
      p_actor_id: null, // Will use current user
      p_actor_role: null, // Will be determined automatically
      p_metadata: metadata || {},
      p_is_milestone: isMilestone,
    });

    if (error) throw error;

    return { success: true, eventId: data };
  } catch (error: any) {
    console.error('Error adding timeline event:', error);
    return { success: false, error: error.message };
  }
}

// Get job status history
export async function getJobStatusHistory(jobId: string): Promise<JobStatusHistory[]> {
  try {
    const { data, error } = await supabase
      .from('job_status_history')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching job status history:', error);
    return [];
  }
}

// Get valid status transitions
export async function getValidStatusTransitions(): Promise<StatusTransition[]> {
  try {
    const { data, error } = await supabase.rpc('get_job_status_transitions');

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching status transitions:', error);
    return [];
  }
}

// Check if status transition is valid
export async function canTransitionStatus(
  fromStatus: string,
  toStatus: string,
  userRole: string
): Promise<boolean> {
  try {
    const transitions = await getValidStatusTransitions();

    const transition = transitions.find(
      (t) => t.from_status === fromStatus && t.to_status === toStatus
    );

    if (!transition) return false;

    return transition.allowed_roles.includes(userRole.toLowerCase());
  } catch (error) {
    console.error('Error checking status transition:', error);
    return false;
  }
}

// Format event type for display
export function formatEventType(eventType: string): string {
  const labels: Record<string, string> = {
    created: 'Created',
    status_changed: 'Status Changed',
    quote_received: 'Quote Received',
    quote_accepted: 'Quote Accepted',
    expired: 'Expired',
    cancelled: 'Cancelled',
    updated: 'Updated',
    message: 'Message',
    note: 'Note Added',
  };

  return labels[eventType] || eventType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// Get event icon name based on event type
export function getEventIcon(eventType: string): string {
  const icons: Record<string, string> = {
    created: 'plus-circle',
    status_changed: 'refresh-cw',
    quote_received: 'message-square',
    quote_accepted: 'check-circle',
    expired: 'clock',
    cancelled: 'x-circle',
    updated: 'edit',
    message: 'message-circle',
    note: 'file-text',
  };

  return icons[eventType] || 'circle';
}

// Get event color based on event type
export function getEventColor(eventType: string): string {
  const colors: Record<string, string> = {
    created: '#10B981', // Green
    status_changed: '#3B82F6', // Blue
    quote_received: '#F59E0B', // Orange
    quote_accepted: '#10B981', // Green
    expired: '#6B7280', // Gray
    cancelled: '#EF4444', // Red
    updated: '#8B5CF6', // Purple
    message: '#3B82F6', // Blue
    note: '#6B7280', // Gray
  };

  return colors[eventType] || '#6B7280';
}

// Get status color
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    Open: '#10B981', // Green
    Booked: '#3B82F6', // Blue
    Completed: '#10B981', // Green
    Expired: '#6B7280', // Gray
    Cancelled: '#EF4444', // Red
  };

  return colors[status] || '#6B7280';
}

// Format relative time
export function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const eventTime = new Date(timestamp);
  const diffMs = now.getTime() - eventTime.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return eventTime.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// Format absolute time
export function formatAbsoluteTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Group events by date
export function groupEventsByDate(events: JobTimelineEvent[]): Map<string, JobTimelineEvent[]> {
  const grouped = new Map<string, JobTimelineEvent[]>();

  events.forEach((event) => {
    const date = new Date(event.timestamp);
    const dateKey = date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }

    grouped.get(dateKey)!.push(event);
  });

  return grouped;
}

// Filter milestones only
export function filterMilestones(events: JobTimelineEvent[]): JobTimelineEvent[] {
  return events.filter((event) => event.is_milestone);
}

// Get latest status change
export function getLatestStatusChange(events: JobTimelineEvent[]): JobTimelineEvent | null {
  const statusChanges = events.filter((e) => e.event_type === 'status_changed');
  return statusChanges.length > 0 ? statusChanges[statusChanges.length - 1] : null;
}

// Get quote count from timeline
export function getQuoteCount(events: JobTimelineEvent[]): number {
  return events.filter((e) => e.event_type === 'quote_received').length;
}

// Check if job has accepted quote
export function hasAcceptedQuote(events: JobTimelineEvent[]): boolean {
  return events.some((e) => e.event_type === 'quote_accepted');
}

// Get timeline summary
export function getTimelineSummary(events: JobTimelineEvent[]): {
  total_events: number;
  milestones: number;
  quotes_received: number;
  has_accepted_quote: boolean;
  days_active: number;
  last_activity: string;
} {
  const milestones = filterMilestones(events);
  const quotes = events.filter((e) => e.event_type === 'quote_received');
  const hasQuote = hasAcceptedQuote(events);

  const timestamps = events.map((e) => new Date(e.timestamp).getTime());
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const daysActive = Math.ceil((maxTime - minTime) / (1000 * 60 * 60 * 24));

  const lastEvent = events[events.length - 1];

  return {
    total_events: events.length,
    milestones: milestones.length,
    quotes_received: quotes.length,
    has_accepted_quote: hasQuote,
    days_active: daysActive || 1,
    last_activity: lastEvent ? formatRelativeTime(lastEvent.timestamp) : 'N/A',
  };
}

// Export timeline data for sharing
export function exportTimelineData(
  events: JobTimelineEvent[],
  jobTitle: string
): string {
  const lines = [
    `Job Timeline: ${jobTitle}`,
    `Generated: ${new Date().toLocaleDateString()}`,
    '',
    'Timeline Events:',
    '',
  ];

  events.forEach((event, index) => {
    lines.push(`${index + 1}. ${event.title}`);
    lines.push(`   ${formatAbsoluteTime(event.timestamp)}`);
    lines.push(`   ${event.actor.name} (${event.actor.role})`);
    if (event.description) {
      lines.push(`   ${event.description}`);
    }
    lines.push('');
  });

  return lines.join('\n');
}

// Get timeline statistics
export function getTimelineStatistics(events: JobTimelineEvent[]): {
  event_types: Record<string, number>;
  actors: Record<string, number>;
  milestones_percentage: number;
  avg_events_per_day: number;
} {
  const eventTypes: Record<string, number> = {};
  const actors: Record<string, number> = {};

  events.forEach((event) => {
    // Count event types
    eventTypes[event.event_type] = (eventTypes[event.event_type] || 0) + 1;

    // Count actors
    const actorKey = `${event.actor.name} (${event.actor.role})`;
    actors[actorKey] = (actors[actorKey] || 0) + 1;
  });

  const milestones = filterMilestones(events);
  const milestonesPercentage =
    events.length > 0 ? (milestones.length / events.length) * 100 : 0;

  const summary = getTimelineSummary(events);
  const avgEventsPerDay = events.length / summary.days_active;

  return {
    event_types: eventTypes,
    actors,
    milestones_percentage: milestonesPercentage,
    avg_events_per_day: avgEventsPerDay,
  };
}
