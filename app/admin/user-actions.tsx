import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { safeGoBack } from '@/lib/navigation-utils';
import {
  ArrowLeft,
  Search,
  Shield,
  Clock,
  Ban,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  getUserSuspensions,
  getActiveSuspension,
  liftSuspension,
  getSeverityColor,
  getTimeRemaining,
  type UserSuspension,
} from '@/lib/suspensions';
import SuspendUserModal from '@/components/SuspendUserModal';
import BanUserModal from '@/components/BanUserModal';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  is_suspended: boolean;
  suspension_expires_at?: string;
}

export default function AdminUserActionsScreen() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userSuspensions, setUserSuspensions] = useState<UserSuspension[]>([]);
  const [activeSuspension, setActiveSuspension] = useState<UserSuspension | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_suspended, suspension_expires_at')
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .limit(10);

      if (error) throw error;

      setSearchResults((data || []) as UserProfile[]);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectUser = async (user: UserProfile) => {
    setSelectedUser(user);
    setSearchResults([]);
    setSearchQuery('');
    setLoading(true);

    try {
      const [suspensions, active] = await Promise.all([
        getUserSuspensions(user.id),
        getActiveSuspension(user.id),
      ]);
      setUserSuspensions(suspensions);
      setActiveSuspension(active);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLiftSuspension = (suspension: UserSuspension) => {
    Alert.alert(
      'Lift Suspension',
      'Are you sure you want to lift this suspension?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Lift',
          style: 'destructive',
          onPress: async () => {
            const result = await liftSuspension(
              suspension.id,
              'Lifted by admin via user actions screen'
            );
            if (result.success) {
              Alert.alert('Success', 'Suspension lifted successfully');
              if (selectedUser) {
                handleSelectUser(selectedUser);
              }
            } else {
              Alert.alert('Error', result.error || 'Failed to lift suspension');
            }
          },
        },
      ]
    );
  };

  const handleActionComplete = () => {
    if (selectedUser) {
      handleSelectUser(selectedUser);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={safeGoBack} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>User Actions</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>Find User</Text>
          <View style={styles.searchBar}>
            <Search size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or email"
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            {searching && <ActivityIndicator size="small" color={colors.primary} />}
          </View>

          {searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map((user) => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.searchResultItem}
                  onPress={() => handleSelectUser(user)}
                >
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultName}>{user.full_name}</Text>
                    <Text style={styles.searchResultEmail}>{user.email}</Text>
                  </View>
                  {user.is_suspended && (
                    <View style={styles.suspendedBadge}>
                      <AlertTriangle size={14} color={colors.error} />
                      <Text style={styles.suspendedBadgeText}>Suspended</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {selectedUser && (
          <View style={styles.userSection}>
            <View style={styles.userHeader}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {selectedUser.full_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{selectedUser.full_name}</Text>
                <Text style={styles.userEmail}>{selectedUser.email}</Text>
              </View>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <>
                {activeSuspension ? (
                  <View style={styles.activeSupensionCard}>
                    <View style={styles.activeSuspensionHeader}>
                      <View style={styles.activeSuspensionHeaderLeft}>
                        {activeSuspension.suspension_type === 'permanent' ? (
                          <Ban size={20} color={colors.error} />
                        ) : (
                          <AlertTriangle
                            size={20}
                            color={getSeverityColor(activeSuspension.severity)}
                          />
                        )}
                        <Text style={styles.activeSuspensionTitle}>
                          {activeSuspension.suspension_type === 'permanent'
                            ? 'Permanently Banned'
                            : 'Currently Suspended'}
                        </Text>
                      </View>
                      {activeSuspension.expires_at && (
                        <View style={styles.timeRemainingBadge}>
                          <Clock size={14} color={colors.textSecondary} />
                          <Text style={styles.timeRemainingText}>
                            {getTimeRemaining(activeSuspension.expires_at)}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.suspensionReason}>{activeSuspension.reason}</Text>

                    {activeSuspension.details && (
                      <Text style={styles.suspensionDetails}>{activeSuspension.details}</Text>
                    )}

                    <View style={styles.suspensionMeta}>
                      <View
                        style={[
                          styles.severityBadge,
                          {
                            backgroundColor:
                              getSeverityColor(activeSuspension.severity) + '20',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.severityText,
                            {
                              color: getSeverityColor(activeSuspension.severity),
                            },
                          ]}
                        >
                          {activeSuspension.severity.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.suspensionDate}>
                        Since{' '}
                        {new Date(activeSuspension.suspended_at).toLocaleDateString()}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.liftButton}
                      onPress={() => handleLiftSuspension(activeSuspension)}
                    >
                      <CheckCircle size={18} color={colors.success} />
                      <Text style={styles.liftButtonText}>Lift Suspension</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.actionsCard}>
                    <Text style={styles.actionsTitle}>User Actions</Text>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => setShowSuspendModal(true)}
                    >
                      <Clock size={20} color={colors.secondary} />
                      <View style={styles.actionButtonContent}>
                        <Text style={styles.actionButtonTitle}>Temporary Suspension</Text>
                        <Text style={styles.actionButtonDescription}>
                          Suspend user for a specific duration
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => setShowBanModal(true)}
                    >
                      <Ban size={20} color={colors.error} />
                      <View style={styles.actionButtonContent}>
                        <Text style={styles.actionButtonTitle}>Permanent Ban</Text>
                        <Text style={styles.actionButtonDescription}>
                          Permanently ban user from platform
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                )}

                {userSuspensions.length > 0 && (
                  <View style={styles.historySection}>
                    <Text style={styles.sectionTitle}>Suspension History</Text>
                    {userSuspensions.map((suspension) => (
                      <View key={suspension.id} style={styles.historyItem}>
                        <View style={styles.historyItemHeader}>
                          <View
                            style={[
                              styles.severityBadge,
                              {
                                backgroundColor: getSeverityColor(suspension.severity) + '20',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.severityText,
                                { color: getSeverityColor(suspension.severity) },
                              ]}
                            >
                              {suspension.severity}
                            </Text>
                          </View>
                          <Text style={styles.historyDate}>
                            {new Date(suspension.suspended_at).toLocaleDateString()}
                          </Text>
                        </View>
                        <Text style={styles.historyReason}>{suspension.reason}</Text>
                        <View style={styles.historyStatus}>
                          {suspension.is_active ? (
                            <Text style={styles.historyStatusActive}>Active</Text>
                          ) : suspension.lifted_at ? (
                            <Text style={styles.historyStatusLifted}>
                              Lifted on {new Date(suspension.lifted_at).toLocaleDateString()}
                            </Text>
                          ) : (
                            <Text style={styles.historyStatusExpired}>Expired</Text>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {!selectedUser && !searchResults.length && (
          <View style={styles.emptyState}>
            <Shield size={64} color={colors.textSecondary} />
            <Text style={styles.emptyStateTitle}>Search for a User</Text>
            <Text style={styles.emptyStateText}>
              Enter a user's name or email to view their account status and take action
            </Text>
          </View>
        )}
      </ScrollView>

      {selectedUser && (
        <>
          <SuspendUserModal
            visible={showSuspendModal}
            userId={selectedUser.id}
            userName={selectedUser.full_name}
            onClose={() => setShowSuspendModal(false)}
            onSuspended={handleActionComplete}
          />

          <BanUserModal
            visible={showBanModal}
            userId={selectedUser.id}
            userName={selectedUser.full_name}
            onClose={() => setShowBanModal(false)}
            onBanned={handleActionComplete}
          />
        </>
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
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  searchSection: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  searchResults: {
    marginTop: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  searchResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  searchResultEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  suspendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.error + '10',
    borderRadius: borderRadius.sm,
  },
  suspendedBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  userSection: {
    padding: spacing.md,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  userAvatarText: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  loadingContainer: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  activeSupensionCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    ...shadows.sm,
  },
  activeSuspensionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  activeSuspensionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activeSuspensionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  timeRemainingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  timeRemainingText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  suspensionReason: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  suspensionDetails: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  suspensionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
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
  suspensionDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  liftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    backgroundColor: colors.success + '10',
    borderRadius: borderRadius.md,
  },
  liftButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  actionsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  actionsTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  actionButtonDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  historySection: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  historyItem: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  historyDate: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  historyReason: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  historyStatus: {
    marginTop: spacing.xs,
  },
  historyStatusActive: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  historyStatusLifted: {
    fontSize: fontSize.xs,
    color: colors.success,
  },
  historyStatusExpired: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyStateTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
