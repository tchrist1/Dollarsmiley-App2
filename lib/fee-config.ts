import { supabase } from './supabase';

export type FeeType = 'Percentage' | 'Flat' | 'Hybrid';
export type AppliesTo = 'Bookings' | 'Subscriptions' | 'Featured' | 'All';
export type DiscountType = 'Percentage' | 'Flat';
export type PassedTo = 'Customer' | 'Provider' | 'Platform' | 'Split';
export type WaiverType = 'FullWaiver' | 'PartialWaiver';
export type SubscriptionPlan = 'Free' | 'Pro' | 'Premium' | 'Elite';

export interface PlatformFeeConfig {
  id: string;
  config_name: string;
  fee_type: FeeType;
  percentage_rate: number;
  flat_amount: number;
  minimum_fee: number;
  maximum_fee: number | null;
  applies_to: AppliesTo;
  is_active: boolean;
  effective_date: string;
  expires_date: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryFeeOverride {
  id: string;
  category_id: string;
  fee_type: FeeType;
  percentage_rate: number;
  flat_amount: number;
  minimum_fee: number;
  maximum_fee: number | null;
  is_active: boolean;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SubscriptionTierFee {
  id: string;
  subscription_plan: SubscriptionPlan;
  discount_type: DiscountType;
  discount_value: number;
  applies_to: AppliesTo;
  is_active: boolean;
  created_at: string;
}

export interface PaymentProcessingFee {
  id: string;
  processor_name: string;
  fee_type: FeeType;
  percentage_rate: number;
  flat_amount: number;
  passed_to: PassedTo;
  is_active: boolean;
  created_at: string;
}

export interface PromotionalFeeWaiver {
  id: string;
  waiver_name: string;
  waiver_type: WaiverType;
  discount_percentage: number;
  applies_to_categories: string[];
  applies_to_users: string[];
  min_transaction_amount: number;
  max_transaction_amount: number | null;
  usage_limit_per_user: number | null;
  usage_count: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface FeeCalculation {
  transaction_amount: number;
  base_fee: number;
  discounts_applied: number;
  final_fee: number;
  provider_payout: number;
  config_id?: string;
  category_override_id?: string;
  subscription_discount_id?: string;
}

/**
 * Get all platform fee configurations
 */
export async function getPlatformFeeConfigs(): Promise<PlatformFeeConfig[]> {
  try {
    const { data, error } = await supabase
      .from('platform_fee_config')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching fee configs:', error);
    return [];
  }
}

/**
 * Get active platform fee config
 */
export async function getActiveFeeConfig(
  appliesTo: AppliesTo = 'Bookings'
): Promise<PlatformFeeConfig | null> {
  try {
    const { data, error } = await supabase
      .from('platform_fee_config')
      .select('*')
      .eq('is_active', true)
      .in('applies_to', [appliesTo, 'All'])
      .lte('effective_date', new Date().toISOString().split('T')[0])
      .or(`expires_date.is.null,expires_date.gte.${new Date().toISOString().split('T')[0]}`)
      .order('effective_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching active fee config:', error);
    return null;
  }
}

/**
 * Create platform fee configuration
 */
export async function createFeeConfig(
  config: Omit<PlatformFeeConfig, 'id' | 'created_at' | 'updated_at'>
): Promise<PlatformFeeConfig | null> {
  try {
    const { data, error } = await supabase
      .from('platform_fee_config')
      .insert([config])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating fee config:', error);
    return null;
  }
}

/**
 * Update platform fee configuration
 */
export async function updateFeeConfig(
  id: string,
  updates: Partial<PlatformFeeConfig>
): Promise<PlatformFeeConfig | null> {
  try {
    const { data, error } = await supabase
      .from('platform_fee_config')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating fee config:', error);
    return null;
  }
}

/**
 * Get category fee overrides
 */
export async function getCategoryFeeOverrides(): Promise<CategoryFeeOverride[]> {
  try {
    const { data, error } = await supabase
      .from('category_fee_overrides')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching category overrides:', error);
    return [];
  }
}

/**
 * Create category fee override
 */
export async function createCategoryOverride(
  override: Omit<CategoryFeeOverride, 'id' | 'created_at'>
): Promise<CategoryFeeOverride | null> {
  try {
    const { data, error } = await supabase
      .from('category_fee_overrides')
      .insert([override])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating category override:', error);
    return null;
  }
}

/**
 * Get subscription tier fees
 */
export async function getSubscriptionTierFees(): Promise<SubscriptionTierFee[]> {
  try {
    const { data, error } = await supabase
      .from('subscription_tier_fees')
      .select('*')
      .order('subscription_plan', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching subscription tier fees:', error);
    return [];
  }
}

/**
 * Update subscription tier fee
 */
export async function updateSubscriptionTierFee(
  id: string,
  updates: Partial<SubscriptionTierFee>
): Promise<SubscriptionTierFee | null> {
  try {
    const { data, error } = await supabase
      .from('subscription_tier_fees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating subscription tier fee:', error);
    return null;
  }
}

/**
 * Get payment processing fees
 */
export async function getPaymentProcessingFees(): Promise<PaymentProcessingFee[]> {
  try {
    const { data, error } = await supabase
      .from('payment_processing_fees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching payment processing fees:', error);
    return [];
  }
}

/**
 * Get promotional fee waivers
 */
export async function getPromotionalWaivers(): Promise<PromotionalFeeWaiver[]> {
  try {
    const { data, error } = await supabase
      .from('promotional_fee_waivers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching promotional waivers:', error);
    return [];
  }
}

/**
 * Create promotional waiver
 */
export async function createPromotionalWaiver(
  waiver: Omit<PromotionalFeeWaiver, 'id' | 'usage_count' | 'created_at'>
): Promise<PromotionalFeeWaiver | null> {
  try {
    const { data, error } = await supabase
      .from('promotional_fee_waivers')
      .insert([waiver])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating promotional waiver:', error);
    return null;
  }
}

/**
 * Calculate platform fee
 */
export async function calculatePlatformFee(
  transactionAmount: number,
  categoryId?: string,
  subscriptionPlan: SubscriptionPlan = 'Free',
  appliesTo: AppliesTo = 'Bookings'
): Promise<FeeCalculation | null> {
  try {
    const { data, error } = await supabase.rpc('calculate_platform_fee', {
      transaction_amount_param: transactionAmount,
      category_id_param: categoryId || null,
      subscription_plan_param: subscriptionPlan,
      applies_to_param: appliesTo,
    });

    if (error) throw error;
    return data as FeeCalculation;
  } catch (error) {
    console.error('Error calculating platform fee:', error);
    return null;
  }
}

/**
 * Format fee display
 */
export function formatFeeDisplay(config: {
  fee_type: FeeType;
  percentage_rate: number;
  flat_amount: number;
}): string {
  if (config.fee_type === 'Percentage') {
    return `${config.percentage_rate}%`;
  } else if (config.fee_type === 'Flat') {
    return `$${config.flat_amount.toFixed(2)}`;
  } else {
    return `${config.percentage_rate}% + $${config.flat_amount.toFixed(2)}`;
  }
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Validate fee configuration
 */
export function validateFeeConfig(
  config: Partial<PlatformFeeConfig>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.config_name || config.config_name.trim().length === 0) {
    errors.push('Configuration name is required');
  }

  if (!config.fee_type) {
    errors.push('Fee type is required');
  }

  if (config.fee_type === 'Percentage' || config.fee_type === 'Hybrid') {
    if (
      config.percentage_rate === undefined ||
      config.percentage_rate < 0 ||
      config.percentage_rate > 100
    ) {
      errors.push('Percentage rate must be between 0 and 100');
    }
  }

  if (config.fee_type === 'Flat' || config.fee_type === 'Hybrid') {
    if (config.flat_amount === undefined || config.flat_amount < 0) {
      errors.push('Flat amount must be 0 or greater');
    }
  }

  if (
    config.minimum_fee !== undefined &&
    config.maximum_fee !== undefined &&
    config.maximum_fee < config.minimum_fee
  ) {
    errors.push('Maximum fee must be greater than minimum fee');
  }

  if (!config.applies_to) {
    errors.push('Applies to field is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get fee type options
 */
export function getFeeTypeOptions(): Array<{ value: FeeType; label: string }> {
  return [
    { value: 'Percentage', label: 'Percentage' },
    { value: 'Flat', label: 'Flat Amount' },
    { value: 'Hybrid', label: 'Percentage + Flat' },
  ];
}

/**
 * Get applies to options
 */
export function getAppliesToOptions(): Array<{
  value: AppliesTo;
  label: string;
}> {
  return [
    { value: 'Bookings', label: 'Service Bookings' },
    { value: 'Subscriptions', label: 'Subscriptions' },
    { value: 'Featured', label: 'Featured Listings' },
    { value: 'All', label: 'All Transactions' },
  ];
}

/**
 * Get subscription plan options
 */
export function getSubscriptionPlanOptions(): Array<{
  value: SubscriptionPlan;
  label: string;
}> {
  return [
    { value: 'Free', label: 'Free' },
    { value: 'Pro', label: 'Pro' },
    { value: 'Premium', label: 'Premium' },
    { value: 'Elite', label: 'Elite' },
  ];
}

/**
 * Calculate example fee
 */
export function calculateExampleFee(
  amount: number,
  config: {
    fee_type: FeeType;
    percentage_rate: number;
    flat_amount: number;
    minimum_fee: number;
    maximum_fee: number | null;
  }
): number {
  let fee = 0;

  if (config.fee_type === 'Percentage') {
    fee = amount * (config.percentage_rate / 100);
  } else if (config.fee_type === 'Flat') {
    fee = config.flat_amount;
  } else if (config.fee_type === 'Hybrid') {
    fee = amount * (config.percentage_rate / 100) + config.flat_amount;
  }

  if (fee < config.minimum_fee) {
    fee = config.minimum_fee;
  }

  if (config.maximum_fee !== null && fee > config.maximum_fee) {
    fee = config.maximum_fee;
  }

  return fee;
}

/**
 * Get fee summary statistics
 */
export async function getFeeSummaryStats(): Promise<{
  totalConfigs: number;
  activeConfigs: number;
  categoryOverrides: number;
  activePromotions: number;
} | null> {
  try {
    const [configs, overrides, promotions] = await Promise.all([
      getPlatformFeeConfigs(),
      getCategoryFeeOverrides(),
      getPromotionalWaivers(),
    ]);

    const today = new Date().toISOString().split('T')[0];
    const activePromotions = promotions.filter(
      (p) =>
        p.is_active && p.start_date <= today && p.end_date >= today
    );

    return {
      totalConfigs: configs.length,
      activeConfigs: configs.filter((c) => c.is_active).length,
      categoryOverrides: overrides.filter((o) => o.is_active).length,
      activePromotions: activePromotions.length,
    };
  } catch (error) {
    console.error('Error fetching fee summary stats:', error);
    return null;
  }
}
