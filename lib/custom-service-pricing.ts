import { supabase } from './supabase';

export interface PricingValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  recommendations: string[];
}

export interface DropOffPricingParams {
  baseCost: number;
  costPerMile: number;
  serviceRadiusMiles?: number;
  distanceMiles: number;
}

export interface CapacityCheckResult {
  canAcceptOrder: boolean;
  reason: string;
  activeOrders: number;
  todayOrders: number;
  maxActive: number | null;
  maxDaily: number | null;
}

export class CustomServicePricing {
  static MINIMUM_BASE_COST = 5.0;
  static MINIMUM_COST_PER_MILE = 0.5;
  static RECOMMENDED_BASE_COST = 10.0;
  static RECOMMENDED_COST_PER_MILE = 1.5;
  static DEFAULT_SERVICE_RADIUS = 50;

  static validateDropOffPricing(params: DropOffPricingParams): PricingValidationResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const recommendations: string[] = [];
    let isValid = true;

    if (params.baseCost < this.MINIMUM_BASE_COST) {
      warnings.push(
        `Base cost ($${params.baseCost}) is below recommended minimum ($${this.MINIMUM_BASE_COST}). This may not cover your delivery costs.`
      );
    }

    if (params.baseCost < this.RECOMMENDED_BASE_COST) {
      recommendations.push(
        `Consider setting base cost to at least $${this.RECOMMENDED_BASE_COST} to ensure profitability.`
      );
    }

    if (params.costPerMile < this.MINIMUM_COST_PER_MILE) {
      warnings.push(
        `Cost per mile ($${params.costPerMile}) is below recommended minimum ($${this.MINIMUM_COST_PER_MILE}). This may not cover fuel and vehicle costs.`
      );
    }

    if (params.costPerMile < this.RECOMMENDED_COST_PER_MILE) {
      recommendations.push(
        `Consider setting cost per mile to at least $${this.RECOMMENDED_COST_PER_MILE} to ensure profitability.`
      );
    }

    if (params.serviceRadiusMiles && params.distanceMiles > params.serviceRadiusMiles) {
      errors.push(
        `Delivery distance (${params.distanceMiles} miles) exceeds service radius (${params.serviceRadiusMiles} miles).`
      );
      isValid = false;
    }

    if (!params.serviceRadiusMiles) {
      recommendations.push(
        `Consider setting a service radius limit (recommended: ${this.DEFAULT_SERVICE_RADIUS} miles) to manage delivery logistics.`
      );
    }

    const totalCost = params.baseCost + params.distanceMiles * params.costPerMile;
    if (totalCost < 10) {
      warnings.push(
        `Total delivery cost ($${totalCost.toFixed(2)}) may be too low to be profitable.`
      );
    }

    return { isValid, warnings, errors, recommendations };
  }

  static calculateDropOffCost(
    baseCost: number,
    costPerMile: number,
    distanceMiles: number,
    quantity: number = 1
  ): number {
    const perItemCost = baseCost + distanceMiles * costPerMile;
    return Math.max(perItemCost * quantity, 0);
  }

  static async checkProviderCapacity(providerId: string): Promise<CapacityCheckResult> {
    try {
      const { data, error } = await supabase.rpc('check_provider_capacity', {
        p_provider_id: providerId,
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        return {
          canAcceptOrder: true,
          reason: 'No capacity limits set',
          activeOrders: 0,
          todayOrders: 0,
          maxActive: null,
          maxDaily: null,
        };
      }

      const result = data[0];
      return {
        canAcceptOrder: result.can_accept_order,
        reason: result.reason,
        activeOrders: result.active_orders,
        todayOrders: result.today_orders,
        maxActive: result.max_active,
        maxDaily: result.max_daily,
      };
    } catch (error) {
      console.error('Error checking provider capacity:', error);
      return {
        canAcceptOrder: true,
        reason: 'Capacity check unavailable',
        activeOrders: 0,
        todayOrders: 0,
        maxActive: null,
        maxDaily: null,
      };
    }
  }

  static async getProviderCapacitySettings(providerId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('max_active_custom_orders, max_daily_custom_orders, service_radius_miles')
      .eq('id', providerId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async updateProviderCapacitySettings(
    providerId: string,
    settings: {
      maxActiveCustomOrders?: number | null;
      maxDailyCustomOrders?: number | null;
      serviceRadiusMiles?: number | null;
    }
  ) {
    const { error } = await supabase
      .from('profiles')
      .update({
        max_active_custom_orders: settings.maxActiveCustomOrders,
        max_daily_custom_orders: settings.maxDailyCustomOrders,
        service_radius_miles: settings.serviceRadiusMiles,
      })
      .eq('id', providerId);

    if (error) throw error;
    return true;
  }

  static determineRefundPolicy(status: string, orderReceivedAt?: string): string {
    if (['inquiry', 'procurement_started', 'price_proposed'].includes(status)) {
      return 'fully_refundable';
    }

    if (status === 'price_approved' && !orderReceivedAt) {
      return 'fully_refundable';
    }

    if (['order_received', 'consultation', 'proofing'].includes(status)) {
      return 'partially_refundable';
    }

    if (['approved', 'in_production', 'quality_check', 'completed'].includes(status)) {
      return 'non_refundable';
    }

    return 'fully_refundable';
  }

  static getRefundAmount(
    finalPrice: number,
    refundPolicy: string,
    shippingCost: number = 0
  ): number {
    switch (refundPolicy) {
      case 'fully_refundable':
        return finalPrice;
      case 'partially_refundable':
        return finalPrice - shippingCost;
      case 'non_refundable':
        return 0;
      default:
        return 0;
    }
  }

  static formatRefundPolicy(policy: string): string {
    const labels: Record<string, string> = {
      fully_refundable: 'Fully Refundable',
      partially_refundable: 'Partially Refundable (minus shipping)',
      non_refundable: 'Non-Refundable',
    };
    return labels[policy] || policy;
  }

  static canCancelOrder(status: string, paymentCapturedAt?: string): boolean {
    if (status === 'cancelled' || status === 'completed') {
      return false;
    }

    if (!paymentCapturedAt) {
      return true;
    }

    return ['order_received', 'consultation', 'proofing'].includes(status);
  }

  static calculateAuthorizationExpiry(startDate: Date = new Date()): Date {
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + 7);
    return expiryDate;
  }

  static isAuthorizationExpired(expiresAt: string | Date): boolean {
    const expiryDate = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
    return expiryDate < new Date();
  }

  static needsReauthorization(
    status: string,
    authorizationExpiresAt?: string,
    paymentCapturedAt?: string
  ): boolean {
    if (paymentCapturedAt) {
      return false;
    }

    if (!['procurement_started', 'price_proposed', 'price_approved'].includes(status)) {
      return false;
    }

    if (!authorizationExpiresAt) {
      return true;
    }

    return this.isAuthorizationExpired(authorizationExpiresAt);
  }
}

export default CustomServicePricing;
