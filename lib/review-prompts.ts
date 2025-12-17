import { supabase } from './supabase';

export interface ReviewPrompt {
  id: string;
  booking_id: string;
  customer_id: string;
  provider_id: string;
  prompt_sent_at: string;
  reminder_sent_at?: string;
  review_submitted_at?: string;
  status: 'Pending' | 'Reminded' | 'Submitted' | 'Expired';
  expires_at: string;
  notification_id?: string;
  reminder_notification_id?: string;
  created_at: string;
}

export interface ReviewPromptPreferences {
  enabled: boolean;
  reminder_enabled: boolean;
  prompt_delay_hours: number;
  reminder_delay_hours: number;
}

export interface ReviewPromptStats {
  total_prompts: number;
  by_status: Record<string, number>;
  submission_rate: number;
  reminder_rate: number;
  expiration_rate: number;
  avg_response_time_hours: number;
}

/**
 * Get review prompts for current user
 */
export async function getMyReviewPrompts(
  status?: string
): Promise<ReviewPrompt[]> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    let query = supabase
      .from('review_prompts')
      .select('*')
      .eq('customer_id', userData.user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting review prompts:', error);
    return [];
  }
}

/**
 * Get pending review prompt for a booking
 */
export async function getBookingReviewPrompt(
  bookingId: string
): Promise<ReviewPrompt | null> {
  try {
    const { data, error } = await supabase
      .from('review_prompts')
      .select('*')
      .eq('booking_id', bookingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error getting booking review prompt:', error);
    return null;
  }
}

/**
 * Check if user has pending review prompts
 */
export async function hasPendingReviewPrompts(): Promise<boolean> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return false;

    const { data, error } = await supabase
      .from('review_prompts')
      .select('id')
      .eq('customer_id', userData.user.id)
      .in('status', ['Pending', 'Reminded'])
      .limit(1);

    if (error) throw error;

    return (data?.length || 0) > 0;
  } catch (error) {
    console.error('Error checking pending prompts:', error);
    return false;
  }
}

/**
 * Get count of pending review prompts
 */
export async function getPendingReviewPromptsCount(): Promise<number> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return 0;

    const { count, error } = await supabase
      .from('review_prompts')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', userData.user.id)
      .in('status', ['Pending', 'Reminded']);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('Error getting pending prompts count:', error);
    return 0;
  }
}

/**
 * Get review prompt preferences
 */
export async function getReviewPromptPreferences(): Promise<ReviewPromptPreferences> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .select('review_prompt_preferences')
      .eq('id', userData.user.id)
      .single();

    if (error) throw error;

    return data.review_prompt_preferences || {
      enabled: true,
      reminder_enabled: true,
      prompt_delay_hours: 0,
      reminder_delay_hours: 24,
    };
  } catch (error) {
    console.error('Error getting review prompt preferences:', error);
    throw error;
  }
}

/**
 * Update review prompt preferences
 */
export async function updateReviewPromptPreferences(
  preferences: Partial<ReviewPromptPreferences>
): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const currentPrefs = await getReviewPromptPreferences();
    const updatedPrefs = { ...currentPrefs, ...preferences };

    const { error } = await supabase
      .from('profiles')
      .update({ review_prompt_preferences: updatedPrefs })
      .eq('id', userData.user.id);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating review prompt preferences:', error);
    throw error;
  }
}

/**
 * Get review prompt statistics (admin only)
 */
export async function getReviewPromptStats(
  startDate?: Date,
  endDate?: Date
): Promise<ReviewPromptStats | null> {
  try {
    const { data, error } = await supabase.rpc('get_review_prompt_stats', {
      start_date_param: startDate?.toISOString().split('T')[0],
      end_date_param: endDate?.toISOString().split('T')[0],
    });

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error getting review prompt stats:', error);
    return null;
  }
}

/**
 * Calculate time remaining until prompt expires
 */
export function getTimeUntilExpiration(expiresAt: string): {
  days: number;
  hours: number;
  minutes: number;
  expired: boolean;
} {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, expired: true };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, expired: false };
}

/**
 * Format expiration time for display
 */
export function formatExpirationTime(expiresAt: string): string {
  const { days, hours, expired } = getTimeUntilExpiration(expiresAt);

  if (expired) return 'Expired';
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} left`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} left`;
  return 'Expiring soon';
}

/**
 * Check if review prompt should be shown (not expired, not submitted)
 */
export function shouldShowReviewPrompt(prompt: ReviewPrompt): boolean {
  if (prompt.status === 'Submitted') return false;
  if (prompt.status === 'Expired') return false;

  const { expired } = getTimeUntilExpiration(prompt.expires_at);
  return !expired;
}

/**
 * Get prompt urgency level
 */
export function getPromptUrgency(
  prompt: ReviewPrompt
): 'low' | 'medium' | 'high' | 'urgent' {
  const { days, hours, expired } = getTimeUntilExpiration(prompt.expires_at);

  if (expired) return 'urgent';
  if (days === 0 && hours < 6) return 'urgent';
  if (days === 0) return 'high';
  if (days === 1) return 'medium';
  return 'low';
}

/**
 * Subscribe to review prompt changes
 */
export function subscribeToReviewPrompts(
  callback: (prompt: ReviewPrompt) => void
) {
  return supabase
    .channel('review_prompts_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'review_prompts',
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as ReviewPrompt);
        }
      }
    )
    .subscribe();
}

/**
 * Dismiss review prompt (mark as expired manually)
 */
export async function dismissReviewPrompt(promptId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('review_prompts')
      .update({ status: 'Expired' })
      .eq('id', promptId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error dismissing review prompt:', error);
    return false;
  }
}

/**
 * Get bookings needing reviews (completed but no prompt yet)
 */
export async function getBookingsNeedingReviews(): Promise<any[]> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];

    const { data, error } = await supabase
      .from('bookings')
      .select(
        `
        *,
        provider:profiles!bookings_provider_id_fkey(id, full_name, avatar_url)
      `
      )
      .eq('customer_id', userData.user.id)
      .eq('status', 'Completed')
      .is('review_prompts.id', null)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting bookings needing reviews:', error);
    return [];
  }
}

/**
 * Manually trigger review reminder job (admin only)
 */
export async function triggerReviewReminderJob(): Promise<{
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

    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-review-reminders`,
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
      throw new Error(result.error || 'Failed to trigger review reminder job');
    }

    return result;
  } catch (error: any) {
    console.error('Error triggering review reminder job:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
