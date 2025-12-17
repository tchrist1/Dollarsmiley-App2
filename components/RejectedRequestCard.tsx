import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  AlertCircle,
  FileText,
  Calendar,
  RefreshCw,
  ChevronRight,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { formatVerificationDate } from '@/lib/realtime-verification';
import type { RejectedRequest } from '@/lib/document-resubmission';

interface RejectedRequestCardProps {
  request: RejectedRequest;
  onResubmit: () => void;
  onViewDetails: () => void;
}

export function RejectedRequestCard({
  request,
  onResubmit,
  onViewDetails,
}: RejectedRequestCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <FileText size={20} color={colors.error} />
          <Text style={styles.typeText}>{request.verification_type}</Text>
        </View>
        <View style={styles.statusBadge}>
          <AlertCircle size={16} color={colors.error} />
          <Text style={styles.statusText}>Rejected</Text>
        </View>
      </View>

      <View style={styles.dates}>
        <View style={styles.dateItem}>
          <Calendar size={14} color={colors.textSecondary} />
          <Text style={styles.dateLabel}>Submitted</Text>
          <Text style={styles.dateValue}>
            {formatVerificationDate(request.submitted_at)}
          </Text>
        </View>

        {request.reviewed_at && (
          <View style={styles.dateItem}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={styles.dateLabel}>Reviewed</Text>
            <Text style={styles.dateValue}>
              {formatVerificationDate(request.reviewed_at)}
            </Text>
          </View>
        )}
      </View>

      {request.rejection_reason && (
        <View style={styles.rejectionContainer}>
          <Text style={styles.rejectionLabel}>Rejection Reason</Text>
          <Text style={styles.rejectionText}>{request.rejection_reason}</Text>
        </View>
      )}

      {request.admin_notes && !request.admin_notes.includes('Superseded') && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Admin Notes</Text>
          <Text style={styles.notesText}>{request.admin_notes}</Text>
        </View>
      )}

      {request.documents && request.documents.length > 0 && (
        <View style={styles.documentsContainer}>
          <Text style={styles.documentsLabel}>
            {request.documents.length} document{request.documents.length !== 1 ? 's' : ''} uploaded
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={onResubmit}>
          <RefreshCw size={18} color={colors.white} />
          <Text style={styles.primaryButtonText}>Resubmit</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={onViewDetails}>
          <Text style={styles.secondaryButtonText}>View Details</Text>
          <ChevronRight size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.error + '30',
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  typeText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.error + '20',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.error,
  },
  dates: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  dateItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  dateValue: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  rejectionContainer: {
    padding: spacing.sm,
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
    marginBottom: spacing.md,
  },
  rejectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  rejectionText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: fontSize.sm * 1.5,
  },
  notesContainer: {
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  notesLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  notesText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: fontSize.sm * 1.5,
  },
  documentsContainer: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.md,
  },
  documentsLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  primaryButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});
