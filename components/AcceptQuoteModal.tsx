import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  CheckCircle,
  DollarSign,
  Calendar,
  Clock,
  MapPin,
  User,
  AlertCircle,
  Shield,
  X,
  Info,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { Button } from './Button';

interface AcceptQuoteModalProps {
  visible: boolean;
  quote: {
    id: string;
    price: number;
    provider: {
      full_name: string;
      rating_average: number;
      rating_count: number;
    };
    estimated_duration?: number;
    estimated_duration_unit?: string;
    deposit_required?: number;
  } | null;
  job: {
    title: string;
    location?: string;
    execution_date_start?: string;
  } | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function AcceptQuoteModal({ visible, quote, job, onClose, onConfirm }: AcceptQuoteModalProps) {
  const [accepting, setAccepting] = useState(false);
  const [agreed, setAgreed] = useState(false);

  if (!quote || !job) return null;

  const handleConfirm = async () => {
    if (!agreed) return;

    setAccepting(true);
    try {
      await onConfirm();
    } finally {
      setAccepting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <CheckCircle size={32} color={colors.success} />
            </View>
            <Text style={styles.title}>Accept Quote?</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Job Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Job Details</Text>
              <View style={styles.jobCard}>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <View style={styles.jobMeta}>
                  {job.location && (
                    <View style={styles.metaItem}>
                      <MapPin size={14} color={colors.textSecondary} />
                      <Text style={styles.metaText}>{job.location}</Text>
                    </View>
                  )}
                  {job.execution_date_start && (
                    <View style={styles.metaItem}>
                      <Calendar size={14} color={colors.textSecondary} />
                      <Text style={styles.metaText}>
                        {new Date(job.execution_date_start).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Provider Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Selected Provider</Text>
              <View style={styles.providerCard}>
                <View style={styles.providerHeader}>
                  <View style={styles.avatar}>
                    <User size={24} color={colors.white} />
                  </View>
                  <View style={styles.providerInfo}>
                    <Text style={styles.providerName}>{quote.provider.full_name}</Text>
                    {quote.provider.rating_count > 0 && (
                      <Text style={styles.providerRating}>
                        ⭐ {quote.provider.rating_average.toFixed(1)} ({quote.provider.rating_count}{' '}
                        reviews)
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* Price Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Summary</Text>
              <View style={styles.priceCard}>
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Total Amount</Text>
                  <View style={styles.priceAmount}>
                    <DollarSign size={20} color={colors.text} />
                    <Text style={styles.priceValue}>{Math.round(quote.price).toLocaleString('en-US')}</Text>
                  </View>
                </View>

                {quote.deposit_required && quote.deposit_required > 0 && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.depositNotice}>
                      <AlertCircle size={16} color={colors.warning} />
                      <Text style={styles.depositText}>
                        Deposit Required: ${Math.round(quote.deposit_required).toLocaleString('en-US')}
                      </Text>
                    </View>
                  </>
                )}

                {quote.estimated_duration && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.priceRow}>
                      <View style={styles.metaItem}>
                        <Clock size={16} color={colors.textSecondary} />
                        <Text style={styles.metaText}>
                          Estimated: {quote.estimated_duration} {quote.estimated_duration_unit || 'hours'}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* What Happens Next */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What Happens Next</Text>
              <View style={styles.stepsList}>
                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Booking Confirmed</Text>
                    <Text style={styles.stepText}>
                      Your booking will be confirmed and the provider notified
                    </Text>
                  </View>
                </View>

                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Other Quotes Cancelled</Text>
                    <Text style={styles.stepText}>All other quotes for this job will be declined</Text>
                  </View>
                </View>

                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Payment Secured</Text>
                    <Text style={styles.stepText}>
                      Funds will be held in escrow until service completion
                    </Text>
                  </View>
                </View>

                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>4</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Stay Connected</Text>
                    <Text style={styles.stepText}>
                      You can message the provider and track progress
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Important Information */}
            <View style={styles.section}>
              <View style={styles.infoCard}>
                <Info size={20} color={colors.primary} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Cancellation Policy</Text>
                  <Text style={styles.infoText}>
                    You can cancel within 24 hours of acceptance for a full refund. After 24 hours,
                    cancellation fees may apply.
                  </Text>
                </View>
              </View>
            </View>

            {/* Terms Agreement */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setAgreed(!agreed)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                  {agreed && <CheckCircle size={20} color={colors.white} />}
                </View>
                <Text style={styles.checkboxText}>
                  I agree to the terms and understand that this action cannot be easily undone
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={accepting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, (!agreed || accepting) && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={!agreed || accepting}
            >
              {accepting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <CheckCircle size={20} color={colors.white} />
                  <Text style={styles.confirmButtonText}>Confirm & Accept</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'hidden',
    ...shadows.lg,
  },
  header: {
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    position: 'relative',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    backgroundColor: colors.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
    maxHeight: 500,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  jobCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  jobTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  jobMeta: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  providerCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  providerRating: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  priceCard: {
    padding: spacing.md,
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  priceAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  priceValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  depositNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.warning + '15',
    borderRadius: borderRadius.md,
  },
  depositText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: fontWeight.medium,
  },
  stepsList: {
    gap: spacing.md,
  },
  step: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  stepText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  infoCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
