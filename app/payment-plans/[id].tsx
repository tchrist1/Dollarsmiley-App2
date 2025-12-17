import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import PaymentPlanDetails from '@/components/PaymentPlanDetails';
import {
  getBookingPaymentPlan,
  getPaymentInstallments,
  type BookingPaymentPlan,
  type PaymentInstallment,
} from '@/lib/payment-plans';
import { colors, spacing, fontSize, fontWeight } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function PaymentPlanDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentPlan, setPaymentPlan] = useState<BookingPaymentPlan | null>(null);
  const [installments, setInstallments] = useState<PaymentInstallment[]>([]);

  useEffect(() => {
    if (id && user?.id) {
      loadData();
    }
  }, [id, user?.id]);

  const loadData = async () => {
    if (!id) return;

    try {
      // Get the booking ID from the payment plan
      const { data: planData } = await supabase
        .from('booking_payment_plans')
        .select('booking_id')
        .eq('id', id)
        .single();

      if (!planData) {
        Alert.alert('Error', 'Payment plan not found');
        router.back();
        return;
      }

      const [plan, installmentsData] = await Promise.all([
        getBookingPaymentPlan(planData.booking_id),
        getPaymentInstallments(id),
      ]);

      setPaymentPlan(plan);
      setInstallments(installmentsData);
    } catch (error) {
      console.error('Error loading payment plan:', error);
      Alert.alert('Error', 'Failed to load payment plan details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handlePayInstallment = (installment: PaymentInstallment) => {
    Alert.alert(
      'Pay Installment',
      'Payment functionality will be integrated with Stripe Payment Sheet',
      [{ text: 'OK' }]
    );
  };

  if (!user || !id) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Invalid request</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Payment Plan</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!paymentPlan) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Payment Plan</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Payment plan not found</Text>
          <TouchableOpacity
            style={styles.backHomeButton}
            onPress={() => router.push('/payment-plans')}
          >
            <Text style={styles.backHomeButtonText}>Back to Payment Plans</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Payment Plan</Text>
          {paymentPlan.booking && (
            <Text style={styles.subtitle}>{paymentPlan.booking.title}</Text>
          )}
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.detailsContainer}>
          <PaymentPlanDetails
            paymentPlan={paymentPlan}
            installments={installments}
            onPayInstallment={handlePayInstallment}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  detailsContainer: {
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.error,
    textAlign: 'center',
  },
  backHomeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: spacing.sm,
  },
  backHomeButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});

// Import supabase for direct query
import { supabase } from '@/lib/supabase';
