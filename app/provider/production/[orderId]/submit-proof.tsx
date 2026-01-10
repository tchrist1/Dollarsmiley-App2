import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { safeGoBack } from '@/lib/navigation-utils';
import { ProductionManagement } from '@/lib/production-management';
import ProviderProofSubmissionForm from '@/components/ProviderProofSubmissionForm';
import { colors, spacing, fontSize, fontWeight } from '@/constants/theme';
import { ArrowLeft, AlertCircle } from 'lucide-react-native';

export default function SubmitProofScreen() {
  const { orderId } = useLocalSearchParams();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orderTitle, setOrderTitle] = useState('');
  const [existingProofCount, setExistingProofCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrderData();
  }, [orderId]);

  const fetchOrderData = async () => {
    if (!orderId || typeof orderId !== 'string') {
      setError('Invalid order ID');
      setLoading(false);
      return;
    }

    try {
      const { data: order, error: orderError } = await ProductionManagement.getOrderDetails(orderId);

      if (orderError || !order) {
        setError('Order not found');
        setLoading(false);
        return;
      }

      if (order.provider_id !== profile?.id) {
        setError('You do not have permission to view this order');
        setLoading(false);
        return;
      }

      setOrderTitle(order.title || 'Custom Order');

      const { data: proofs } = await ProductionManagement.getProofs(orderId);
      setExistingProofCount(proofs.length);

      setLoading(false);
    } catch (err) {
      setError('Failed to load order data');
      setLoading(false);
    }
  };

  const handleSubmitSuccess = () => {
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading order...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={64} color={colors.error} />
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.backButtonLarge} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={safeGoBack}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Submit Proof</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {orderTitle}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {existingProofCount > 0 && (
        <View style={styles.revisionBanner}>
          <Text style={styles.revisionText}>
            Revision #{existingProofCount + 1} - Previous proof was revised
          </Text>
        </View>
      )}

      <ProviderProofSubmissionForm
        orderId={orderId as string}
        providerId={profile?.id || ''}
        existingProofCount={existingProofCount}
        onSubmitSuccess={handleSubmitSuccess}
        onCancel={handleCancel}
      />
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  revisionBanner: {
    backgroundColor: colors.warningLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  revisionText: {
    fontSize: fontSize.sm,
    color: colors.warningDark,
    textAlign: 'center',
    fontWeight: fontWeight.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  backButtonLarge: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
  },
  backButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
