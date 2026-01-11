import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { Button } from '@/components/Button';
import { PlusCircle, Edit, Eye, TrendingUp, Star, MapPin, Calendar, DollarSign, Package, Power, PowerOff, MoreVertical, Trash2, CheckCircle2, Archive, RotateCcw, Pause } from 'lucide-react-native';
import { formatCurrency } from '@/lib/currency-utils';
import { ListingStatus, updateListingStatus, publishListing, archiveListing, restoreListing } from '@/lib/listing-status-manager';

interface ServiceListing {
  id: string;
  title: string;
  description: string;
  base_price: number;
  pricing_type: string;
  photos: string[];
  status: string;
  view_count: number;
  booking_count: number;
  save_count: number;
  is_featured: boolean;
  is_active: boolean;
  rating_average: number;
  total_reviews: number;
  listing_type: string;
  location: string;
  created_at: string;
  category?: {
    name: string;
  };
}

export default function MyListingsScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [listings, setListings] = useState<ServiceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'draft' | 'archived'>('all');

  useEffect(() => {
    if (profile) {
      fetchListings();
    }
  }, [profile, filter]);

  const fetchListings = async () => {
    if (!profile) return;

    setLoading(true);
    let query = supabase
      .from('service_listings')
      .select(`
        *,
        category:categories(name)
      `)
      .eq('provider_id', profile.id)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter.charAt(0).toUpperCase() + filter.slice(1));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching listings:', error);
    } else {
      setListings(data as any || []);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchListings();
  };

  const handlePublish = async (listingId: string) => {
    const result = await publishListing(listingId);
    if (result.success) {
      Alert.alert('Success', 'Listing has been published and is now visible to customers');
      fetchListings();
    } else if (result.validationErrors) {
      const errorMessages = result.validationErrors.map(e => e.message).join('\n');
      Alert.alert('Cannot Publish', errorMessages);
    } else {
      Alert.alert('Error', result.error || 'Failed to publish listing');
    }
  };

  const handlePause = async (listingId: string) => {
    const result = await updateListingStatus(listingId, 'Paused');
    if (result.success) {
      fetchListings();
    } else {
      Alert.alert('Error', result.error || 'Failed to pause listing');
    }
  };

  const handleActivate = async (listingId: string) => {
    const result = await updateListingStatus(listingId, 'Active');
    if (result.success) {
      fetchListings();
    } else {
      Alert.alert('Error', result.error || 'Failed to activate listing');
    }
  };

  const handleArchive = async (listingId: string, listingTitle: string) => {
    Alert.alert(
      'Archive Listing',
      `Archive "${listingTitle}"? Customers will no longer see it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            const result = await archiveListing(listingId);
            if (result.success) {
              fetchListings();
            } else {
              Alert.alert('Error', result.error || 'Failed to archive listing');
            }
          },
        },
      ]
    );
  };

  const handleRestore = async (listingId: string) => {
    const result = await restoreListing(listingId, 'Paused');
    if (result.success) {
      Alert.alert('Success', 'Listing has been restored as Paused');
      fetchListings();
    } else {
      Alert.alert('Error', result.error || 'Failed to restore listing');
    }
  };

  const deleteListing = async (listingId: string, listingTitle: string) => {
    Alert.alert(
      'Delete Listing',
      `Are you sure you want to delete "${listingTitle}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('service_listings')
              .delete()
              .eq('id', listingId);

            if (error) {
              Alert.alert('Error', 'Failed to delete listing');
              console.error('Error deleting listing:', error);
            } else {
              Alert.alert('Success', 'Listing deleted successfully');
              fetchListings();
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return colors.success;
      case 'Paused': return colors.warning;
      case 'Draft': return colors.textLight;
      case 'Archived': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    return status === 'Active' ? 'Power' : 'PowerOff';
  };

  const renderListingCard = (listing: ServiceListing) => {
    const imageUrl = listing.photos && listing.photos.length > 0
      ? (typeof listing.photos[0] === 'string' ? listing.photos[0] : null)
      : null;

    return (
      <View key={listing.id} style={styles.listingCard}>
        <View style={styles.listingHeader}>
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
            <View style={styles.titleRow}>
              <Text style={styles.listingTitle} numberOfLines={2}>
                {listing.title}
              </Text>
              {listing.is_featured && (
                <View style={styles.featuredBadge}>
                  <Star size={12} color={colors.warning} fill={colors.warning} />
                </View>
              )}
            </View>

            <Text style={styles.categoryText}>
              {listing.category?.name || 'Uncategorized'} • {listing.listing_type}
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Eye size={14} color={colors.textSecondary} />
                <Text style={styles.statText}>{listing.view_count || 0}</Text>
              </View>
              <View style={styles.stat}>
                <Calendar size={14} color={colors.textSecondary} />
                <Text style={styles.statText}>{listing.booking_count || 0}</Text>
              </View>
              {listing.rating_average > 0 && (
                <View style={styles.stat}>
                  <Star size={14} color={colors.warning} fill={colors.warning} />
                  <Text style={styles.statText}>
                    {listing.rating_average.toFixed(1)} ({listing.total_reviews})
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.listingFooter}>
          <View style={styles.priceStatusRow}>
            <Text style={styles.priceText}>
              {formatCurrency(listing.base_price)}
              <Text style={styles.pricingTypeText}>
                {listing.pricing_type === 'Hourly' ? '/hr' : ''}
              </Text>
            </Text>

            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(listing.status)}15` }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(listing.status) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(listing.status) }]}>
                {listing.status}
              </Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            {listing.status === 'Draft' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => router.push(`/listing/${listing.id}/edit` as any)}
                  activeOpacity={0.7}
                >
                  <Edit size={16} color={colors.primary} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.publishButton]}
                  onPress={() => handlePublish(listing.id)}
                  activeOpacity={0.7}
                >
                  <CheckCircle2 size={16} color={colors.success} />
                  <Text style={[styles.toggleButtonText, { color: colors.success }]}>Publish</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.archiveButton]}
                  onPress={() => handleArchive(listing.id, listing.title)}
                  activeOpacity={0.7}
                >
                  <Archive size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </>
            )}

            {listing.status === 'Active' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => router.push(`/listing/${listing.id}/edit` as any)}
                  activeOpacity={0.7}
                >
                  <Edit size={16} color={colors.primary} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.pauseButton]}
                  onPress={() => handlePause(listing.id)}
                  activeOpacity={0.7}
                >
                  <Pause size={16} color={colors.warning} />
                  <Text style={[styles.toggleButtonText, { color: colors.warning }]}>Pause</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.iconButton]}
                  onPress={() => router.push(`/listing/${listing.id}` as any)}
                  activeOpacity={0.7}
                >
                  <Eye size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.archiveIconButton]}
                  onPress={() => handleArchive(listing.id, listing.title)}
                  activeOpacity={0.7}
                >
                  <Archive size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteIconButton]}
                  onPress={() => deleteListing(listing.id, listing.title)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={20} color={colors.error} />
                </TouchableOpacity>
              </>
            )}

            {listing.status === 'Paused' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => router.push(`/listing/${listing.id}/edit` as any)}
                  activeOpacity={0.7}
                >
                  <Edit size={16} color={colors.primary} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.activateButton]}
                  onPress={() => handleActivate(listing.id)}
                  activeOpacity={0.7}
                >
                  <Power size={16} color={colors.success} />
                  <Text style={[styles.toggleButtonText, { color: colors.success }]}>Activate</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.iconButton]}
                  onPress={() => router.push(`/listing/${listing.id}` as any)}
                  activeOpacity={0.7}
                >
                  <Eye size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.archiveIconButton]}
                  onPress={() => handleArchive(listing.id, listing.title)}
                  activeOpacity={0.7}
                >
                  <Archive size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteIconButton]}
                  onPress={() => deleteListing(listing.id, listing.title)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={20} color={colors.error} />
                </TouchableOpacity>
              </>
            )}

            {listing.status === 'Archived' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.viewButton]}
                  onPress={() => router.push(`/listing/${listing.id}`)}
                  activeOpacity={0.7}
                >
                  <Eye size={16} color={colors.textSecondary} />
                  <Text style={styles.viewButtonText}>View</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.restoreButton]}
                  onPress={() => handleRestore(listing.id)}
                  activeOpacity={0.7}
                >
                  <RotateCcw size={16} color={colors.primary} />
                  <Text style={[styles.toggleButtonText, { color: colors.primary }]}>Restore</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deleteListing(listing.id, listing.title)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color={colors.error} />
                </TouchableOpacity>
              </>
            )}

          </View>
        </View>
      </View>
    );
  };

  const filteredCount = listings.length;
  const activeCount = listings.filter(l => l.status === 'Active').length;
  const pausedCount = listings.filter(l => l.status === 'Paused').length;
  const draftCount = listings.filter(l => l.status === 'Draft').length;
  const archivedCount = listings.filter(l => l.status === 'Archived').length;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View>
          <Text style={styles.headerTitle}>My Listings</Text>
          <Text style={styles.headerSubtitle}>
            {filteredCount} {filteredCount === 1 ? 'listing' : 'listings'}
          </Text>
        </View>
        <Button
          title="Create"
          onPress={() => router.push('/create-listing' as any)}
          icon={<PlusCircle size={20} color={colors.white} />}
          style={styles.createButton}
        />
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All ({listings.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'active' && styles.filterChipActive]}
            onPress={() => setFilter('active')}
            activeOpacity={0.7}
          >
            <View style={[styles.filterDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
              Active ({activeCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'paused' && styles.filterChipActive]}
            onPress={() => setFilter('paused')}
            activeOpacity={0.7}
          >
            <View style={[styles.filterDot, { backgroundColor: colors.warning }]} />
            <Text style={[styles.filterText, filter === 'paused' && styles.filterTextActive]}>
              Paused ({pausedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'draft' && styles.filterChipActive]}
            onPress={() => setFilter('draft')}
            activeOpacity={0.7}
          >
            <View style={[styles.filterDot, { backgroundColor: colors.textLight }]} />
            <Text style={[styles.filterText, filter === 'draft' && styles.filterTextActive]}>
              Drafts ({draftCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filter === 'archived' && styles.filterChipActive]}
            onPress={() => setFilter('archived')}
            activeOpacity={0.7}
          >
            <View style={[styles.filterDot, { backgroundColor: colors.error }]} />
            <Text style={[styles.filterText, filter === 'archived' && styles.filterTextActive]}>
              Archived ({archivedCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading listings...</Text>
          </View>
        ) : listings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Package size={64} color={colors.textLight} />
            <Text style={styles.emptyTitle}>No Listings Yet</Text>
            <Text style={styles.emptyText}>
              {filter === 'all'
                ? "Create your first listing to start offering services"
                : `No ${filter} listings found`
              }
            </Text>
            {filter === 'all' && (
              <Button
                title="Create Your First Listing"
                onPress={() => router.push('/create-listing' as any)}
                icon={<PlusCircle size={20} color={colors.white} />}
                style={styles.emptyButton}
              />
            )}
          </View>
        ) : (
          <>
            {listings.map(renderListingCard)}
          </>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold as any,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  createButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterScroll: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    gap: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as any,
    color: colors.text,
  },
  filterTextActive: {
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  listingCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  listingHeader: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  listingImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  listingTitle: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold as any,
    color: colors.text,
    marginRight: spacing.xs,
  },
  featuredBadge: {
    backgroundColor: `${colors.warning}15`,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  categoryText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  listingFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
  },
  priceStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  priceText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold as any,
    color: colors.primary,
  },
  pricingTypeText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium as any,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  editButton: {
    flex: 1,
    backgroundColor: `${colors.primary}10`,
  },
  editButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as any,
    color: colors.primary,
  },
  toggleButton: {
    flex: 1,
  },
  pauseButton: {
    backgroundColor: `${colors.warning}10`,
  },
  activateButton: {
    backgroundColor: `${colors.success}10`,
  },
  publishButton: {
    flex: 1,
    backgroundColor: `${colors.success}10`,
  },
  archiveButton: {
    paddingHorizontal: spacing.md,
    backgroundColor: `${colors.textSecondary}10`,
  },
  restoreButton: {
    flex: 1,
    backgroundColor: `${colors.primary}10`,
  },
  toggleButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as any,
  },
  viewButton: {
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  viewButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium as any,
    color: colors.textSecondary,
  },
  iconButton: {
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  archiveIconButton: {
    paddingHorizontal: spacing.md,
    backgroundColor: `${colors.textSecondary}10`,
  },
  deleteIconButton: {
    paddingHorizontal: spacing.md,
    backgroundColor: `${colors.error}10`,
  },
  deleteButton: {
    paddingHorizontal: spacing.md,
    backgroundColor: `${colors.error}10`,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold as any,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyButton: {
    minWidth: 200,
  },
});
