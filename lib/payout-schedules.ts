import { supabase } from './supabase';
import { PayoutSchedule, OrderType, PayoutStatus } from '../types/database';

export interface PayoutConfig {
  cycleDays: number;
  cutoffDays: number;
  earlyPayoutEligibleDays: number;
}

export class PayoutScheduleService {
  static readonly PAYOUT_CONFIGS: Record<OrderType, PayoutConfig> = {
    Job: {
      cycleDays: 7,
      cutoffDays: 3,
      earlyPayoutEligibleDays: 3,
    },
    Service: {
      cycleDays: 14,
      cutoffDays: 5,
      earlyPayoutEligibleDays: 7,
    },
    CustomService: {
      cycleDays: 14,
      cutoffDays: 5,
      earlyPayoutEligibleDays: 7,
    },
  };

  static getPayoutConfig(orderType: OrderType): PayoutConfig {
    return this.PAYOUT_CONFIGS[orderType];
  }

  static calculatePayoutDates(
    orderType: OrderType,
    completedAt: Date
  ): {
    eligibleForPayoutAt: Date;
    scheduledPayoutDate: Date;
    earlyPayoutEligibleAt: Date;
  } {
    const config = this.getPayoutConfig(orderType);
    const eligibleForPayoutAt = new Date(completedAt);
    eligibleForPayoutAt.setDate(
      eligibleForPayoutAt.getDate() + config.cutoffDays
    );

    const scheduledPayoutDate = new Date(eligibleForPayoutAt);
    scheduledPayoutDate.setDate(
      scheduledPayoutDate.getDate() + config.cycleDays
    );

    const earlyPayoutEligibleAt = new Date(completedAt);
    earlyPayoutEligibleAt.setDate(
      earlyPayoutEligibleAt.getDate() + config.earlyPayoutEligibleDays
    );

    return {
      eligibleForPayoutAt,
      scheduledPayoutDate,
      earlyPayoutEligibleAt,
    };
  }

  static async getProviderPayoutSchedules(
    providerId: string,
    status?: PayoutStatus
  ): Promise<PayoutSchedule[]> {
    try {
      let query = supabase
        .from('payout_schedules')
        .select('*')
        .eq('provider_id', providerId)
        .order('scheduled_payout_date', { ascending: true });

      if (status) {
        query = query.eq('payout_status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching payout schedules:', error);
      return [];
    }
  }

  static async getPendingPayouts(): Promise<PayoutSchedule[]> {
    try {
      const { data, error } = await supabase
        .from('payout_schedules')
        .select('*')
        .in('payout_status', ['Pending', 'Scheduled'])
        .lte('eligible_for_payout_at', new Date().toISOString())
        .order('scheduled_payout_date', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pending payouts:', error);
      return [];
    }
  }

  static async requestEarlyPayout(scheduleId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const { data: schedule, error: fetchError } = await supabase
        .from('payout_schedules')
        .select('*')
        .eq('id', scheduleId)
        .single();

      if (fetchError || !schedule) {
        return { success: false, error: 'Payout schedule not found' };
      }

      if (schedule.payout_status !== 'Pending') {
        return {
          success: false,
          error: 'Payout is not in pending status',
        };
      }

      const now = new Date();
      const earlyEligible = new Date(schedule.early_payout_eligible_at);

      if (now < earlyEligible) {
        const daysUntil = Math.ceil(
          (earlyEligible.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          success: false,
          error: `Early payout available in ${daysUntil} days`,
        };
      }

      const { error: updateError } = await supabase
        .from('payout_schedules')
        .update({
          early_payout_requested: true,
          early_payout_requested_at: new Date().toISOString(),
          payout_status: 'Processing' as PayoutStatus,
        })
        .eq('id', scheduleId);

      if (updateError) throw updateError;

      await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/process-early-payout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ scheduleId }),
        }
      );

      return { success: true };
    } catch (error: any) {
      console.error('Error requesting early payout:', error);
      return { success: false, error: error.message || 'Request failed' };
    }
  }

  static async getTotalPendingPayouts(providerId: string): Promise<number> {
    try {
      const schedules = await this.getProviderPayoutSchedules(providerId, 'Pending');
      return schedules.reduce((total, schedule) => total + schedule.payout_amount, 0);
    } catch (error) {
      console.error('Error calculating total pending payouts:', error);
      return 0;
    }
  }

  static async getPayoutSummary(providerId: string): Promise<{
    totalPending: number;
    totalScheduled: number;
    totalCompleted: number;
    nextPayoutDate?: string;
    nextPayoutAmount?: number;
    earlyPayoutAvailable: boolean;
    earlyPayoutAmount: number;
  }> {
    try {
      const allSchedules = await this.getProviderPayoutSchedules(providerId);

      const pending = allSchedules.filter((s) => s.payout_status === 'Pending');
      const scheduled = allSchedules.filter((s) => s.payout_status === 'Scheduled');
      const completed = allSchedules.filter((s) => s.payout_status === 'Completed');

      const now = new Date();
      const earlyEligible = pending.filter(
        (s) =>
          new Date(s.early_payout_eligible_at) <= now &&
          !s.early_payout_requested
      );

      const nextPayout = scheduled.sort((a, b) =>
        a.scheduled_payout_date.localeCompare(b.scheduled_payout_date)
      )[0];

      return {
        totalPending: pending.reduce((sum, s) => sum + s.payout_amount, 0),
        totalScheduled: scheduled.reduce((sum, s) => sum + s.payout_amount, 0),
        totalCompleted: completed.reduce((sum, s) => sum + s.payout_amount, 0),
        nextPayoutDate: nextPayout?.scheduled_payout_date,
        nextPayoutAmount: nextPayout?.payout_amount,
        earlyPayoutAvailable: earlyEligible.length > 0,
        earlyPayoutAmount: earlyEligible.reduce(
          (sum, s) => sum + s.payout_amount,
          0
        ),
      };
    } catch (error) {
      console.error('Error getting payout summary:', error);
      return {
        totalPending: 0,
        totalScheduled: 0,
        totalCompleted: 0,
        earlyPayoutAvailable: false,
        earlyPayoutAmount: 0,
      };
    }
  }

  static async getEarlyPayoutEligibleSchedules(
    providerId: string
  ): Promise<PayoutSchedule[]> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('payout_schedules')
        .select('*')
        .eq('provider_id', providerId)
        .eq('payout_status', 'Pending')
        .eq('early_payout_requested', false)
        .lte('early_payout_eligible_at', now)
        .order('early_payout_eligible_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching early payout eligible schedules:', error);
      return [];
    }
  }

  static async markPayoutCompleted(
    scheduleId: string,
    transactionId?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payout_schedules')
        .update({
          payout_status: 'Completed' as PayoutStatus,
          processed_at: new Date().toISOString(),
        })
        .eq('id', scheduleId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking payout completed:', error);
      return false;
    }
  }

  static async markPayoutFailed(
    scheduleId: string,
    reason: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payout_schedules')
        .update({
          payout_status: 'Failed' as PayoutStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', scheduleId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking payout failed:', error);
      return false;
    }
  }

  static getDaysUntilPayout(schedule: PayoutSchedule): number {
    const now = new Date();
    const payoutDate = new Date(schedule.scheduled_payout_date);
    const diffTime = payoutDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  static canRequestEarlyPayout(schedule: PayoutSchedule): boolean {
    if (schedule.payout_status !== 'Pending') return false;
    if (schedule.early_payout_requested) return false;

    const now = new Date();
    const earlyEligible = new Date(schedule.early_payout_eligible_at);
    return now >= earlyEligible;
  }

  static formatPayoutSchedule(orderType: OrderType): string {
    const config = this.getPayoutConfig(orderType);
    return `Every ${config.cycleDays} days (${config.cutoffDays}-day cut-off, early payout after ${config.earlyPayoutEligibleDays} days)`;
  }
}

export default PayoutScheduleService;
