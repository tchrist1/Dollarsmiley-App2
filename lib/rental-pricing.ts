import { supabase } from './supabase';

export type RentalPricingModel = 'flat' | 'per_day' | 'per_hour' | 'tiered';
export type TierUnitType = 'hour' | 'day' | 'flat';

export interface RentalPricingTier {
  id: string;
  service_listing_id: string;
  tier_order: number;
  min_duration_hours: number;
  max_duration_hours: number | null;
  price_per_unit: number;
  unit_type: TierUnitType;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface RentalPriceCalculation {
  total_price: number;
  unit_price: number;
  quantity: number;
  duration_hours: number;
  duration_days: number;
  pickup_at: string;
  dropoff_at: string;
  breakdown: {
    model: string;
    base_price?: number;
    rate?: number;
    hours?: number;
    days?: number;
    tier?: string;
    unit_type?: string;
    quantity: number;
    subtotal: number;
    [key: string]: any;
  };
  error?: string;
}

export interface CreateRentalTierInput {
  tier_order?: number;
  min_duration_hours: number;
  max_duration_hours?: number;
  price_per_unit: number;
  unit_type: TierUnitType;
  description?: string;
}

export interface UpdateRentalTierInput {
  tier_order?: number;
  min_duration_hours?: number;
  max_duration_hours?: number | null;
  price_per_unit?: number;
  unit_type?: TierUnitType;
  description?: string;
  is_active?: boolean;
}

export async function calculateRentalPrice(
  listingId: string,
  pickupAt: string,
  dropoffAt: string,
  quantity = 1
): Promise<RentalPriceCalculation> {
  try {
    const { data, error } = await supabase.rpc('calculate_rental_price', {
      p_service_listing_id: listingId,
      p_pickup_at: pickupAt,
      p_dropoff_at: dropoffAt,
      p_quantity: quantity,
    });

    if (error) throw error;
    return data as RentalPriceCalculation;
  } catch (error) {
    console.error('Error calculating rental price:', error);
    return {
      total_price: 0,
      unit_price: 0,
      quantity,
      duration_hours: 0,
      duration_days: 0,
      pickup_at: pickupAt,
      dropoff_at: dropoffAt,
      breakdown: { model: 'error', quantity, subtotal: 0 },
      error: 'Failed to calculate price',
    };
  }
}

export async function getRentalPricingTiers(
  listingId: string
): Promise<RentalPricingTier[]> {
  try {
    const { data, error } = await supabase
      .from('rental_pricing_tiers')
      .select('*')
      .eq('service_listing_id', listingId)
      .eq('is_active', true)
      .order('tier_order');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching rental pricing tiers:', error);
    return [];
  }
}

export async function createRentalPricingTier(
  listingId: string,
  input: CreateRentalTierInput
): Promise<RentalPricingTier | null> {
  try {
    const existingTiers = await getRentalPricingTiers(listingId);
    const maxOrder = existingTiers.reduce(
      (max, tier) => Math.max(max, tier.tier_order),
      0
    );

    const { data, error } = await supabase
      .from('rental_pricing_tiers')
      .insert({
        service_listing_id: listingId,
        tier_order: input.tier_order ?? maxOrder + 1,
        min_duration_hours: input.min_duration_hours,
        max_duration_hours: input.max_duration_hours ?? null,
        price_per_unit: input.price_per_unit,
        unit_type: input.unit_type,
        description: input.description ?? null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating rental pricing tier:', error);
    return null;
  }
}

export async function updateRentalPricingTier(
  tierId: string,
  input: UpdateRentalTierInput
): Promise<RentalPricingTier | null> {
  try {
    const updateData: Record<string, any> = {};

    if (input.tier_order !== undefined) updateData.tier_order = input.tier_order;
    if (input.min_duration_hours !== undefined) updateData.min_duration_hours = input.min_duration_hours;
    if (input.max_duration_hours !== undefined) updateData.max_duration_hours = input.max_duration_hours;
    if (input.price_per_unit !== undefined) updateData.price_per_unit = input.price_per_unit;
    if (input.unit_type !== undefined) updateData.unit_type = input.unit_type;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { data, error } = await supabase
      .from('rental_pricing_tiers')
      .update(updateData)
      .eq('id', tierId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating rental pricing tier:', error);
    return null;
  }
}

export async function deleteRentalPricingTier(tierId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('rental_pricing_tiers')
      .update({ is_active: false })
      .eq('id', tierId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting rental pricing tier:', error);
    return false;
  }
}

export async function reorderRentalPricingTiers(
  listingId: string,
  tierIds: string[]
): Promise<boolean> {
  try {
    for (let i = 0; i < tierIds.length; i++) {
      const { error } = await supabase
        .from('rental_pricing_tiers')
        .update({ tier_order: i + 1 })
        .eq('id', tierIds[i])
        .eq('service_listing_id', listingId);

      if (error) throw error;
    }
    return true;
  } catch (error) {
    console.error('Error reordering rental pricing tiers:', error);
    return false;
  }
}

export function calculateDuration(
  pickupAt: Date | string,
  dropoffAt: Date | string
): { hours: number; days: number } {
  const pickup = typeof pickupAt === 'string' ? new Date(pickupAt) : pickupAt;
  const dropoff = typeof dropoffAt === 'string' ? new Date(dropoffAt) : dropoffAt;

  const diffMs = dropoff.getTime() - pickup.getTime();
  const hours = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60)));
  const days = Math.max(1, Math.ceil(hours / 24));

  return { hours, days };
}

export function calculatePriceByModel(
  model: RentalPricingModel,
  basePrice: number,
  durationHours: number,
  durationDays: number,
  quantity: number
): { price: number; breakdown: Record<string, any> } {
  switch (model) {
    case 'flat':
      return {
        price: basePrice * quantity,
        breakdown: {
          model: 'flat',
          base_price: basePrice,
          quantity,
          subtotal: basePrice * quantity,
        },
      };

    case 'per_hour':
      const hourlyTotal = basePrice * durationHours;
      return {
        price: hourlyTotal * quantity,
        breakdown: {
          model: 'per_hour',
          rate: basePrice,
          hours: durationHours,
          quantity,
          subtotal: hourlyTotal * quantity,
        },
      };

    case 'per_day':
      const dailyTotal = basePrice * durationDays;
      return {
        price: dailyTotal * quantity,
        breakdown: {
          model: 'per_day',
          rate: basePrice,
          days: durationDays,
          quantity,
          subtotal: dailyTotal * quantity,
        },
      };

    default:
      return {
        price: basePrice * quantity,
        breakdown: {
          model: 'default',
          base_price: basePrice,
          quantity,
          subtotal: basePrice * quantity,
        },
      };
  }
}

export function findApplicableTier(
  tiers: RentalPricingTier[],
  durationHours: number
): RentalPricingTier | null {
  const sortedTiers = [...tiers].sort((a, b) => a.tier_order - b.tier_order);

  for (const tier of sortedTiers) {
    const minOk = durationHours >= tier.min_duration_hours;
    const maxOk = tier.max_duration_hours === null || durationHours <= tier.max_duration_hours;

    if (minOk && maxOk) {
      return tier;
    }
  }

  return null;
}

export function calculateTieredPrice(
  tier: RentalPricingTier,
  durationHours: number,
  quantity: number
): { price: number; breakdown: Record<string, any> } {
  const durationDays = Math.ceil(durationHours / 24);
  let unitPrice: number;

  switch (tier.unit_type) {
    case 'flat':
      unitPrice = tier.price_per_unit;
      break;
    case 'hour':
      unitPrice = tier.price_per_unit * durationHours;
      break;
    case 'day':
      unitPrice = tier.price_per_unit * durationDays;
      break;
    default:
      unitPrice = tier.price_per_unit;
  }

  return {
    price: unitPrice * quantity,
    breakdown: {
      model: 'tiered',
      tier: tier.description || `Tier ${tier.tier_order}`,
      rate: tier.price_per_unit,
      unit_type: tier.unit_type,
      duration_hours: durationHours,
      duration_days: durationDays,
      quantity,
      subtotal: unitPrice * quantity,
    },
  };
}

export function formatPricingModel(model: RentalPricingModel): string {
  const labels: Record<RentalPricingModel, string> = {
    flat: 'Flat Rate',
    per_day: 'Per Day',
    per_hour: 'Per Hour',
    tiered: 'Tiered Pricing',
  };
  return labels[model] || model;
}

export function formatUnitType(unitType: TierUnitType): string {
  const labels: Record<TierUnitType, string> = {
    flat: 'Flat Fee',
    hour: 'Per Hour',
    day: 'Per Day',
  };
  return labels[unitType] || unitType;
}

export function formatDuration(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} min`;
  }
  if (hours < 24) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  const days = Math.ceil(hours / 24);
  return days === 1 ? '1 day' : `${days} days`;
}

export function formatPriceBreakdown(breakdown: Record<string, any>): string {
  switch (breakdown.model) {
    case 'flat':
      return `Flat rate: $${breakdown.base_price?.toFixed(2) || '0.00'}`;

    case 'per_hour':
      return `$${breakdown.rate?.toFixed(2) || '0.00'}/hr × ${breakdown.hours || 0} hours`;

    case 'per_day':
      return `$${breakdown.rate?.toFixed(2) || '0.00'}/day × ${breakdown.days || 0} days`;

    case 'tiered':
      const rateStr = `$${breakdown.rate?.toFixed(2) || '0.00'}`;
      const unitStr = breakdown.unit_type === 'flat' ? '' : `/${breakdown.unit_type}`;
      return `${breakdown.tier}: ${rateStr}${unitStr}`;

    default:
      return `$${breakdown.subtotal?.toFixed(2) || '0.00'}`;
  }
}

export function validateTierDurations(tiers: CreateRentalTierInput[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const sortedTiers = [...tiers].sort((a, b) => a.min_duration_hours - b.min_duration_hours);

  for (let i = 0; i < sortedTiers.length; i++) {
    const tier = sortedTiers[i];

    if (tier.min_duration_hours < 0) {
      errors.push(`Tier ${i + 1}: Minimum duration cannot be negative`);
    }

    if (tier.max_duration_hours !== undefined && tier.max_duration_hours !== null) {
      if (tier.max_duration_hours <= tier.min_duration_hours) {
        errors.push(`Tier ${i + 1}: Maximum duration must be greater than minimum`);
      }
    }

    if (tier.price_per_unit < 0) {
      errors.push(`Tier ${i + 1}: Price cannot be negative`);
    }

    if (i > 0) {
      const prevTier = sortedTiers[i - 1];
      if (prevTier.max_duration_hours !== undefined && prevTier.max_duration_hours !== null) {
        if (tier.min_duration_hours < prevTier.max_duration_hours) {
          errors.push(`Tier ${i + 1}: Overlaps with previous tier`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function generateDefaultTiers(
  dailyRate: number,
  options?: {
    shortTermMultiplier?: number;
    longTermDiscount?: number;
  }
): CreateRentalTierInput[] {
  const shortMultiplier = options?.shortTermMultiplier ?? 1.5;
  const longDiscount = options?.longTermDiscount ?? 0.15;

  return [
    {
      tier_order: 1,
      min_duration_hours: 0,
      max_duration_hours: 4,
      price_per_unit: Math.round(dailyRate * shortMultiplier * 100) / 100,
      unit_type: 'flat',
      description: 'Half Day (up to 4 hours)',
    },
    {
      tier_order: 2,
      min_duration_hours: 4,
      max_duration_hours: 24,
      price_per_unit: dailyRate,
      unit_type: 'flat',
      description: 'Full Day (4-24 hours)',
    },
    {
      tier_order: 3,
      min_duration_hours: 24,
      max_duration_hours: 168,
      price_per_unit: dailyRate,
      unit_type: 'day',
      description: 'Multi-Day (1-7 days)',
    },
    {
      tier_order: 4,
      min_duration_hours: 168,
      price_per_unit: Math.round(dailyRate * (1 - longDiscount) * 100) / 100,
      unit_type: 'day',
      description: 'Weekly+ (7+ days)',
    },
  ];
}
