import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import InventoryCalendarView from '@/components/InventoryCalendarView';

export default function InventoryCalendarScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  if (!profile?.id) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Inventory Calendar' }} />
      <View style={styles.container}>
        <InventoryCalendarView
          providerId={profile.id}
          onSelectItem={(itemId) => itemId && router.push(`/provider/inventory/${itemId}`)}
          onViewBooking={(bookingId) => router.push(`/booking/${bookingId}`)}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
