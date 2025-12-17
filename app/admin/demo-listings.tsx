import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AdminDemoListingsManager } from '@/components/AdminDemoListingsManager';
import { colors } from '@/constants/theme';

export default function AdminDemoListingsScreen() {
  return (
    <View style={styles.container}>
      <AdminDemoListingsManager />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
