import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import RefundStatusTracker from '@/components/RefundStatusTracker';
import { getBookingRefund, subscribeToRefundUpdates, type CustomerRefund } from '@/lib/customer-refunds';
import { colors, spacing, fontSize, fontWeight } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function RefundStatusScreen() {
  const router = useRouter();
  const { refundId } = useLocalSearchParams<{ refundId: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refund, setRefund] = useState<CustomerRefund | null>(null);

  useEffect(() => {
    if (user?.id && refundId) {
      loadRefund();

      const unsubscribe = subscribeToRefundUpdates(user.id, (payload) => {
        if (payload.new && payload.new.id === refundId) {
          setRefund(payload.new);
        }
      });

      return unsubscribe;
    }
  }, [user?.id, refundId]);

  const loadRefund = async () => {
    if (!user?.id || !refundId) return;

    try {
      const { data, error } = await supabase
        .from('refunds')
        .select(`
          *,
          booking:bookings(
            id,
            title,
            price,
            scheduled_date,
            status
          )
        `)
        .eq('id', refundId)
        .eq('requested_by', user.id)
        .maybeSingle();

      if (error) throw error;
      setRefund(data);
    } catch (error) {
      console.error('Error loading refund:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadRefund();
  };

  if (!user || !refundId) {
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
          <Text style={styles.title}>Refund Status</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!refund) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Refund Status</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Refund not found</Text>
          <TouchableOpacity
            style={styles.backHomeButton}
            onPress={() => router.push('/')}
          >
            <Text style={styles.backHomeButtonText}>Go to Home</Text>
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
        <Text style={styles.title}>Refund Status</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.trackerContainer}>
          <RefundStatusTracker refund={refund} />
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
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  trackerContainer: {
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
