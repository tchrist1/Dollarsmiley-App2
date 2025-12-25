import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Box,
  Clock,
  TrendingUp,
  AlertCircle,
} from 'lucide-react-native';
import { colors } from '@/constants/theme';
import {
  getProviderInventoryItems,
  getInventoryStats,
  getInventoryAlerts,
  getUpcomingPickupsAndReturns,
  formatInventoryStatus,
  ProviderInventoryItem,
  InventoryAlert,
  InventoryLock,
} from '@/lib/inventory-locking';

interface InventoryDashboardProps {
  providerId: string;
  onViewInventory?: () => void;
  onViewCalendar?: () => void;
  onViewItem?: (itemId: string) => void;
  onViewAlerts?: () => void;
}

interface Stats {
  totalItems: number;
  totalQuantity: number;
  totalAvailable: number;
  activeRentals: number;
  activeLocks: number;
  lowStockItems: number;
  outOfStockItems: number;
}

export default function InventoryDashboard({
  providerId,
  onViewInventory,
  onViewCalendar,
  onViewItem,
  onViewAlerts,
}: InventoryDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [items, setItems] = useState<ProviderInventoryItem[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [pickups, setPickups] = useState<Array<{ lock: InventoryLock; itemName: string }>>([]);
  const [returns, setReturns] = useState<Array<{ lock: InventoryLock; itemName: string }>>([]);

  const loadData = useCallback(async () => {
    try {
      const [statsData, itemsData, alertsData, upcomingData] = await Promise.all([
        getInventoryStats(providerId),
        getProviderInventoryItems(providerId),
        getInventoryAlerts(providerId),
        getUpcomingPickupsAndReturns(providerId, 7),
      ]);

      setStats(statsData);
      setItems(itemsData.slice(0, 5));
      setAlerts(alertsData.slice(0, 3));
      setPickups(upcomingData.pickups.slice(0, 3));
      setReturns(upcomingData.returns.slice(0, 3));
    } catch (error) {
      console.error('Error loading inventory dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [providerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.primary + '20' }]}>
            <Package size={20} color={colors.primary} />
          </View>
          <Text style={styles.statValue}>{stats?.totalItems || 0}</Text>
          <Text style={styles.statLabel}>Items</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#10B98120' }]}>
            <Box size={20} color="#10B981" />
          </View>
          <Text style={styles.statValue}>{stats?.totalAvailable || 0}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#3B82F620' }]}>
            <Clock size={20} color="#3B82F6" />
          </View>
          <Text style={styles.statValue}>{stats?.activeRentals || 0}</Text>
          <Text style={styles.statLabel}>Active Rentals</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#F59E0B20' }]}>
            <AlertTriangle size={20} color="#F59E0B" />
          </View>
          <Text style={styles.statValue}>{stats?.lowStockItems || 0}</Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
      </View>

      {alerts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Alerts</Text>
            {onViewAlerts && (
              <TouchableOpacity onPress={onViewAlerts}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>
          {alerts.map((alert) => (
            <View
              key={alert.id}
              style={[
                styles.alertCard,
                alert.alert_type === 'out_of_stock' && styles.alertCardCritical,
              ]}
            >
              <AlertCircle
                size={18}
                color={alert.alert_type === 'out_of_stock' ? '#EF4444' : '#F59E0B'}
              />
              <Text style={styles.alertText} numberOfLines={2}>
                {alert.message}
              </Text>
            </View>
          ))}
        </View>
      )}

      {(pickups.length > 0 || returns.length > 0) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            {onViewCalendar && (
              <TouchableOpacity onPress={onViewCalendar}>
                <Text style={styles.viewAllText}>Calendar</Text>
              </TouchableOpacity>
            )}
          </View>

          {pickups.map((pickup, index) => (
            <View key={`pickup-${index}`} style={styles.upcomingCard}>
              <View style={[styles.upcomingIcon, { backgroundColor: '#10B98120' }]}>
                <ArrowUpRight size={16} color="#10B981" />
              </View>
              <View style={styles.upcomingInfo}>
                <Text style={styles.upcomingTitle}>{pickup.itemName}</Text>
                <Text style={styles.upcomingTime}>
                  Pickup: {new Date(pickup.lock.pickup_at!).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}

          {returns.map((ret, index) => (
            <View key={`return-${index}`} style={styles.upcomingCard}>
              <View style={[styles.upcomingIcon, { backgroundColor: '#3B82F620' }]}>
                <ArrowDownLeft size={16} color="#3B82F6" />
              </View>
              <View style={styles.upcomingInfo}>
                <Text style={styles.upcomingTitle}>{ret.itemName}</Text>
                <Text style={styles.upcomingTime}>
                  Return: {new Date(ret.lock.dropoff_at!).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Inventory Items</Text>
          {onViewInventory && (
            <TouchableOpacity onPress={onViewInventory}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={40} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No inventory items yet</Text>
            {onViewInventory && (
              <TouchableOpacity style={styles.addButton} onPress={onViewInventory}>
                <Text style={styles.addButtonText}>Add Inventory</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          items.map((item) => {
            const available = item.total_quantity - item.buffer_quantity;
            const status = formatInventoryStatus(
              available,
              item.total_quantity,
              item.low_stock_threshold
            );

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.itemCard}
                onPress={() => onViewItem?.(item.id)}
              >
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQuantity}>
                    {available} / {item.total_quantity} available
                  </Text>
                </View>
                <View style={styles.itemStatus}>
                  {item.is_rentable && (
                    <View style={styles.rentableBadge}>
                      <Clock size={12} color="#3B82F6" />
                      <Text style={styles.rentableText}>Rental</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: status.color + '20' },
                    ]}
                  >
                    <Text style={[styles.statusText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <View style={styles.actionsRow}>
        {onViewInventory && (
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryAction]}
            onPress={onViewInventory}
          >
            <Package size={18} color="#fff" />
            <Text style={styles.primaryActionText}>Manage Inventory</Text>
          </TouchableOpacity>
        )}
        {onViewCalendar && (
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryAction]}
            onPress={onViewCalendar}
          >
            <TrendingUp size={18} color={colors.primary} />
            <Text style={styles.secondaryActionText}>View Calendar</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
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
  section: {
    marginBottom: 24,
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
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B10',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  alertCardCritical: {
    backgroundColor: '#EF444410',
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  upcomingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  upcomingTime: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  itemStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rentableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F610',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  rentableText: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 12,
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryAction: {
    backgroundColor: colors.primary,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryAction: {
    backgroundColor: colors.primary + '15',
  },
  secondaryActionText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
