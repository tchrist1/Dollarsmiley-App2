import { supabase } from './supabase';

interface RecurringScheduleCreate {
  userId: string;
  amount: number;
  currency?: string;
  interval: 'daily' | 'weekly' | 'monthly' | 'yearly';
  intervalCount?: number;
  startDate: string;
  endDate?: string;
  paymentMethodId: string;
  bookingId?: string;
  productionOrderId?: string;
  metadata?: Record<string, any>;
}

export class RecurringPaymentSchedulesService {
  static async createSchedule(schedule: RecurringScheduleCreate) {
    const { data, error } = await supabase
      .from('recurring_payment_schedules')
      .insert({
        user_id: schedule.userId,
        amount: schedule.amount,
        currency: schedule.currency?.toLowerCase() || 'usd',
        interval: schedule.interval,
        interval_count: schedule.intervalCount || 1,
        start_date: schedule.startDate,
        end_date: schedule.endDate,
        next_payment_date: schedule.startDate,
        payment_method_id: schedule.paymentMethodId,
        booking_id: schedule.bookingId,
        production_order_id: schedule.productionOrderId,
        metadata: schedule.metadata || {},
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getSchedule(scheduleId: string) {
    const { data, error } = await supabase
      .from('recurring_payment_schedules')
      .select('*')
      .eq('id', scheduleId)
      .single();

    if (error) throw error;
    return data;
  }

  static async getUserSchedules(userId: string) {
    const { data, error } = await supabase
      .from('recurring_payment_schedules')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getActiveSchedules(userId: string) {
    const { data, error } = await supabase
      .from('recurring_payment_schedules')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('next_payment_date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async pauseSchedule(scheduleId: string) {
    const { data, error } = await supabase
      .from('recurring_payment_schedules')
      .update({
        status: 'paused',
        updated_at: new Date().toISOString(),
      })
      .eq('id', scheduleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async resumeSchedule(scheduleId: string) {
    const { data, error } = await supabase
      .from('recurring_payment_schedules')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', scheduleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async cancelSchedule(scheduleId: string) {
    const { data, error } = await supabase
      .from('recurring_payment_schedules')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', scheduleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updatePaymentMethod(scheduleId: string, paymentMethodId: string) {
    const { data, error } = await supabase
      .from('recurring_payment_schedules')
      .update({
        payment_method_id: paymentMethodId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scheduleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getScheduleAttempts(scheduleId: string) {
    const { data, error } = await supabase
      .from('recurring_payment_attempts')
      .select('*')
      .eq('schedule_id', scheduleId)
      .order('attempted_at', { ascending: false});

    if (error) throw error;
    return data || [];
  }

  static async getUpcomingPayments(userId: string, days: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const { data, error } = await supabase
      .from('recurring_payment_schedules')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .lte('next_payment_date', futureDate.toISOString().split('T')[0])
      .order('next_payment_date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async getScheduleStats(userId: string) {
    const schedules = await this.getUserSchedules(userId);

    const stats = {
      total: schedules.length,
      active: schedules.filter((s) => s.status === 'active').length,
      paused: schedules.filter((s) => s.status === 'paused').length,
      completed: schedules.filter((s) => s.status === 'completed').length,
      cancelled: schedules.filter((s) => s.status === 'cancelled').length,
      total_successful_payments: schedules.reduce((sum, s) => sum + s.successful_payments, 0),
      total_failed_payments: schedules.reduce((sum, s) => sum + s.failed_payments, 0),
      monthly_amount: schedules
        .filter((s) => s.status === 'active' && s.interval === 'monthly')
        .reduce((sum, s) => sum + s.amount, 0),
    };

    return stats;
  }

  static getIntervalLabel(interval: string, intervalCount: number = 1): string {
    const labels: Record<string, string> = {
      daily: 'day',
      weekly: 'week',
      monthly: 'month',
      yearly: 'year',
    };

    const label = labels[interval] || 'period';
    return intervalCount === 1 ? label : `${intervalCount} ${label}s`;
  }

  static getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: 'Active',
      paused: 'Paused',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };

    return labels[status] || status;
  }

  static getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      active: '#10B981',
      paused: '#F59E0B',
      completed: '#6B7280',
      cancelled: '#DC2626',
    };

    return colors[status] || '#6B7280';
  }

  static formatScheduleSummary(schedule: any): string {
    const amountFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: schedule.currency.toUpperCase(),
    }).format(schedule.amount);

    const intervalLabel = this.getIntervalLabel(schedule.interval, schedule.interval_count);

    return `${amountFormatted} every ${intervalLabel}`;
  }

  static getDaysUntilNextPayment(schedule: any): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextPaymentDate = new Date(schedule.next_payment_date);
    nextPaymentDate.setHours(0, 0, 0, 0);

    const diffTime = nextPaymentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }
}

export default RecurringPaymentSchedulesService;
