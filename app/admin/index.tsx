import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import AdminDisputesManager from '@/components/AdminDisputesManager';
import AdminPayoutsManager from '@/components/AdminPayoutsManager';
import AdminAnnouncementsManager from '@/components/AdminAnnouncementsManager';
import ExportMenu from '@/components/ExportMenu';
import BulkActionsBar from '@/components/BulkActionsBar';
import ScheduledReportsManager from '@/components/ScheduledReportsManager';
import ResponsiveGrid from '@/components/ResponsiveGrid';
import { LineChartCard, PieChartCard, MultiLineChartCard } from '@/components/AnalyticsCharts';
import {
  getUserGrowthData,
  getRevenueData,
  getBookingsData,
  getActiveUsersData,
  getUserTypeDistribution,
  getSubscriptionDistribution,
  getAnalyticsOverview,
  type ChartData,
  type DistributionData,
  type AnalyticsOverview as AnalyticsOverviewType,
} from '@/lib/analytics';
import {
  Shield,
  Users,
  FileText,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  BarChart3,
  Activity,
  DollarSign,
  Download,
  Send,
  Award,
  CreditCard,
  Trash2,
  Megaphone,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  totalListings: number;
  pendingVerifications: number;
  totalRevenue: number;
  platformFees: number;
  completedBookings: number;
  activeDisputes: number;
  escrowsHeld: number;
  totalEscrowAmount: number;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  user_type: string;
  is_suspended: boolean;
  is_verified: boolean;
  created_at: string;
}

interface PendingVerification {
  id: string;
  provider_id: string;
  status: string;
  submitted_at: string;
  provider: {
    full_name: string;
    email: string;
  };
}

type TabType = 'overview' | 'users' | 'verifications' | 'disputes' | 'payouts' | 'analytics' | 'reports' | 'announcements';

export default function AdminDashboardScreen() {
  const { profile } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    totalListings: 0,
    pendingVerifications: 0,
    totalRevenue: 0,
    platformFees: 0,
    completedBookings: 0,
    activeDisputes: 0,
    escrowsHeld: 0,
    totalEscrowAmount: 0,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [verifications, setVerifications] = useState<PendingVerification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [analyticsData, setAnalyticsData] = useState<{
    userGrowth: ChartData;
    revenue: ChartData;
    bookings: ChartData;
    activeUsers: ChartData;
    userTypes: DistributionData[];
    subscriptions: DistributionData[];
    overview: AnalyticsOverviewType | null;
  }>({
    userGrowth: { labels: [], datasets: [{ data: [] }] },
    revenue: { labels: [], datasets: [{ data: [] }] },
    bookings: { labels: [], datasets: [{ data: [] }] },
    activeUsers: { labels: [], datasets: [{ data: [] }] },
    userTypes: [],
    subscriptions: [],
    overview: null,
  });
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [exportMenuVisible, setExportMenuVisible] = useState(false);
  const [exportConfig, setExportConfig] = useState<{
    type: 'users' | 'bookings' | 'revenue' | 'analytics' | 'disputes' | 'payouts';
    title: string;
  }>({ type: 'users', title: 'Users' });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedVerificationIds, setSelectedVerificationIds] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      checkAdminStatus();
    }
  }, [profile]);

  const checkAdminStatus = async () => {
    if (!profile) return;

    // Check both user_type === 'Admin' AND admin_mode preference
    if (profile.user_type === 'Admin' && profile.admin_mode !== false) {
      setIsAdmin(true);
      fetchDashboardData();
    } else {
      setIsAdmin(false);
      setLoading(false);
      // Redirect to profile if not in admin mode
      if (profile.user_type === 'Admin' && profile.admin_mode === false) {
        router.push('/(tabs)/profile');
      }
    }
  };

  const fetchAnalyticsData = async () => {
    setLoadingAnalytics(true);
    try {
      const [
        userGrowth,
        revenue,
        bookings,
        activeUsers,
        userTypes,
        subscriptions,
        overview,
      ] = await Promise.all([
        getUserGrowthData(30),
        getRevenueData(30),
        getBookingsData(30),
        getActiveUsersData(30),
        getUserTypeDistribution(),
        getSubscriptionDistribution(),
        getAnalyticsOverview(),
      ]);

      setAnalyticsData({
        userGrowth,
        revenue,
        bookings,
        activeUsers,
        userTypes,
        subscriptions,
        overview,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);

    const today = new Date().toISOString().split('T')[0];

    const [
      { count: totalUsers },
      { count: newUsers },
      { count: totalListings },
      { data: pendingVerifications },
      { data: metrics },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today),
      supabase.from('service_listings').select('*', { count: 'exact', head: true }),
      supabase
        .from('provider_verification_requests')
        .select('*, provider:profiles!provider_verification_requests_provider_id_fkey(*)')
        .eq('status', 'Pending'),
      supabase
        .from('platform_metrics')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(1),
    ]);

    const latestMetrics = metrics?.[0];

    const [{ count: activeDisputes }, { data: escrows }] = await Promise.all([
      supabase.from('disputes').select('*', { count: 'exact', head: true }).in('status', ['Open', 'UnderReview']),
      supabase.from('escrow_holds').select('amount').eq('status', 'Held'),
    ]);

    const totalEscrow = escrows?.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;

    setStats({
      totalUsers: totalUsers || 0,
      activeUsers: latestMetrics?.active_users || 0,
      newUsersToday: newUsers || 0,
      totalListings: totalListings || 0,
      pendingVerifications: pendingVerifications?.length || 0,
      totalRevenue: latestMetrics?.total_revenue || 0,
      platformFees: latestMetrics?.platform_fees || 0,
      completedBookings: latestMetrics?.completed_bookings || 0,
      activeDisputes: activeDisputes || 0,
      escrowsHeld: escrows?.length || 0,
      totalEscrowAmount: totalEscrow,
    });

    setVerifications(pendingVerifications || []);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    setUsers(data || []);
  };

  const handleSuspendUser = async (userId: string, suspend: boolean) => {
    if (!profile) return;

    const action = suspend ? 'suspend' : 'activate';

    Alert.alert(
      `${suspend ? 'Suspend' : 'Activate'} User`,
      `Are you sure you want to ${action} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('profiles')
              .update({
                is_suspended: suspend,
                suspension_reason: suspend ? 'Suspended by admin' : null,
              })
              .eq('id', userId);

            if (!error) {
              await supabase.rpc('log_admin_action', {
                p_admin_id: profile.id,
                p_action_type: suspend ? 'UserSuspend' : 'UserActivate',
                p_target_type: 'User',
                p_target_id: userId,
              });

              Alert.alert('Success', `User ${action}d successfully`);
              fetchUsers();
            }
          },
        },
      ]
    );
  };

  const handleVerificationAction = async (
    verificationId: string,
    approve: boolean,
    reason?: string
  ) => {
    if (!profile) return;

    const { error } = await supabase
      .from('provider_verification_requests')
      .update({
        status: approve ? 'Approved' : 'Rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: profile.id,
        rejection_reason: reason,
      })
      .eq('id', verificationId);

    if (!error) {
      await supabase.rpc('log_admin_action', {
        p_admin_id: profile.id,
        p_action_type: approve ? 'VerificationApprove' : 'VerificationReject',
        p_target_type: 'Verification',
        p_target_id: verificationId,
      });

      Alert.alert('Success', `Verification ${approve ? 'approved' : 'rejected'}`);
      fetchDashboardData();
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleVerificationSelection = (verificationId: string) => {
    setSelectedVerificationIds((prev) =>
      prev.includes(verificationId)
        ? prev.filter((id) => id !== verificationId)
        : [...prev, verificationId]
    );
  };

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <TouchableOpacity
        style={[
          styles.checkbox,
          selectedUserIds.includes(item.id) && styles.checkboxChecked,
        ]}
        onPress={() => toggleUserSelection(item.id)}
      >
        {selectedUserIds.includes(item.id) && (
          <CheckCircle size={20} color={colors.primary} />
        )}
      </TouchableOpacity>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.full_name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <View style={styles.userMeta}>
          <Text style={styles.userType}>{item.user_type}</Text>
          {item.is_verified && (
            <View style={styles.verifiedBadge}>
              <CheckCircle size={12} color={colors.success} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          )}
          {item.is_suspended && (
            <View style={styles.suspendedBadge}>
              <XCircle size={12} color={colors.error} />
              <Text style={styles.suspendedText}>Suspended</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.actionButton,
          item.is_suspended ? styles.activateButton : styles.suspendButton,
        ]}
        onPress={() => handleSuspendUser(item.id, !item.is_suspended)}
      >
        <Text
          style={[
            styles.actionButtonText,
            item.is_suspended ? styles.activateButtonText : styles.suspendButtonText,
          ]}
        >
          {item.is_suspended ? 'Activate' : 'Suspend'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderVerification = ({ item }: { item: PendingVerification }) => (
    <View style={styles.verificationCard}>
      <TouchableOpacity
        style={[
          styles.checkbox,
          selectedVerificationIds.includes(item.id) && styles.checkboxChecked,
        ]}
        onPress={() => toggleVerificationSelection(item.id)}
      >
        {selectedVerificationIds.includes(item.id) && (
          <CheckCircle size={20} color={colors.primary} />
        )}
      </TouchableOpacity>
      <View style={styles.verificationInfo}>
        <Text style={styles.verificationName}>{item.provider.full_name}</Text>
        <Text style={styles.verificationEmail}>{item.provider.email}</Text>
        <Text style={styles.verificationDate}>
          Submitted {new Date(item.submitted_at).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.verificationActions}>
        <TouchableOpacity
          style={styles.approveButton}
          onPress={() => handleVerificationAction(item.id, true)}
        >
          <CheckCircle size={20} color={colors.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={() => {
            Alert.prompt(
              'Reject Verification',
              'Please provide a reason for rejection:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reject',
                  style: 'destructive',
                  onPress: (reason?: string) => handleVerificationAction(item.id, false, reason),
                },
              ]
            );
          }}
        >
          <XCircle size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please sign in to access admin dashboard</Text>
      </View>
    );
  }

  if (!isAdmin && !loading) {
    return (
      <View style={styles.container}>
        <View style={styles.unauthorizedContainer}>
          <Shield size={64} color={colors.textLight} />
          <Text style={styles.unauthorizedTitle}>Access Denied</Text>
          <Text style={styles.unauthorizedText}>
            You do not have permission to access the admin dashboard
          </Text>
          <Button title="Go Back" onPress={() => router.back()} style={styles.goBackButton} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Shield size={24} color={colors.primary} />
          <Text style={styles.title}>Admin Dashboard</Text>
        </View>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => {
            const configMap = {
              overview: { type: 'analytics' as const, title: 'Analytics' },
              users: { type: 'users' as const, title: 'Users' },
              verifications: { type: 'users' as const, title: 'Verifications' },
              disputes: { type: 'disputes' as const, title: 'Disputes' },
              payouts: { type: 'payouts' as const, title: 'Payouts' },
              analytics: { type: 'analytics' as const, title: 'Analytics' },
              reports: { type: 'analytics' as const, title: 'Reports' },
              announcements: { type: 'users' as const, title: 'Announcements' },
            };
            setExportConfig(configMap[activeTab]);
            setExportMenuVisible(true);
          }}
        >
          <Download size={20} color={colors.primary} />
          <Text style={styles.exportButtonText}>Export</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabs}
      >
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]} numberOfLines={1}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => {
            setActiveTab('users');
            fetchUsers();
          }}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]} numberOfLines={1}>
            Users
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'verifications' && styles.activeTab]}
          onPress={() => setActiveTab('verifications')}
        >
          <Text style={[styles.tabText, activeTab === 'verifications' && styles.activeTabText]} numberOfLines={1}>
            Verifications
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'disputes' && styles.activeTab]}
          onPress={() => setActiveTab('disputes')}
        >
          <Text style={[styles.tabText, activeTab === 'disputes' && styles.activeTabText]} numberOfLines={1}>
            Disputes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payouts' && styles.activeTab]}
          onPress={() => setActiveTab('payouts')}
        >
          <Text style={[styles.tabText, activeTab === 'payouts' && styles.activeTabText]} numberOfLines={1}>
            Payouts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'analytics' && styles.activeTab]}
          onPress={() => {
            setActiveTab('analytics');
            fetchAnalyticsData();
          }}
        >
          <Text style={[styles.tabText, activeTab === 'analytics' && styles.activeTabText]} numberOfLines={1}>
            Analytics
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
          onPress={() => setActiveTab('reports')}
        >
          <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]} numberOfLines={1}>
            Reports
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'announcements' && styles.activeTab]}
          onPress={() => setActiveTab('announcements')}
        >
          <Text style={[styles.tabText, activeTab === 'announcements' && styles.activeTabText]} numberOfLines={1}>
            Announcements
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustContentInsets={false}
        contentInset={{ top: 0, bottom: 0, left: 0, right: 0 }}
        contentOffset={{ x: 0, y: 0 }}
      >
        {activeTab === 'overview' && (
          <>
            <View style={styles.quickLinksContainer}>
              <TouchableOpacity
                style={styles.quickLinkCard}
                onPress={() => setActiveTab('announcements')}
              >
                <Megaphone size={32} color={colors.success} />
                <Text style={styles.quickLinkTitle}>Announcements</Text>
                <Text style={styles.quickLinkDescription}>Manage platform announcements</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickLinkCard}
                onPress={() => router.push('/admin/oauth-providers')}
              >
                <Shield size={32} color={colors.primary} />
                <Text style={styles.quickLinkTitle}>OAuth Providers</Text>
                <Text style={styles.quickLinkDescription}>Manage social login options</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickLinkCard}
                onPress={() => router.push('/admin/feature-toggles')}
              >
                <Activity size={32} color={colors.secondary} />
                <Text style={styles.quickLinkTitle}>Feature Toggles</Text>
                <Text style={styles.quickLinkDescription}>Enable/disable features</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              <ResponsiveGrid minColumns={2} maxColumns={3} gap={spacing.md}>
                <TouchableOpacity
                  style={styles.statCard}
                  onPress={() => setActiveTab('users')}
                  activeOpacity={0.7}
                >
                  <Users size={24} color={colors.primary} />
                  <Text style={styles.statValue}>{stats.totalUsers}</Text>
                  <Text style={styles.statLabel}>Total Users</Text>
                  <Text style={styles.statSubtext}>+{stats.newUsersToday} today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.statCard}
                  onPress={() => setActiveTab('users')}
                  activeOpacity={0.7}
                >
                  <Activity size={24} color={colors.success} />
                  <Text style={styles.statValue}>{stats.activeUsers}</Text>
                  <Text style={styles.statLabel}>Active Users</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.statCard}
                  onPress={() => setActiveTab('analytics')}
                  activeOpacity={0.7}
                >
                  <FileText size={24} color={colors.secondary} />
                  <Text style={styles.statValue}>{stats.totalListings}</Text>
                  <Text style={styles.statLabel}>Total Listings</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.statCard}
                  onPress={() => setActiveTab('verifications')}
                  activeOpacity={0.7}
                >
                  <AlertCircle size={24} color={colors.warning} />
                  <Text style={styles.statValue}>{stats.pendingVerifications}</Text>
                  <Text style={styles.statLabel}>Pending Reviews</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.statCard}
                  onPress={() => setActiveTab('disputes')}
                  activeOpacity={0.7}
                >
                  <AlertCircle size={24} color={colors.error} />
                  <Text style={styles.statValue}>{stats.activeDisputes}</Text>
                  <Text style={styles.statLabel}>Active Disputes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.statCard}
                  onPress={() => setActiveTab('analytics')}
                  activeOpacity={0.7}
                >
                  <DollarSign size={24} color={colors.success} />
                  <Text style={styles.statValue}>{stats.escrowsHeld}</Text>
                  <Text style={styles.statLabel}>Escrows Held</Text>
                  <Text style={styles.statSubtext}>${stats.totalEscrowAmount.toFixed(2)}</Text>
                </TouchableOpacity>
              </ResponsiveGrid>
            </View>

            <View style={styles.revenueSection}>
              <Text style={styles.sectionTitle}>Revenue Overview</Text>
              <View style={styles.revenueCard}>
                <View style={styles.revenueItem}>
                  <DollarSign size={32} color={colors.success} />
                  <View style={styles.revenueDetails}>
                    <Text style={styles.revenueValue}>${stats.totalRevenue.toFixed(2)}</Text>
                    <Text style={styles.revenueLabel}>Total Revenue</Text>
                  </View>
                </View>
                <View style={styles.revenueItem}>
                  <TrendingUp size={32} color={colors.primary} />
                  <View style={styles.revenueDetails}>
                    <Text style={styles.revenueValue}>${stats.platformFees.toFixed(2)}</Text>
                    <Text style={styles.revenueLabel}>Platform Fees</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}

        {activeTab === 'users' && (
          <View style={styles.section}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search users..."
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {profile && (
              <BulkActionsBar
                selectedIds={selectedUserIds}
                onClearSelection={() => setSelectedUserIds([])}
                adminId={profile.id}
                entityName="user"
                actions={[
                  {
                    id: 'suspend_users',
                    label: 'Suspend',
                    icon: <XCircle size={16} color={colors.error} />,
                    color: colors.error,
                    requiresReason: true,
                    dangerous: true,
                  },
                  {
                    id: 'activate_users',
                    label: 'Activate',
                    icon: <CheckCircle size={16} color={colors.success} />,
                    color: colors.success,
                  },
                  {
                    id: 'verify_users',
                    label: 'Verify',
                    icon: <Shield size={16} color={colors.primary} />,
                    color: colors.primary,
                  },
                  {
                    id: 'send_notifications',
                    label: 'Notify',
                    icon: <Send size={16} color={colors.secondary} />,
                    color: colors.secondary,
                    requiresInput: true,
                    inputLabel: 'Notification (Title on first line, message below)',
                    inputPlaceholder: 'Important Update\n\nYour account has been...',
                  },
                ]}
              />
            )}
            <FlatList
              data={users.filter(
                (u) =>
                  u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  u.email.toLowerCase().includes(searchQuery.toLowerCase())
              )}
              renderItem={renderUser}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No users found</Text>
              }
            />
          </View>
        )}

        {activeTab === 'verifications' && (
          <View style={styles.section}>
            {profile && (
              <BulkActionsBar
                selectedIds={selectedVerificationIds}
                onClearSelection={() => setSelectedVerificationIds([])}
                adminId={profile.id}
                entityName="verification"
                actions={[
                  {
                    id: 'approve_verifications',
                    label: 'Approve',
                    icon: <CheckCircle size={16} color={colors.success} />,
                    color: colors.success,
                  },
                  {
                    id: 'reject_verifications',
                    label: 'Reject',
                    icon: <XCircle size={16} color={colors.error} />,
                    color: colors.error,
                    requiresReason: true,
                    dangerous: true,
                  },
                ]}
              />
            )}
            {verifications.length > 0 ? (
              <FlatList
                data={verifications}
                renderItem={renderVerification}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            ) : (
              <Text style={styles.emptyText}>No pending verifications</Text>
            )}
          </View>
        )}

        {activeTab === 'disputes' && profile && (
          <AdminDisputesManager adminId={profile.id} />
        )}

        {activeTab === 'payouts' && profile && (
          <AdminPayoutsManager adminId={profile.id} />
        )}

        {activeTab === 'reports' && profile && (
          <ScheduledReportsManager adminId={profile.id} />
        )}

        {activeTab === 'announcements' && profile && (
          <AdminAnnouncementsManager adminId={profile.id} />
        )}

        {activeTab === 'analytics' && (
          <View style={styles.analyticsSection}>
            {loadingAnalytics ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading analytics...</Text>
              </View>
            ) : (
              <>
                {analyticsData.overview && (
                  <View style={styles.overviewGrid}>
                    <View style={styles.overviewCard}>
                      <Text style={styles.overviewLabel}>User Growth</Text>
                      <Text style={styles.overviewValue}>
                        {analyticsData.overview.userGrowth.percentageChange > 0 ? '+' : ''}
                        {analyticsData.overview.userGrowth.percentageChange.toFixed(1)}%
                      </Text>
                      <Text style={styles.overviewSubtext}>
                        {analyticsData.overview.userGrowth.current} total users
                      </Text>
                    </View>
                    <View style={styles.overviewCard}>
                      <Text style={styles.overviewLabel}>Revenue Growth</Text>
                      <Text style={styles.overviewValue}>
                        {analyticsData.overview.revenueGrowth.percentageChange > 0 ? '+' : ''}
                        {analyticsData.overview.revenueGrowth.percentageChange.toFixed(1)}%
                      </Text>
                      <Text style={styles.overviewSubtext}>
                        ${analyticsData.overview.revenueGrowth.current.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.overviewCard}>
                      <Text style={styles.overviewLabel}>Booking Growth</Text>
                      <Text style={styles.overviewValue}>
                        {analyticsData.overview.bookingGrowth.percentageChange > 0 ? '+' : ''}
                        {analyticsData.overview.bookingGrowth.percentageChange.toFixed(1)}%
                      </Text>
                      <Text style={styles.overviewSubtext}>
                        {analyticsData.overview.bookingGrowth.current} completed
                      </Text>
                    </View>
                    <View style={styles.overviewCard}>
                      <Text style={styles.overviewLabel}>Avg Booking Value</Text>
                      <Text style={styles.overviewValue}>
                        ${analyticsData.overview.averageBookingValue.toFixed(2)}
                      </Text>
                      <Text style={styles.overviewSubtext}>Per transaction</Text>
                    </View>
                  </View>
                )}

                <LineChartCard
                  title="User Growth"
                  subtitle="Total users over the last 30 days"
                  data={analyticsData.userGrowth}
                  color={colors.primary}
                />

                <LineChartCard
                  title="Active Users"
                  subtitle="Daily active users (last 30 days)"
                  data={analyticsData.activeUsers}
                  color={colors.success}
                />

                <MultiLineChartCard
                  title="Revenue Overview"
                  subtitle="Total revenue vs platform fees (last 30 days)"
                  data={analyticsData.revenue}
                  legends={['Total Revenue', 'Platform Fees']}
                  colors={[colors.success, colors.primary]}
                  yAxisSuffix="$"
                />

                <LineChartCard
                  title="Completed Bookings"
                  subtitle="Bookings completed over the last 30 days"
                  data={analyticsData.bookings}
                  color={colors.secondary}
                />

                <PieChartCard
                  title="User Type Distribution"
                  subtitle="Customers vs Providers"
                  data={analyticsData.userTypes}
                />

                {analyticsData.subscriptions.length > 0 && (
                  <PieChartCard
                    title="Subscription Tiers"
                    subtitle="Active subscriptions by plan"
                    data={analyticsData.subscriptions}
                  />
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      <ExportMenu
        visible={exportMenuVisible}
        onClose={() => setExportMenuVisible(false)}
        exportType={exportConfig.type}
        title={exportConfig.title}
        filters={activeTab === 'users' ? { searchQuery } : undefined}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.lg,
    paddingTop: spacing.xxl + spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
  },
  exportButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  tabsContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexGrow: 0,
    flexShrink: 0,
  },
  tabs: {
    flexDirection: 'row',
  },
  tab: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minWidth: 90,
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 0,
  },
  quickLinksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingTop: 0,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  quickLinkCard: {
    minWidth: '30%',
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadows.md,
  },
  quickLinkTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  quickLinkDescription: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  statsGrid: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  statCard: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
    width: '100%',
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statSubtext: {
    fontSize: fontSize.xs,
    color: colors.success,
    marginTop: spacing.xs,
  },
  revenueSection: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  revenueCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    ...shadows.md,
  },
  revenueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  revenueDetails: {
    flex: 1,
  },
  revenueValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  revenueLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  section: {
    padding: spacing.lg,
  },
  searchInput: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    ...shadows.sm,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  userType: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  verifiedText: {
    fontSize: fontSize.xs,
    color: colors.success,
  },
  suspendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  suspendedText: {
    fontSize: fontSize.xs,
    color: colors.error,
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  suspendButton: {
    backgroundColor: colors.error + '20',
  },
  activateButton: {
    backgroundColor: colors.success + '20',
  },
  actionButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  suspendButtonText: {
    color: colors.error,
  },
  activateButtonText: {
    color: colors.success,
  },
  verificationCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    ...shadows.sm,
  },
  verificationInfo: {
    flex: 1,
  },
  verificationName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  verificationEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  verificationDate: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  verificationActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  approveButton: {
    width: 40,
    height: 40,
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    width: 40,
    height: 40,
    backgroundColor: colors.error,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyticsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
  },
  analyticsTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  analyticsGrid: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.lg,
  },
  analyticsItem: {
    flex: 1,
    alignItems: 'center',
  },
  analyticsValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  analyticsLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.xl,
  },
  unauthorizedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  unauthorizedTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  unauthorizedText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  goBackButton: {
    width: '100%',
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  analyticsSection: {
    padding: spacing.lg,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  overviewCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  overviewLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  overviewValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  overviewSubtext: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
    padding: spacing.xl,
  },
});
