import { supabase } from './supabase';
import { getUserPreferences, type UserPreferences } from './recommendation-engine';

export interface EnhancedRecommendation {
  id: string;
  title: string;
  description: string;
  base_price: number;
  price_type: string;
  listing_type: 'Service' | 'CustomService';
  provider_id: string;
  category_id: string;
  photos: string;
  rating_average?: number;
  review_count?: number;
  provider?: {
    full_name: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  category?: {
    name: string;
  };
  fulfillment_options?: Array<{
    fulfillment_type: string;
  }>;
  has_vas: boolean;
  recommendation_score: number;
  recommendation_reason: string;
}

/**
 * Get personalized recommendations with custom service awareness
 */
export async function getEnhancedRecommendations(
  userId: string,
  limit: number = 10
): Promise<EnhancedRecommendation[]> {
  try {
    const preferences = await getUserPreferences(userId);

    // Get user's booking history to understand preferences
    const { data: bookingHistory } = await supabase
      .from('bookings')
      .select('listing_id, provider_id, category_id')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    const bookedCategories = bookingHistory?.map((b) => b.category_id) || [];
    const bookedProviders = bookingHistory?.map((b) => b.provider_id) || [];

    // Get listings with enhanced data
    let query = supabase
      .from('service_listings')
      .select(`
        *,
        provider:profiles!service_listings_provider_id_fkey(full_name, avatar_url, is_verified),
        category:categories!service_listings_category_id_fkey(name),
        fulfillment_options(fulfillment_type),
        value_added_services(id, is_active)
      `)
      .eq('is_active', true)
      .neq('provider_id', userId); // Don't recommend own listings

    // Exclude already booked providers if user has history
    if (bookedProviders.length > 0) {
      query = query.not('provider_id', 'in', `(${bookedProviders.slice(0, 5).join(',')})`);
    }

    // Prioritize categories user has booked before
    if (bookedCategories.length > 0 && preferences?.categories) {
      const preferredCategories = [...new Set([...preferences.categories, ...bookedCategories])];
      query = query.in('category_id', preferredCategories);
    }

    const { data: listings, error } = await query.limit(50);

    if (error) throw error;

    // Calculate recommendation scores
    const recommendations: EnhancedRecommendation[] = (listings || []).map((listing) => {
      let score = 50; // Base score
      let reasons: string[] = [];

      // Rating boost
      if (listing.rating_average) {
        score += listing.rating_average * 10;
        if (listing.rating_average >= 4.5) {
          reasons.push('Highly rated');
        }
      }

      // Review count boost
      if (listing.review_count && listing.review_count > 10) {
        score += Math.min(listing.review_count / 2, 15);
        reasons.push('Popular choice');
      }

      // Verified provider boost
      if (listing.provider?.is_verified) {
        score += 10;
        reasons.push('Verified provider');
      }

      // Category match boost
      if (bookedCategories.includes(listing.category_id)) {
        score += 20;
        reasons.push('Based on your bookings');
      }

      // Custom service boost (more options = higher score)
      if (listing.listing_type === 'CustomService') {
        score += 5;
        const activeVAS = listing.value_added_services?.filter((v: any) => v.is_active) || [];
        if (activeVAS.length > 0) {
          score += activeVAS.length * 2;
          reasons.push('Customizable options');
        }

        if (listing.fulfillment_options && listing.fulfillment_options.length > 1) {
          score += 5;
          reasons.push('Multiple fulfillment options');
        }
      }

      // Price range match
      if (preferences) {
        const inPriceRange =
          listing.base_price >= preferences.price_range_min &&
          (!preferences.price_range_max || listing.base_price <= preferences.price_range_max);

        if (inPriceRange) {
          score += 10;
          reasons.push('Matches your budget');
        }
      }

      // Featured boost
      if (listing.is_featured) {
        score += 5;
      }

      return {
        ...listing,
        has_vas: (listing.value_added_services?.filter((v: any) => v.is_active) || []).length > 0,
        recommendation_score: score,
        recommendation_reason: reasons.length > 0 ? reasons.join(' • ') : 'Recommended for you',
      };
    });

    // Sort by score and return top results
    return recommendations
      .sort((a, b) => b.recommendation_score - a.recommendation_score)
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting enhanced recommendations:', error);
    return [];
  }
}

/**
 * Get similar listings based on custom service features
 */
export async function getSimilarListings(
  listingId: string,
  limit: number = 5
): Promise<EnhancedRecommendation[]> {
  try {
    // Get the source listing
    const { data: sourceListing } = await supabase
      .from('service_listings')
      .select(`
        *,
        fulfillment_options(fulfillment_type),
        value_added_services(id, is_active)
      `)
      .eq('id', listingId)
      .single();

    if (!sourceListing) return [];

    // Find similar listings
    let query = supabase
      .from('service_listings')
      .select(`
        *,
        provider:profiles!service_listings_provider_id_fkey(full_name, avatar_url, is_verified),
        category:categories!service_listings_category_id_fkey(name),
        fulfillment_options(fulfillment_type),
        value_added_services(id, is_active)
      `)
      .eq('is_active', true)
      .neq('id', listingId)
      .eq('category_id', sourceListing.category_id);

    // Prefer same listing type
    if (sourceListing.listing_type) {
      query = query.eq('listing_type', sourceListing.listing_type);
    }

    const { data: listings, error } = await query.limit(20);

    if (error) throw error;

    // Calculate similarity scores
    const sourceFulfillmentTypes =
      sourceListing.fulfillment_options?.map((fo: any) => fo.fulfillment_type) || [];
    const sourceHasVAS =
      (sourceListing.value_added_services?.filter((v: any) => v.is_active) || []).length > 0;

    const recommendations: EnhancedRecommendation[] = (listings || []).map((listing) => {
      let score = 50;
      let reasons: string[] = [];

      // Same category (already filtered)
      score += 20;
      reasons.push('Same category');

      // Similar price range
      const priceDiff = Math.abs(listing.base_price - sourceListing.base_price);
      const priceRatio = priceDiff / sourceListing.base_price;
      if (priceRatio < 0.3) {
        score += 15;
        reasons.push('Similar price');
      }

      // Similar fulfillment options
      const listingFulfillmentTypes =
        listing.fulfillment_options?.map((fo: any) => fo.fulfillment_type) || [];
      const commonFulfillmentTypes = sourceFulfillmentTypes.filter((type) =>
        listingFulfillmentTypes.includes(type)
      );
      if (commonFulfillmentTypes.length > 0) {
        score += commonFulfillmentTypes.length * 10;
        reasons.push('Similar fulfillment');
      }

      // Both have VAS
      const listingHasVAS =
        (listing.value_added_services?.filter((v: any) => v.is_active) || []).length > 0;
      if (sourceHasVAS && listingHasVAS) {
        score += 10;
        reasons.push('Customizable');
      }

      // Rating boost
      if (listing.rating_average && listing.rating_average >= 4.0) {
        score += listing.rating_average * 5;
      }

      return {
        ...listing,
        has_vas: listingHasVAS,
        recommendation_score: score,
        recommendation_reason: reasons.join(' • '),
      };
    });

    return recommendations
      .sort((a, b) => b.recommendation_score - a.recommendation_score)
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting similar listings:', error);
    return [];
  }
}

/**
 * Track user interaction for better recommendations
 */
export async function trackListingInteraction(
  userId: string,
  listingId: string,
  interactionType: 'view' | 'favorite' | 'share' | 'book'
): Promise<void> {
  try {
    const weights = {
      view: 1,
      favorite: 5,
      share: 3,
      book: 10,
    };

    await supabase.from('user_interactions').insert({
      user_id: userId,
      item_type: 'listing',
      item_id: listingId,
      interaction_type: interactionType,
      interaction_weight: weights[interactionType],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking interaction:', error);
  }
}
