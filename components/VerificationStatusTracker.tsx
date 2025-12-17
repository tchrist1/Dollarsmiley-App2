import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  FileText,
  Shield,
  Phone,
  Building,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  verificationRealtimeManager,
  getVerificationStatusColor,
  getVerificationStatusLabel,
  formatVerificationDate,
  getAllVerificationRequests,
  getProfileVerificationStatus,
  type VerificationStatusUpdate,
  type ProfileVerificationUpdate,
} from '@/lib/realtime-verification';

interface VerificationStatusTrackerProps {
  userId: string;
  onRequestPress?: (request: VerificationStatusUpdate) => void;
}

export function VerificationStatusTracker({
  userId,
  onRequestPress,
}: VerificationStatusTrackerProps) {
  const [requests, setRequests] = useState<VerificationStatusUpdate[]>([]);
  const [profileStatus, setProfileStatus] = useState<ProfileVerificationUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();

    const unsubscribe = verificationRealtimeManager.subscribeToAllVerifications(userId, {
      onRequestUpdate: handleRequestUpdate,
      onProfileUpdate: handleProfileUpdate,
      onPhoneUpdate: (update) => {
        if (update.status === 'verified') {
          Alert.alert('Phone Verified', 'Your phone number has been successfully verified!');
        }
      },
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [requestsData, profileData] = await Promise.all([
        getAllVerificationRequests(userId),
        getProfileVerificationStatus(userId),
      ]);

      setRequests(requestsData);
      setProfileStatus(profileData);
    } catch (error) {
      console.error('Error loading verification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRequestUpdate = (update: VerificationStatusUpdate) => {
    console.log('Verification request updated:', update);

    setRequests((prev) => {
      const index = prev.findIndex((r) => r.id === update.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = update;
        return updated;
      } else {
        return [update, ...prev];
      }
    });

    if (update.status === 'Approved') {
      Alert.alert(
        'Verification Approved',
        `Your ${update.verification_type} verification has been approved!`
      );
    } else if (update.status === 'Rejected') {
      Alert.alert(
        'Verification Rejected',
        update.rejection_reason || 'Please review the feedback and try again.'
      );
    } else if (update.status === 'UnderReview') {
      Alert.alert(
        'Under Review',
        `Your ${update.verification_type} verification is now being reviewed.`
      );
    }
  };

  const handleProfileUpdate = (update: ProfileVerificationUpdate) => {
    console.log('Profile verification updated:', update);

    setProfileStatus(update);

    if (update.is_verified && !profileStatus?.is_verified) {
      Alert.alert('Congratulations!', 'Your profile has been fully verified!');
    }
  };

  const getVerificationTypeIcon = (type: string) => {
    switch (type) {
      case 'Identity':
        return <FileText size={20} color={colors.primary} />;
      case 'Business':
        return <Building size={20} color={colors.primary} />;
      case 'Background':
        return <Shield size={20} color={colors.primary} />;
      case 'All':
        return <CheckCircle size={20} color={colors.primary} />;
      default:
        return <AlertCircle size={20} color={colors.textSecondary} />;
    }
  };

  const getStatusIcon = (status: string) => {
    const statusColor = getVerificationStatusColor(status);

    switch (status) {
      case 'Approved':
      case 'Verified':
        return <CheckCircle size={24} color={statusColor} />;
      case 'Pending':
      case 'UnderReview':
        return <Clock size={24} color={statusColor} />;
      case 'Rejected':
        return <XCircle size={24} color={statusColor} />;
      default:
        return <AlertCircle size={24} color={statusColor} />;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading verification status...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Overall Status */}
      {profileStatus && (
        <View style={styles.overallStatus}>
          <View style={styles.overallHeader}>
            <Text style={styles.overallTitle}>Overall Verification Status</Text>
            <View
              style={[
                styles.overallBadge,
                {
                  backgroundColor:
                    getVerificationStatusColor(profileStatus.verification_status) + '20',
                },
              ]}
            >
              {getStatusIcon(profileStatus.verification_status)}
              <Text
                style={[
                  styles.overallBadgeText,
                  {
                    color: getVerificationStatusColor(profileStatus.verification_status),
                  },
                ]}
              >
                {getVerificationStatusLabel(profileStatus.verification_status)}
              </Text>
            </View>
          </View>

          <View style={styles.verificationsGrid}>
            <View style={styles.verificationItem}>
              <FileText size={20} color={profileStatus.id_verified ? colors.success : colors.textSecondary} />
              <Text style={styles.verificationItemLabel}>ID</Text>
              {profileStatus.id_verified && (
                <CheckCircle size={16} color={colors.success} style={styles.verificationCheck} />
              )}
            </View>

            <View style={styles.verificationItem}>
              <Building size={20} color={profileStatus.business_verified ? colors.success : colors.textSecondary} />
              <Text style={styles.verificationItemLabel}>Business</Text>
              {profileStatus.business_verified && (
                <CheckCircle size={16} color={colors.success} style={styles.verificationCheck} />
              )}
            </View>

            <View style={styles.verificationItem}>
              <Phone size={20} color={profileStatus.phone_verified ? colors.success : colors.textSecondary} />
              <Text style={styles.verificationItemLabel}>Phone</Text>
              {profileStatus.phone_verified && (
                <CheckCircle size={16} color={colors.success} style={styles.verificationCheck} />
              )}
            </View>
          </View>

          {profileStatus.verified_at && (
            <Text style={styles.verifiedDate}>
              Verified {formatVerificationDate(profileStatus.verified_at)}
            </Text>
          )}
        </View>
      )}

      {/* Real-time Status Indicator */}
      <View style={styles.realtimeIndicator}>
        <View style={styles.realtimeDot} />
        <Text style={styles.realtimeText}>Real-time updates enabled</Text>
      </View>

      {/* Verification Requests */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Verification Requests</Text>
          <TouchableOpacity onPress={handleRefresh}>
            <RefreshCw size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <AlertCircle size={48} color={colors.textSecondary} />
            <Text style={styles.emptyStateText}>No verification requests yet</Text>
          </View>
        ) : (
          requests.map((request) => (
            <TouchableOpacity
              key={request.id}
              style={styles.requestCard}
              onPress={() => onRequestPress && onRequestPress(request)}
            >
              <View style={styles.requestHeader}>
                <View style={styles.requestType}>
                  {getVerificationTypeIcon(request.verification_type)}
                  <Text style={styles.requestTypeText}>{request.verification_type}</Text>
                </View>
                <View
                  style={[
                    styles.requestStatus,
                    { backgroundColor: getVerificationStatusColor(request.status) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.requestStatusText,
                      { color: getVerificationStatusColor(request.status) },
                    ]}
                  >
                    {getVerificationStatusLabel(request.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.requestDetails}>
                <View style={styles.requestDetail}>
                  <Text style={styles.requestDetailLabel}>Submitted</Text>
                  <Text style={styles.requestDetailValue}>
                    {formatVerificationDate(request.submitted_at)}
                  </Text>
                </View>

                {request.reviewed_at && (
                  <View style={styles.requestDetail}>
                    <Text style={styles.requestDetailLabel}>Reviewed</Text>
                    <Text style={styles.requestDetailValue}>
                      {formatVerificationDate(request.reviewed_at)}
                    </Text>
                  </View>
                )}
              </View>

              {request.rejection_reason && (
                <View style={styles.rejectionReason}>
                  <AlertCircle size={16} color={colors.error} />
                  <Text style={styles.rejectionReasonText}>{request.rejection_reason}</Text>
                </View>
              )}

              {request.admin_notes && request.status !== 'Rejected' && (
                <View style={styles.adminNotes}>
                  <Text style={styles.adminNotesLabel}>Admin Notes:</Text>
                  <Text style={styles.adminNotesText}>{request.admin_notes}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  overallStatus: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  overallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  overallTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  overallBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  overallBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  verificationsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  verificationItem: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  verificationItemLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  verificationCheck: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
  },
  verifiedDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  realtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.success + '10',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: borderRadius.sm,
  },
  realtimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  realtimeText: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: fontWeight.semibold,
  },
  section: {
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  requestCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  requestType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  requestTypeText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  requestStatus: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  requestStatusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  requestDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  requestDetail: {
    flex: 1,
  },
  requestDetailLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  requestDetailValue: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  rejectionReason: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  rejectionReasonText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  adminNotes: {
    padding: spacing.sm,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  adminNotesLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginBottom: spacing.xxs,
  },
  adminNotesText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
});
