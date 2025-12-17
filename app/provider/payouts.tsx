import React from 'react';
import { View, StyleSheet } from 'react-native';
import PayoutScheduleDashboard from '@/components/PayoutScheduleDashboard';
import { colors } from '@/constants/theme';

export default function ProviderPayoutsScreen() {
  return (
    <View style={styles.container}>
      <PayoutScheduleDashboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
