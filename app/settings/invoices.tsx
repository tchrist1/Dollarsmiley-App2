import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  Receipt,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  Mail,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/lib/stripe-subscription-config';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface Invoice {
  id: string;
  amount_due: number;
  amount_paid: number;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  created: number;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  number: string | null;
  billing_reason: string;
  currency: string;
}

export default function InvoicesScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    loadInvoices();
  }, [user]);

  const loadInvoices = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      // Call edge function to get invoices from Stripe
      const { data, error } = await supabase.functions.invoke('get-invoices', {
        body: { userId: user.id },
      });

      if (error) throw error;

      setInvoices(data.invoices || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
      Alert.alert('Error', 'Failed to load invoices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadInvoices();
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    if (!invoice.invoice_pdf) {
      Alert.alert('Error', 'PDF not available for this invoice');
      return;
    }

    try {
      await Linking.openURL(invoice.invoice_pdf);
    } catch (error) {
      console.error('Error opening PDF:', error);
      Alert.alert('Error', 'Failed to open invoice PDF');
    }
  };

  const handleViewInvoice = async (invoice: Invoice) => {
    if (!invoice.hosted_invoice_url) {
      Alert.alert('Error', 'Invoice URL not available');
      return;
    }

    try {
      await Linking.openURL(invoice.hosted_invoice_url);
    } catch (error) {
      console.error('Error opening invoice:', error);
      Alert.alert('Error', 'Failed to open invoice');
    }
  };

  const handleEmailInvoice = (invoice: Invoice) => {
    Alert.alert(
      'Email Invoice',
      'Would you like us to email you a copy of this invoice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Email',
          onPress: async () => {
            try {
              const { error } = await supabase.functions.invoke('email-invoice', {
                body: {
                  invoiceId: invoice.id,
                },
              });

              if (error) throw error;

              Alert.alert('Success', 'Invoice has been emailed to you!');
            } catch (error) {
              console.error('Error emailing invoice:', error);
              Alert.alert('Error', 'Failed to email invoice');
            }
          },
        },
      ]
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle size={20} color={colors.success} />;
      case 'open':
        return <Clock size={20} color={colors.warning} />;
      case 'void':
      case 'uncollectible':
        return <AlertCircle size={20} color={colors.error} />;
      default:
        return <Receipt size={20} color={colors.textSecondary} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return colors.success;
      case 'open':
        return colors.warning;
      case 'void':
      case 'uncollectible':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'open':
        return 'Due';
      case 'void':
        return 'Void';
      case 'uncollectible':
        return 'Failed';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getBillingReasonText = (reason: string) => {
    switch (reason) {
      case 'subscription_create':
        return 'New Subscription';
      case 'subscription_cycle':
        return 'Subscription Renewal';
      case 'subscription_update':
        return 'Subscription Update';
      case 'manual':
        return 'Manual Invoice';
      default:
        return reason.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading invoices...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Invoices',
          headerShown: true,
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {invoices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Receipt size={64} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Invoices</Text>
            <Text style={styles.emptyText}>
              You don't have any invoices yet. Invoices will appear here once you subscribe to a plan.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/subscription')}
            >
              <Text style={styles.emptyButtonText}>View Plans</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Your Invoices</Text>
              <Text style={styles.subtitle}>
                View and download your payment history
              </Text>
            </View>

            {invoices.map((invoice) => (
              <View key={invoice.id} style={styles.invoiceCard}>
                <View style={styles.invoiceHeader}>
                  <View style={styles.invoiceInfo}>
                    <View style={styles.invoiceNumber}>
                      <Receipt size={20} color={colors.textSecondary} />
                      <Text style={styles.invoiceNumberText}>
                        {invoice.number || `Invoice ${invoice.id.slice(-8)}`}
                      </Text>
                    </View>
                    <Text style={styles.invoiceDate}>
                      {new Date(invoice.created * 1000).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(invoice.status) + '20' },
                    ]}
                  >
                    {getStatusIcon(invoice.status)}
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(invoice.status) },
                      ]}
                    >
                      {getStatusText(invoice.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.invoiceDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {getBillingReasonText(invoice.billing_reason)}
                    </Text>
                  </View>

                  <View style={styles.amountSection}>
                    <Text style={styles.amountLabel}>
                      {invoice.status === 'paid' ? 'Amount Paid' : 'Amount Due'}
                    </Text>
                    <Text style={styles.amountValue}>
                      {formatPrice(
                        invoice.status === 'paid' ? invoice.amount_paid : invoice.amount_due
                      )}
                    </Text>
                  </View>
                </View>

                <View style={styles.invoiceActions}>
                  {invoice.hosted_invoice_url && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleViewInvoice(invoice)}
                    >
                      <ExternalLink size={18} color={colors.primary} />
                      <Text style={styles.actionButtonText}>View</Text>
                    </TouchableOpacity>
                  )}

                  {invoice.invoice_pdf && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDownloadInvoice(invoice)}
                    >
                      <Download size={18} color={colors.primary} />
                      <Text style={styles.actionButtonText}>Download</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEmailInvoice(invoice)}
                  >
                    <Mail size={18} color={colors.primary} />
                    <Text style={styles.actionButtonText}>Email</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Need help with an invoice? Contact support@dollarsmiley.com
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  emptyButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  invoiceCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  invoiceNumberText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  invoiceDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  invoiceDetails: {
    marginBottom: spacing.md,
  },
  detailRow: {
    marginBottom: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  amountSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  amountLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  amountValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  invoiceActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  footer: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
  },
  footerText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
