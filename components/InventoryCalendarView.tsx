import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  Package,
  Clock,
  X,
  Lock,
  Unlock,
} from 'lucide-react-native';
import { colors } from '@/constants/theme';
import {
  getInventoryCalendar,
  getProviderInventoryItems,
  ProviderInventoryItem,
} from '@/lib/inventory-locking';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface InventoryCalendarViewProps {
  providerId: string;
  selectedItemId?: string;
  onSelectItem?: (itemId: string | null) => void;
  onViewBooking?: (bookingId: string) => void;
}

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

interface CalendarItem {
  id: string;
  name: string;
  total_quantity: number;
  buffer_quantity: number;
  is_rentable: boolean;
  turnaround_buffer_hours: number;
  available_now: number;
}

export default function InventoryCalendarView({
  providerId,
  selectedItemId,
  onSelectItem,
  onViewBooking,
}: InventoryCalendarViewProps) {
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [locks, setLocks] = useState<CalendarLock[]>([]);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [allItems, setAllItems] = useState<ProviderInventoryItem[]>([]);
  const [selectedLock, setSelectedLock] = useState<CalendarLock | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);

  const startDate = useMemo(() => {
    const date = new Date(currentDate);
    date.setDate(date.getDate() - date.getDay());
    return date;
  }, [currentDate]);

  const endDate = useMemo(() => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + 27);
    return date;
  }, [startDate]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [calendarData, itemsData] = await Promise.all([
        getInventoryCalendar(
          providerId,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0],
          selectedItemId
        ),
        getProviderInventoryItems(providerId),
      ]);

      setLocks(calendarData.locks);
      setItems(calendarData.items);
      setAllItems(itemsData);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  }, [providerId, startDate, endDate, selectedItemId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setCurrentDate(newDate);
  };

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    let currentWeek: Date[] = [];

    for (let i = 0; i < 28; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      currentWeek.push(date);

      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    }

    return result;
  }, [startDate]);

  const getLocksForDate = useCallback(
    (date: Date): CalendarLock[] => {
      const dateStr = date.toISOString().split('T')[0];
      return locks.filter((lock) => {
        if (!lock.pickup_at) return false;

        const pickupDate = lock.pickup_at.split('T')[0];
        const dropoffDate = (lock.dropoff_at_effective || lock.dropoff_at)?.split('T')[0];

        return pickupDate <= dateStr && (!dropoffDate || dropoffDate >= dateStr);
      });
    },
    [locks]
  );

  const handleLockPress = (lock: CalendarLock) => {
    setSelectedLock(lock);
    setShowLockModal(true);
  };

  const formatDateHeader = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateWeek(-1)}
        >
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{formatDateHeader(currentDate)}</Text>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateWeek(1)}
        >
          <ChevronRight size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {allItems.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterBar}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              !selectedItemId && styles.filterChipActive,
            ]}
            onPress={() => onSelectItem?.(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                !selectedItemId && styles.filterChipTextActive,
              ]}
            >
              All Items
            </Text>
          </TouchableOpacity>
          {allItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.filterChip,
                selectedItemId === item.id && styles.filterChipActive,
              ]}
              onPress={() => onSelectItem?.(item.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedItemId === item.id && styles.filterChipTextActive,
                ]}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.dayHeaders}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <Text key={day} style={styles.dayHeader}>
            {day}
          </Text>
        ))}
      </View>

      <ScrollView style={styles.calendarScroll} showsVerticalScrollIndicator={false}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((date, dayIndex) => {
              const dayLocks = getLocksForDate(date);
              const today = isToday(date);

              return (
                <View
                  key={dayIndex}
                  style={[styles.dayCell, today && styles.dayCellToday]}
                >
                  <Text
                    style={[styles.dateNumber, today && styles.dateNumberToday]}
                  >
                    {date.getDate()}
                  </Text>
                  <View style={styles.locksContainer}>
                    {dayLocks.slice(0, 2).map((lock) => (
                      <TouchableOpacity
                        key={lock.id}
                        style={[
                          styles.lockBar,
                          lock.lock_type === 'soft'
                            ? styles.lockBarSoft
                            : styles.lockBarHard,
                        ]}
                        onPress={() => handleLockPress(lock)}
                      >
                        <Text style={styles.lockBarText} numberOfLines={1}>
                          {lock.inventory_item_name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {dayLocks.length > 2 && (
                      <Text style={styles.moreText}>+{dayLocks.length - 2}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.lockBarHard]} />
          <Text style={styles.legendText}>Confirmed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.lockBarSoft]} />
          <Text style={styles.legendText}>Pending</Text>
        </View>
      </View>

      <Modal
        visible={showLockModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLockModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lock Details</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setShowLockModal(false)}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedLock && (
              <View style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Package size={18} color={colors.textSecondary} />
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailLabel}>Item</Text>
                    <Text style={styles.detailValue}>
                      {selectedLock.inventory_item_name}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  {selectedLock.lock_type === 'hard' ? (
                    <Lock size={18} color="#10B981" />
                  ) : (
                    <Unlock size={18} color="#F59E0B" />
                  )}
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailLabel}>Lock Type</Text>
                    <Text style={styles.detailValue}>
                      {selectedLock.lock_type === 'hard' ? 'Confirmed' : 'Pending'}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailRow}>
                  <Clock size={18} color={colors.textSecondary} />
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailLabel}>Quantity</Text>
                    <Text style={styles.detailValue}>{selectedLock.quantity}</Text>
                  </View>
                </View>

                {selectedLock.pickup_at && (
                  <View style={styles.detailRow}>
                    <Clock size={18} color={colors.textSecondary} />
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailLabel}>Pickup</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedLock.pickup_at).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                )}

                {selectedLock.dropoff_at && (
                  <View style={styles.detailRow}>
                    <Clock size={18} color={colors.textSecondary} />
                    <View style={styles.detailInfo}>
                      <Text style={styles.detailLabel}>Return</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedLock.dropoff_at).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                )}

                {selectedLock.dropoff_at_effective &&
                  selectedLock.dropoff_at_effective !== selectedLock.dropoff_at && (
                    <View style={styles.bufferNote}>
                      <Text style={styles.bufferNoteText}>
                        Includes turnaround buffer until{' '}
                        {new Date(selectedLock.dropoff_at_effective).toLocaleString()}
                      </Text>
                    </View>
                  )}

                {selectedLock.booking_id && onViewBooking && (
                  <TouchableOpacity
                    style={styles.viewBookingButton}
                    onPress={() => {
                      setShowLockModal(false);
                      onViewBooking(selectedLock.booking_id!);
                    }}
                  >
                    <Text style={styles.viewBookingButtonText}>View Booking</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  filterBar: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  dayHeaders: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  calendarScroll: {
    flex: 1,
  },
  weekRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayCell: {
    flex: 1,
    minHeight: 80,
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  dayCellToday: {
    backgroundColor: colors.primary + '10',
  },
  dateNumber: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  dateNumberToday: {
    color: colors.primary,
    fontWeight: '700',
  },
  locksContainer: {
    flex: 1,
    gap: 2,
  },
  lockBar: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lockBarHard: {
    backgroundColor: '#10B981',
  },
  lockBarSoft: {
    backgroundColor: '#F59E0B',
  },
  lockBarText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '500',
  },
  moreText: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalClose: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  bufferNote: {
    backgroundColor: colors.primary + '10',
    padding: 12,
    borderRadius: 8,
  },
  bufferNoteText: {
    fontSize: 13,
    color: colors.primary,
  },
  viewBookingButton: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  viewBookingButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
