import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Plus, Trash2, Calendar as CalendarIcon, Clock, X } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { DatePicker } from '@/components/DatePicker';
import { Input } from '@/components/Input';

interface BlockedDate {
  id: string;
  exception_date: string;
  exception_type: string;
  start_time?: string;
  end_time?: string;
  reason?: string;
  created_at: string;
}

interface BlockedDatesManagerProps {
  providerId: string;
  onUpdate?: () => void;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const period = hour < 12 ? 'AM' : 'PM';
  return {
    value: `${hour.toString().padStart(2, '0')}:${minute}:00`,
    label: `${hour12}:${minute} ${period}`,
  };
});

const BLOCK_REASONS = [
  'Holiday',
  'Vacation',
  'Sick Day',
  'Personal Appointment',
  'Family Emergency',
  'Training/Conference',
  'Maintenance',
  'Other',
];

export function BlockedDatesManager({ providerId, onUpdate }: BlockedDatesManagerProps) {
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [blockType, setBlockType] = useState<'full_day' | 'time_range'>('full_day');
  const [startTime, setStartTime] = useState('09:00:00');
  const [endTime, setEndTime] = useState('17:00:00');
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    loadBlockedDates();
  }, [providerId]);

  const loadBlockedDates = async () => {
    try {
      const { data, error } = await supabase
        .from('availability_exceptions')
        .select('*')
        .eq('provider_id', providerId)
        .eq('exception_type', 'Unavailable')
        .gte('exception_date', new Date().toISOString().split('T')[0])
        .order('exception_date', { ascending: true });

      if (error) throw error;

      setBlockedDates((data as BlockedDate[]) || []);
    } catch (error) {
      console.error('Error loading blocked dates:', error);
      Alert.alert('Error', 'Failed to load blocked dates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addBlockedDate = async () => {
    if (!selectedDate) {
      Alert.alert('Error', 'Please select a date.');
      return;
    }

    const finalReason = reason === 'Other' ? customReason : reason;

    if (!finalReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for blocking this date.');
      return;
    }

    const formattedDate = selectedDate.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    if (formattedDate < today) {
      Alert.alert('Error', 'Cannot block dates in the past.');
      return;
    }

    setSaving(true);

    try {
      const blockData: any = {
        provider_id: providerId,
        exception_date: formattedDate,
        exception_type: 'Unavailable',
        reason: finalReason,
      };

      if (blockType === 'time_range') {
        if (startTime >= endTime) {
          Alert.alert('Error', 'End time must be after start time.');
          setSaving(false);
          return;
        }
        blockData.start_time = startTime;
        blockData.end_time = endTime;
      }

      const { error } = await supabase.from('availability_exceptions').insert(blockData);

      if (error) throw error;

      Alert.alert('Success', 'Date blocked successfully!');
      setShowAddModal(false);
      resetForm();
      loadBlockedDates();
      onUpdate?.();
    } catch (error) {
      console.error('Error blocking date:', error);
      Alert.alert('Error', 'Failed to block date. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const removeBlockedDate = async (blockId: string) => {
    Alert.alert('Remove Block', 'Are you sure you want to remove this block?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('availability_exceptions')
              .delete()
              .eq('id', blockId);

            if (error) throw error;

            Alert.alert('Success', 'Block removed successfully!');
            loadBlockedDates();
            onUpdate?.();
          } catch (error) {
            console.error('Error removing block:', error);
            Alert.alert('Error', 'Failed to remove block. Please try again.');
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setSelectedDate(new Date());
    setBlockType('full_day');
    setStartTime('09:00:00');
    setEndTime('17:00:00');
    setReason('');
    setCustomReason('');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const time = TIME_OPTIONS.find((t) => t.value === timeStr);
    return time ? time.label : timeStr;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading blocked dates...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Blocked Dates</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Plus size={20} color={colors.white} />
          <Text style={styles.addButtonText}>Block Date</Text>
        </TouchableOpacity>
      </View>

      {blockedDates.length === 0 ? (
        <View style={styles.emptyState}>
          <CalendarIcon size={48} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Blocked Dates</Text>
          <Text style={styles.emptyText}>
            Block out dates when you're unavailable to accept bookings
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {blockedDates.map((block) => (
            <View key={block.id} style={styles.blockCard}>
              <View style={styles.blockHeader}>
                <View style={styles.blockIcon}>
                  <CalendarIcon size={20} color={colors.error} />
                </View>
                <View style={styles.blockInfo}>
                  <Text style={styles.blockDate}>{formatDate(block.exception_date)}</Text>
                  {block.start_time && block.end_time ? (
                    <View style={styles.timeRow}>
                      <Clock size={14} color={colors.textSecondary} />
                      <Text style={styles.timeText}>
                        {formatTime(block.start_time)} - {formatTime(block.end_time)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.fullDayText}>Full Day</Text>
                  )}
                  {block.reason && (
                    <Text style={styles.reasonText}>{block.reason}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => removeBlockedDate(block.id)}
                >
                  <Trash2 size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Block Date</Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.section}>
                <Text style={styles.label}>Select Date</Text>
                <DatePicker
                  value={selectedDate}
                  onChange={setSelectedDate}
                  minimumDate={new Date()}
                  placeholder="Select date"
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Block Type</Text>
                <View style={styles.blockTypeRow}>
                  <TouchableOpacity
                    style={[
                      styles.blockTypeButton,
                      blockType === 'full_day' && styles.blockTypeButtonActive,
                    ]}
                    onPress={() => setBlockType('full_day')}
                  >
                    <Text
                      style={[
                        styles.blockTypeText,
                        blockType === 'full_day' && styles.blockTypeTextActive,
                      ]}
                    >
                      Full Day
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.blockTypeButton,
                      blockType === 'time_range' && styles.blockTypeButtonActive,
                    ]}
                    onPress={() => setBlockType('time_range')}
                  >
                    <Text
                      style={[
                        styles.blockTypeText,
                        blockType === 'time_range' && styles.blockTypeTextActive,
                      ]}
                    >
                      Time Range
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {blockType === 'time_range' && (
                <View style={styles.section}>
                  <Text style={styles.label}>Time Range</Text>
                  <View style={styles.timeRow}>
                    <View style={styles.timeInputContainer}>
                      <Text style={styles.timeInputLabel}>Start</Text>
                      <TouchableOpacity
                        style={styles.timeInput}
                        onPress={() => {
                          Alert.alert(
                            'Select Start Time',
                            '',
                            TIME_OPTIONS.map((time) => ({
                              text: time.label,
                              onPress: () => setStartTime(time.value),
                            }))
                          );
                        }}
                      >
                        <Clock size={16} color={colors.textSecondary} />
                        <Text style={styles.timeValue}>{formatTime(startTime)}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.timeInputContainer}>
                      <Text style={styles.timeInputLabel}>End</Text>
                      <TouchableOpacity
                        style={styles.timeInput}
                        onPress={() => {
                          Alert.alert(
                            'Select End Time',
                            '',
                            TIME_OPTIONS.map((time) => ({
                              text: time.label,
                              onPress: () => setEndTime(time.value),
                            }))
                          );
                        }}
                      >
                        <Clock size={16} color={colors.textSecondary} />
                        <Text style={styles.timeValue}>{formatTime(endTime)}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.label}>Reason</Text>
                <View style={styles.reasonGrid}>
                  {BLOCK_REASONS.map((reasonOption) => (
                    <TouchableOpacity
                      key={reasonOption}
                      style={[
                        styles.reasonChip,
                        reason === reasonOption && styles.reasonChipActive,
                      ]}
                      onPress={() => setReason(reasonOption)}
                    >
                      <Text
                        style={[
                          styles.reasonChipText,
                          reason === reasonOption && styles.reasonChipTextActive,
                        ]}
                      >
                        {reasonOption}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {reason === 'Other' && (
                  <Input
                    placeholder="Enter custom reason"
                    value={customReason}
                    onChangeText={setCustomReason}
                    style={styles.customReasonInput}
                  />
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                onPress={() => setShowAddModal(false)}
                variant="outline"
                style={styles.modalButton}
              />
              <Button
                title={saving ? 'Blocking...' : 'Block Date'}
                onPress={addBlockedDate}
                loading={saving}
                style={styles.modalButton}
              />
            </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  blockCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  blockIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  blockInfo: {
    flex: 1,
  },
  blockDate: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  timeText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  fullDayText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: fontWeight.medium,
    marginBottom: spacing.xs,
  },
  reasonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  deleteButton: {
    padding: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    padding: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  blockTypeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  blockTypeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  blockTypeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  blockTypeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  blockTypeTextActive: {
    color: colors.primary,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeInputLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reasonChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  reasonChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  reasonChipText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  reasonChipTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  customReasonInput: {
    marginTop: spacing.md,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  modalButton: {
    flex: 1,
    marginBottom: 0,
  },
});
