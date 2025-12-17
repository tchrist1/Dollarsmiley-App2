import { supabase } from './supabase';

export interface RecommendationResult {
  id: string;
  listing: any;
  score: number;
  reasoning: string;
  type: string;
}

export interface JobMatch {
  id: string;
  job: any;
  match_score: number;
  match_reasons: any[];
  status: string;
}

export async function generatePersonalizedRecommendations(
  userId: string,
  limit: number = 10
): Promise<RecommendationResult[]> {
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!preferences || !preferences.view_history?.length) {
    return getPopularListings(limit);
  }

  const viewedListingIds = preferences.view_history
    .map((v: any) => v.listing_id)
    .slice(-20);

  const { data: viewedListings } = await supabase
    .from('service_listings')
    .select('category_id, tags, base_price')
    .in('id', viewedListingIds);

  const categoryIds = [
    ...new Set([
      ...(preferences.favorite_categories || []),
      ...(viewedListings?.map((l) => l.category_id) || []),
    ]),
  ];

  const averageBudget = calculateAverageBudget(preferences.booking_history_summary);
  const priceRange = {
    min: averageBudget * 0.7,
    max: averageBudget * 1.5,
  };

  let query = supabase
    .from('service_listings')
    .select('*, provider:profiles!service_listings_provider_id_fkey(*), category:categories(*)')
    .eq('status', 'Active')
    .not('provider_id', 'eq', userId);

  if (categoryIds.length > 0) {
    query = query.in('category_id', categoryIds);
  }

  if (averageBudget > 0) {
    query = query.gte('base_price', priceRange.min).lte('base_price', priceRange.max);
  }

  if (preferences.location_preferences?.latitude && preferences.location_preferences?.longitude) {
    query = query.not('latitude', 'is', null).not('longitude', 'is', null);
  }

  const { data: listings } = await query.limit(limit * 2);

  if (!listings || listings.length === 0) {
    return getPopularListings(limit);
  }

  const scoredListings = listings.map((listing: any) => {
    let score = 50;
    const reasons: string[] = [];

    if (categoryIds.includes(listing.category_id)) {
      score += 25;
      reasons.push('Matches your interests');
    }

    if (listing.provider?.rating_average >= 4.5) {
      score += 10;
      reasons.push('Highly rated');
    }

    if (listing.provider?.id_verified || listing.provider?.business_verified) {
      score += 5;
      reasons.push('Verified provider');
    }

    if (listing.provider?.total_bookings >= 10) {
      score += 5;
      reasons.push('Experienced');
    }

    if (
      preferences.location_preferences?.latitude &&
      preferences.location_preferences?.longitude &&
      listing.latitude &&
      listing.longitude
    ) {
      const distance = calculateDistance(
        preferences.location_preferences.latitude,
        preferences.location_preferences.longitude,
        listing.latitude,
        listing.longitude
      );

      if (distance <= 10) {
        score += 15;
        reasons.push('Near you');
      } else if (distance <= 25) {
        score += 8;
        reasons.push('Nearby');
      }
    }

    if (viewedListings) {
      const similarTags = viewedListings.some((viewed) => {
        const viewedTags = viewed.tags || [];
        const listingTags = listing.tags || [];
        return viewedTags.some((tag: string) => listingTags.includes(tag));
      });

      if (similarTags) {
        score += 5;
        reasons.push('Similar to viewed');
      }
    }

    if (listing.is_featured) {
      score += 3;
    }

    return {
      id: listing.id,
      listing,
      score: Math.min(score, 100),
      reasoning: reasons.join(' • '),
      type: 'Personalized',
    };
  });

  return scoredListings
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function getPopularListings(limit: number = 10): Promise<RecommendationResult[]> {
  const { data: listings } = await supabase
    .from('service_listings')
    .select('*, provider:profiles!service_listings_provider_id_fkey(*), category:categories(*)')
    .eq('status', 'Active')
    .order('view_count', { ascending: false })
    .limit(limit);

  return (listings || []).map((listing: any) => ({
    id: listing.id,
    listing,
    score: 80,
    reasoning: 'Popular service',
    type: 'Popular',
  }));
}

export async function getTrendingListings(limit: number = 10): Promise<RecommendationResult[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: listings } = await supabase
    .from('service_listings')
    .select('*, provider:profiles!service_listings_provider_id_fkey(*), category:categories(*)')
    .eq('status', 'Active')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('view_count', { ascending: false })
    .order('booking_count', { ascending: false })
    .limit(limit);

  return (listings || []).map((listing: any) => ({
    id: listing.id,
    listing,
    score: 85,
    reasoning: 'Trending this week',
    type: 'Trending',
  }));
}

export async function getSimilarListings(
  listingId: string,
  limit: number = 6
): Promise<RecommendationResult[]> {
  const { data: baseListing } = await supabase
    .from('service_listings')
    .select('category_id, tags, base_price, provider_id, latitude, longitude')
    .eq('id', listingId)
    .single();

  if (!baseListing) return [];

  const priceRange = {
    min: baseListing.base_price * 0.7,
    max: baseListing.base_price * 1.3,
  };

  let query = supabase
    .from('service_listings')
    .select('*, provider:profiles!service_listings_provider_id_fkey(*), category:categories(*)')
    .eq('status', 'Active')
    .eq('category_id', baseListing.category_id)
    .neq('id', listingId)
    .neq('provider_id', baseListing.provider_id)
    .gte('base_price', priceRange.min)
    .lte('base_price', priceRange.max);

  const { data: listings } = await query.limit(limit * 2);

  if (!listings) return [];

  const scoredListings = (listings || []).map((listing: any) => {
    let score = 70;
    const reasons: string[] = ['Similar service'];

    const commonTags =
      listing.tags?.filter((tag: string) => baseListing.tags?.includes(tag)).length || 0;

    if (commonTags > 0) {
      score += Math.min(commonTags * 5, 15);
      reasons.push('Similar features');
    }

    const priceDiff = Math.abs(listing.base_price - baseListing.base_price);
    const pricePercentDiff = (priceDiff / baseListing.base_price) * 100;

    if (pricePercentDiff < 15) {
      score += 10;
      reasons.push('Similar price');
    }

    if (
      baseListing.latitude &&
      baseListing.longitude &&
      listing.latitude &&
      listing.longitude
    ) {
      const distance = calculateDistance(
        baseListing.latitude,
        baseListing.longitude,
        listing.latitude,
        listing.longitude
      );

      if (distance <= 15) {
        score += 5;
        reasons.push('Same area');
      }
    }

    return {
      id: listing.id,
      listing,
      score: Math.min(score, 100),
      reasoning: reasons.join(' • '),
      type: 'Similar',
    };
  });

  return scoredListings
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function getNearbyListings(
  latitude: number,
  longitude: number,
  radiusMiles: number = 25,
  limit: number = 10
): Promise<RecommendationResult[]> {
  const { data: listings } = await supabase
    .from('service_listings')
    .select('*, provider:profiles!service_listings_provider_id_fkey(*), category:categories(*)')
    .eq('status', 'Active')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(100);

  if (!listings) return [];

  const nearbyListings = listings
    .map((listing: any) => {
      const distance = calculateDistance(latitude, longitude, listing.latitude, listing.longitude);

      if (distance > radiusMiles) return null;

      let score = 90 - Math.min(distance * 2, 40);

      return {
        id: listing.id,
        listing,
        score: Math.round(score),
        reasoning: `${distance.toFixed(1)} miles away`,
        type: 'NearYou',
      };
    })
    .filter((item): item is RecommendationResult => item !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return nearbyListings;
}

export async function trackListingView(userId: string, listingId: string): Promise<void> {
  try {
    await supabase.rpc('track_listing_view', {
      p_user_id: userId,
      p_listing_id: listingId,
    });
  } catch (error) {
    console.error('Error tracking listing view:', error);
  }
}

export async function trackSearch(
  userId: string,
  searchTerm: string,
  categoryId?: string
): Promise<void> {
  try {
    await supabase.rpc('track_search', {
      p_user_id: userId,
      p_search_term: searchTerm,
      p_category_id: categoryId,
    });
  } catch (error) {
    console.error('Error tracking search:', error);
  }
}

export async function suggestCategoryForListing(
  title: string,
  description: string
): Promise<{ categoryId: string | null; confidence: number; suggestedTags: string[] }> {
  const text = `${title} ${description}`.toLowerCase();

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('is_active', true);

  if (!categories || categories.length === 0) {
    return { categoryId: null, confidence: 0, suggestedTags: [] };
  }

  let bestMatch = { categoryId: null as string | null, confidence: 0 };

  categories.forEach((category) => {
    const categoryName = category.name.toLowerCase();
    const categorySlug = category.slug.toLowerCase();

    let confidence = 0;

    if (text.includes(categoryName)) {
      confidence += 40;
    }

    if (text.includes(categorySlug)) {
      confidence += 30;
    }

    const keywords = getCategoryKeywords(category.slug);
    keywords.forEach((keyword) => {
      if (text.includes(keyword.toLowerCase())) {
        confidence += 10;
      }
    });

    if (confidence > bestMatch.confidence) {
      bestMatch = { categoryId: category.id, confidence: Math.min(confidence, 100) };
    }
  });

  const suggestedTags = extractTags(text);

  return {
    categoryId: bestMatch.categoryId,
    confidence: bestMatch.confidence,
    suggestedTags,
  };
}

function getCategoryKeywords(categorySlug: string): string[] {
  const keywordMap: Record<string, string[]> = {
    'home-services': ['cleaning', 'repair', 'maintenance', 'plumbing', 'electrical', 'hvac', 'handyman'],
    'beauty-wellness': ['haircut', 'massage', 'spa', 'nails', 'facial', 'skincare', 'barber'],
    'automotive': ['car', 'auto', 'vehicle', 'mechanic', 'tire', 'oil change', 'detailing'],
    'pet-services': ['dog', 'cat', 'pet', 'grooming', 'walking', 'veterinary', 'training'],
    'events': ['party', 'wedding', 'event', 'catering', 'photography', 'dj', 'planning'],
    'tutoring': ['tutor', 'lesson', 'teaching', 'education', 'training', 'class', 'learning'],
    'fitness': ['workout', 'exercise', 'gym', 'personal training', 'yoga', 'pilates', 'coach'],
    'technology': ['computer', 'phone', 'tech', 'software', 'website', 'app', 'repair'],
  };

  return keywordMap[categorySlug] || [];
}

function extractTags(text: string): string[] {
  const commonTags = [
    'professional',
    'licensed',
    'insured',
    'experienced',
    'certified',
    'affordable',
    'emergency',
    'same-day',
    'eco-friendly',
    'local',
    'background-checked',
    'flexible',
    '24/7',
    'mobile',
  ];

  return commonTags.filter((tag) => text.includes(tag.toLowerCase()));
}

export async function generateJobMatches(jobId: string): Promise<void> {
  try {
    await supabase.rpc('generate_job_matches', {
      p_job_id: jobId,
    });
  } catch (error) {
    console.error('Error generating job matches:', error);
  }
}

export async function getJobMatchesForProvider(
  providerId: string,
  limit: number = 10
): Promise<JobMatch[]> {
  const { data: matches } = await supabase
    .from('job_matches')
    .select('*, job:jobs(*, customer:profiles!jobs_customer_id_fkey(*), category:categories(*))')
    .eq('provider_id', providerId)
    .eq('status', 'Suggested')
    .order('match_score', { ascending: false })
    .limit(limit);

  return matches || [];
}

export async function updateJobMatchStatus(
  matchId: string,
  status: 'Viewed' | 'Applied' | 'Rejected'
): Promise<void> {
  await supabase.from('job_matches').update({ status }).eq('id', matchId);
}

export async function updateFavoriteCategories(
  userId: string,
  categoryId: string,
  action: 'add' | 'remove'
): Promise<void> {
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('favorite_categories')
    .eq('user_id', userId)
    .single();

  const currentCategories = preferences?.favorite_categories || [];

  let updatedCategories: string[];
  if (action === 'add' && !currentCategories.includes(categoryId)) {
    updatedCategories = [...currentCategories, categoryId];
  } else if (action === 'remove') {
    updatedCategories = currentCategories.filter((id: string) => id !== categoryId);
  } else {
    return;
  }

  await supabase
    .from('user_preferences')
    .update({ favorite_categories: updatedCategories, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateAverageBudget(bookingHistory: any): number {
  if (!bookingHistory || !bookingHistory.total_spent || !bookingHistory.booking_count) {
    return 0;
  }

  return bookingHistory.total_spent / bookingHistory.booking_count;
}

export async function getCollaborativeRecommendations(
  userId: string,
  limit: number = 10
): Promise<RecommendationResult[]> {
  const { data: userPreferences } = await supabase
    .from('user_preferences')
    .select('view_history, favorite_categories')
    .eq('user_id', userId)
    .single();

  if (!userPreferences || !userPreferences.view_history?.length) {
    return [];
  }

  const userViewedListingIds = userPreferences.view_history
    .map((v: any) => v.listing_id)
    .slice(-20);

  const { data: similarUsers } = await supabase
    .from('user_preferences')
    .select('user_id, view_history')
    .neq('user_id', userId)
    .limit(100);

  if (!similarUsers) return [];

  const similarityScores = similarUsers.map((user) => {
    const theirViewedIds = user.view_history.map((v: any) => v.listing_id);
    const commonViews = userViewedListingIds.filter((id: string) =>
      theirViewedIds.includes(id)
    ).length;
    const similarity = commonViews / Math.max(userViewedListingIds.length, theirViewedIds.length);

    return {
      userId: user.user_id,
      similarity,
      viewedIds: theirViewedIds,
    };
  });

  const topSimilarUsers = similarityScores
    .filter((s) => s.similarity > 0.1)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);

  if (topSimilarUsers.length === 0) return [];

  const recommendedListingIds = topSimilarUsers
    .flatMap((u) => u.viewedIds)
    .filter((id: string) => !userViewedListingIds.includes(id));

  const uniqueListingIds = [...new Set(recommendedListingIds)].slice(0, limit);

  if (uniqueListingIds.length === 0) return [];

  const { data: listings } = await supabase
    .from('service_listings')
    .select('*, provider:profiles!service_listings_provider_id_fkey(*), category:categories(*)')
    .in('id', uniqueListingIds)
    .eq('status', 'Active');

  return (listings || []).map((listing: any) => ({
    id: listing.id,
    listing,
    score: 75,
    reasoning: 'Users like you also viewed this',
    type: 'Collaborative',
  }));
}
