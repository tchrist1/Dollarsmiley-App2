import { supabase } from './supabase';
import { TimelineEvent } from '@/components/BookingTimeline';

/**
 * Get complete timeline for a booking
 */
export async function getBookingTimeline(
  bookingId: string
): Promise<TimelineEvent[]> {
  try {
    const { data, error } = await supabase.rpc('get_booking_timeline', {
      booking_id_param: bookingId,
    });

    if (error) throw error;

    return (data as TimelineEvent[]) || [];
  } catch (error) {
    console.error('Error fetching booking timeline:', error);
    return [];
  }
}

/**
 * Get booking status history
 */
export async function getBookingStatusHistory(bookingId: string): Promise<
  Array<{
    status: string;
    changed_at: string;
    changed_by: string;
    changed_by_name: string;
    changed_by_role: string;
  }>
> {
  try {
    const { data, error } = await supabase.rpc('get_booking_status_history', {
      booking_id_param: bookingId,
    });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching booking status history:', error);
    return [];
  }
}

/**
 * Add custom timeline event
 */
export async function addTimelineEvent(
  bookingId: string,
  eventType: string,
  title: string,
  description?: string,
  metadata?: Record<string, any>
): Promise<TimelineEvent | null> {
  try {
    const { data, error } = await supabase.rpc('add_timeline_event', {
      booking_id_param: bookingId,
      event_type_param: eventType,
      title_param: title,
      description_param: description,
      metadata_param: metadata,
    });

    if (error) throw error;

    return data as TimelineEvent;
  } catch (error) {
    console.error('Error adding timeline event:', error);
    return null;
  }
}

/**
 * Generate timeline from booking data (client-side fallback)
 */
export function generateTimelineFromBooking(booking: any): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Created event
  events.push({
    id: `${booking.id}-created`,
    type: 'created',
    title: 'Booking Created',
    description: 'Job request was posted',
    timestamp: booking.created_at,
    actor: {
      name: booking.customer?.full_name || 'Customer',
      role: 'customer',
    },
  });

  // Accepted event
  if (['Accepted', 'Confirmed', 'Completed', 'In Progress'].includes(booking.status)) {
    events.push({
      id: `${booking.id}-accepted`,
      type: 'accepted',
      title: 'Booking Accepted',
      description: 'Provider accepted the booking request',
      timestamp: booking.updated_at || booking.created_at,
      actor: {
        name: booking.provider?.full_name || 'Provider',
        role: 'provider',
      },
    });
  }

  // Payment events
  if (booking.payment_status === 'Completed') {
    events.push({
      id: `${booking.id}-payment`,
      type: 'payment_completed',
      title: 'Payment Received',
      description: 'Payment has been processed successfully',
      timestamp: booking.updated_at,
      actor: {
        name: booking.customer?.full_name || 'Customer',
        role: 'customer',
      },
      metadata: {
        amount: `$${booking.price?.toFixed(2)}`,
        payment_method: booking.payment_method || 'Card',
      },
    });
  } else if (booking.payment_status === 'Pending') {
    events.push({
      id: `${booking.id}-payment-pending`,
      type: 'payment_pending',
      title: 'Payment Pending',
      description: 'Waiting for payment confirmation',
      timestamp: booking.updated_at,
      actor: {
        name: 'System',
        role: 'system',
      },
    });
  }

  // Confirmed event
  if (booking.status === 'Confirmed') {
    events.push({
      id: `${booking.id}-confirmed`,
      type: 'confirmed',
      title: 'Booking Confirmed',
      description: 'All details confirmed, booking is scheduled',
      timestamp: booking.updated_at,
      actor: {
        name: 'System',
        role: 'system',
      },
      metadata: {
        scheduled_date: booking.scheduled_date,
        scheduled_time: booking.scheduled_time,
      },
    });
  }

  // In Progress event
  if (booking.status === 'In Progress') {
    events.push({
      id: `${booking.id}-in-progress`,
      type: 'in_progress',
      title: 'Service Started',
      description: 'Provider has started the service',
      timestamp: booking.updated_at,
      actor: {
        name: booking.provider?.full_name || 'Provider',
        role: 'provider',
      },
    });
  }

  // Completed event
  if (booking.status === 'Completed') {
    events.push({
      id: `${booking.id}-completed`,
      type: 'completed',
      title: 'Booking Completed',
      description: 'Service has been completed successfully',
      timestamp: booking.updated_at,
      actor: {
        name: booking.provider?.full_name || 'Provider',
        role: 'provider',
      },
    });
  }

  // Cancelled event
  if (booking.status === 'Cancelled' && booking.cancellation) {
    events.push({
      id: `${booking.id}-cancelled`,
      type: 'cancelled',
      title: 'Booking Cancelled',
      description: booking.cancellation.cancellation_reason || 'Booking was cancelled',
      timestamp: booking.cancellation.cancelled_at,
      actor: {
        name: booking.cancellation.cancelled_by_profile?.full_name || 'User',
        role: booking.cancellation.cancelled_by_role?.toLowerCase() || 'customer',
      },
      metadata: {
        reason: booking.cancellation.cancellation_reason,
        refund_status: booking.cancellation.refund_status,
        refund_amount:
          booking.cancellation.refund_amount > 0
            ? `$${booking.cancellation.refund_amount.toFixed(2)}`
            : 'No refund',
      },
    });
  }

  // Sort by timestamp
  return events.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Get timeline summary statistics
 */
export function getTimelineStats(events: TimelineEvent[]): {
  totalEvents: number;
  eventsByType: Record<string, number>;
  duration: number;
  lastUpdate: string;
} {
  const eventsByType: Record<string, number> = {};

  events.forEach((event) => {
    eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
  });

  const timestamps = events.map((e) => new Date(e.timestamp).getTime());
  const duration = timestamps.length > 0 ? Math.max(...timestamps) - Math.min(...timestamps) : 0;

  return {
    totalEvents: events.length,
    eventsByType,
    duration,
    lastUpdate: events.length > 0 ? events[events.length - 1].timestamp : '',
  };
}

/**
 * Filter timeline events by type
 */
export function filterTimelineByType(
  events: TimelineEvent[],
  types: string[]
): TimelineEvent[] {
  return events.filter((event) => types.includes(event.type));
}

/**
 * Filter timeline events by date range
 */
export function filterTimelineByDateRange(
  events: TimelineEvent[],
  startDate: Date,
  endDate: Date
): TimelineEvent[] {
  return events.filter((event) => {
    const eventDate = new Date(event.timestamp);
    return eventDate >= startDate && eventDate <= endDate;
  });
}

/**
 * Group timeline events by date
 */
export function groupTimelineByDate(
  events: TimelineEvent[]
): Record<string, TimelineEvent[]> {
  const grouped: Record<string, TimelineEvent[]> = {};

  events.forEach((event) => {
    const date = new Date(event.timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (!grouped[date]) {
      grouped[date] = [];
    }

    grouped[date].push(event);
  });

  return grouped;
}

/**
 * Get next expected timeline event
 */
export function getNextExpectedEvent(
  events: TimelineEvent[],
  currentStatus: string
): string | null {
  const statusFlow = [
    'created',
    'accepted',
    'payment_completed',
    'confirmed',
    'in_progress',
    'completed',
    'reviewed',
  ];

  const lastEventType = events.length > 0 ? events[events.length - 1].type : null;
  const lastIndex = lastEventType ? statusFlow.indexOf(lastEventType) : -1;

  if (lastIndex >= 0 && lastIndex < statusFlow.length - 1) {
    return statusFlow[lastIndex + 1];
  }

  return null;
}

/**
 * Calculate completion percentage based on timeline
 */
export function calculateTimelineProgress(
  events: TimelineEvent[],
  status: string
): number {
  const milestones = [
    'created',
    'accepted',
    'payment_completed',
    'confirmed',
    'in_progress',
    'completed',
  ];

  const completedMilestones = new Set(events.map((e) => e.type));
  const completed = milestones.filter((m) => completedMilestones.has(m)).length;

  return Math.round((completed / milestones.length) * 100);
}
