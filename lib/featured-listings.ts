import { supabase } from './supabase';
import { trackUsage, canPerformAction } from './usage-tracking';

export type FeaturedDuration = '7' | '14' | '30';

export interface FeaturedPricing {
  duration: FeaturedDuration;
  days: number;
  price: number;
  pricePerDay: number;
  savings: number;
  popular: boolean;
}

export interface FeaturedListing {
  id: string;
  listing_id: string;
  user_id: string;
  starts_at: string;
  ends_at: string;
  status: 'active' | 'scheduled' | 'expired';
  payment_intent_id: string | null;
  amount_paid: number;
  created_at: string;
}

export interface FeaturedSlot {
  id: string;
  listing_id: string;
  position: number;
  category_id?: string;
  starts_at: string;
  ends_at: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

const BASE_PRICE_PER_DAY = 9.99;

export function getFeaturedPricing(): FeaturedPricing[] {
  return [
    {
      duration: '7',
      days: 7,
      price: 49.99,
      pricePerDay: 7.14,
      savings: 19.94,
      popular: false,
    },
    {
      duration: '14',
      days: 14,
      price: 79.99,
      pricePerDay: 5.71,
      savings: 59.87,
      popular: true,
    },
    {
      duration: '30',
      days: 30,
      price: 149.99,
      pricePerDay: 5.0,
      savings: 149.71,
      popular: false,
    },
  ];
}

export function getPricingByDuration(duration: FeaturedDuration): FeaturedPricing | null {
  const pricing = getFeaturedPricing();
  return pricing.find((p) => p.duration === duration) || null;
}

export async function checkFeaturedEligibility(
  userId: string,
  listingId: string
): Promise<{ eligible: boolean; reason?: string }> {
  try {
    // Check if listing exists and belongs to user
    const { data: listing, error: listingError } = await supabase
      .from('service_listings')
      .select('id, user_id, status')
      .eq('id', listingId)
      .eq('user_id', userId)
      .single();

    if (listingError || !listing) {
      return { eligible: false, reason: 'Listing not found or access denied' };
    }

    if (listing.status !== 'Active') {
      return { eligible: false, reason: 'Only active listings can be featured' };
    }

    // Check if listing is already featured
    const { data: activeFeatured } = await supabase
      .from('featured_listings')
      .select('id')
      .eq('listing_id', listingId)
      .eq('status', 'active')
      .single();

    if (activeFeatured) {
      return { eligible: false, reason: 'Listing is already featured' };
    }

    // Check usage limits
    const { allowed, message } = await canPerformAction(
      userId,
      'featured_listings',
      1
    );

    if (!allowed) {
      return { eligible: false, reason: message || 'Featured listing limit reached' };
    }

    return { eligible: true };
  } catch (error) {
    console.error('Error checking featured eligibility:', error);
    return { eligible: false, reason: 'Error checking eligibility' };
  }
}

export async function createFeaturedPaymentIntent(
  userId: string,
  listingId: string,
  duration: FeaturedDuration
): Promise<{
  clientSecret: string;
  amount: number;
  featuredId: string;
} | null> {
  try {
    const pricing = getPricingByDuration(duration);
    if (!pricing) {
      throw new Error('Invalid duration');
    }

    // Create payment intent via edge function
    const { data, error } = await supabase.functions.invoke('create-featured-payment', {
      body: {
        listingId,
        duration,
        amount: pricing.price,
      },
    });

    if (error) throw error;

    return {
      clientSecret: data.clientSecret,
      amount: data.amount,
      featuredId: data.featuredId,
    };
  } catch (error) {
    console.error('Error creating featured payment intent:', error);
    return null;
  }
}

export async function activateFeaturedListing(
  featuredId: string,
  paymentIntentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.functions.invoke('activate-featured-listing', {
      body: {
        featuredId,
        paymentIntentId,
      },
    });

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error activating featured listing:', error);
    return { success: false, error: error.message };
  }
}

export async function getUserFeaturedListings(
  userId: string
): Promise<FeaturedListing[]> {
  try {
    const { data, error } = await supabase
      .from('featured_listings')
      .select(`
        *,
        listing:service_listings(id, title, category:categories(name))
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error getting featured listings:', error);
    return [];
  }
}

export async function getActiveFeaturedListings(
  categoryId?: string,
  limit: number = 10
): Promise<any[]> {
  try {
    let query = supabase
      .from('featured_listings')
      .select(`
        *,
        listing:service_listings(
          *,
          category:categories(name),
          provider:profiles(id, full_name, avatar_url, average_rating)
        )
      `)
      .eq('status', 'active')
      .lte('starts_at', new Date().toISOString())
      .gte('ends_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(limit);

    if (categoryId) {
      query = query.eq('listing.category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) {
      // Check if error is due to missing table
      if (error.code === 'PGRST205' || error.message?.includes('featured_listings')) {
        return [];
      }
      throw error;
    }

    return data || [];
  } catch (error: any) {
    // Silently handle missing table error
    if (error?.code === 'PGRST205' || error?.message?.includes('featured_listings')) {
      return [];
    }
    console.error('Error getting active featured listings:', error);
    return [];
  }
}

export async function trackFeaturedImpression(featuredId: string): Promise<void> {
  try {
    await supabase.rpc('increment_featured_impressions', {
      p_featured_id: featuredId,
    });
  } catch (error) {
    console.error('Error tracking impression:', error);
  }
}

export async function trackFeaturedClick(featuredId: string): Promise<void> {
  try {
    await supabase.rpc('increment_featured_clicks', {
      p_featured_id: featuredId,
    });
  } catch (error) {
    console.error('Error tracking click:', error);
  }
}

export async function getFeaturedStats(
  featuredId: string
): Promise<{
  impressions: number;
  clicks: number;
  ctr: number;
} | null> {
  try {
    const { data, error } = await supabase
      .from('featured_listings')
      .select('impressions, clicks')
      .eq('id', featuredId)
      .single();

    if (error) throw error;

    const impressions = data.impressions || 0;
    const clicks = data.clicks || 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

    return { impressions, clicks, ctr };
  } catch (error) {
    console.error('Error getting featured stats:', error);
    return null;
  }
}

export function calculateDaysRemaining(endsAt: string): number {
  const now = new Date();
  const end = new Date(endsAt);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function isFeaturedActive(featured: FeaturedListing): boolean {
  const now = new Date();
  const start = new Date(featured.starts_at);
  const end = new Date(featured.ends_at);
  return featured.status === 'active' && now >= start && now <= end;
}

export function formatFeaturedDuration(days: number): string {
  if (days === 7) return '1 Week';
  if (days === 14) return '2 Weeks';
  if (days === 30) return '1 Month';
  return `${days} Days`;
}

export function calculateROI(
  amountPaid: number,
  clicks: number,
  conversionRate: number = 0.05
): {
  costPerClick: number;
  estimatedConversions: number;
  estimatedRevenue: number;
  roi: number;
} {
  const costPerClick = clicks > 0 ? amountPaid / clicks : 0;
  const estimatedConversions = clicks * conversionRate;
  const estimatedRevenue = estimatedConversions * 100; // Assume $100 average booking
  const roi = amountPaid > 0 ? ((estimatedRevenue - amountPaid) / amountPaid) * 100 : 0;

  return {
    costPerClick,
    estimatedConversions,
    estimatedRevenue,
    roi,
  };
}

export function getFeaturedBadgeColor(daysRemaining: number): string {
  if (daysRemaining >= 14) return '#10B981'; // Green
  if (daysRemaining >= 7) return '#3B82F6'; // Blue
  if (daysRemaining >= 3) return '#F59E0B'; // Orange
  return '#EF4444'; // Red
}

export async function extendFeaturedListing(
  featuredId: string,
  additionalDays: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: featured } = await supabase
      .from('featured_listings')
      .select('ends_at')
      .eq('id', featuredId)
      .single();

    if (!featured) {
      return { success: false, error: 'Featured listing not found' };
    }

    const currentEnd = new Date(featured.ends_at);
    const newEnd = new Date(currentEnd.getTime() + additionalDays * 24 * 60 * 60 * 1000);

    const { error } = await supabase
      .from('featured_listings')
      .update({ ends_at: newEnd.toISOString() })
      .eq('id', featuredId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error extending featured listing:', error);
    return { success: false, error: error.message };
  }
}
