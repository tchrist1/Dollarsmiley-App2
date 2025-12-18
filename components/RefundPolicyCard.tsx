import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, AlertCircle, XCircle, Info } from 'lucide-react-native';
import { CustomServicePricing } from '@/lib/custom-service-pricing';
import { RefundPolicy } from '@/types/database';

interface RefundPolicyCardProps {
  policy: RefundPolicy;
  finalPrice: number;
  shippingCost?: number;
  compact?: boolean;
}

export default function RefundPolicyCard({
  policy,
  finalPrice,
  shippingCost = 0,
  compact = false,
}: RefundPolicyCardProps) {
  const refundAmount = CustomServicePricing.getRefundAmount(
    finalPrice,
    policy,
    shippingCost
  );

  const getPolicyInfo = () => {
    switch (policy) {
      case 'fully_refundable':
        return {
          label: 'Fully Refundable',
          description: 'You can cancel and receive a full refund at this stage',
          icon: CheckCircle,
          color: '#059669',
          bgColor: '#D1FAE5',
          borderColor: '#10B981',
        };
      case 'partially_refundable':
        return {
          label: 'Partially Refundable',
          description: 'Shipping costs are non-refundable',
          icon: AlertCircle,
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          borderColor: '#F59E0B',
        };
      case 'non_refundable':
        return {
          label: 'Non-Refundable',
          description: 'Production has started. Order cannot be refunded',
          icon: XCircle,
          color: '#EF4444',
          bgColor: '#FEE2E2',
          borderColor: '#EF4444',
        };
      default:
        return {
          label: 'Unknown Policy',
          description: 'Contact support for refund information',
          icon: Info,
          color: '#6B7280',
          bgColor: '#F3F4F6',
          borderColor: '#9CA3AF',
        };
    }
  };

  const policyInfo = getPolicyInfo();
  const Icon = policyInfo.icon;

  if (compact) {
    return (
      <View
        style={[
          styles.compactContainer,
          {
            backgroundColor: policyInfo.bgColor,
            borderColor: policyInfo.borderColor,
          },
        ]}
      >
        <Icon size={16} color={policyInfo.color} />
        <Text style={[styles.compactLabel, { color: policyInfo.color }]}>
          {policyInfo.label}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: policyInfo.bgColor,
          borderColor: policyInfo.borderColor,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Icon size={20} color={policyInfo.color} />
          <Text style={[styles.label, { color: policyInfo.color }]}>
            {policyInfo.label}
          </Text>
        </View>
        {refundAmount > 0 && (
          <Text style={[styles.amount, { color: policyInfo.color }]}>
            ${refundAmount.toFixed(2)}
          </Text>
        )}
      </View>

      <Text style={styles.description}>{policyInfo.description}</Text>

      {policy === 'partially_refundable' && shippingCost > 0 && (
        <View style={styles.breakdown}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Order Total:</Text>
            <Text style={styles.breakdownValue}>${finalPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Shipping (non-refundable):</Text>
            <Text style={styles.breakdownValue}>-${shippingCost.toFixed(2)}</Text>
          </View>
          <View style={[styles.breakdownRow, styles.breakdownTotal]}>
            <Text style={styles.breakdownTotalLabel}>Refundable Amount:</Text>
            <Text style={[styles.breakdownTotalValue, { color: policyInfo.color }]}>
              ${refundAmount.toFixed(2)}
            </Text>
          </View>
        </View>
      )}

      {refundAmount === 0 && policy === 'non_refundable' && (
        <View style={styles.infoBox}>
          <Info size={16} color="#6B7280" />
          <Text style={styles.infoText}>
            Refunds are not available once production has begun. Please contact the provider if
            there are quality issues.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  compactLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  breakdown: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  breakdownValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
  },
  breakdownTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  breakdownTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  breakdownTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 16,
  },
});
