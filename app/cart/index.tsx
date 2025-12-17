import React from 'react';
import { View, StyleSheet } from 'react-native';
import CartSummary from '@/components/CartSummary';
import { colors } from '@/constants/theme';

export default function CartScreen() {
  return (
    <View style={styles.container}>
      <CartSummary />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
