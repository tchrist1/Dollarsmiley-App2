import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { ArrowLeft, MessageCircle, Star, MapPin, Package, Briefcase, Users } from 'lucide-react-native';
import { Button } from '@/components/Button';
import { formatCurrency } from '@/lib/currency-utils';

interface ProviderProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  rating_average: number;
  rating_count: number;
  total_reviews: number;
  service_radius: number;
  location: string;
  user_type: string;
}

interface Listing {
  id: string;
  title: string;
  base_price: number;
  pricing_type: string;
  photos: string[];
  status: string;
  rating_average: number;
  total_reviews: number;
  listing_type: string;
  category?: {
    name: string;
  };
}

interface Job {
  id: string;
  title: string;
  budget_type: string;
  budget: number;
  status: string;
  photos: string[];
  category?: {
    name: string;
  };
}

export default function ProviderStoreFrontScreen() {
  const { providerId } = useLocalSearchParams();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'services' | 'custom' | 'jobs'>('services');
  const [services, setServices] = useState<Listing[]>([]);
  const [customServices, setCustomServices] = useState<Listing[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    if (providerId) {
      fetchProviderData();
    }
  }, [providerId]);

  const fetchProviderData = async () => {
    setLoading(true);

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', providerId)
      .single();

    if (profileError || !profileData) {
      console.error('Error fetching provider profile:', profileError);
      setLoading(false);
      return;
    }

    setProvider(profileData as ProviderProfile);

    const { data: servicesData } = await supabase
      .from('service_listings')
      .select(`
        *,
        category:categories(name)
      `)
      .eq('provider_id', providerId)
      .eq('listing_type', 'Service')
      .eq('status', 'Active')
      .order('created_at', { ascending: false });

    const { data: customServicesData } = await supabase
      .from('service_listings')
      .select(`
        *,
        category:categories(name)
      `)
      .eq('provider_id', providerId)
      .eq('listing_type', 'CustomService')
      .eq('status', 'Active')
      .order('created_at', { ascending: false });

    const { data: jobsData } = await supabase
      .from('jobs')
      .select(`
        *,
        category:categories(name)
      `)
      .eq('customer_id', providerId)
      .in('status', ['Open', 'InProgress'])
      .order('created_at', { ascending: false });

    setServices((servicesData as any) || []);
    setCustomServices((customServicesData as any) || []);
    setJobs((jobsData as any) || []);

    if ((servicesData?.length || 0) > 0) {
      setActiveTab('services');
    } else if ((customServicesData?.length || 0) > 0) {
      setActiveTab('custom');
    } else if ((jobsData?.length || 0) > 0) {
      setActiveTab('jobs');
    }

    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProviderData();
  };

  const handleContactProvider = async () => {
    if (!providerId) return;

    const conversationId = [profile?.id, providerId].sort().join('_');

    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .single();

    if (!existingConversation) {
      await supabase.from('conversations').insert({
        id: conversationId,
        user1_id: profile?.id,
        user2_id: providerId,
      });
    }

    router.push(`/chat/${conversationId}` as any);
  };

  const renderListingCard = (listing: Listing) => {
    const imageUrl = listing.photos && listing.photos.length > 0
      ? (typeof listing.photos[0] === 'string' ? listing.photos[0] : null)
      : null;

    return (
      <TouchableOpacity
        key={listing.id}
        style={styles.listingCard}
        onPress={() => router.push(`/listing/${listing.id}` as any)}
        activeOpacity={0.7}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.listingImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.listingImage, styles.placeholderImage]}>
            <Package size={32} color={colors.textLight} />
          </View>
        )}

        <View style={styles.listingInfo}>
          <Text style={styles.listingTitle} numberOfLines={2}>
            {listing.title}
          </Text>

          <Text style={styles.categoryText}>
            {listing.category?.name || 'Uncategorized'}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceText}>
              {formatCurrency(listing.base_price)}
              {listing.pricing_type === 'Hourly' && <Text style={styles.priceUnit}>/hr</Text>}
            </Text>

            {listing.rating_average > 0 && (
              <View style={styles.ratingBadge}>
                <Star size={12} color={colors.warning} fill={colors.warning} />
                <Text style={styles.ratingText}>{listing.rating_average.toFixed(1)}</Text>
              </View>
            )}
          </View>

          <View style={[styles.statusBadge, { backgroundColor: `${colors.success}15` }]}>
            <Text style={[styles.statusText, { color: colors.success }]}>
              {listing.status}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderJobCard = (job: Job) => {
    const imageUrl = job.photos && job.photos.length > 0
      ? (typeof job.photos[0] === 'string' ? job.photos[0] : null)
      : null;

    return (
      <TouchableOpacity
        key={job.id}
        style={styles.listingCard}
        onPress={() => router.push(`/jobs/${job.id}` as any)}
        activeOpacity={0.7}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.listingImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.listingImage, styles.placeholderImage]}>
            <Briefcase size={32} color={colors.textLight} />
          </View>
        )}

        <View style={styles.listingInfo}>
          <Text style={styles.listingTitle} numberOfLines={2}>
            {job.title}
          </Text>

          <Text style={styles.categoryText}>
            {job.category?.name || 'Uncategorized'}
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceText}>
              {job.budget_type === 'Fixed' ? formatCurrency(job.budget) : 'Quote Required'}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: `${colors.primary}15` }]}>
            <Text style={[styles.statusText, { color: colors.primary }]}>
              {job.status}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const availableTabs = [];
  if (services.length > 0) availableTabs.push('services');
  if (customServices.length > 0) availableTabs.push('custom');
  if (jobs.length > 0 && provider?.user_type === 'Hybrid') availableTabs.push('jobs');

  const currentListings =
    activeTab === 'services' ? services :
    activeTab === 'custom' ? customServices :
    [];

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading store front...</Text>
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Provider not found</Text>
        <Button
          title="Go Back"
          onPress={() => router.back()}
          style={styles.backButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIconButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Store Front</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <View style={styles.providerHeader}>
          {provider.avatar_url ? (
            <Image
              source={{ uri: provider.avatar_url }}
              style={styles.providerAvatar}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.providerAvatar, styles.placeholderAvatar]}>
              <Users size={40} color={colors.textLight} />
            </View>
          )}

          <Text style={styles.providerName}>
            {provider.full_name}
          </Text>

          <View style={styles.statsRow}>
            {provider.rating_average > 0 && (
              <>
                <Star size={14} color={colors.warning} fill={colors.warning} />
                <Text style={styles.statsText}>
                  {provider.rating_average.toFixed(1)}
                </Text>
                <Text style={styles.statsSeparator}>•</Text>
              </>
            )}
            {jobs.length > 0 && (
              <>
                <Text style={styles.statsText}>
                  {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
                </Text>
                <Text style={styles.statsSeparator}>•</Text>
              </>
            )}
            <Text style={styles.statsText}>
              {services.length + customServices.length} {(services.length + customServices.length) === 1 ? 'service' : 'services'}
            </Text>
          </View>

          {provider.service_radius && (
            <View style={styles.locationRow}>
              <MapPin size={14} color={colors.textSecondary} />
              <Text style={styles.locationText}>
                Serves within {provider.service_radius} miles
              </Text>
            </View>
          )}

          <Button
            title="Contact Provider"
            onPress={handleContactProvider}
            icon={<MessageCircle size={20} color={colors.white} />}
            style={styles.contactButton}
          />
        </View>

        {availableTabs.length > 0 && (
          <View style={styles.tabContainer}>
            {availableTabs.includes('services') && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'services' && styles.tabActive]}
                onPress={() => setActiveTab('services')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === 'services' && styles.tabTextActive]}>
                  Services ({services.length})
                </Text>
              </TouchableOpacity>
            )}

            {availableTabs.includes('custom') && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'custom' && styles.tabActive]}
                onPress={() => setActiveTab('custom')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === 'custom' && styles.tabTextActive]}>
                  Custom Services ({customServices.length})
                </Text>
              </TouchableOpacity>
            )}

            {availableTabs.includes('jobs') && (
              <TouchableOpacity
                style={[styles.tab, activeTab === 'jobs' && styles.tabActive]}
                onPress={() => setActiveTab('jobs')}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === 'jobs' && styles.tabTextActive]}>
                  Jobs ({jobs.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.listingsGrid}>
          {activeTab === 'jobs'
            ? jobs.map(renderJobCard)
            : currentListings.map(renderListingCard)
          }
        </View>

        {currentListings.length === 0 && activeTab !== 'jobs' && (
          <View style={styles.emptyState}>
            <Package size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>No listings available</Text>
          </View>
        )}

        {jobs.length === 0 && activeTab === 'jobs' && (
          <View style={styles.emptyState}>
            <Briefcase size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>No jobs available</Text>
          </View>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backIconButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold as any,
    color: colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  providerHeader: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  providerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background,
    marginBottom: spacing.md,
  },
  placeholderAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold as any,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  statsText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as any,
    color: colors.textSecondary,
  },
  statsSeparator: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginHorizontal: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  locationText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  contactButton: {
    width: '100%',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as any,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.white,
  },
  listingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  listingCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  listingImage: {
    width: '100%',
    height: 120,
    backgroundColor: colors.background,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingInfo: {
    padding: spacing.sm,
  },
  listingTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold as any,
    color: colors.text,
    marginBottom: spacing.xs,
    minHeight: 36,
  },
  categoryText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  priceText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold as any,
    color: colors.primary,
  },
  priceUnit: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium as any,
    color: colors.text,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium as any,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.error,
    marginBottom: spacing.lg,
  },
  backButton: {
    minWidth: 120,
  },
});
