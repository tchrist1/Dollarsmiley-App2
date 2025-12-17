import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import RecurringBookingDetails from '@/components/RecurringBookingDetails';
import { cancelRecurringBooking } from '@/lib/recurring-bookings';
import { supabase } from '@/lib/supabase';
import { colors } from '@/constants/theme';

export default function RecurringBookingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const handlePause = async () => {
    try {
      const { error } = await supabase
        .from('recurring_bookings')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      Alert.alert('Success', 'Recurring booking paused successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error pausing recurring booking:', error);
      Alert.alert('Error', 'Failed to pause recurring booking');
    }
  };

  const handleResume = async () => {
    try {
      const { error } = await supabase
        .from('recurring_bookings')
        .update({ is_active: true })
        .eq('id', id);

      if (error) throw error;

      Alert.alert('Success', 'Recurring booking resumed successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error resuming recurring booking:', error);
      Alert.alert('Error', 'Failed to resume recurring booking');
    }
  };

  const handleCancel = async () => {
    try {
      const success = await cancelRecurringBooking(id);

      if (success) {
        Alert.alert(
          'Success',
          'Recurring booking stopped. No future bookings will be created.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', 'Failed to stop recurring booking');
      }
    } catch (error) {
      console.error('Error cancelling recurring booking:', error);
      Alert.alert('Error', 'Failed to stop recurring booking');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Recurring Booking',
          headerShown: true,
        }}
      />

      <View style={styles.container}>
        <RecurringBookingDetails
          recurringId={id}
          onPause={handlePause}
          onResume={handleResume}
          onCancel={handleCancel}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});
