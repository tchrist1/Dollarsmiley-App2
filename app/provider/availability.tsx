import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import AvailabilityManager from '@/components/AvailabilityManager';
import { theme } from '@/constants/theme';
import { useRouter } from 'expo-router';

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

export default function ProviderAvailabilityScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.user_type !== 'Provider' && profile?.user_type !== 'Hybrid') {
      Alert.alert('Access Denied', 'Only providers can manage availability');
      router.back();
      return;
    }
    setLoading(false);
  }, [profile]);

  const handleSaveRecurring = async (schedules: RecurringSchedule[]) => {
    if (!profile) return;

    setSaving(true);
    try {
      await supabase
        .from('provider_availability')
        .delete()
        .eq('provider_id', profile.id)
        .eq('is_recurring', true);

      const records = schedules.flatMap((schedule) =>
        schedule.slots.map((slot) => ({
          provider_id: profile.id,
          availability_type: 'Available',
          day_of_week: schedule.dayOfWeek,
          start_time: slot.start,
          end_time: slot.end,
          is_recurring: true,
        }))
      );

      if (records.length > 0) {
        const { error } = await supabase.from('provider_availability').insert(records);

        if (error) throw error;
      }

      Alert.alert('Success', 'Weekly schedule saved successfully!');
    } catch (error: any) {
      console.error('Error saving recurring schedule:', error);
      Alert.alert('Error', error.message || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBlocks = async (blocks: DateBlock[]) => {
    if (!profile) return;

    setSaving(true);
    try {
      await supabase
        .from('provider_availability')
        .delete()
        .eq('provider_id', profile.id)
        .eq('is_recurring', false)
        .eq('availability_type', 'Blocked');

      const records = blocks.map((block) => ({
        provider_id: profile.id,
        availability_type: 'Blocked',
        start_date: block.startDate,
        end_date: block.endDate,
        start_time: '00:00:00',
        end_time: '23:59:59',
        is_recurring: false,
        notes: block.reason,
      }));

      if (records.length > 0) {
        const { error } = await supabase.from('provider_availability').insert(records);

        if (error) throw error;
      }

      Alert.alert('Success', 'Blocked dates saved successfully!');
    } catch (error: any) {
      console.error('Error saving blocked dates:', error);
      Alert.alert('Error', error.message || 'Failed to save blocked dates');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.savingText}>Saving...</Text>
        </View>
      )}
      <AvailabilityManager
        onSaveRecurring={handleSaveRecurring}
        onSaveBlocks={handleSaveBlocks}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  savingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
  },
});
