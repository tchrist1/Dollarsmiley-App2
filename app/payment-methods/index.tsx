import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CreditCard, Plus, Trash2, Star, X } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  getPaymentMethods,
  setDefaultPaymentMethod,
  deletePaymentMethod,
  formatPaymentMethodForDisplay,
  isPaymentMethodExpired,
  type PaymentMethod,
} from '@/lib/payment-methods';

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchPaymentMethods();
    }
  }, [user]);

  const fetchPaymentMethods = async () => {
    if (!user) return;

    setLoading(true);
    const methods = await getPaymentMethods(user.id);
    setPaymentMethods(methods);
    setLoading(false);
  };

  const handleSetDefault = async (methodId: string) => {
    const success = await setDefaultPaymentMethod(methodId);

    if (success) {
      fetchPaymentMethods();
    } else {
      Alert.alert('Error', 'Failed to set default payment method');
    }
  };

  const handleDelete = async (methodId: string, isDefault: boolean) => {
    if (isDefault) {
      Alert.alert(
        'Cannot Delete',
        'Cannot delete your default payment method. Please set another method as default first.'
      );
      return;
    }

    Alert.alert(
      'Delete Payment Method',
      'Are you sure you want to delete this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(methodId);
            const success = await deletePaymentMethod(methodId);

            if (success) {
              fetchPaymentMethods();
            } else {
              Alert.alert('Error', 'Failed to delete payment method');
            }
            setDeletingId(null);
          },
        },
      ]
    );
  };

  const getPaymentMethodIcon = (type: string) => {
    switch (type) {
      case 'card':
        return <CreditCard size={28} color={theme.colors.primary} />;
      case 'paypal':
        return <Text style={styles.iconText}>PP</Text>;
      case 'apple_pay':
        return <Text style={styles.iconText}></Text>;
      case 'google_pay':
        return <Text style={styles.iconText}>G</Text>;
      case 'cashapp':
        return <Text style={[styles.iconText, { color: '#00d54b' }]}>$</Text>;
      case 'venmo':
        return <Text style={[styles.iconText, { color: '#008cff' }]}>V</Text>;
      default:
        return <CreditCard size={28} color={theme.colors.primary} />;
    }
  };

  const getCardBrandLogo = (brand?: string) => {
    if (!brand) return null;
    const brandLower = brand.toLowerCase();
    let brandText = brand.toUpperCase();
    let brandColor = theme.colors.primary;

    if (brandLower === 'visa') {
      brandText = 'VISA';
      brandColor = '#1434CB';
    } else if (brandLower === 'mastercard') {
      brandText = 'MC';
      brandColor = '#EB001B';
    } else if (brandLower === 'amex' || brandLower === 'american express') {
      brandText = 'AMEX';
      brandColor = '#006FCF';
    } else if (brandLower === 'discover') {
      brandText = 'DISC';
      brandColor = '#FF6000';
    }

    return (
      <View style={[styles.brandBadge, { backgroundColor: brandColor }]}>
        <Text style={styles.brandText}>{brandText}</Text>
      </View>
    );
  };

  const formatPaymentMethodDetails = (method: PaymentMethod) => {
    switch (method.payment_type) {
      case 'card':
        return {
          title: `•••• ${method.card_last4}`,
          subtitle: `Expires ${method.card_exp_month?.toString().padStart(2, '0')}/${method.card_exp_year}`,
          extra: getCardBrandLogo(method.card_brand),
        };
      case 'paypal':
        return {
          title: 'PayPal',
          subtitle: method.paypal_email || 'Connected',
          extra: null,
        };
      case 'apple_pay':
        return {
          title: 'Apple Pay',
          subtitle: 'Quick and secure payments',
          extra: null,
        };
      case 'google_pay':
        return {
          title: 'Google Pay',
          subtitle: 'Quick and secure payments',
          extra: null,
        };
      case 'cashapp':
        return {
          title: 'Cash App',
          subtitle: method.cashapp_cashtag || 'Connected',
          extra: null,
        };
      case 'venmo':
        return {
          title: 'Venmo',
          subtitle: method.venmo_username || 'Connected',
          extra: null,
        };
      default:
        return {
          title: method.payment_type,
          subtitle: 'Payment method',
          extra: null,
        };
    }
  };

  const renderPaymentMethod = (method: PaymentMethod) => {
    const display = formatPaymentMethodForDisplay(method);
    const isDeleting = deletingId === method.id;
    const expired = isPaymentMethodExpired(method);

    return (
      <View key={method.id} style={styles.methodCard}>
        <View style={styles.methodIconContainer}>
          {getPaymentMethodIcon(method.payment_type)}
        </View>

        <View style={styles.methodDetails}>
          <View style={styles.methodHeader}>
            <Text style={[styles.methodTitle, expired && styles.expiredText]}>{display.title}</Text>
            {formatPaymentMethodDetails(method).extra}
          </View>
          <Text style={[styles.methodSubtitle, expired && styles.expiredText]}>
            {expired ? 'Expired' : display.subtitle}
          </Text>
          <View style={styles.badges}>
            {display.isDefault && (
              <View style={styles.defaultBadge}>
                <Star size={12} color={theme.colors.primary} fill={theme.colors.primary} />
                <Text style={styles.defaultText}>Default</Text>
              </View>
            )}
            {display.isExpiringSoon && !expired && (
              <View style={styles.warningBadge}>
                <Text style={styles.warningText}>Expiring Soon</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.methodActions}>
          {!method.is_default && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSetDefault(method.id)}
            >
              <Star size={20} color={theme.colors.textLight} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(method.id, method.is_default)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={theme.colors.error} />
            ) : (
              <Trash2 size={20} color={theme.colors.error} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Methods</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading payment methods...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <X size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {paymentMethods.length === 0 ? (
          <View style={styles.emptyState}>
            <CreditCard size={64} color={theme.colors.textLight} />
            <Text style={styles.emptyTitle}>No Payment Methods</Text>
            <Text style={styles.emptyText}>
              Add a payment method to make bookings and payments easier.
            </Text>
          </View>
        ) : (
          <View style={styles.methodsList}>
            {paymentMethods.map(renderPaymentMethod)}
          </View>
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Secure Payments</Text>
          <Text style={styles.infoText}>
            Your payment information is encrypted and stored securely. We never share your
            payment details with service providers.
          </Text>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Supported Payment Methods</Text>
          <View style={styles.supportedMethods}>
            <View style={styles.supportedMethod}>
              <CreditCard size={20} color={theme.colors.textLight} />
              <Text style={styles.supportedText}>Credit & Debit Cards</Text>
            </View>
            {Platform.OS === 'ios' && (
              <View style={styles.supportedMethod}>
                <Text style={styles.supportedIcon}></Text>
                <Text style={styles.supportedText}>Apple Pay</Text>
              </View>
            )}
            {Platform.OS === 'android' && (
              <View style={styles.supportedMethod}>
                <Text style={styles.supportedIcon}>G</Text>
                <Text style={styles.supportedText}>Google Pay</Text>
              </View>
            )}
            <View style={styles.supportedMethod}>
              <Text style={[styles.supportedIcon, { color: '#0070ba' }]}>PP</Text>
              <Text style={styles.supportedText}>PayPal</Text>
            </View>
            <View style={styles.supportedMethod}>
              <Text style={[styles.supportedIcon, { color: '#00d54b' }]}>$</Text>
              <Text style={styles.supportedText}>Cash App</Text>
            </View>
            <View style={styles.supportedMethod}>
              <Text style={[styles.supportedIcon, { color: '#008cff' }]}>V</Text>
              <Text style={styles.supportedText}>Venmo</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.addButtonContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/payment-methods/add')}
        >
          <Plus size={24} color="#fff" />
          <Text style={styles.addButtonText}>Add Payment Method</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: theme.spacing.xxl + theme.spacing.lg,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textLight,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: theme.colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  methodsList: {
    gap: 12,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  methodIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  methodDetails: {
    flex: 1,
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  brandBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  brandText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  methodSubtitle: {
    fontSize: 13,
    color: theme.colors.textLight,
    marginBottom: 6,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 6,
  },
  defaultText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  warningBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
  },
  warningText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
  },
  expiredText: {
    color: theme.colors.error,
    textDecorationLine: 'line-through',
  },
  methodActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textLight,
    lineHeight: 20,
  },
  supportedMethods: {
    gap: 12,
  },
  supportedMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  supportedIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  supportedText: {
    fontSize: 14,
    color: theme.colors.textLight,
  },
  addButtonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
