import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { safeGoBack } from '@/lib/navigation-utils';
import {
  ArrowLeft,
  Download,
  Share2,
  Calendar,
  MapPin,
  User,
  CreditCard,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  getTransactionById,
  generateReceiptData,
  downloadReceipt,
  getPaymentMethodIcon,
  getPaymentMethodLabel,
  formatTransactionTimeline,
  type PaymentDetails,
} from '@/lib/payment-details';
import { formatAmount, formatTransactionDateTime } from '@/lib/transactions';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export default function PaymentDetailsScreen() {
  const params = useLocalSearchParams();
  const transactionId = params.id as string;

  const [transaction, setTransaction] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadTransaction();
  }, [transactionId]);

  const loadTransaction = async () => {
    try {
      setLoading(true);
      const data = await getTransactionById(transactionId);
      setTransaction(data);
    } catch (error) {
      console.error('Error loading transaction:', error);
      Alert.alert('Error', 'Failed to load transaction details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!transaction) return;

    try {
      setDownloading(true);
      const html = await downloadReceipt(transactionId);
      
      const fileName = `receipt_${transactionId.substring(0, 8)}.html`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, html);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/html',
          dialogTitle: 'Receipt',
        });
      } else {
        Alert.alert('Success', 'Receipt downloaded to ' + fileUri);
      }
    } catch (error) {
      console.error('Error downloading receipt:', error);
      Alert.alert('Error', 'Failed to download receipt');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!transaction) return;

    const receipt = generateReceiptData(transaction);
    const message = `Receipt ${receipt.receiptNumber}\nAmount: ${formatAmount(receipt.total)}\nDate: ${formatTransactionDateTime(receipt.issueDate)}`;

    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync('', {
          dialogTitle: 'Share Receipt',
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return CheckCircle;
      case 'Pending':
        return Loader;
      case 'Failed':
        return XCircle;
      case 'Cancelled':
        return AlertCircle;
      default:
        return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return colors.success;
      case 'Pending':
        return colors.warning;
      case 'Failed':
        return colors.error;
      case 'Cancelled':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Earning':
        return colors.success;
      case 'Payout':
        return colors.primary;
      case 'Refund':
        return colors.warning;
      case 'Fee':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Payment Details',
            headerLeft: () => (
              <TouchableOpacity onPress={() => safeGoBack('/transactions')}>
                <ArrowLeft size={24} color={colors.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Payment Details',
            headerLeft: () => (
              <TouchableOpacity onPress={() => safeGoBack('/transactions')}>
                <ArrowLeft size={24} color={colors.text} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.emptyState}>
          <AlertCircle size={64} color={colors.textSecondary} />
          <Text style={styles.emptyStateTitle}>Transaction Not Found</Text>
          <Text style={styles.emptyStateText}>
            This transaction could not be found or you don't have access to it.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const StatusIcon = getStatusIcon(transaction.status);
  const statusColor = getStatusColor(transaction.status);
  const typeColor = getTypeColor(transaction.transaction_type);
  const receipt = generateReceiptData(transaction);
  const timeline = formatTransactionTimeline(transaction);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Payment Details',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleDownloadReceipt}
                disabled={downloading}
                style={styles.headerButton}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Download size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
                <Share2 size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.amountCard}>
          <View style={styles.amountHeader}>
            <StatusIcon size={32} color={statusColor} />
          </View>
          <Text style={[styles.amount, { color: typeColor }]}>
            {['Earning', 'Refund'].includes(transaction.transaction_type) ? '+' : '-'}
            {formatAmount(transaction.amount)}
          </Text>
          <Text style={styles.description}>{transaction.description}</Text>
          <View style={styles.statusBadgeContainer}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {transaction.status}
              </Text>
            </View>
            <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
              <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                {transaction.transaction_type}
              </Text>
            </View>
          </View>
        </View>

        {transaction.booking && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Information</Text>
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.bookingCard}
                onPress={() => router.push(`/booking/${transaction.booking_id}`)}
              >
                <Text style={styles.bookingTitle}>{transaction.booking.title}</Text>

                <View style={styles.bookingDetail}>
                  <Calendar size={16} color={colors.textSecondary} />
                  <Text style={styles.bookingDetailText}>
                    {formatTransactionDateTime(transaction.booking.scheduled_date)}
                  </Text>
                </View>

                <View style={styles.bookingDetail}>
                  <MapPin size={16} color={colors.textSecondary} />
                  <Text style={styles.bookingDetailText}>{transaction.booking.location}</Text>
                </View>

                {transaction.booking.customer && (
                  <View style={styles.bookingDetail}>
                    <User size={16} color={colors.textSecondary} />
                    <Text style={styles.bookingDetailText}>
                      {transaction.booking.customer.full_name}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Details</Text>
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Receipt Number</Text>
              <Text style={styles.detailValue}>{receipt.receiptNumber}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>
                {formatTransactionDateTime(transaction.created_at)}
              </Text>
            </View>

            {transaction.completed_at && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Completed</Text>
                <Text style={styles.detailValue}>
                  {formatTransactionDateTime(transaction.completed_at)}
                </Text>
              </View>
            )}

            {transaction.reference_id && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reference ID</Text>
                <Text style={styles.detailValue}>{transaction.reference_id}</Text>
              </View>
            )}

            {transaction.payment_method && (
              <View style={styles.detailRow}>
                <View style={styles.paymentMethod}>
                  <Text style={styles.paymentMethodIcon}>
                    {getPaymentMethodIcon(transaction.payment_method.type)}
                  </Text>
                  <Text style={styles.detailValue}>
                    {getPaymentMethodLabel(
                      transaction.payment_method.type,
                      transaction.payment_method
                    )}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.card}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatAmount(receipt.subtotal)}</Text>
            </View>

            {receipt.fees > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Platform Fee</Text>
                <Text style={styles.summaryValue}>{formatAmount(receipt.fees)}</Text>
              </View>
            )}

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabelTotal}>Total</Text>
              <Text style={styles.summaryValueTotal}>{formatAmount(receipt.total)}</Text>
            </View>
          </View>
        </View>

        {timeline.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            <View style={styles.card}>
              {timeline.map((item, index) => (
                <View key={index} style={styles.timelineItem}>
                  <View style={styles.timelineIconContainer}>
                    <Text style={styles.timelineIcon}>{item.icon}</Text>
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>{item.title}</Text>
                    <Text style={styles.timelineDescription}>{item.description}</Text>
                    <Text style={styles.timelineTimestamp}>
                      {formatTransactionDateTime(item.timestamp)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {transaction.related_transactions && transaction.related_transactions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Related Transactions</Text>
            {transaction.related_transactions.map((related) => (
              <TouchableOpacity
                key={related.id}
                style={styles.relatedCard}
                onPress={() => router.push(`/transactions/${related.id}`)}
              >
                <View style={styles.relatedLeft}>
                  <Text style={styles.relatedType}>{related.transaction_type}</Text>
                  <Text style={styles.relatedDescription}>{related.description}</Text>
                </View>
                <Text
                  style={[
                    styles.relatedAmount,
                    {
                      color: ['Earning', 'Refund'].includes(related.transaction_type)
                        ? colors.success
                        : colors.text,
                    },
                  ]}
                >
                  {['Earning', 'Refund'].includes(related.transaction_type) ? '+' : '-'}
                  {formatAmount(related.amount)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  backButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  backButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.xs,
  },
  amountCard: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  amountHeader: {
    marginBottom: spacing.md,
  },
  amount: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.lg,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  typeBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  bookingCard: {
    gap: spacing.sm,
  },
  bookingTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  bookingDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bookingDetailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    justifyContent: 'flex-end',
  },
  paymentMethodIcon: {
    fontSize: fontSize.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  summaryLabelTotal: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  summaryValueTotal: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timelineIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineIcon: {
    fontSize: fontSize.xl,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  timelineDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  timelineTimestamp: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  relatedCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  relatedLeft: {
    flex: 1,
  },
  relatedType: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  relatedDescription: {
    fontSize: fontSize.md,
    color: colors.text,
    marginTop: spacing.xxs,
  },
  relatedAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
});
