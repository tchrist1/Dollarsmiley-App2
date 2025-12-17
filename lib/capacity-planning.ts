import { supabase } from './supabase';

interface CapacityConfig {
  id: string;
  provider_id: string;
  capacity_type: string;
  daily_capacity: number;
  weekly_capacity?: number;
  monthly_capacity?: number;
  unit: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
}

interface CapacityBooking {
  id: string;
  capacity_id: string;
  booking_id?: string;
  production_order_id?: string;
  capacity_used: number;
  scheduled_date: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export class CapacityPlanningService {
  static async createCapacityConfig(
    providerId: string,
    config: {
      capacityType: string;
      dailyCapacity: number;
      weeklyCapacity?: number;
      monthlyCapacity?: number;
      unit?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<CapacityConfig> {
    const { data, error } = await supabase
      .from('production_capacity')
      .insert({
        provider_id: providerId,
        capacity_type: config.capacityType,
        daily_capacity: config.dailyCapacity,
        weekly_capacity: config.weeklyCapacity,
        monthly_capacity: config.monthlyCapacity,
        unit: config.unit || 'orders',
        start_date: config.startDate,
        end_date: config.endDate,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getProviderCapacity(providerId: string): Promise<CapacityConfig[]> {
    const { data, error } = await supabase
      .from('production_capacity')
      .select('*')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async updateCapacity(
    capacityId: string,
    updates: Partial<CapacityConfig>
  ): Promise<CapacityConfig> {
    const { data, error } = await supabase
      .from('production_capacity')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', capacityId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getAvailableCapacity(providerId: string, date: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_available_capacity', {
      provider_id_param: providerId,
      date_param: date,
    });

    if (error) throw error;
    return data || 0;
  }

  static async checkCapacityAvailable(
    providerId: string,
    date: string,
    required: number
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_capacity_available', {
      provider_id_param: providerId,
      date_param: date,
      required_capacity: required,
    });

    if (error) throw error;
    return data || false;
  }

  static async bookCapacity(
    providerId: string,
    date: string,
    capacityNeeded: number,
    bookingId?: string,
    orderId?: string
  ): Promise<string> {
    const { data, error } = await supabase.rpc('book_capacity', {
      provider_id_param: providerId,
      date_param: date,
      capacity_needed: capacityNeeded,
      booking_id_param: bookingId,
      order_id_param: orderId,
    });

    if (error) throw error;
    return data;
  }

  static async getCapacityUtilization(
    providerId: string,
    startDate: string,
    endDate: string
  ) {
    const { data, error } = await supabase.rpc('get_capacity_utilization', {
      provider_id_param: providerId,
      start_date_param: startDate,
      end_date_param: endDate,
    });

    if (error) throw error;
    return data || [];
  }

  static async getOptimalProductionDates(
    providerId: string,
    capacityNeeded: number,
    startFrom?: string,
    daysToCheck?: number
  ) {
    const { data, error } = await supabase.rpc('get_optimal_production_dates', {
      provider_id_param: providerId,
      capacity_needed: capacityNeeded,
      start_from_date: startFrom || new Date().toISOString().split('T')[0],
      days_to_check: daysToCheck || 30,
    });

    if (error) throw error;
    return data || [];
  }

  static async getScheduleForWeek(providerId: string, weekStart: Date) {
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      return date.toISOString().split('T')[0];
    });

    const utilization = await this.getCapacityUtilization(
      providerId,
      dates[0],
      dates[6]
    );

    return utilization;
  }

  static async getScheduleForMonth(providerId: string, year: number, month: number) {
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    return this.getCapacityUtilization(providerId, startDate, endDate);
  }

  static calculateUtilizationStatus(utilization: number): {
    status: 'under' | 'optimal' | 'over' | 'full';
    color: string;
    label: string;
  } {
    if (utilization >= 100) {
      return { status: 'full', color: '#DC2626', label: 'Fully Booked' };
    } else if (utilization >= 80) {
      return { status: 'over', color: '#F59E0B', label: 'High Utilization' };
    } else if (utilization >= 50) {
      return { status: 'optimal', color: '#10B981', label: 'Optimal' };
    } else {
      return { status: 'under', color: '#3B82F6', label: 'Available' };
    }
  }

  static formatCapacity(capacity: number, unit: string): string {
    return `${capacity} ${unit}`;
  }

  static async getUpcomingBookings(providerId: string, days: number = 7) {
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const { data, error } = await supabase
      .from('capacity_bookings')
      .select(`
        *,
        production_capacity (provider_id),
        bookings (id, customer_id, service_type),
        production_orders (id, product_name)
      `)
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .eq('production_capacity.provider_id', providerId)
      .in('status', ['scheduled', 'in_progress'])
      .order('scheduled_date');

    if (error) throw error;
    return data || [];
  }

  static async updateBookingStatus(
    bookingId: string,
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  ): Promise<void> {
    const { error } = await supabase
      .from('capacity_bookings')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (error) throw error;
  }

  static async getCapacityStats(providerId: string, days: number = 30) {
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const utilization = await this.getCapacityUtilization(providerId, startDate, endDate);

    const totalCapacity = utilization.reduce((sum, day) => sum + day.total_capacity, 0);
    const totalAllocated = utilization.reduce((sum, day) => sum + day.allocated_capacity, 0);
    const avgUtilization =
      utilization.reduce((sum, day) => sum + day.utilization_percent, 0) / utilization.length;

    const fullyBookedDays = utilization.filter(day => day.utilization_percent >= 100).length;
    const availableDays = utilization.filter(day => day.utilization_percent < 80).length;

    return {
      totalCapacity,
      totalAllocated,
      avgUtilization,
      fullyBookedDays,
      availableDays,
      totalDays: utilization.length,
    };
  }

  static async exportSchedule(providerId: string, startDate: string, endDate: string): Promise<string> {
    const utilization = await this.getCapacityUtilization(providerId, startDate, endDate);

    let csv = 'Date,Total Capacity,Allocated,Available,Utilization %,Bookings\n';

    utilization.forEach(day => {
      csv += `${day.schedule_date},${day.total_capacity},${day.allocated_capacity},${day.total_capacity - day.allocated_capacity},${day.utilization_percent.toFixed(1)},${day.bookings_count}\n`;
    });

    return csv;
  }
}

export default CapacityPlanningService;
