import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Button } from './Button';
import {
  CheckCircle,
  XCircle,
  X,
  Calendar,
  Clock,
  DollarSign,
  User,
  AlertTriangle,
  Shield,
  MessageCircle,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface BookingData {
  id: string;
  title: string;
  customer_name: string;
  scheduled_date: string;
  scheduled_time: string;
  price: number;
  location: string;
  description?: string;
}

interface BookingAcceptRejectModalProps {
  visible: boolean;
  type: 'accept' | 'reject';
  booking: BookingData | null;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
  loading?: boolean;
}

const REJECTION_REASONS = [
  'Schedule conflict',
  'Outside service area',
  'Insufficient notice',
  'Service not available',
  'Personal reasons',
  'Other (specify below)',
];

export function BookingAcceptRejectModal({
  visible,
  type,
  booking,
  onClose,
  onConfirm,
  loading = false,
}: BookingAcceptRejectModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');

  if (!booking) return null;

  const handleConfirm = async () => {
    if (type === 'reject') {
      const reason =
        selectedReason === 'Other (specify below)'
          ? customReason
          : selectedReason || customReason;

      if (!reason.trim()) {
        return;
      }

      await onConfirm(reason);
    } else {
      await onConfirm(notes);
    }

    setSelectedReason('');
    setCustomReason('');
    setNotes('');
  };

  const providerEarnings = booking.price * 0.9;

  const renderAcceptContent = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.successIconContainer}>
        <CheckCircle size={64} color={colors.success} />
      </View>

      <Text style={styles.modalTitle}>Accept Booking?</Text>
      <Text style={styles.modalSubtitle}>
        Confirm that you want to accept this booking request
      </Text>

      <View style={styles.bookingCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <User size={20} color={colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Customer</Text>
            <Text style={styles.infoValue}>{booking.customer_name}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Calendar size={20} color={colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Service Date</Text>
            <Text style={styles.infoValue}>
              {new Date(booking.scheduled_date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Clock size={20} color={colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Time</Text>
            <Text style={styles.infoValue}>{booking.scheduled_time}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <DollarSign size={20} color={colors.success} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>Your Earnings</Text>
            <Text style={[styles.infoValue, styles.earningsValue]}>
              ${Math.round(providerEarnings).toLocaleString('en-US')}
            </Text>
            <Text style={styles.infoSubtext}>
              (${Math.round(booking.price).toLocaleString('en-US')} - 10% platform fee)
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.protectionBox}>
        <Shield size={20} color={colors.success} />
        <View style={styles.protectionContent}>
          <Text style={styles.protectionTitle}>Payment Protection</Text>
          <Text style={styles.protectionText}>
            Payment is held in escrow and will be released to your wallet after service
            completion.
          </Text>
        </View>
      </View>

      <View style={styles.notesSection}>
        <Text style={styles.notesLabel}>Notes (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Add any notes for the customer..."
          placeholderTextColor={colors.textLight}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
    </ScrollView>
  );

  const renderRejectContent = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.errorIconContainer}>
        <XCircle size={64} color={colors.error} />
      </View>

      <Text style={styles.modalTitle}>Decline Booking?</Text>
      <Text style={styles.modalSubtitle}>
        Please provide a reason for declining this booking
      </Text>

      <View style={styles.bookingInfoCard}>
        <Text style={styles.bookingInfoTitle}>{booking.title}</Text>
        <Text style={styles.bookingInfoCustomer}>{booking.customer_name}</Text>
        <Text style={styles.bookingInfoDate}>
          {new Date(booking.scheduled_date).toLocaleDateString()} at {booking.scheduled_time}
        </Text>
      </View>

      <View style={styles.reasonsSection}>
        <Text style={styles.reasonsTitle}>Select a reason:</Text>
        {REJECTION_REASONS.map((reason) => (
          <TouchableOpacity
            key={reason}
            style={[
              styles.reasonOption,
              selectedReason === reason && styles.reasonOptionSelected,
            ]}
            onPress={() => setSelectedReason(reason)}
          >
            <View
              style={[
                styles.radioButton,
                selectedReason === reason && styles.radioButtonSelected,
              ]}
            >
              {selectedReason === reason && <View style={styles.radioButtonInner} />}
            </View>
            <Text
              style={[
                styles.reasonText,
                selectedReason === reason && styles.reasonTextSelected,
              ]}
            >
              {reason}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {(selectedReason === 'Other (specify below)' || !selectedReason) && (
        <View style={styles.customReasonSection}>
          <Text style={styles.customReasonLabel}>
            {selectedReason === 'Other (specify below)'
              ? 'Please specify the reason:'
              : 'Or enter a custom reason:'}
          </Text>
          <TextInput
            style={styles.customReasonInput}
            placeholder="Enter your reason..."
            placeholderTextColor={colors.textLight}
            value={customReason}
            onChangeText={setCustomReason}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      )}

      <View style={styles.warningBox}>
        <AlertTriangle size={20} color={colors.warning} />
        <View style={styles.warningContent}>
          <Text style={styles.warningTitle}>Refund Notice</Text>
          <Text style={styles.warningText}>
            The customer will receive a full refund within 5-10 business days.
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  const isConfirmDisabled =
    loading || (type === 'reject' && !selectedReason && !customReason.trim());

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>
              {type === 'accept' ? 'Accept Booking' : 'Decline Booking'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={loading}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {type === 'accept' ? renderAcceptContent() : renderRejectContent()}

          <View style={styles.modalActions}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={styles.actionButton}
              disabled={loading}
            />
            <Button
              title={type === 'accept' ? 'Accept Booking' : 'Decline Booking'}
              onPress={handleConfirm}
              style={styles.actionButton}
              loading={loading}
              disabled={isConfirmDisabled}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHeaderTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  successIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  errorIconContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  bookingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  infoValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  infoSubtext: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  earningsValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  protectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.success + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  protectionContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  protectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  protectionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  notesSection: {
    marginBottom: spacing.md,
  },
  notesLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  notesInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
  },
  bookingInfoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  bookingInfoTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  bookingInfoCustomer: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  bookingInfoDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  reasonsSection: {
    marginBottom: spacing.md,
  },
  reasonsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    marginBottom: spacing.xs,
  },
  reasonOptionSelected: {
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  radioButtonSelected: {
    borderColor: colors.primary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  reasonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  reasonTextSelected: {
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  customReasonSection: {
    marginBottom: spacing.md,
  },
  customReasonLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  customReasonInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.sm,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 100,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  warningContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  warningTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  warningText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
  },
});
