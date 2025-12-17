import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '@/constants/theme';
import MultiRegionService from '@/lib/multi-region';
import { DollarSign, Check } from 'lucide-react-native';

interface CurrencySwitcherProps {
  userId: string;
  currentCurrency: string;
  onCurrencyChange: (currency: string) => void;
}

export default function CurrencySwitcher({
  userId,
  currentCurrency,
  onCurrencyChange,
}: CurrencySwitcherProps) {
  const [visible, setVisible] = useState(false);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState(currentCurrency);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCurrencies();
  }, []);

  const loadCurrencies = async () => {
    try {
      const activeCurrencies = await MultiRegionService.getActiveCurrencies();
      setCurrencies(activeCurrencies);
    } catch (error) {
      console.error('Failed to load currencies:', error);
    }
  };

  const handleSelectCurrency = async (currencyCode: string) => {
    setLoading(true);
    try {
      await MultiRegionService.updateUserCurrency(userId, currencyCode);
      setSelectedCurrency(currencyCode);
      onCurrencyChange(currencyCode);
      setVisible(false);
    } catch (error) {
      console.error('Failed to update currency:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentCurrencyData = currencies.find((c) => c.code === selectedCurrency);

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)}>
        <DollarSign size={20} color={colors.primary} />
        <Text style={styles.triggerText}>
          {currentCurrencyData?.symbol || '$'} {currentCurrencyData?.code || currentCurrency}
        </Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={styles.closeButton}>Done</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.currencyList}>
              {currencies.map((currency) => (
                <TouchableOpacity
                  key={currency.code}
                  style={[
                    styles.currencyItem,
                    selectedCurrency === currency.code && styles.currencyItemSelected,
                  ]}
                  onPress={() => handleSelectCurrency(currency.code)}
                  disabled={loading}
                >
                  <View style={styles.currencyInfo}>
                    <Text style={styles.currencySymbol}>{currency.symbol}</Text>
                    <View style={styles.currencyDetails}>
                      <Text style={styles.currencyCode}>{currency.code}</Text>
                      <Text style={styles.currencyName}>{currency.name}</Text>
                    </View>
                  </View>
                  {selectedCurrency === currency.code && (
                    <Check size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  triggerText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
  },
  currencyList: {
    padding: spacing.md,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  currencyItemSelected: {
    backgroundColor: colors.primaryLighter,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  currencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  currencySymbol: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.primary,
  },
  currencyDetails: {
    flex: 1,
  },
  currencyCode: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  currencyName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});