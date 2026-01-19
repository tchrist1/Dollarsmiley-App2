import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Sparkles, TrendingUp, Star } from 'lucide-react-native';
import { MarketplaceListing } from '@/types/database';
import { HomeCarouselSection } from './HomeCarouselSection';
import { colors } from '@/constants/theme';

interface HomeCarouselsContainerProps {
  recommendedListings: MarketplaceListing[];
  trendingListings: MarketplaceListing[];
  popularListings: MarketplaceListing[];
  onSeeAll: (type: string) => void;
  showCarousels: boolean;
  hasActiveFilters: boolean;
}

export const HomeCarouselsContainer = memo<HomeCarouselsContainerProps>(({
  recommendedListings,
  trendingListings,
  popularListings,
  onSeeAll,
  showCarousels,
  hasActiveFilters,
}) => {
  // Don't show carousels when filters/search are active
  if (!showCarousels || hasActiveFilters) {
    return null;
  }

  const hasAnyCarousels =
    recommendedListings.length > 0 ||
    trendingListings.length > 0 ||
    popularListings.length > 0;

  if (!hasAnyCarousels) {
    return null;
  }

  return (
    <View style={styles.container}>
      {recommendedListings.length > 0 && (
        <HomeCarouselSection
          title="Recommended for You"
          icon={<Sparkles size={20} color={colors.primary} />}
          data={recommendedListings}
          carouselType="recommended"
          onSeeAll={onSeeAll}
        />
      )}

      {trendingListings.length > 0 && (
        <HomeCarouselSection
          title="Trending This Week"
          icon={<TrendingUp size={20} color={colors.primary} />}
          data={trendingListings}
          carouselType="trending"
          onSeeAll={onSeeAll}
        />
      )}

      {popularListings.length > 0 && (
        <HomeCarouselSection
          title="Popular Services"
          icon={<Star size={20} color={colors.primary} />}
          data={popularListings}
          carouselType="popular"
          onSeeAll={onSeeAll}
        />
      )}
    </View>
  );
});

HomeCarouselsContainer.displayName = 'HomeCarouselsContainer';

const styles = StyleSheet.create({
  container: {
    // Container for all carousels
  },
});
