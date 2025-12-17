import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { useState, useEffect } from 'react';
import { CreditCard, Check } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface SavedPaymentMethod {
  id: string;
  payment_type: string;
  is_default: boolean;
  card_last4?: string;
  card_brand?: string;
  card_exp_month?: number;
  card_exp_year?: number;
  paypal_email?: string;
  cashapp_cashtag?: string;
  venmo_username?: string;
}

interface PaymentMethodSelectorProps {
  userId: string;
  selectedMethod: string;
  onSelectMethod: (method: string, paymentMethodId?: string) => void;
  amount: number;
}

export default function PaymentMethodSelector({
  userId,
  selectedMethod,
  onSelectMethod,
  amount,
}: PaymentMethodSelectorProps) {
  const [savedMethods, setSavedMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedMethods();
  }, [userId]);

  const fetchSavedMethods = async () => {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });

    if (!error && data) {
      setSavedMethods(data);
      if (data.length > 0 && !selectedMethod) {
        const defaultMethod = data.find((m) => m.is_default) || data[0];
        onSelectMethod(defaultMethod.payment_type, defaultMethod.id);
      }
    }
    setLoading(false);
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'card':
        return <CreditCard size={24} color={theme.colors.primary} />;
      case 'paypal':
        return <Text style={styles.paypalIcon}>PayPal</Text>;
      case 'apple_pay':
        return <Text style={styles.applePayIcon}> Pay</Text>;
      case 'google_pay':
        return <Text style={styles.googlePayIcon}>G Pay</Text>;
      case 'cashapp':
        return <Text style={styles.cashappIcon}>$</Text>;
      case 'venmo':
        return <Text style={styles.venmoIcon}>V</Text>;
      default:
        return <CreditCard size={24} color={theme.colors.primary} />;
    }
  };

  const getCardBrandIcon = (brand?: string) => {
    if (!brand) return null;
    const brandLower = brand.toLowerCase();
    return <Text style={styles.cardBrand}>{brandLower === 'visa' ? 'VISA' : brandLower === 'mastercard' ? 'MC' : brand.toUpperCase()}</Text>;
  };

  const renderSavedMethod = (method: SavedPaymentMethod) => {
    const isSelected = selectedMethod === method.payment_type;

    return (
      <TouchableOpacity
        key={method.id}
        style={[styles.methodCard, isSelected && styles.methodCardSelected]}
        onPress={() => onSelectMethod(method.payment_type, method.id)}
      >
        <View style={styles.methodInfo}>
          <View style={styles.methodIcon}>{getPaymentMethodIcon(method.payment_type)}</View>
          <View style={styles.methodDetails}>
            {method.payment_type === 'card' && (
              <>
                <View style={styles.cardRow}>
                  {getCardBrandIcon(method.card_brand)}
                  <Text style={styles.methodText}>•••• {method.card_last4}</Text>
                </View>
                <Text style={styles.methodSubtext}>
                  Expires {method.card_exp_month?.toString().padStart(2, '0')}/{method.card_exp_year}
                </Text>
              </>
            )}
            {method.payment_type === 'paypal' && (
              <>
                <Text style={styles.methodText}>PayPal</Text>
                <Text style={styles.methodSubtext}>{method.paypal_email}</Text>
              </>
            )}
            {method.payment_type === 'apple_pay' && (
              <Text style={styles.methodText}>Apple Pay</Text>
            )}
            {method.payment_type === 'google_pay' && (
              <Text style={styles.methodText}>Google Pay</Text>
            )}
            {method.payment_type === 'cashapp' && (
              <>
                <Text style={styles.methodText}>Cash App</Text>
                {method.cashapp_cashtag && (
                  <Text style={styles.methodSubtext}>{method.cashapp_cashtag}</Text>
                )}
              </>
            )}
            {method.payment_type === 'venmo' && (
              <>
                <Text style={styles.methodText}>Venmo</Text>
                {method.venmo_username && (
                  <Text style={styles.methodSubtext}>{method.venmo_username}</Text>
                )}
              </>
            )}
          </View>
        </View>
        {isSelected && (
          <View style={styles.checkmark}>
            <Check size={20} color={theme.colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderNewPaymentOptions = () => {
    const availableOptions = [];

    availableOptions.push({
      id: 'new_card',
      type: 'card',
      label: 'Credit or Debit Card',
      sublabel: 'Visa, Mastercard, Amex, Discover',
    });

    availableOptions.push({
      id: 'new_paypal',
      type: 'paypal',
      label: 'PayPal',
      sublabel: 'Pay with your PayPal account',
    });

    if (Platform.OS === 'ios') {
      availableOptions.push({
        id: 'new_apple_pay',
        type: 'apple_pay',
        label: 'Apple Pay',
        sublabel: 'Pay with Face ID or Touch ID',
      });
    }

    if (Platform.OS === 'android') {
      availableOptions.push({
        id: 'new_google_pay',
        type: 'google_pay',
        label: 'Google Pay',
        sublabel: 'Pay with Google Pay',
      });
    }

    availableOptions.push({
      id: 'new_cashapp',
      type: 'cashapp',
      label: 'Cash App',
      sublabel: 'Pay with Cash App',
    });

    availableOptions.push({
      id: 'new_venmo',
      type: 'venmo',
      label: 'Venmo',
      sublabel: 'Pay with Venmo',
    });

    return availableOptions.map((option) => {
      const isSelected = selectedMethod === option.type;

      return (
        <TouchableOpacity
          key={option.id}
          style={[styles.methodCard, isSelected && styles.methodCardSelected]}
          onPress={() => onSelectMethod(option.type)}
        >
          <View style={styles.methodInfo}>
            <View style={styles.methodIcon}>{getPaymentMethodIcon(option.type)}</View>
            <View style={styles.methodDetails}>
              <Text style={styles.methodText}>{option.label}</Text>
              <Text style={styles.methodSubtext}>{option.sublabel}</Text>
            </View>
          </View>
          {isSelected && (
            <View style={styles.checkmark}>
              <Check size={20} color={theme.colors.primary} />
            </View>
          )}
        </TouchableOpacity>
      );
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading payment methods...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Method</Text>
      <Text style={styles.amountText}>Total: ${amount.toFixed(2)}</Text>

      {savedMethods.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Methods</Text>
          {savedMethods.map(renderSavedMethod)}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {savedMethods.length > 0 ? 'Add New Method' : 'Select Payment Method'}
        </Text>
        {renderNewPaymentOptions()}
      </View>

      <View style={styles.securityNote}>
        <Text style={styles.securityText}>
          🔒 Your payment information is encrypted and secure
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  amountText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textLight,
    textAlign: 'center',
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  methodCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodDetails: {
    flex: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  methodText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  methodSubtext: {
    fontSize: 13,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paypalIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0070ba',
  },
  applePayIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  googlePayIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4285f4',
  },
  cardBrand: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cashappIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00d54b',
  },
  venmoIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#008cff',
  },
  securityNote: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginTop: 8,
  },
  securityText: {
    fontSize: 13,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
});
