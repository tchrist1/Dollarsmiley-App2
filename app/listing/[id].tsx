import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { safeGoBack } from '@/lib/navigation-utils';
import { useAuth } from '@/contexts/AuthContext';
import { trackListingView } from '@/lib/recommendations';
import { Listing, Review, Profile } from '@/types/database';
import { Button } from '@/components/Button';
import { RecommendationsCarousel } from '@/components/RecommendationsCarousel';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { formatCurrency } from '@/lib/currency-utils';
import BadgeList from '@/components/BadgeList';
import { Badge } from '@/components/VerificationBadge';
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  DollarSign,
  Heart,
  Share2,
  Shield,
  Calendar,
  Edit,
  MessageCircle,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [listing, setListing] = useState<Listing | null>(null);
  const [provider, setProvider] = useState<Profile | null>(null);
  const [providerBadges, setProviderBadges] = useState<Badge[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  useEffect(() => {
    if (id) {
      fetchListingDetails();
      checkFavoriteStatus();
      if (profile && typeof id === 'string') {
        trackListingView(profile.id, id);
      }
    }
  }, [id, profile]);

  const fetchListingDetails = async () => {
    setLoading(true);

    const { data: listingData, error: listingError } = await supabase
      .from('service_listings')
      .select('*, categories(*)')
      .eq('id', id)
      .single();

    if (listingError) {
      Alert.alert('Error', 'Failed to load listing details');
      console.error('Listing fetch error:', listingError);
      setLoading(false);
      return;
    }

    if (listingData.status !== 'Active' && listingData.provider_id !== profile?.id) {
      Alert.alert(
        'Listing Unavailable',
        'This listing is no longer available.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
      setLoading(false);
      return;
    }

    setListing(listingData);

    const { data: providerData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', listingData.provider_id)
      .single();

    if (providerData) {
      setProvider(providerData);

      // Fetch provider badges
      const { data: badgesData } = await supabase
        .rpc('get_profile_badges', { p_profile_id: providerData.id });

      if (badgesData) {
        setProviderBadges(badgesData as Badge[]);
      }
    }

    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*, reviewer:profiles!reviews_reviewer_id_fkey(*)')
      .eq('reviewee_id', listingData.provider_id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (reviewsData) {
      setReviews(reviewsData);
    }

    await supabase
      .from('service_listings')
      .update({ view_count: (listingData.view_count || 0) + 1 })
      .eq('id', id);

    setLoading(false);
  };

  const checkFavoriteStatus = async () => {
    if (!profile) return;

    const { data } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', profile.id)
      .eq('listing_id', id)
      .maybeSingle();

    setIsFavorite(!!data);
  };

  const toggleFavorite = async () => {
    if (!profile) {
      Alert.alert('Sign In Required', 'Please sign in to save favorites');
      return;
    }

    if (isFavorite) {
      await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', profile.id)
        .eq('listing_id', id);

      setIsFavorite(false);
    } else {
      await supabase.from('user_favorites').insert({
        user_id: profile.id,
        listing_id: id,
      });

      setIsFavorite(true);
    }
  };

  const handleBookNow = () => {
    if (!profile) {
      Alert.alert('Sign In Required', 'Please sign in to book this service');
      return;
    }

    if (!listing) return;

    const listingType = listing.listing_type || 'Service';
    const isCustomService = listingType === 'CustomService';

    if (isCustomService) {
      router.push({
        pathname: '/book-service/[listingId]',
        params: {
          listingId: id,
          type: 'custom',
          providerId: listing.provider_id,
          price: listing.base_price || 0,
        },
      } as any);
    } else {
      router.push({
        pathname: '/book-service/[listingId]',
        params: {
          listingId: id,
          type: 'standard',
          providerId: listing.provider_id,
          price: listing.base_price || 0,
        },
      } as any);
    }
  };

  const handleRequestQuote = async () => {
    if (!profile) {
      Alert.alert('Sign In Required', 'Please sign in to request a quote');
      return;
    }

    if (!provider) return;

    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(participant_one_id.eq.${profile.id},participant_two_id.eq.${provider.id}),and(participant_one_id.eq.${provider.id},participant_two_id.eq.${profile.id})`
      )
      .maybeSingle();

    if (existingConv) {
      router.push(`/chat/${existingConv.id}`);
    } else {
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          participant_one_id: profile.id,
          participant_two_id: provider.id,
          last_message: 'Quote request',
        })
        .select()
        .single();

      if (newConv && !error) {
        router.push(`/chat/${newConv.id}`);
      } else {
        Alert.alert('Error', 'Failed to start conversation');
      }
    }
  };

  const handleContactProvider = async () => {
    if (!profile) {
      Alert.alert('Sign In Required', 'Please sign in to contact the provider');
      return;
    }

    if (!provider) return;

    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .or(
        `and(participant_one_id.eq.${profile.id},participant_two_id.eq.${provider.id}),and(participant_one_id.eq.${provider.id},participant_two_id.eq.${profile.id})`
      )
      .maybeSingle();

    if (existingConv) {
      router.push(`/chat/${existingConv.id}`);
    } else {
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({
          participant_one_id: profile.id,
          participant_two_id: provider.id,
          last_message: 'Conversation started',
        })
        .select()
        .single();

      if (newConv && !error) {
        router.push(`/chat/${newConv.id}`);
      } else {
        Alert.alert('Error', 'Failed to start conversation');
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!listing || !provider) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Listing not found</Text>
      </View>
    );
  }

  let photos: string[] = [];
  if (listing.photos) {
    if (Array.isArray(listing.photos)) {
      photos = listing.photos.filter((p: any) => typeof p === 'string' && p.trim() !== '');
    } else if (typeof listing.photos === 'string') {
      try {
        const parsed = JSON.parse(listing.photos);
        photos = Array.isArray(parsed) ? parsed.filter((p: any) => typeof p === 'string' && p.trim() !== '') : [];
      } catch (e) {
        if (listing.photos.trim() !== '') {
          photos = [listing.photos];
        }
      }
    }
  }
  const tags = listing.tags || [];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.photoSection}>
          {photos.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const index = Math.round(e.nativeEvent.contentOffset.x / width);
                setActivePhotoIndex(index);
              }}
              scrollEventThrottle={16}
            >
              {photos.map((photo: any, index: number) => {
                const photoUrl = typeof photo === 'string' ? photo : photo?.url || '';
                return photoUrl ? (
                  <Image key={index} source={{ uri: photoUrl }} style={styles.photo} />
                ) : null;
              })}
            </ScrollView>
          ) : (
            <View style={[styles.photo, styles.placeholderPhoto]}>
              <Text style={styles.placeholderText}>No photos available</Text>
            </View>
          )}

          <View style={styles.photoOverlay}>
            <TouchableOpacity style={styles.backButton} onPress={() => safeGoBack()}>
              <ArrowLeft size={24} color={colors.white} />
            </TouchableOpacity>
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.iconButton} onPress={toggleFavorite}>
                <Heart
                  size={24}
                  color={isFavorite ? colors.error : colors.white}
                  fill={isFavorite ? colors.error : 'none'}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <Share2 size={24} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          {photos.length > 1 && (
            <View style={styles.photoIndicator}>
              {photos.map((_: any, index: number) => (
                <View
                  key={index}
                  style={[styles.dot, activePhotoIndex === index && styles.activeDot]}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.detailsSection}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>{listing.title}</Text>
              <View style={styles.ratingRow}>
                <Star size={16} color={colors.warning} fill={colors.warning} />
                <Text style={styles.ratingText}>
                  {(listing.rating_average || provider.rating_average || 0).toFixed(1)} ({(listing.total_reviews || provider.rating_count || 0)} reviews)
                </Text>
              </View>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>{formatCurrency(listing.base_price)}</Text>
              <Text style={styles.priceType}>
                {listing.pricing_type === 'Hourly' ? '/hour' : 'fixed'}
              </Text>
            </View>
          </View>

          {listing.estimated_duration && (
            <View style={styles.infoRow}>
              <Clock size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>
                Typical duration: {Math.floor(listing.estimated_duration / 60)} hours
              </Text>
            </View>
          )}

          {listing.location && (
            <View style={styles.infoRow}>
              <MapPin size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>{listing.location}</Text>
            </View>
          )}

          {tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{listing.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About the Provider</Text>
            <View style={styles.providerCard}>
              <View style={styles.providerHeader}>
                <View style={styles.avatarContainer}>
                  {provider.avatar_url ? (
                    <Image source={{ uri: provider.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>
                        {provider.full_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {provider.id_verified && (
                    <View style={styles.verifiedBadge}>
                      <Shield size={12} color={colors.white} />
                    </View>
                  )}
                </View>
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{provider.full_name}</Text>
                  {providerBadges.length > 0 && (
                    <View style={styles.providerBadges}>
                      <BadgeList badges={providerBadges} size="small" maxVisible={3} horizontal />
                    </View>
                  )}
                  <Text style={styles.providerStats}>
                    {provider.total_bookings || 0} bookings completed
                  </Text>
                  {provider.location && (
                    <View style={styles.providerLocation}>
                      <MapPin size={14} color={colors.textSecondary} />
                      <Text style={styles.providerLocationText}>{provider.location}</Text>
                    </View>
                  )}
                </View>
              </View>
              {provider.bio && <Text style={styles.providerBio}>{provider.bio}</Text>}
            </View>
          </View>

          {reviews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reviews ({reviews.length})</Text>
              {reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewerInfo}>
                      <View style={styles.reviewerAvatar}>
                        <Text style={styles.reviewerAvatarText}>
                          {review.reviewer?.full_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.reviewerName}>{review.reviewer?.full_name}</Text>
                        <Text style={styles.reviewDate}>
                          {new Date(review.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.reviewRating}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          color={i < review.rating ? colors.warning : colors.border}
                          fill={i < review.rating ? colors.warning : 'none'}
                        />
                      ))}
                    </View>
                  </View>
                  {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                </View>
              ))}
            </View>
          )}
        </View>

        <RecommendationsCarousel type="popular" title="Similar Services" limit={6} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.lg }]}>
        {listing?.provider_id === profile?.id ? (
          <Button
            title="Edit Listing"
            onPress={() => router.push(`/listing/${id}/edit` as any)}
            style={styles.bookButton}
            textStyle={styles.footerButtonText}
            leftIcon={<Edit size={20} color={colors.white} />}
          />
        ) : (
          <>
            <Button
              title="Book Now"
              onPress={handleBookNow}
              style={styles.bookButton}
              textStyle={styles.footerButtonText}
              leftIcon={<Calendar size={20} color={colors.white} />}
            />
            <Button
              title="Request Quote"
              onPress={handleRequestQuote}
              variant="outline"
              style={styles.quoteButton}
              textStyle={styles.footerButtonText}
            />
          </>
        )}
        <Button
          title="Contact"
          onPress={handleContactProvider}
          variant="outline"
          style={styles.contactButton}
          textStyle={styles.footerButtonText}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  loadingText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  photoSection: {
    position: 'relative',
  },
  photo: {
    width,
    height: 300,
    backgroundColor: colors.surface,
  },
  placeholderPhoto: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: fontSize.md,
    color: colors.textLight,
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIndicator: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  activeDot: {
    backgroundColor: colors.white,
    width: 20,
  },
  detailsSection: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: -0.8,
  },
  priceType: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'lowercase',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
  },
  tagText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 26,
    fontWeight: '400',
  },
  providerCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border + '30',
    ...shadows.sm,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },
  providerBadges: {
    marginBottom: spacing.xs,
  },
  providerStats: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  providerLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  providerLocationText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  providerBio: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  reviewCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border + '20',
    ...shadows.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewerAvatarText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: -0.2,
  },
  reviewDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  reviewRating: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewComment: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    fontWeight: '400',
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'stretch',
  },
  bookButton: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  quoteButton: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  contactButton: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  footerButtonText: {
    fontSize: fontSize.sm,
  },
});
