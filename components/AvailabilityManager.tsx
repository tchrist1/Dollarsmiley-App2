import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import { useState } from 'react';
import { Calendar, Clock, X, Plus, Trash2 } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import Button from './Button';

interface TimeSlot {
  start: string;
  end: string;
}

interface RecurringSchedule {
  dayOfWeek: number;
  slots: TimeSlot[];
}

interface DateBlock {
  startDate: string;
  endDate: string;
  reason: string;
}

interface AvailabilityManagerProps {
  onSaveRecurring: (schedules: RecurringSchedule[]) => void;
  onSaveBlocks: (blocks: DateBlock[]) => void;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return {
    value: `${hour.toString().padStart(2, '0')}:${minute}:00`,
    label: `${displayHour}:${minute} ${period}`,
  };
});

export default function AvailabilityManager({
  onSaveRecurring,
  onSaveBlocks,
}: AvailabilityManagerProps) {
  const [activeTab, setActiveTab] = useState<'recurring' | 'blocks'>('recurring');
  const [recurringSchedules, setRecurringSchedules] = useState<RecurringSchedule[]>([]);
  const [dateBlocks, setDateBlocks] = useState<DateBlock[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([{ start: '09:00:00', end: '17:00:00' }]);

  const [blockStartDate, setBlockStartDate] = useState('');
  const [blockEndDate, setBlockEndDate] = useState('');
  const [blockReason, setBlockReason] = useState('');

  const handleAddTimeSlot = () => {
    setTimeSlots([...timeSlots, { start: '09:00:00', end: '17:00:00' }]);
  };

  const handleRemoveTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index));
  };

  const handleUpdateTimeSlot = (index: number, field: 'start' | 'end', value: string) => {
    const updated = [...timeSlots];
    updated[index][field] = value;
    setTimeSlots(updated);
  };

  const handleSaveRecurringDay = () => {
    if (selectedDay === null) return;

    const newSchedule: RecurringSchedule = {
      dayOfWeek: selectedDay,
      slots: timeSlots,
    };

    const existing = recurringSchedules.filter((s) => s.dayOfWeek !== selectedDay);
    setRecurringSchedules([...existing, newSchedule]);
    setModalVisible(false);
    setSelectedDay(null);
    setTimeSlots([{ start: '09:00:00', end: '17:00:00' }]);
  };

  const handleRemoveRecurringDay = (dayOfWeek: number) => {
    setRecurringSchedules(recurringSchedules.filter((s) => s.dayOfWeek !== dayOfWeek));
  };

  const handleAddDateBlock = () => {
    if (!blockStartDate || !blockEndDate) {
      alert('Please select start and end dates');
      return;
    }

    const newBlock: DateBlock = {
      startDate: blockStartDate,
      endDate: blockEndDate,
      reason: blockReason || 'Unavailable',
    };

    setDateBlocks([...dateBlocks, newBlock]);
    setBlockModalVisible(false);
    setBlockStartDate('');
    setBlockEndDate('');
    setBlockReason('');
  };

  const handleRemoveDateBlock = (index: number) => {
    setDateBlocks(dateBlocks.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (activeTab === 'recurring') {
      onSaveRecurring(recurringSchedules);
    } else {
      onSaveBlocks(dateBlocks);
    }
  };

  const getDaySchedule = (dayOfWeek: number) => {
    return recurringSchedules.find((s) => s.dayOfWeek === dayOfWeek);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recurring' && styles.tabActive]}
          onPress={() => setActiveTab('recurring')}
        >
          <Text style={[styles.tabText, activeTab === 'recurring' && styles.tabTextActive]}>
            Weekly Schedule
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'blocks' && styles.tabActive]}
          onPress={() => setActiveTab('blocks')}
        >
          <Text style={[styles.tabText, activeTab === 'blocks' && styles.tabTextActive]}>
            Blocked Dates
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'recurring' ? (
          <View>
            <Text style={styles.description}>
              Set your regular weekly availability. These hours will repeat every week.
            </Text>

            {DAYS_OF_WEEK.map((day) => {
              const schedule = getDaySchedule(day.value);
              return (
                <View key={day.value} style={styles.dayCard}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayLabel}>{day.label}</Text>
                    {schedule ? (
                      <TouchableOpacity
                        onPress={() => handleRemoveRecurringDay(day.value)}
                        style={styles.removeButton}
                      >
                        <Trash2 size={18} color={theme.colors.error} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedDay(day.value);
                          setModalVisible(true);
                        }}
                        style={styles.addButton}
                      >
                        <Plus size={18} color={theme.colors.primary} />
                        <Text style={styles.addButtonText}>Add Hours</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {schedule && (
                    <View style={styles.slotsContainer}>
                      {schedule.slots.map((slot, index) => (
                        <View key={index} style={styles.slotChip}>
                          <Clock size={14} color={theme.colors.primary} />
                          <Text style={styles.slotText}>
                            {formatTime(slot.start)} - {formatTime(slot.end)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View>
            <Text style={styles.description}>
              Block off specific dates when you're unavailable (vacation, holidays, etc.)
            </Text>

            <TouchableOpacity
              style={styles.addBlockButton}
              onPress={() => setBlockModalVisible(true)}
            >
              <Plus size={20} color={theme.colors.primary} />
              <Text style={styles.addBlockButtonText}>Add Blocked Dates</Text>
            </TouchableOpacity>

            {dateBlocks.map((block, index) => (
              <View key={index} style={styles.blockCard}>
                <View style={styles.blockInfo}>
                  <Calendar size={20} color={theme.colors.primary} />
                  <View style={styles.blockDates}>
                    <Text style={styles.blockDateText}>
                      {new Date(block.startDate).toLocaleDateString()} -{' '}
                      {new Date(block.endDate).toLocaleDateString()}
                    </Text>
                    <Text style={styles.blockReason}>{block.reason}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleRemoveDateBlock(index)}>
                  <Trash2 size={20} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Save Availability" onPress={handleSave} />
      </View>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Set Hours for {selectedDay !== null ? DAYS_OF_WEEK[selectedDay].label : ''}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {timeSlots.map((slot, index) => (
                <View key={index} style={styles.timeSlotRow}>
                  <View style={styles.timeInputs}>
                    <View style={styles.timeInputContainer}>
                      <Text style={styles.timeLabel}>Start</Text>
                      <View style={styles.timePicker}>
                        <Text style={styles.timeValue}>{formatTime(slot.start)}</Text>
                      </View>
                    </View>
                    <Text style={styles.timeSeparator}>to</Text>
                    <View style={styles.timeInputContainer}>
                      <Text style={styles.timeLabel}>End</Text>
                      <View style={styles.timePicker}>
                        <Text style={styles.timeValue}>{formatTime(slot.end)}</Text>
                      </View>
                    </View>
                  </View>
                  {timeSlots.length > 1 && (
                    <TouchableOpacity onPress={() => handleRemoveTimeSlot(index)}>
                      <Trash2 size={20} color={theme.colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <TouchableOpacity style={styles.addSlotButton} onPress={handleAddTimeSlot}>
                <Plus size={18} color={theme.colors.primary} />
                <Text style={styles.addSlotButtonText}>Add Time Slot</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button title="Save" onPress={handleSaveRecurringDay} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={blockModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Block Dates</Text>
              <TouchableOpacity onPress={() => setBlockModalVisible(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Start Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={blockStartDate}
                  onChangeText={setBlockStartDate}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>End Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={blockEndDate}
                  onChangeText={setBlockEndDate}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Reason (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Vacation, Holiday, etc."
                  value={blockReason}
                  onChangeText={setBlockReason}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Button title="Add Block" onPress={handleAddDateBlock} />
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
    backgroundColor: '#f8f9fa',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textLight,
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginBottom: 20,
    lineHeight: 20,
  },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  removeButton: {
    padding: 4,
  },
  slotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  slotText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  addBlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  addBlockButtonText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  blockCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  blockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  blockDates: {
    flex: 1,
  },
  blockDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  blockReason: {
    fontSize: 13,
    color: theme.colors.textLight,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  modalBody: {
    padding: 20,
  },
  timeSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  timePicker: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
  },
  timeValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  timeSeparator: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginTop: 20,
  },
  addSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    marginTop: 8,
  },
  addSlotButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: '#fff',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
