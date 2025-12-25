import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Plus,
  Package,
  Search,
  Clock,
  AlertTriangle,
  MoreVertical,
  Edit,
  Trash2,
  Calendar,
} from 'lucide-react-native';
import { colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  getProviderInventoryItems,
  getAvailableInventoryCount,
  deleteInventoryItem,
  formatInventoryStatus,
  ProviderInventoryItem,
} from '@/lib/inventory-locking';

export default function ProviderInventoryScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ProviderInventoryItem[]>([]);
  const [availabilities, setAvailabilities] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;

    try {
      const itemsData = await getProviderInventoryItems(profile.id);
      setItems(itemsData);

      const availabilityPromises = itemsData.map(async (item) => {
        const available = await getAvailableInventoryCount(item.id);
        return { id: item.id, available };
      });

      const results = await Promise.all(availabilityPromises);
      const availabilityMap: Record<string, number> = {};
      results.forEach((r) => {
        availabilityMap[r.id] = r.available;
      });
      setAvailabilities(availabilityMap);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleDeleteItem = async (itemId: string) => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm(
        'Are you sure you want to delete this inventory item?'
      );
      if (!confirm) return;
    } else {
      Alert.alert(
        'Delete Item',
        'Are you sure you want to delete this inventory item?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await performDelete(itemId);
            },
          },
        ]
      );
      return;
    }

    await performDelete(itemId);
  };

  const performDelete = async (itemId: string) => {
    const success = await deleteInventoryItem(itemId);
    if (success) {
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      setSelectedItem(null);
    }
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Inventory',
          headerRight: () => (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.push('/provider/inventory/calendar')}
            >
              <Calendar size={22} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search inventory..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Package size={48} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No Inventory Items</Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'No items match your search'
                  : 'Add inventory items to track stock and rentals'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => router.push('/provider/inventory/create')}
                >
                  <Plus size={18} color="#fff" />
                  <Text style={styles.emptyButtonText}>Add Item</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredItems.map((item) => {
              const available = availabilities[item.id] ?? 0;
              const status = formatInventoryStatus(
                available,
                item.total_quantity,
                item.low_stock_threshold
              );
              const isSelected = selectedItem === item.id;

              return (
                <View key={item.id}>
                  <TouchableOpacity
                    style={styles.itemCard}
                    onPress={() =>
                      router.push(`/provider/inventory/${item.id}`)
                    }
                    onLongPress={() =>
                      setSelectedItem(isSelected ? null : item.id)
                    }
                  >
                    <View style={styles.itemIcon}>
                      <Package size={24} color={colors.primary} />
                    </View>
                    <View style={styles.itemInfo}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        {item.is_rentable && (
                          <View style={styles.rentableBadge}>
                            <Clock size={12} color="#3B82F6" />
                            <Text style={styles.rentableText}>Rental</Text>
                          </View>
                        )}
                      </View>
                      {item.sku && (
                        <Text style={styles.itemSku}>SKU: {item.sku}</Text>
                      )}
                      <View style={styles.itemStats}>
                        <Text style={styles.itemQuantity}>
                          {available} / {item.total_quantity} available
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: status.color + '20' },
                          ]}
                        >
                          {status.status !== 'available' && (
                            <AlertTriangle size={12} color={status.color} />
                          )}
                          <Text
                            style={[styles.statusText, { color: status.color }]}
                          >
                            {status.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.moreButton}
                      onPress={() =>
                        setSelectedItem(isSelected ? null : item.id)
                      }
                    >
                      <MoreVertical size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </TouchableOpacity>

                  {isSelected && (
                    <View style={styles.actionsMenu}>
                      <TouchableOpacity
                        style={styles.actionItem}
                        onPress={() => {
                          setSelectedItem(null);
                          router.push(`/provider/inventory/${item.id}/edit`);
                        }}
                      >
                        <Edit size={18} color={colors.text} />
                        <Text style={styles.actionText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionItem}
                        onPress={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 size={18} color="#EF4444" />
                        <Text style={[styles.actionText, { color: '#EF4444' }]}>
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/provider/inventory/create')}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  headerButton: {
    padding: 8,
    marginRight: 8,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  rentableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F610',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  rentableText: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '500',
  },
  itemSku: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  itemStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemQuantity: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  moreButton: {
    padding: 8,
  },
  actionsMenu: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    marginTop: -6,
    marginBottom: 10,
    marginHorizontal: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionText: {
    fontSize: 15,
    color: colors.text,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
});
