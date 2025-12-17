import { supabase } from './supabase';

export type DiscountType = 'percentage' | 'fixed_amount' | 'free_service';
export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'ended';
export type CampaignType = 'general' | 'referral' | 'seasonal' | 'first_time' | 'loyalty';

export interface PromotionalCampaign {
  id: string;
  name: string;
  description: string;
  campaign_type: CampaignType;
  discount_type: DiscountType;
  discount_value: number;
  min_order_value?: number;
  max_discount_amount?: number;
  usage_limit_per_user?: number;
  total_usage_limit?: number;
  current_usage: number;
  start_date: string;
  end_date: string;
  status: CampaignStatus;
  target_audience?: {
    new_users?: boolean;
    user_segments?: string[];
    specific_users?: string[];
  };
  applicable_categories?: string[];
  applicable_services?: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DiscountCode {
  id: string;
  campaign_id: string;
  code: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

export interface CampaignUsage {
  id: string;
  campaign_id: string;
  code_id: string;
  user_id: string;
  booking_id?: string;
  discount_amount: number;
  created_at: string;
}

export interface CampaignAnalytics {
  campaign_id: string;
  total_uses: number;
  unique_users: number;
  total_discount_given: number;
  revenue_generated: number;
  conversion_rate: number;
  average_order_value: number;
  roi: number;
  top_performing_codes: Array<{
    code: string;
    uses: number;
    revenue: number;
  }>;
  daily_usage: Array<{
    date: string;
    uses: number;
    revenue: number;
  }>;
}

export async function createCampaign(
  userId: string,
  data: {
    name: string;
    description: string;
    campaign_type: CampaignType;
    discount_type: DiscountType;
    discount_value: number;
    min_order_value?: number;
    max_discount_amount?: number;
    usage_limit_per_user?: number;
    total_usage_limit?: number;
    start_date: string;
    end_date: string;
    target_audience?: PromotionalCampaign['target_audience'];
    applicable_categories?: string[];
    applicable_services?: string[];
    codes?: string[];
  }
): Promise<PromotionalCampaign | null> {
  try {
    // Validate dates
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);

    if (endDate <= startDate) {
      throw new Error('End date must be after start date');
    }

    // Validate discount value
    if (data.discount_type === 'percentage' && data.discount_value > 100) {
      throw new Error('Percentage discount cannot exceed 100%');
    }

    if (data.discount_value <= 0) {
      throw new Error('Discount value must be positive');
    }

    // Determine initial status
    const now = new Date();
    let status: CampaignStatus = 'draft';
    if (startDate <= now && endDate > now) {
      status = 'active';
    } else if (startDate > now) {
      status = 'scheduled';
    }

    const { data: campaign, error } = await supabase
      .from('promotional_campaigns')
      .insert({
        name: data.name,
        description: data.description,
        campaign_type: data.campaign_type,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        min_order_value: data.min_order_value,
        max_discount_amount: data.max_discount_amount,
        usage_limit_per_user: data.usage_limit_per_user,
        total_usage_limit: data.total_usage_limit,
        start_date: data.start_date,
        end_date: data.end_date,
        status,
        target_audience: data.target_audience || {},
        applicable_categories: data.applicable_categories || [],
        applicable_services: data.applicable_services || [],
        created_by: userId,
        current_usage: 0,
      })
      .select()
      .single();

    if (error) throw error;

    // Create discount codes
    if (data.codes && data.codes.length > 0) {
      await createDiscountCodes(campaign.id, data.codes);
    }

    return campaign;
  } catch (error) {
    console.error('Error creating campaign:', error);
    return null;
  }
}

export async function createDiscountCodes(
  campaignId: string,
  codes: string[]
): Promise<DiscountCode[]> {
  try {
    // Validate codes are unique and properly formatted
    const uniqueCodes = [...new Set(codes.map(c => c.toUpperCase().trim()))];

    // Check if codes already exist
    const { data: existingCodes } = await supabase
      .from('discount_codes')
      .select('code')
      .in('code', uniqueCodes);

    if (existingCodes && existingCodes.length > 0) {
      throw new Error(
        `Codes already exist: ${existingCodes.map(c => c.code).join(', ')}`
      );
    }

    const { data, error } = await supabase
      .from('discount_codes')
      .insert(
        uniqueCodes.map(code => ({
          campaign_id: campaignId,
          code,
          is_active: true,
          usage_count: 0,
        }))
      )
      .select();

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error creating discount codes:', error);
    throw error;
  }
}

export async function generateRandomCode(length: number = 8): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';

  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Check if code already exists
  const { data } = await supabase
    .from('discount_codes')
    .select('code')
    .eq('code', code)
    .single();

  // If exists, generate new one recursively
  if (data) {
    return generateRandomCode(length);
  }

  return code;
}

export async function validateDiscountCode(
  code: string,
  userId: string,
  bookingAmount: number,
  categoryId?: string,
  serviceId?: string
): Promise<{
  valid: boolean;
  campaign?: PromotionalCampaign;
  discountCode?: DiscountCode;
  discountAmount?: number;
  message?: string;
}> {
  try {
    // Get code and campaign
    const { data: discountCode, error: codeError } = await supabase
      .from('discount_codes')
      .select('*, campaign:promotional_campaigns(*)')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (codeError || !discountCode) {
      return { valid: false, message: 'Invalid discount code' };
    }

    const campaign = discountCode.campaign as any;

    // Check campaign status
    if (campaign.status !== 'active') {
      return { valid: false, message: 'This campaign is not currently active' };
    }

    // Check dates
    const now = new Date();
    const startDate = new Date(campaign.start_date);
    const endDate = new Date(campaign.end_date);

    if (now < startDate) {
      return { valid: false, message: 'This promotion has not started yet' };
    }

    if (now > endDate) {
      return { valid: false, message: 'This promotion has ended' };
    }

    // Check minimum order value
    if (campaign.min_order_value && bookingAmount < campaign.min_order_value) {
      return {
        valid: false,
        message: `Minimum order value is $${campaign.min_order_value}`,
      };
    }

    // Check total usage limit
    if (campaign.total_usage_limit && campaign.current_usage >= campaign.total_usage_limit) {
      return { valid: false, message: 'This promotion has reached its usage limit' };
    }

    // Check per-user usage limit
    if (campaign.usage_limit_per_user) {
      const { data: userUsage } = await supabase
        .from('campaign_usage')
        .select('id')
        .eq('campaign_id', campaign.id)
        .eq('user_id', userId);

      if (userUsage && userUsage.length >= campaign.usage_limit_per_user) {
        return { valid: false, message: 'You have reached the usage limit for this code' };
      }
    }

    // Check target audience
    if (campaign.target_audience) {
      if (campaign.target_audience.new_users) {
        const { data: previousBookings } = await supabase
          .from('bookings')
          .select('id')
          .eq('customer_id', userId)
          .limit(1);

        if (previousBookings && previousBookings.length > 0) {
          return { valid: false, message: 'This promotion is for first-time users only' };
        }
      }

      if (
        campaign.target_audience.specific_users &&
        !campaign.target_audience.specific_users.includes(userId)
      ) {
        return { valid: false, message: 'This promotion is not available for your account' };
      }
    }

    // Check applicable categories
    if (
      categoryId &&
      campaign.applicable_categories &&
      campaign.applicable_categories.length > 0 &&
      !campaign.applicable_categories.includes(categoryId)
    ) {
      return { valid: false, message: 'This code is not valid for this service category' };
    }

    // Check applicable services
    if (
      serviceId &&
      campaign.applicable_services &&
      campaign.applicable_services.length > 0 &&
      !campaign.applicable_services.includes(serviceId)
    ) {
      return { valid: false, message: 'This code is not valid for this service' };
    }

    // Calculate discount amount
    let discountAmount = 0;

    if (campaign.discount_type === 'percentage') {
      discountAmount = (bookingAmount * campaign.discount_value) / 100;
    } else if (campaign.discount_type === 'fixed_amount') {
      discountAmount = campaign.discount_value;
    }

    // Apply max discount cap
    if (campaign.max_discount_amount && discountAmount > campaign.max_discount_amount) {
      discountAmount = campaign.max_discount_amount;
    }

    // Don't exceed booking amount
    if (discountAmount > bookingAmount) {
      discountAmount = bookingAmount;
    }

    return {
      valid: true,
      campaign,
      discountCode,
      discountAmount,
      message: 'Discount code applied successfully',
    };
  } catch (error) {
    console.error('Error validating discount code:', error);
    return { valid: false, message: 'Error validating code' };
  }
}

export async function applyDiscountCode(
  codeId: string,
  campaignId: string,
  userId: string,
  bookingId: string,
  discountAmount: number
): Promise<boolean> {
  try {
    // Record usage
    const { error: usageError } = await supabase.from('campaign_usage').insert({
      campaign_id: campaignId,
      code_id: codeId,
      user_id: userId,
      booking_id: bookingId,
      discount_amount: discountAmount,
    });

    if (usageError) throw usageError;

    // Update campaign usage count
    await supabase.rpc('increment_campaign_usage', {
      p_campaign_id: campaignId,
    });

    // Update code usage count
    await supabase.rpc('increment_code_usage', {
      p_code_id: codeId,
    });

    return true;
  } catch (error) {
    console.error('Error applying discount code:', error);
    return false;
  }
}

export async function getCampaigns(
  userId: string,
  filters?: {
    status?: CampaignStatus;
    type?: CampaignType;
  }
): Promise<PromotionalCampaign[]> {
  try {
    let query = supabase
      .from('promotional_campaigns')
      .select('*')
      .eq('created_by', userId);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.type) {
      query = query.eq('campaign_type', filters.type);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting campaigns:', error);
    return [];
  }
}

export async function getCampaignDetails(campaignId: string): Promise<{
  campaign: PromotionalCampaign;
  codes: DiscountCode[];
} | null> {
  try {
    const { data: campaign, error: campaignError } = await supabase
      .from('promotional_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError) throw campaignError;

    const { data: codes, error: codesError } = await supabase
      .from('discount_codes')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (codesError) throw codesError;

    return {
      campaign,
      codes: codes || [],
    };
  } catch (error) {
    console.error('Error getting campaign details:', error);
    return null;
  }
}

export async function updateCampaign(
  campaignId: string,
  updates: Partial<PromotionalCampaign>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('promotional_campaigns')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error updating campaign:', error);
    return false;
  }
}

export async function pauseCampaign(campaignId: string): Promise<boolean> {
  return updateCampaign(campaignId, { status: 'paused' });
}

export async function resumeCampaign(campaignId: string): Promise<boolean> {
  return updateCampaign(campaignId, { status: 'active' });
}

export async function endCampaign(campaignId: string): Promise<boolean> {
  return updateCampaign(campaignId, { status: 'ended' });
}

export async function getCampaignAnalytics(
  campaignId: string
): Promise<CampaignAnalytics | null> {
  try {
    const { data: usage } = await supabase
      .from('campaign_usage')
      .select('*, booking:bookings(total_price), code:discount_codes(code)')
      .eq('campaign_id', campaignId);

    if (!usage || usage.length === 0) {
      return {
        campaign_id: campaignId,
        total_uses: 0,
        unique_users: 0,
        total_discount_given: 0,
        revenue_generated: 0,
        conversion_rate: 0,
        average_order_value: 0,
        roi: 0,
        top_performing_codes: [],
        daily_usage: [],
      };
    }

    const uniqueUsers = new Set(usage.map(u => u.user_id)).size;
    const totalDiscountGiven = usage.reduce((sum, u) => sum + u.discount_amount, 0);
    const revenueGenerated = usage.reduce(
      (sum, u) => sum + ((u.booking as any)?.total_price || 0),
      0
    );
    const averageOrderValue = revenueGenerated / usage.length;

    // Calculate ROI (revenue generated vs discount given)
    const roi = totalDiscountGiven > 0
      ? ((revenueGenerated - totalDiscountGiven) / totalDiscountGiven) * 100
      : 0;

    // Top performing codes
    const codeMap = new Map<string, { uses: number; revenue: number }>();
    usage.forEach(u => {
      const code = (u.code as any)?.code;
      if (!code) return;

      const existing = codeMap.get(code) || { uses: 0, revenue: 0 };
      existing.uses++;
      existing.revenue += (u.booking as any)?.total_price || 0;
      codeMap.set(code, existing);
    });

    const topPerformingCodes = Array.from(codeMap.entries())
      .map(([code, data]) => ({ code, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Daily usage
    const dailyMap = new Map<string, { uses: number; revenue: number }>();
    usage.forEach(u => {
      const date = new Date(u.created_at).toISOString().split('T')[0];
      const existing = dailyMap.get(date) || { uses: 0, revenue: 0 };
      existing.uses++;
      existing.revenue += (u.booking as any)?.total_price || 0;
      dailyMap.set(date, existing);
    });

    const dailyUsage = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      campaign_id: campaignId,
      total_uses: usage.length,
      unique_users: uniqueUsers,
      total_discount_given: totalDiscountGiven,
      revenue_generated: revenueGenerated,
      conversion_rate: 0, // Would need total views/impressions to calculate
      average_order_value: averageOrderValue,
      roi,
      top_performing_codes: topPerformingCodes,
      daily_usage: dailyUsage,
    };
  } catch (error) {
    console.error('Error getting campaign analytics:', error);
    return null;
  }
}

export async function getActiveCampaigns(
  categoryId?: string,
  serviceId?: string
): Promise<PromotionalCampaign[]> {
  try {
    const now = new Date().toISOString();

    let query = supabase
      .from('promotional_campaigns')
      .select('*')
      .eq('status', 'active')
      .lte('start_date', now)
      .gte('end_date', now);

    const { data, error } = await query.order('discount_value', { ascending: false });

    if (error) throw error;

    // Filter by category/service if provided
    let filtered = data || [];

    if (categoryId) {
      filtered = filtered.filter(
        c =>
          !c.applicable_categories ||
          c.applicable_categories.length === 0 ||
          c.applicable_categories.includes(categoryId)
      );
    }

    if (serviceId) {
      filtered = filtered.filter(
        c =>
          !c.applicable_services ||
          c.applicable_services.length === 0 ||
          c.applicable_services.includes(serviceId)
      );
    }

    return filtered;
  } catch (error) {
    console.error('Error getting active campaigns:', error);
    return [];
  }
}

export function formatDiscount(campaign: PromotionalCampaign): string {
  if (campaign.discount_type === 'percentage') {
    return `${campaign.discount_value}% OFF`;
  } else if (campaign.discount_type === 'fixed_amount') {
    return `$${campaign.discount_value} OFF`;
  } else {
    return 'FREE SERVICE';
  }
}

export function getCampaignTypeLabel(type: CampaignType): string {
  switch (type) {
    case 'general':
      return 'General Promotion';
    case 'referral':
      return 'Referral Program';
    case 'seasonal':
      return 'Seasonal Sale';
    case 'first_time':
      return 'First-Time Offer';
    case 'loyalty':
      return 'Loyalty Reward';
  }
}

export function getCampaignStatusLabel(status: CampaignStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'scheduled':
      return 'Scheduled';
    case 'active':
      return 'Active';
    case 'paused':
      return 'Paused';
    case 'ended':
      return 'Ended';
  }
}

export function getCampaignStatusColor(status: CampaignStatus): string {
  switch (status) {
    case 'draft':
      return '#6B7280'; // Gray
    case 'scheduled':
      return '#3B82F6'; // Blue
    case 'active':
      return '#10B981'; // Green
    case 'paused':
      return '#F59E0B'; // Orange
    case 'ended':
      return '#EF4444'; // Red
  }
}
