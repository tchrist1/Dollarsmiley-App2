import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Star, ArrowRight } from 'lucide-react-native';
import FeaturedListingCard from './FeaturedListingCard';
import { getActiveFeaturedListings, calculateDaysRemaining } from '@/lib/featured-listings';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface FeaturedListingsSectionProps {
  categoryId?: string;
  limit?: number;
  variant?: 'default' | 'compact' | 'hero';
  title?: string;
  showViewAll?: boolean;
}

export default function FeaturedListingsSection({
  categoryId,
  limit = 5,
  variant = 'default',
  title = 'Featured Services',
  showViewAll = true,
}: FeaturedListingsSectionProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [featured, setFeatured] = useState<any[]>([]);

  useEffect(() => {
    loadFeaturedListings();
  }, [categoryId]);

  const loadFeaturedListings = async () => {
    setLoading(true);
    try {
      const data = await getActiveFeaturedListings(categoryId, limit);
      setFeatured(data);
    } catch (error) {
      console.error('Error loading featured listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAll = () => {
    router.push('/discover?featured=true');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Loading featured services...</Text>
      </View>
    );
  }

  if (featured.length === 0) {
    return null;
  }

  // Hero variant - show single large card
  if (variant === 'hero' && featured.length > 0) {
    const heroItem = featured[0];
    return (
      <View style={styles.heroContainer}>
        <View style={styles.heroHeader}>
          <View style={styles.heroTitleContainer}>
            <Star size={24} color={colors.warning} fill={colors.warning} />
            <Text style={styles.heroTitle}>{title}</Text>
          </View>
        </View>

        <FeaturedListingCard
          listing={heroItem.listing}
          featuredId={heroItem.id}
          daysRemaining={calculateDaysRemaining(heroItem.ends_at)}
          impressions={heroItem.impressions}
          clicks={heroItem.clicks}
          variant="hero"
        />

        {featured.length > 1 && showViewAll && (
          <TouchableOpacity style={styles.viewAllButton} onPress={handleViewAll}>
            <Text style={styles.viewAllText}>
              View {featured.length - 1} More Featured Service{featured.length > 2 ? 's' : ''}
            </Text>
            <ArrowRight size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Compact variant - horizontal scroll
  if (variant === 'compact') {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Star size={20} color={colors.warning} fill={colors.warning} />
            <Text style={styles.title}>{title}</Text>
          </View>
          {showViewAll && (
            <TouchableOpacity style={styles.viewAllLink} onPress={handleViewAll}>
              <Text style={styles.viewAllLinkText}>View All</Text>
              <ArrowRight size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.compactScroll}
        >
          {featured.map((item) => (
            <View key={item.id} style={styles.compactCardWrapper}>
              <FeaturedListingCard
                listing={item.listing}
                featuredId={item.id}
                daysRemaining={calculateDaysRemaining(item.ends_at)}
                variant="compact"
              />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Default variant - vertical list
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Star size={20} color={colors.warning} fill={colors.warning} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {showViewAll && (
          <TouchableOpacity style={styles.viewAllLink} onPress={handleViewAll}>
            <Text style={styles.viewAllLinkText}>View All</Text>
            <ArrowRight size={14} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.subtitle}>
        Premium services hand-picked for quality and reliability
      </Text>

      <View style={styles.listContainer}>
        {featured.map((item) => (
          <FeaturedListingCard
            key={item.id}
            listing={item.listing}
            featuredId={item.id}
            daysRemaining={calculateDaysRemaining(item.ends_at)}
            impressions={item.impressions}
            clicks={item.clicks}
            variant="default"
          />
        ))}
      </View>

      {showViewAll && featured.length >= limit && (
        <TouchableOpacity style={styles.viewMoreButton} onPress={handleViewAll}>
          <Text style={styles.viewMoreText}>View All Featured Services</Text>
          <ArrowRight size={20} color={colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  heroContainer: {
    marginBottom: spacing.xl,
  },
  heroHeader: {
    marginBottom: spacing.lg,
  },
  heroTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewAllText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  compactContainer: {
    marginBottom: spacing.lg,
  },
  container: {
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  viewAllLinkText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  listContainer: {
    gap: spacing.md,
  },
  compactScroll: {
    paddingRight: spacing.lg,
  },
  compactCardWrapper: {
    width: 280,
    marginRight: spacing.md,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },
  viewMoreText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
