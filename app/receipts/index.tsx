import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Download, Mail, Calendar, DollarSign, ChevronRight } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface Receipt {
  id: string;
  receipt_number: string;
  transaction_type: string;
  amount: number;
  currency: string;
  email_status: string;
  created_at: string;
  receipt_data: any;
}

export default function ReceiptsScreen() {
  const { profile } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'booking' | 'payment' | 'refund'>('all');

  useEffect(() => {
    if (profile) {
      fetchReceipts();
    }
  }, [profile, filter]);

  const fetchReceipts = async () => {
    if (!profile) return;

    setLoading(true);

    let query = supabase
      .from('email_receipts')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      const typeMap = {
        booking: 'Booking',
        payment: 'Payment',
        refund: 'Refund',
      };
      query = query.eq('transaction_type', typeMap[filter]);
    }

    const { data, error } = await query;

    if (!error && data) {
      setReceipts(data);
    }

    setLoading(false);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Booking':
        return colors.primary;
      case 'Deposit':
        return colors.success;
      case 'Balance':
        return colors.warning;
      case 'Refund':
        return colors.error;
      case 'Payment':
        return colors.secondary;
      default:
        return colors.textLight;
    }
  };

  const getTypeIcon = (type: string) => {
    return FileText;
  };

  const renderReceipt = ({ item }: { item: Receipt }) => {
    const TypeIcon = getTypeIcon(item.transaction_type);
    const typeColor = getTypeColor(item.transaction_type);

    return (
      <TouchableOpacity
        style={styles.receiptCard}
        onPress={() => router.push(`/receipts/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.receiptHeader}>
          <View style={[styles.iconContainer, { backgroundColor: typeColor + '20' }]}>
            <TypeIcon size={24} color={typeColor} />
          </View>
          <View style={styles.receiptInfo}>
            <Text style={styles.receiptNumber}>{item.receipt_number}</Text>
            <View style={styles.receiptMeta}>
              <View style={[styles.typeBadge, { backgroundColor: typeColor + '20' }]}>
                <Text style={[styles.typeText, { color: typeColor }]}>
                  {item.transaction_type}
                </Text>
              </View>
              {item.receipt_data?.service_name && (
                <Text style={styles.serviceName} numberOfLines={1}>
                  {item.receipt_data.service_name}
                </Text>
              )}
            </View>
          </View>
          <ChevronRight size={20} color={colors.textLight} />
        </View>

        <View style={styles.receiptDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Calendar size={14} color={colors.textLight} />
              <Text style={styles.detailText}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <DollarSign size={14} color={colors.textLight} />
              <Text style={styles.amountText}>
                ${item.amount.toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.detailItem}>
              <Mail size={14} color={colors.textLight} />
              <Text style={styles.detailText}>
                Email: {item.email_status}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please sign in to view receipts</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <FileText size={24} color={colors.primary} />
        <Text style={styles.title}>My Receipts</Text>
      </View>

      <View style={styles.filters}>
        {(['all', 'booking', 'payment', 'refund'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading receipts...</Text>
        </View>
      ) : receipts.length > 0 ? (
        <FlatList
          data={receipts}
          renderItem={renderReceipt}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <FileText size={64} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No Receipts Found</Text>
          <Text style={styles.emptyText}>
            Your transaction receipts will appear here
          </Text>
        </View>
      )}
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
    gap: spacing.sm,
    backgroundColor: colors.white,
    padding: spacing.lg,
    paddingTop: spacing.xxl + spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  filters: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  filterTextActive: {
    color: colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  listContent: {
    padding: spacing.lg,
  },
  receiptCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.md,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  receiptInfo: {
    flex: 1,
  },
  receiptNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  receiptMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  serviceName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  receiptDetails: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  amountText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
    padding: spacing.xl,
  },
});
