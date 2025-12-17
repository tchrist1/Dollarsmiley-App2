import { supabase } from './supabase';

export interface PayoutNotification {
  id: string;
  user_id: string;
  notification_type: 'payout_scheduled' | 'payout_processing' | 'payout_completed' | 'payout_failed' | 'early_payout_eligible' | 'early_payout_approved';
  title: string;
  message: string;
  amount?: number;
  payout_schedule_id?: string;
  read: boolean;
  created_at: string;
}

export class PayoutNotificationService {
  static async createPayoutScheduledNotification(
    userId: string,
    scheduleId: string,
    amount: number,
    payoutDate: string
  ): Promise<void> {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

    const payoutDateFormatted = new Date(payoutDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'payout_scheduled',
      title: 'Payout Scheduled',
      message: `Your payout of ${formattedAmount} has been scheduled for ${payoutDateFormatted}`,
      data: {
        amount,
        payout_schedule_id: scheduleId,
        payout_date: payoutDate,
      },
      is_read: false,
    });
  }

  static async createPayoutProcessingNotification(
    userId: string,
    scheduleId: string,
    amount: number
  ): Promise<void> {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'payout_processing',
      title: 'Payout Processing',
      message: `Your payout of ${formattedAmount} is being processed`,
      data: {
        amount,
        payout_schedule_id: scheduleId,
      },
      is_read: false,
    });
  }

  static async createPayoutCompletedNotification(
    userId: string,
    scheduleId: string,
    amount: number
  ): Promise<void> {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'payout_completed',
      title: 'Payout Completed',
      message: `Your payout of ${formattedAmount} has been transferred to your account`,
      data: {
        amount,
        payout_schedule_id: scheduleId,
      },
      is_read: false,
    });
  }

  static async createPayoutFailedNotification(
    userId: string,
    scheduleId: string,
    amount: number,
    reason?: string
  ): Promise<void> {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'payout_failed',
      title: 'Payout Failed',
      message: `Your payout of ${formattedAmount} failed. ${reason || 'Please check your payment method.'}`,
      data: {
        amount,
        payout_schedule_id: scheduleId,
        reason,
      },
      is_read: false,
    });
  }

  static async createEarlyPayoutEligibleNotification(
    userId: string,
    scheduleId: string,
    amount: number
  ): Promise<void> {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'early_payout_eligible',
      title: 'Early Payout Available',
      message: `You can now request an early payout of ${formattedAmount}`,
      data: {
        amount,
        payout_schedule_id: scheduleId,
      },
      is_read: false,
    });
  }

  static async createEarlyPayoutApprovedNotification(
    userId: string,
    scheduleId: string,
    amount: number,
    fee: number
  ): Promise<void> {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

    const formattedFee = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(fee);

    const netAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount - fee);

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'early_payout_approved',
      title: 'Early Payout Approved',
      message: `Your early payout request has been approved. You'll receive ${netAmount} (${formattedAmount} - ${formattedFee} fee)`,
      data: {
        amount,
        fee,
        net_amount: amount - fee,
        payout_schedule_id: scheduleId,
      },
      is_read: false,
    });
  }

  static async notifyPayoutScheduleCreated(
    providerId: string,
    bookingId: string
  ): Promise<void> {
    const { data: booking } = await supabase
      .from('bookings')
      .select('provider_payout, scheduled_date')
      .eq('id', bookingId)
      .single();

    if (!booking) return;

    const { data: schedule } = await supabase
      .from('payout_schedules')
      .select('id, scheduled_payout_date')
      .eq('booking_id', bookingId)
      .eq('provider_id', providerId)
      .single();

    if (!schedule) return;

    await this.createPayoutScheduledNotification(
      providerId,
      schedule.id,
      booking.provider_payout,
      schedule.scheduled_payout_date
    );
  }

  static async checkAndNotifyEarlyPayoutEligibility(
    scheduleId: string
  ): Promise<void> {
    const { data: schedule } = await supabase
      .from('payout_schedules')
      .select(`
        id,
        provider_id,
        amount,
        booking:bookings(status, completed_at)
      `)
      .eq('id', scheduleId)
      .single();

    if (!schedule) return;

    const booking = schedule.booking as any;
    if (booking?.status !== 'Completed' || !booking?.completed_at) return;

    const completedDate = new Date(booking.completed_at);
    const hoursSinceCompletion = (Date.now() - completedDate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceCompletion >= 24) {
      await this.createEarlyPayoutEligibleNotification(
        schedule.provider_id,
        schedule.id,
        schedule.amount
      );
    }
  }

  static async getPayoutNotifications(
    userId: string,
    limit: number = 20
  ): Promise<any[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .in('type', [
        'payout_scheduled',
        'payout_processing',
        'payout_completed',
        'payout_failed',
        'early_payout_eligible',
        'early_payout_approved',
      ])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching payout notifications:', error);
      return [];
    }

    return data || [];
  }

  static async markNotificationAsRead(notificationId: string): Promise<void> {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
  }

  static async getUnreadPayoutNotificationCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .in('type', [
        'payout_scheduled',
        'payout_processing',
        'payout_completed',
        'payout_failed',
        'early_payout_eligible',
        'early_payout_approved',
      ]);

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  }
}
