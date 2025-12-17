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
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, CreditCard, Check } from 'lucide-react-native';

let CardField: any = View;
let useStripe: any = () => ({
  createPaymentMethod: async () => ({ error: null, paymentMethod: null }),
});

if (Platform.OS !== 'web') {
  const stripe = require('@stripe/stripe-react-native');
  CardField = stripe.CardField;
  useStripe = stripe.useStripe;
}
import { theme } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/Input';

type PaymentType = 'card' | 'paypal' | 'apple_pay' | 'google_pay' | 'cashapp' | 'venmo';

export default function AddPaymentMethodScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { createPaymentMethod } = useStripe();

  const [selectedType, setSelectedType] = useState<PaymentType>('card');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  // Card details
  const [cardComplete, setCardComplete] = useState(false);

  // Alternative payment details
  const [paypalEmail, setPaypalEmail] = useState('');
  const [cashappTag, setCashappTag] = useState('');
  const [venmoUsername, setVenmoUsername] = useState('');

  const handleAddCard = async () => {
    if (!user || !cardComplete) {
      Alert.alert('Error', 'Please complete card details');
      return;
    }

    setLoading(true);

    try {
      // Create payment method with Stripe
      const { paymentMethod, error } = await createPaymentMethod({
        paymentMethodType: 'Card',
      });

      if (error) {
        Alert.alert('Error', error.message);
        setLoading(false);
        return;
      }

      if (!paymentMethod) {
        Alert.alert('Error', 'Failed to create payment method');
        setLoading(false);
        return;
      }

      // Save to database
      const { error: dbError } = await supabase.from('payment_methods').insert({
        user_id: user.id,
        payment_type: 'card',
        stripe_payment_method_id: paymentMethod.id,
        card_last4: paymentMethod.Card?.last4,
        card_brand: paymentMethod.Card?.brand,
        card_exp_month: paymentMethod.Card?.expMonth,
        card_exp_year: paymentMethod.Card?.expYear,
        is_default: isDefault,
      });

      if (dbError) {
        Alert.alert('Error', 'Failed to save payment method');
        console.error('Database error:', dbError);
        setLoading(false);
        return;
      }

      // Update other methods if this is default
      if (isDefault) {
        await supabase
          .from('payment_methods')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .neq('stripe_payment_method_id', paymentMethod.id);
      }

      Alert.alert('Success', 'Payment method added successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error adding card:', error);
      Alert.alert('Error', 'Failed to add payment method');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAlternativePayment = async () => {
    if (!user) return;

    let details: any = {
      user_id: user.id,
      payment_type: selectedType,
      is_default: isDefault,
    };

    switch (selectedType) {
      case 'paypal':
        if (!paypalEmail.trim()) {
          Alert.alert('Error', 'Please enter your PayPal email');
          return;
        }
        details.paypal_email = paypalEmail.trim();
        break;
      case 'cashapp':
        if (!cashappTag.trim()) {
          Alert.alert('Error', 'Please enter your Cash App $Cashtag');
          return;
        }
        details.cashapp_cashtag = cashappTag.trim();
        break;
      case 'venmo':
        if (!venmoUsername.trim()) {
          Alert.alert('Error', 'Please enter your Venmo username');
          return;
        }
        details.venmo_username = venmoUsername.trim();
        break;
      case 'apple_pay':
      case 'google_pay':
        // These don't require additional details
        break;
    }

    setLoading(true);

    const { error } = await supabase.from('payment_methods').insert(details);

    if (error) {
      Alert.alert('Error', 'Failed to add payment method');
      console.error('Database error:', error);
      setLoading(false);
      return;
    }

    // Update other methods if this is default
    if (isDefault) {
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .neq('payment_type', selectedType);
    }

    Alert.alert('Success', 'Payment method added successfully', [
      { text: 'OK', onPress: () => router.back() },
    ]);

    setLoading(false);
  };

  const handleSubmit = async () => {
    if (selectedType === 'card') {
      await handleAddCard();
    } else {
      await handleAddAlternativePayment();
    }
  };

  const renderPaymentTypeOption = (
    type: PaymentType,
    label: string,
    sublabel: string,
    icon: any,
    available: boolean = true
  ) => {
    const isSelected = selectedType === type;

    return (
      <TouchableOpacity
        key={type}
        style={[styles.typeOption, isSelected && styles.typeOptionSelected, !available && styles.typeOptionDisabled]}
        onPress={() => available && setSelectedType(type)}
        disabled={!available}
      >
        <View style={styles.typeIcon}>{icon}</View>
        <View style={styles.typeDetails}>
          <Text style={[styles.typeLabel, !available && styles.typeDisabled]}>{label}</Text>
          <Text style={[styles.typeSublabel, !available && styles.typeDisabled]}>{sublabel}</Text>
          {!available && <Text style={styles.comingSoon}>Coming Soon</Text>}
        </View>
        {isSelected && available && (
          <View style={styles.checkmark}>
            <Check size={20} color={theme.colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderPaymentForm = () => {
    switch (selectedType) {
      case 'card':
        return (
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Card Details</Text>
            <View style={styles.cardFieldContainer}>
              <CardField
                postalCodeEnabled={true}
                placeholders={{
                  number: '4242 4242 4242 4242',
                }}
                cardStyle={{
                  backgroundColor: '#FFFFFF',
                  textColor: theme.colors.text,
                  fontSize: 16,
                }}
                style={styles.cardField}
                onCardChange={(cardDetails) => {
                  setCardComplete(cardDetails.complete);
                }}
              />
            </View>
            <Text style={styles.cardHelp}>
              Your card information is encrypted and secure
            </Text>
          </View>
        );

      case 'paypal':
        return (
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>PayPal Email</Text>
            <Input
              placeholder="your-email@example.com"
              value={paypalEmail}
              onChangeText={setPaypalEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.formHelp}>
              Enter the email address associated with your PayPal account
            </Text>
          </View>
        );

      case 'cashapp':
        return (
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Cash App $Cashtag</Text>
            <Input
              placeholder="$yourcashtag"
              value={cashappTag}
              onChangeText={(text: string) => {
                const formatted = text.startsWith('$') ? text : `$${text}`;
                setCashappTag(formatted);
              }}
              autoCapitalize="none"
            />
            <Text style={styles.formHelp}>Your Cash App $Cashtag (e.g., $johndoe)</Text>
          </View>
        );

      case 'venmo':
        return (
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Venmo Username</Text>
            <Input
              placeholder="@username"
              value={venmoUsername}
              onChangeText={(text: string) => {
                const formatted = text.startsWith('@') ? text : `@${text}`;
                setVenmoUsername(formatted);
              }}
              autoCapitalize="none"
            />
            <Text style={styles.formHelp}>Your Venmo username (e.g., @johndoe)</Text>
          </View>
        );

      case 'apple_pay':
        return (
          <View style={styles.formSection}>
            <Text style={styles.formHelp}>
              Apple Pay will be available for quick payments using Face ID or Touch ID
            </Text>
          </View>
        );

      case 'google_pay':
        return (
          <View style={styles.formSection}>
            <Text style={styles.formHelp}>
              Google Pay will be available for quick and secure payments
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <X size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Payment Method</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Select Payment Type</Text>

        {renderPaymentTypeOption(
          'card',
          'Credit or Debit Card',
          'Visa, Mastercard, Amex, Discover',
          <CreditCard size={24} color={theme.colors.primary} />
        )}

        {Platform.OS === 'ios' &&
          renderPaymentTypeOption(
            'apple_pay',
            'Apple Pay',
            'Pay with Face ID or Touch ID',
            <Text style={styles.appleIcon}></Text>
          )}

        {Platform.OS === 'android' &&
          renderPaymentTypeOption(
            'google_pay',
            'Google Pay',
            'Quick and secure payments',
            <Text style={styles.googleIcon}>G</Text>
          )}

        {renderPaymentTypeOption(
          'paypal',
          'PayPal',
          'Pay with your PayPal account',
          <Text style={styles.paypalIcon}>PP</Text>
        )}

        {renderPaymentTypeOption(
          'cashapp',
          'Cash App',
          'Pay with Cash App',
          <Text style={[styles.iconBadge, { color: '#00d54b' }]}>$</Text>
        )}

        {renderPaymentTypeOption(
          'venmo',
          'Venmo',
          'Pay with Venmo',
          <Text style={[styles.iconBadge, { color: '#008cff' }]}>V</Text>
        )}

        {renderPaymentForm()}

        <TouchableOpacity
          style={styles.defaultToggle}
          onPress={() => setIsDefault(!isDefault)}
        >
          <View style={[styles.checkbox, isDefault && styles.checkboxChecked]}>
            {isDefault && <Check size={16} color="#fff" />}
          </View>
          <Text style={styles.defaultLabel}>Set as default payment method</Text>
        </TouchableOpacity>

        <View style={styles.securityNote}>
          <Text style={styles.securityText}>
            🔒 Your payment information is encrypted and stored securely
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            ((selectedType === 'card' && !cardComplete) || loading) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={(selectedType === 'card' && !cardComplete) || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Add Payment Method</Text>
          )}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  typeOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  typeOptionDisabled: {
    opacity: 0.5,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  typeDetails: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  typeSublabel: {
    fontSize: 13,
    color: theme.colors.textLight,
  },
  typeDisabled: {
    color: theme.colors.textLight,
  },
  comingSoon: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 4,
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appleIcon: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4285f4',
  },
  paypalIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0070ba',
  },
  iconBadge: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  formSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  cardFieldContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  cardField: {
    width: '100%',
    height: 50,
  },
  cardHelp: {
    fontSize: 13,
    color: theme.colors.textLight,
    marginTop: 8,
  },
  formHelp: {
    fontSize: 13,
    color: theme.colors.textLight,
    marginTop: 8,
  },
  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  defaultLabel: {
    fontSize: 15,
    color: theme.colors.text,
  },
  securityNote: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 24,
  },
  securityText: {
    fontSize: 13,
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
