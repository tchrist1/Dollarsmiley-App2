import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import {
  Package,
  Clock,
  AlertTriangle,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  TrendingUp,
  Box,
  Hash,
} from 'lucide-react-native';
import { colors } from '@/constants/theme';
import {
  getInventoryItemById,
  getAvailableInventoryCount,
  getInventoryCalendar,
  deleteInventoryItem,
  formatInventoryStatus,
  ProviderInventoryItem,
} from '@/lib/inventory-locking';

interface CalendarLock {
  id: string;
  inventory_item_id: string;
  inventory_item_name: string;
  booking_id: string | null;
  production_order_id: string | null;
  quantity: number;
  pickup_at: string | null;
  dropoff_at: string | null;
  dropoff_at_effective: string | null;
  lock_type: string;
  status: string;
}
import {
  getRentalPricingTiers,
  formatPricingModel,
  formatUnitType,
  RentalPricingTier,
} from '@/lib/rental-pricing';

export default function InventoryItemDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [item, setItem] = useState<ProviderInventoryItem | null>(null);
  const [available, setAvailable] = useState(0);
  const [upcomingLocks, setUpcomingLocks] = useState<CalendarLock[]>([]);
  const [pricingTiers, setPricingTiers] = useState<RentalPricingTier[]>([]);

  const loadData = useCallback(async () => {
    if (!id) return;

    try {
      const [itemData, availableCount, calendarData, tiers] = await Promise.all([
        getInventoryItemById(id),
        getAvailableInventoryCount(id),
        getInventoryCalendar(
          '',
          new Date().toISOString(),
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          id
        ),
        getRentalPricingTiers(id),
      ]);

      setItem(itemData);
      setAvailable(availableCount);
      setUpcomingLocks(calendarData.locks.slice(0, 5));
      setPricingTiers(tiers);
    } catch (error) {
      console.error('Error loading inventory item:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleDelete = async () => {
    if (!id) return;

    const doDelete = async () => {
      const success = await deleteInventoryItem(id);
      if (success) {
        router.back();
      }
    };

    if (Platform.OS === 'web') {
      const confirm = window.confirm(
        'Are you sure you want to delete this inventory item? This action cannot be undone.'
      );
      if (confirm) {
        await doDelete();
      }
    } else {
      Alert.alert(
        'Delete Item',
        'Are you sure you want to delete this inventory item? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: doDelete,
          },
        ]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.errorContainer}>
        <Package size={48} color={colors.textSecondary} />
        <Text style={styles.errorTitle}>Item Not Found</Text>
        <Text style={styles.errorText}>
          This inventory item may have been deleted.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = formatInventoryStatus(
    available,
    item.total_quantity,
    item.low_stock_threshold
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: item.name,
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.push(`/provider/inventory/${id}/edit`)}
              >
                <Edit size={20} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={handleDelete}>
                <Trash2 size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.itemIcon}>
            <Package size={32} color={colors.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.sku && (
              <View style={styles.skuRow}>
                <Hash size={14} color={colors.textSecondary} />
                <Text style={styles.skuText}>{item.sku}</Text>
              </View>
            )}
            <View style={styles.badges}>
              {item.is_rentable && (
                <View style={styles.rentableBadge}>
                  <Clock size={12} color="#3B82F6" />
                  <Text style={styles.rentableText}>Rental</Text>
                </View>
              )}
              <View
                style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}
              >
                {status.status !== 'available' && (
                  <AlertTriangle size={12} color={status.color} />
                )}
                <Text style={[styles.statusText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {item.description && (
          <View style={styles.section}>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#10B98120' }]}>
              <Box size={20} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{available}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
              <Package size={20} color={colors.primary} />
            </View>
            <Text style={styles.statValue}>{item.total_quantity}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#F59E0B20' }]}>
              <AlertTriangle size={20} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>{item.buffer_quantity}</Text>
            <Text style={styles.statLabel}>Buffer</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#3B82F620' }]}>
              <TrendingUp size={20} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>
              {item.total_quantity - available - item.buffer_quantity}
            </Text>
            <Text style={styles.statLabel}>In Use</Text>
          </View>
        </View>

        {item.is_rentable && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Rental Settings</Text>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Turnaround Time</Text>
                <Text style={styles.infoValue}>
                  {item.turnaround_hours || 0} hours
                </Text>
              </View>
              {item.default_rental_price && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Default Daily Rate</Text>
                  <Text style={styles.infoValue}>
                    ${item.default_rental_price.toFixed(2)}
                  </Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Low Stock Alert</Text>
                <Text style={styles.infoValue}>
                  Below {item.low_stock_threshold} units
                </Text>
              </View>
            </View>
          </View>
        )}

        {item.is_rentable && pricingTiers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Pricing Tiers</Text>
              <TouchableOpacity
                onPress={() => router.push(`/provider/inventory/${id}/pricing`)}
              >
                <Text style={styles.viewAllText}>Edit</Text>
              </TouchableOpacity>
            </View>
            {pricingTiers.map((tier) => (
              <View key={tier.id} style={styles.tierCard}>
                <View style={styles.tierHeader}>
                  <Text style={styles.tierName}>
                    {tier.description || `Tier ${tier.tier_order}`}
                  </Text>
                  <Text style={styles.tierPrice}>
                    ${tier.price_per_unit.toFixed(2)}{' '}
                    <Text style={styles.tierUnit}>{formatUnitType(tier.unit_type)}</Text>
                  </Text>
                </View>
                <Text style={styles.tierDuration}>
                  {tier.min_duration_hours}
                  {tier.max_duration_hours
                    ? ` - ${tier.max_duration_hours}`
                    : '+'}{' '}
                  hours
                </Text>
              </View>
            ))}
          </View>
        )}

        {upcomingLocks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Reservations</Text>
              <TouchableOpacity
                onPress={() => router.push('/provider/inventory/calendar')}
              >
                <Text style={styles.viewAllText}>Calendar</Text>
              </TouchableOpacity>
            </View>
            {upcomingLocks.map((lock) => (
              <View key={lock.id} style={styles.lockCard}>
                <View
                  style={[
                    styles.lockIndicator,
                    { backgroundColor: lock.lock_type === 'hard' ? '#10B981' : '#F59E0B' },
                  ]}
                />
                <View style={styles.lockInfo}>
                  <Text style={styles.lockType}>
                    {lock.lock_type === 'hard' ? 'Confirmed' : 'Pending'} Reservation
                  </Text>
                  <Text style={styles.lockQuantity}>
                    {lock.quantity} unit{lock.quantity > 1 ? 's' : ''}
                  </Text>
                  {lock.pickup_at && lock.dropoff_at && (
                    <Text style={styles.lockDates}>
                      {new Date(lock.pickup_at).toLocaleDateString()} -{' '}
                      {new Date(lock.dropoff_at).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/provider/inventory/${id}/edit`)}
          >
            <Edit size={18} color={colors.primary} />
            <Text style={styles.actionButtonText}>Edit Item</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/provider/inventory/calendar')}
          >
            <Calendar size={18} color={colors.primary} />
            <Text style={styles.actionButtonText}>View Calendar</Text>
          </TouchableOpacity>

          {item.is_rentable && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/provider/inventory/${id}/pricing`)}
            >
              <DollarSign size={18} color={colors.primary} />
              <Text style={styles.actionButtonText}>Manage Pricing</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 16,
  },
  itemIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  skuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  skuText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
  },
  rentableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F610',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  rentableText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  statCard: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  tierCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tierName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  tierPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  tierUnit: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  tierDuration: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  lockCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  lockIndicator: {
    width: 4,
    borderRadius: 2,
  },
  lockInfo: {
    flex: 1,
  },
  lockType: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  lockQuantity: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  lockDates: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  actionsSection: {
    gap: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '15',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
});
