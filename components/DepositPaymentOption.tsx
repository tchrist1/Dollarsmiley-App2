import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';
import { DollarSign, CheckCircle, Info } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface DepositInfo {
  deposit_amount: number;
  balance_amount: number;
  deposit_display: string;
}

interface DepositPaymentOptionProps {
  providerId: string;
  totalAmount: number;
  onSelect: (paymentType: 'full' | 'deposit', depositAmount?: number, balanceAmount?: number) => void;
  selectedType: 'full' | 'deposit';
}

export default function DepositPaymentOption({
  providerId,
  totalAmount,
  onSelect,
  selectedType,
}: DepositPaymentOptionProps) {
  const [depositInfo, setDepositInfo] = useState<DepositInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [depositEnabled, setDepositEnabled] = useState(false);

  useEffect(() => {
    fetchDepositInfo();
  }, [providerId, totalAmount]);

  const fetchDepositInfo = async () => {
    setLoading(true);

    const { data: settings } = await supabase
      .from('deposit_settings')
      .select('*')
      .eq('provider_id', providerId)
      .single();

    if (settings && settings.deposit_enabled) {
      setDepositEnabled(true);

      const { data, error } = await supabase.rpc('calculate_deposit_amount', {
        p_provider_id: providerId,
        p_total_amount: totalAmount,
      });

      if (data && data.length > 0) {
        setDepositInfo(data[0]);
      }
    }

    setLoading(false);
  };

  if (loading || !depositEnabled || !depositInfo) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.optionCard, selectedType === 'full' && styles.optionCardSelected]}
          onPress={() => onSelect('full')}
          activeOpacity={0.7}
        >
          <View style={styles.optionHeader}>
            <View style={styles.radioOuter}>
              {selectedType === 'full' && <View style={styles.radioInner} />}
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Pay Full Amount</Text>
              <Text style={styles.optionPrice}>${totalAmount.toFixed(2)}</Text>
            </View>
            {selectedType === 'full' && <CheckCircle size={24} color={theme.colors.success} />}
          </View>
          <Text style={styles.optionDescription}>
            Pay the full amount now to secure your booking
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Payment Options</Text>
      <Text style={styles.sectionSubtitle}>
        Choose how you'd like to pay for this service
      </Text>

      <TouchableOpacity
        style={[styles.optionCard, selectedType === 'deposit' && styles.optionCardSelected]}
        onPress={() => onSelect('deposit', depositInfo.deposit_amount, depositInfo.balance_amount)}
        activeOpacity={0.7}
      >
        <View style={styles.optionHeader}>
          <View style={styles.radioOuter}>
            {selectedType === 'deposit' && <View style={styles.radioInner} />}
          </View>
          <View style={styles.optionContent}>
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>RECOMMENDED</Text>
            </View>
            <Text style={styles.optionTitle}>Pay Deposit Now</Text>
            <Text style={styles.optionPrice}>${depositInfo.deposit_amount.toFixed(2)}</Text>
            <Text style={styles.depositLabel}>{depositInfo.deposit_display}</Text>
          </View>
          {selectedType === 'deposit' && <CheckCircle size={24} color={theme.colors.success} />}
        </View>
        <Text style={styles.optionDescription}>
          Secure your booking with a deposit. Pay the remaining balance of $
          {depositInfo.balance_amount.toFixed(2)} before the service date.
        </Text>
        <View style={styles.benefitsContainer}>
          <View style={styles.benefitItem}>
            <CheckCircle size={14} color={theme.colors.success} />
            <Text style={styles.benefitText}>Lower upfront cost</Text>
          </View>
          <View style={styles.benefitItem}>
            <CheckCircle size={14} color={theme.colors.success} />
            <Text style={styles.benefitText}>Booking confirmed instantly</Text>
          </View>
          <View style={styles.benefitItem}>
            <CheckCircle size={14} color={theme.colors.success} />
            <Text style={styles.benefitText}>Flexible payment schedule</Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.optionCard, selectedType === 'full' && styles.optionCardSelected]}
        onPress={() => onSelect('full')}
        activeOpacity={0.7}
      >
        <View style={styles.optionHeader}>
          <View style={styles.radioOuter}>
            {selectedType === 'full' && <View style={styles.radioInner} />}
          </View>
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Pay Full Amount</Text>
            <Text style={styles.optionPrice}>${totalAmount.toFixed(2)}</Text>
          </View>
          {selectedType === 'full' && <CheckCircle size={24} color={theme.colors.success} />}
        </View>
        <Text style={styles.optionDescription}>
          Pay the full amount now. No additional payments needed.
        </Text>
      </TouchableOpacity>

      <View style={styles.infoBox}>
        <Info size={16} color={theme.colors.primary} />
        <Text style={styles.infoText}>
          Both options secure your booking immediately. Choose what works best for your budget.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textLight,
    marginTop: -8,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  optionCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '08',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  optionContent: {
    flex: 1,
  },
  recommendedBadge: {
    backgroundColor: theme.colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  optionPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  depositLabel: {
    fontSize: 12,
    color: theme.colors.textLight,
  },
  optionDescription: {
    fontSize: 14,
    color: theme.colors.textLight,
    lineHeight: 20,
    marginBottom: 12,
  },
  benefitsContainer: {
    gap: 8,
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 13,
    color: theme.colors.text,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: theme.colors.primary + '10',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
});
