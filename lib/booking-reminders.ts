import { supabase } from './supabase';

export interface ReminderPreferences {
  '24_hour_reminder': boolean;
  '1_hour_reminder': boolean;
  'day_of_reminder': boolean;
  'email_reminders': boolean;
  'push_reminders': boolean;
  'sms_reminders': boolean;
}

export interface BookingReminder {
  id: string;
  booking_id: string;
  reminder_type: '24_hour' | '1_hour' | 'day_of' | 'custom';
  sent_to: string;
  sent_at: string;
  delivery_status: 'Sent' | 'Delivered' | 'Read' | 'Failed';
  notification_id?: string;
  error_message?: string;
}

export interface ReminderStats {
  total_sent: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  delivery_rate: number;
  read_rate: number;
}

/**
 * Get user's reminder preferences
 */
export async function getReminderPreferences(): Promise<ReminderPreferences> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .select('reminder_preferences')
      .eq('id', userData.user.id)
      .single();

    if (error) throw error;

    return data.reminder_preferences || {
      '24_hour_reminder': true,
      '1_hour_reminder': true,
      'day_of_reminder': true,
      'email_reminders': true,
      'push_reminders': true,
      'sms_reminders': false,
    };
  } catch (error) {
    console.error('Error getting reminder preferences:', error);
    throw error;
  }
}

/**
 * Update user's reminder preferences
 */
export async function updateReminderPreferences(
  preferences: Partial<ReminderPreferences>
): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const currentPrefs = await getReminderPreferences();
    const updatedPrefs = { ...currentPrefs, ...preferences };

    const { error } = await supabase
      .from('profiles')
      .update({ reminder_preferences: updatedPrefs })
      .eq('id', userData.user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating reminder preferences:', error);
    throw error;
  }
}

/**
 * Get reminders for a specific booking
 */
export async function getBookingReminders(
  bookingId: string
): Promise<BookingReminder[]> {
  try {
    const { data, error } = await supabase
      .from('booking_reminders')
      .select('*')
      .eq('booking_id', bookingId)
      .order('sent_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting booking reminders:', error);
    return [];
  }
}

/**
 * Get all reminders for current user
 */
export async function getMyReminders(
  limit: number = 50
): Promise<BookingReminder[]> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('booking_reminders')
      .select('*')
      .eq('sent_to', userData.user.id)
      .order('sent_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting user reminders:', error);
    return [];
  }
}

/**
 * Mark reminder as delivered
 */
export async function markReminderDelivered(
  reminderId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('mark_reminder_delivered', {
      reminder_id_param: reminderId,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error marking reminder as delivered:', error);
    return false;
  }
}

/**
 * Mark reminder as read
 */
export async function markReminderRead(reminderId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('mark_reminder_read', {
      reminder_id_param: reminderId,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error marking reminder as read:', error);
    return false;
  }
}

/**
 * Check if reminder was sent for a booking
 */
export async function checkReminderSent(
  bookingId: string,
  reminderType: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_reminder_sent', {
      booking_id_param: bookingId,
      reminder_type_param: reminderType,
      user_id_param: userId,
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error checking reminder status:', error);
    return false;
  }
}

/**
 * Get reminder statistics (admin only)
 */
export async function getReminderStats(
  startDate?: Date,
  endDate?: Date
): Promise<ReminderStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_reminder_stats', {
      start_date_param: startDate?.toISOString().split('T')[0],
      end_date_param: endDate?.toISOString().split('T')[0],
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error getting reminder stats:', error);
    return null;
  }
}

/**
 * Get upcoming bookings with reminder status
 */
export async function getUpcomingBookingsWithReminders(): Promise<any[]> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('upcoming_bookings_with_reminders')
      .select('*')
      .or(`customer_id.eq.${userData.user.id},provider_id.eq.${userData.user.id}`)
      .limit(20);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting upcoming bookings:', error);
    return [];
  }
}

/**
 * Manually trigger reminder job (admin only)
 */
export async function triggerReminderJob(
  reminderType: '24_hour' | '1_hour' = '24_hour'
): Promise<{
  success: boolean;
  details?: any;
  error?: string;
}> {
  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing');
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('No active session');
    }

    const functionName =
      reminderType === '1_hour'
        ? 'send-1-hour-reminders'
        : 'send-booking-reminders';

    const response = await fetch(
      `${supabaseUrl}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseAnonKey,
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to trigger reminder job');
    }

    return result;
  } catch (error: any) {
    console.error('Error triggering reminder job:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Calculate hours until booking
 */
export function calculateHoursUntilBooking(
  scheduledDate: string,
  scheduledTime: string
): number {
  const bookingDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
  const now = new Date();
  const diffMs = bookingDateTime.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  return diffHours;
}

/**
 * Check if booking needs 24-hour reminder
 */
export function needs24HourReminder(
  scheduledDate: string,
  scheduledTime: string
): boolean {
  const hours = calculateHoursUntilBooking(scheduledDate, scheduledTime);
  return hours >= 23 && hours <= 25;
}

/**
 * Check if booking needs 1-hour reminder
 */
export function needs1HourReminder(
  scheduledDate: string,
  scheduledTime: string
): boolean {
  const hours = calculateHoursUntilBooking(scheduledDate, scheduledTime);
  return hours >= 0.5 && hours <= 1.5;
}

/**
 * Format reminder message
 */
export function formatReminderMessage(
  booking: {
    title: string;
    scheduled_date: string;
    scheduled_time: string;
    location?: string;
  },
  reminderType: '24_hour' | '1_hour' | 'day_of',
  isProvider: boolean = false
): string {
  const timeMap = {
    '24_hour': 'tomorrow',
    '1_hour': 'in 1 hour',
    'day_of': 'today',
  };

  const timeText = timeMap[reminderType];

  if (isProvider) {
    return `Reminder: Service ${timeText} at ${booking.scheduled_time}`;
  } else {
    return `Reminder: Your ${booking.title} booking is ${timeText} at ${booking.scheduled_time}`;
  }
}
