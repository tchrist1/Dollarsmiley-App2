import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { AlertTriangle, Clock, Ban, FileText } from 'lucide-react-native';
import { router } from 'expo-router';
import {
  type UserSuspension,
  getTimeRemaining,
  getSeverityColor,
} from '@/lib/suspensions';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface SuspendedUserBannerProps {
  suspension: UserSuspension;
  onAppeal?: () => void;
}

export default function SuspendedUserBanner({
  suspension,
  onAppeal,
}: SuspendedUserBannerProps) {
  const [expanded, setExpanded] = useState(false);

  const isPermanent = suspension.suspension_type === 'permanent';
  const severityColor = getSeverityColor(suspension.severity);

  return (
    <View style={[styles.container, { borderLeftColor: severityColor }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {isPermanent ? (
            <Ban size={24} color={colors.error} />
          ) : (
            <AlertTriangle size={24} color={severityColor} />
          )}
          <View style={styles.headerText}>
            <Text style={styles.title}>
              {isPermanent ? 'Account Banned' : 'Account Suspended'}
            </Text>
            {!isPermanent && suspension.expires_at && (
              <View style={styles.timeRemaining}>
                <Clock size={14} color={colors.textSecondary} />
                <Text style={styles.timeRemainingText}>
                  {getTimeRemaining(suspension.expires_at)}
                </Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={styles.expandButtonText}>
            {expanded ? 'Less' : 'More'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.reason} numberOfLines={expanded ? undefined : 2}>
        {suspension.reason}
      </Text>

      {expanded && (
        <>
          {suspension.details && (
            <View style={styles.detailsSection}>
              <Text style={styles.detailsLabel}>Details:</Text>
              <Text style={styles.detailsText}>{suspension.details}</Text>
            </View>
          )}

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Severity:</Text>
              <View
                style={[
                  styles.severityBadge,
                  { backgroundColor: severityColor + '20' },
                ]}
              >
                <Text style={[styles.severityText, { color: severityColor }]}>
                  {suspension.severity.toUpperCase()}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Suspended on:</Text>
              <Text style={styles.infoValue}>
                {new Date(suspension.suspended_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>

            {!isPermanent && suspension.expires_at && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Expires on:</Text>
                <Text style={styles.infoValue}>
                  {new Date(suspension.expires_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.appealButton}
              onPress={() => {
                if (onAppeal) {
                  onAppeal();
                } else {
                  router.push('/settings/strikes' as any);
                }
              }}
            >
              <FileText size={18} color={colors.primary} />
              <Text style={styles.appealButtonText}>Appeal Suspension</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {!expanded && (
        <TouchableOpacity
          style={styles.quickAppeal}
          onPress={() => {
            if (onAppeal) {
              onAppeal();
            } else {
              router.push('/settings/strikes' as any);
            }
          }}
        >
          <FileText size={16} color={colors.primary} />
          <Text style={styles.quickAppealText}>Appeal</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderLeftWidth: 4,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  timeRemaining: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeRemainingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  expandButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  expandButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  reason: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  detailsSection: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  detailsLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  detailsText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  infoSection: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  severityText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  actions: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  appealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  appealButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  quickAppeal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quickAppealText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});
