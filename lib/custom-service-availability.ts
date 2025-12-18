import { supabase } from './supabase';

export interface AvailabilityCheckParams {
  providerId: string;
  startDate: Date;
  fulfillmentWindowDays: number;
  listingId?: string;
}

export interface AvailabilityCheckResult {
  isAvailable: boolean;
  conflictType?: 'no_availability' | 'insufficient_window' | 'booking_conflict';
  message: string;
  warnings: string[];
  availableSlots?: Array<{
    date: string;
    startTime: string;
    endTime: string;
  }>;
  nextAvailableDate?: Date;
  estimatedCompletionDate?: Date;
}

export interface FulfillmentWindowValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendedStartDate?: Date;
  earliestPossibleCompletion?: Date;
}

export class CustomServiceAvailability {
  static async checkAvailabilityForCustomService(
    params: AvailabilityCheckParams
  ): Promise<AvailabilityCheckResult> {
    const warnings: string[] = [];

    try {
      const endDate = new Date(params.startDate);
      endDate.setDate(endDate.getDate() + params.fulfillmentWindowDays);

      const { data: availability, error } = await supabase
        .from('provider_availability')
        .select('*')
        .eq('provider_id', params.providerId)
        .eq('is_recurring', false)
        .gte('date', params.startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .eq('is_available', true)
        .order('date');

      if (error) throw error;

      if (!availability || availability.length === 0) {
        return {
          isAvailable: false,
          conflictType: 'no_availability',
          message: 'Provider has no availability in the requested timeframe',
          warnings,
        };
      }

      const totalAvailableDays = availability.length;
      const requiredDays = Math.ceil(params.fulfillmentWindowDays * 0.7);

      if (totalAvailableDays < requiredDays) {
        warnings.push(
          `Provider has limited availability (${totalAvailableDays} days) for the required fulfillment window (${params.fulfillmentWindowDays} days)`
        );
      }

      const { data: existingBookings } = await supabase
        .from('bookings')
        .select('scheduled_date')
        .eq('provider_id', params.providerId)
        .eq('status', 'Accepted')
        .gte('scheduled_date', params.startDate.toISOString().split('T')[0])
        .lte('scheduled_date', endDate.toISOString().split('T')[0]);

      if (existingBookings && existingBookings.length > 0) {
        warnings.push(
          `Provider has ${existingBookings.length} other bookings during this period. Expect possible delays.`
        );
      }

      const estimatedCompletionDate = new Date(params.startDate);
      estimatedCompletionDate.setDate(
        estimatedCompletionDate.getDate() + params.fulfillmentWindowDays
      );

      return {
        isAvailable: true,
        message: 'Provider is available for this custom service',
        warnings,
        availableSlots: availability.map((slot: any) => ({
          date: slot.date,
          startTime: slot.start_time,
          endTime: slot.end_time,
        })),
        estimatedCompletionDate,
      };
    } catch (error) {
      console.error('Error checking availability:', error);
      return {
        isAvailable: false,
        message: 'Unable to verify provider availability',
        warnings: ['Availability check failed. Please contact provider directly.'],
      };
    }
  }

  static async validateFulfillmentWindow(
    providerId: string,
    requestedStartDate: Date,
    fulfillmentWindowDays: number
  ): Promise<FulfillmentWindowValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let isValid = true;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('service_radius_miles, max_active_custom_orders')
        .eq('id', providerId)
        .single();

      if (profile?.max_active_custom_orders) {
        const { data: activeOrders } = await supabase
          .from('production_orders')
          .select('id')
          .eq('provider_id', providerId)
          .not('status', 'in', '(completed,cancelled)')
          .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

        if (
          activeOrders &&
          activeOrders.length >= profile.max_active_custom_orders
        ) {
          errors.push(
            `Provider is at capacity (${activeOrders.length}/${profile.max_active_custom_orders} active orders)`
          );
          isValid = false;
        }
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const requestedDate = new Date(requestedStartDate);
      requestedDate.setHours(0, 0, 0, 0);

      if (requestedDate < today) {
        errors.push('Start date cannot be in the past');
        isValid = false;
      }

      const minLeadTime = 2;
      const leadTimeDays = Math.ceil(
        (requestedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (leadTimeDays < minLeadTime) {
        warnings.push(
          `Custom services typically require ${minLeadTime}+ days lead time. Rush orders may incur additional fees.`
        );
      }

      if (fulfillmentWindowDays < 3) {
        warnings.push(
          'Fulfillment window is shorter than typical production time. Verify with provider.'
        );
      }

      if (fulfillmentWindowDays > 30) {
        warnings.push(
          'Long fulfillment window may indicate complex order. Consider breaking into phases.'
        );
      }

      const recommendedStartDate = new Date(today);
      recommendedStartDate.setDate(recommendedStartDate.getDate() + minLeadTime);

      const earliestCompletion = new Date(recommendedStartDate);
      earliestCompletion.setDate(
        earliestCompletion.getDate() + fulfillmentWindowDays
      );

      return {
        isValid,
        errors,
        warnings,
        recommendedStartDate: isValid ? undefined : recommendedStartDate,
        earliestPossibleCompletion: earliestCompletion,
      };
    } catch (error) {
      console.error('Error validating fulfillment window:', error);
      return {
        isValid: false,
        errors: ['Unable to validate fulfillment window'],
        warnings,
      };
    }
  }

  static async findNextAvailableSlot(
    providerId: string,
    fulfillmentWindowDays: number,
    fromDate: Date = new Date()
  ): Promise<{ startDate: Date; endDate: Date } | null> {
    try {
      const searchEndDate = new Date(fromDate);
      searchEndDate.setDate(searchEndDate.getDate() + 60);

      const { data: availability } = await supabase
        .from('provider_availability')
        .select('date')
        .eq('provider_id', providerId)
        .eq('is_available', true)
        .gte('date', fromDate.toISOString().split('T')[0])
        .lte('date', searchEndDate.toISOString().split('T')[0])
        .order('date');

      if (!availability || availability.length < fulfillmentWindowDays) {
        return null;
      }

      const startDate = new Date(availability[0].date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + fulfillmentWindowDays);

      return { startDate, endDate };
    } catch (error) {
      console.error('Error finding next available slot:', error);
      return null;
    }
  }

  static calculateProductionSchedule(
    startDate: Date,
    fulfillmentWindowDays: number,
    proofingDays: number = 2,
    productionDays: number = 5,
    shippingDays: number = 3
  ): {
    consultation: { start: Date; end: Date };
    proofing: { start: Date; end: Date };
    production: { start: Date; end: Date };
    shipping: { start: Date; end: Date };
    completion: Date;
  } {
    const consultationStart = new Date(startDate);
    const consultationEnd = new Date(consultationStart);
    consultationEnd.setDate(consultationEnd.getDate() + 1);

    const proofingStart = new Date(consultationEnd);
    const proofingEnd = new Date(proofingStart);
    proofingEnd.setDate(proofingEnd.getDate() + proofingDays);

    const productionStart = new Date(proofingEnd);
    const productionEnd = new Date(productionStart);
    productionEnd.setDate(productionEnd.getDate() + productionDays);

    const shippingStart = new Date(productionEnd);
    const shippingEnd = new Date(shippingStart);
    shippingEnd.setDate(shippingEnd.getDate() + shippingDays);

    return {
      consultation: { start: consultationStart, end: consultationEnd },
      proofing: { start: proofingStart, end: proofingEnd },
      production: { start: productionStart, end: productionEnd },
      shipping: { start: shippingStart, end: shippingEnd },
      completion: shippingEnd,
    };
  }

  static async getProviderWorkload(
    providerId: string
  ): Promise<{
    activeOrders: number;
    todayOrders: number;
    upcomingDeadlines: Array<{ orderId: string; dueDate: Date; daysRemaining: number }>;
    utilizationPercentage: number;
  }> {
    try {
      const { data: orders } = await supabase
        .from('production_orders')
        .select('id, estimated_completion_date')
        .eq('provider_id', providerId)
        .not('status', 'in', '(completed,cancelled)')
        .order('estimated_completion_date');

      const activeOrders = orders?.length || 0;

      const { data: todayOrders } = await supabase
        .from('production_orders')
        .select('id')
        .eq('provider_id', providerId)
        .gte('created_at', new Date().toISOString().split('T')[0]);

      const todayCount = todayOrders?.length || 0;

      const upcomingDeadlines =
        orders
          ?.filter((o: any) => o.estimated_completion_date)
          .map((o: any) => {
            const dueDate = new Date(o.estimated_completion_date);
            const daysRemaining = Math.ceil(
              (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            return {
              orderId: o.id,
              dueDate,
              daysRemaining,
            };
          })
          .filter((d: any) => d.daysRemaining >= 0 && d.daysRemaining <= 7)
          .sort((a: any, b: any) => a.daysRemaining - b.daysRemaining) || [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('max_active_custom_orders')
        .eq('id', providerId)
        .single();

      const utilizationPercentage = profile?.max_active_custom_orders
        ? Math.round((activeOrders / profile.max_active_custom_orders) * 100)
        : 0;

      return {
        activeOrders,
        todayOrders: todayCount,
        upcomingDeadlines,
        utilizationPercentage,
      };
    } catch (error) {
      console.error('Error getting provider workload:', error);
      return {
        activeOrders: 0,
        todayOrders: 0,
        upcomingDeadlines: [],
        utilizationPercentage: 0,
      };
    }
  }
}

export default CustomServiceAvailability;
