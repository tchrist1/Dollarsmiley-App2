import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import {
  Home,
  LayoutGrid,
  Users,
  Bell,
  User,
  Briefcase,
  ShoppingBag,
  Calendar,
  MessageCircle,
  Settings,
  DollarSign,
  FileText,
  Star,
  Search,
  Bookmark,
  TrendingUp,
  MapPin,
  CreditCard,
  Package,
  BarChart3,
  Shield,
  AlertCircle,
  Wallet,
  Clock,
  Phone,
  Video,
  Receipt,
  RefreshCw,
  Award,
  Zap,
  Gift,
  Mail,
  HelpCircle,
  Lock,
  Globe,
  Camera,
  Upload,
  Download,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  X,
  Activity,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

interface NavigationItem {
  label: string;
  route: string;
  icon: any;
  category: string;
  requiresAuth?: boolean;
  requiresProvider?: boolean;
  requiresAdmin?: boolean;
  description?: string;
}

const navigationItems: NavigationItem[] = [
  // Main Tabs
  {
    label: 'Home',
    route: '/(tabs)',
    icon: Home,
    category: 'Main Navigation',
    description: 'Main home screen',
  },
  {
    label: 'Categories',
    route: '/(tabs)/categories',
    icon: LayoutGrid,
    category: 'Main Navigation',
    description: 'Browse service categories',
  },
  {
    label: 'Community',
    route: '/(tabs)/community',
    icon: Users,
    category: 'Main Navigation',
    description: 'Community feed and social features',
  },
  {
    label: 'Notifications',
    route: '/(tabs)/notifications',
    icon: Bell,
    category: 'Main Navigation',
    description: 'View all notifications',
  },
  {
    label: 'Profile',
    route: '/(tabs)/profile',
    icon: User,
    category: 'Main Navigation',
    description: 'Your profile and account',
  },

  // Discovery & Browse
  {
    label: 'Discover Services',
    route: '/(tabs)/index',
    icon: TrendingUp,
    category: 'Discovery',
    description: 'Discover services and providers',
  },
  {
    label: 'For You',
    route: '/(tabs)/for-you',
    icon: Zap,
    category: 'Discovery',
    description: 'Personalized recommendations',
  },

  // Jobs & Listings
  {
    label: 'Post Job',
    route: '/(tabs)/post-job',
    icon: Briefcase,
    category: 'Jobs & Services',
    requiresAuth: true,
    description: 'Post a new job request',
  },
  {
    label: 'Create Listing',
    route: '/(tabs)/create-listing',
    icon: Package,
    category: 'Jobs & Services',
    requiresAuth: true,
    requiresProvider: true,
    description: 'Create service listing',
  },
  {
    label: 'Browse Jobs',
    route: '/(tabs)/index?filter=Job',
    icon: Search,
    category: 'Jobs & Services',
    description: 'Browse available jobs',
  },
  {
    label: 'My Posted Jobs',
    route: '/my-jobs/posted',
    icon: FileText,
    category: 'Jobs & Services',
    requiresAuth: true,
    description: 'Jobs you posted',
  },
  {
    label: 'My Applied Jobs',
    route: '/my-jobs/applied',
    icon: FileText,
    category: 'Jobs & Services',
    requiresAuth: true,
    description: 'Jobs you applied to',
  },
  {
    label: 'My Bookings',
    route: '/bookings',
    icon: Calendar,
    category: 'Jobs & Services',
    requiresAuth: true,
    description: 'Your bookings',
  },
  {
    label: 'Recurring Bookings',
    route: '/bookings/recurring',
    icon: RefreshCw,
    category: 'Jobs & Services',
    requiresAuth: true,
    description: 'Recurring appointments',
  },

  // Provider Dashboard
  {
    label: 'Provider Dashboard',
    route: '/provider/dashboard',
    icon: BarChart3,
    category: 'Provider Tools',
    requiresAuth: true,
    requiresProvider: true,
    description: 'Provider overview',
  },
  {
    label: 'Availability Manager',
    route: '/provider/availability',
    icon: Calendar,
    category: 'Provider Tools',
    requiresAuth: true,
    requiresProvider: true,
    description: 'Manage your schedule',
  },
  {
    label: 'Blocked Dates',
    route: '/provider/blocked-dates',
    icon: XCircle,
    category: 'Provider Tools',
    requiresAuth: true,
    requiresProvider: true,
    description: 'Block unavailable dates',
  },
  {
    label: 'Schedule Editor',
    route: '/provider/schedule-editor',
    icon: Clock,
    category: 'Provider Tools',
    requiresAuth: true,
    requiresProvider: true,
    description: 'Edit weekly schedule',
  },
  {
    label: 'Reschedule Requests',
    route: '/provider/reschedule-requests',
    icon: Calendar,
    category: 'Provider Tools',
    requiresAuth: true,
    requiresProvider: true,
    description: 'Handle reschedule requests',
  },
  {
    label: 'Payout Dashboard',
    route: '/provider/payout-dashboard',
    icon: DollarSign,
    category: 'Provider Tools',
    requiresAuth: true,
    requiresProvider: true,
    description: 'Earnings and payouts',
  },
  {
    label: 'Income Statement',
    route: '/provider/income-statement',
    icon: FileText,
    category: 'Provider Tools',
    requiresAuth: true,
    requiresProvider: true,
    description: 'Income reports',
  },

  // Financial
  {
    label: 'Wallet',
    route: '/wallet',
    icon: Wallet,
    category: 'Financial',
    requiresAuth: true,
    description: 'Your wallet balance',
  },
  {
    label: 'Earnings',
    route: '/wallet/earnings',
    icon: DollarSign,
    category: 'Financial',
    requiresAuth: true,
    description: 'View earnings',
  },
  {
    label: 'Payouts',
    route: '/wallet/payouts',
    icon: Download,
    category: 'Financial',
    requiresAuth: true,
    description: 'Payout history',
  },
  {
    label: 'Stripe Connect',
    route: '/wallet/stripe-connect',
    icon: CreditCard,
    category: 'Financial',
    requiresAuth: true,
    description: 'Connect payment account',
  },
  {
    label: 'Transactions',
    route: '/transactions',
    icon: FileText,
    category: 'Financial',
    requiresAuth: true,
    description: 'Transaction history',
  },
  {
    label: 'Payment Methods',
    route: '/settings/payment-settings',
    icon: CreditCard,
    category: 'Financial',
    requiresAuth: true,
    description: 'Manage payment methods',
  },
  {
    label: 'Payment Plans',
    route: '/payment-plans',
    icon: Calendar,
    category: 'Financial',
    requiresAuth: true,
    description: 'Payment plan options',
  },
  {
    label: 'Receipts',
    route: '/receipts',
    icon: Receipt,
    category: 'Financial',
    requiresAuth: true,
    description: 'View receipts',
  },
  {
    label: 'Refunds',
    route: '/refunds',
    icon: RefreshCw,
    category: 'Financial',
    requiresAuth: true,
    description: 'Refund requests',
  },

  // Reports
  {
    label: 'Expense Reports',
    route: '/expense-reports',
    icon: FileText,
    category: 'Reports & Tax',
    requiresAuth: true,
    description: 'Generate expense reports',
  },
  {
    label: 'Income Reports',
    route: '/income-reports',
    icon: BarChart3,
    category: 'Reports & Tax',
    requiresAuth: true,
    description: 'Income reports',
  },
  {
    label: 'Tax Forms',
    route: '/tax-forms',
    icon: FileText,
    category: 'Reports & Tax',
    requiresAuth: true,
    description: 'W-9 and 1099 forms',
  },

  // Analytics
  {
    label: 'Advanced Analytics',
    route: '/analytics/advanced',
    icon: BarChart3,
    category: 'Analytics',
    requiresAuth: true,
    requiresProvider: true,
    description: 'Detailed analytics',
  },
  {
    label: 'Job Analytics',
    route: '/analytics/job-analytics',
    icon: TrendingUp,
    category: 'Analytics',
    requiresAuth: true,
    description: 'Job performance metrics',
  },

  // Messaging
  {
    label: 'Messages',
    route: '/(tabs)/messages',
    icon: MessageCircle,
    category: 'Communication',
    requiresAuth: true,
    description: 'Direct messages',
  },

  // Verification
  {
    label: 'Verification Status',
    route: '/verification/status',
    icon: Shield,
    category: 'Verification',
    requiresAuth: true,
    description: 'Verification overview',
  },
  {
    label: 'ID Verification',
    route: '/verification/submit',
    icon: Camera,
    category: 'Verification',
    requiresAuth: true,
    description: 'Submit ID documents',
  },
  {
    label: 'Background Check',
    route: '/verification/background-check',
    icon: CheckCircle,
    category: 'Verification',
    requiresAuth: true,
    description: 'Background check status',
  },

  // Settings
  {
    label: 'Settings',
    route: '/settings',
    icon: Settings,
    category: 'Settings',
    requiresAuth: true,
    description: 'App settings',
  },
  {
    label: 'Calendar Permissions',
    route: '/settings/calendar-permissions',
    icon: Calendar,
    category: 'Settings',
    requiresAuth: true,
    description: 'Calendar integration',
  },
  {
    label: 'Phone Verification',
    route: '/settings/phone-verification',
    icon: Phone,
    category: 'Settings',
    requiresAuth: true,
    description: 'Verify phone number',
  },
  {
    label: 'Payment Settings',
    route: '/settings/payment-settings',
    icon: CreditCard,
    category: 'Settings',
    requiresAuth: true,
    description: 'Payment preferences',
  },
  {
    label: 'Reports & Strikes',
    route: '/settings/reports-and-strikes',
    icon: AlertCircle,
    category: 'Settings',
    requiresAuth: true,
    description: 'Account standing',
  },
  {
    label: 'W-9 Tax Info',
    route: '/settings/w9-tax-information',
    icon: FileText,
    category: 'Settings',
    requiresAuth: true,
    description: 'Tax information',
  },
  {
    label: 'Usage Tracking',
    route: '/settings/usage',
    icon: BarChart3,
    category: 'Settings',
    requiresAuth: true,
    description: 'View usage stats',
  },

  // Subscription
  {
    label: 'Subscription Plans',
    route: '/subscription',
    icon: Star,
    category: 'Subscription',
    description: 'View plans',
  },
  {
    label: 'Subscription Checkout',
    route: '/subscription/checkout',
    icon: CreditCard,
    category: 'Subscription',
    requiresAuth: true,
    description: 'Subscribe to plan',
  },

  // Saved Items
  {
    label: 'Saved Jobs',
    route: '/saved/jobs',
    icon: Bookmark,
    category: 'Saved',
    requiresAuth: true,
    description: 'Bookmarked jobs',
  },
  {
    label: 'Saved Searches',
    route: '/saved/searches',
    icon: Search,
    category: 'Saved',
    requiresAuth: true,
    description: 'Saved search queries',
  },

  // Support
  {
    label: 'Support Tickets',
    route: '/support',
    icon: HelpCircle,
    category: 'Support',
    requiresAuth: true,
    description: 'Get help',
  },
  {
    label: 'Create Ticket',
    route: '/support/create',
    icon: Mail,
    category: 'Support',
    requiresAuth: true,
    description: 'New support ticket',
  },

  // Announcements
  {
    label: 'Announcements',
    route: '/announcements',
    icon: Bell,
    category: 'Updates',
    description: 'System announcements',
  },

  // Admin
  {
    label: 'Admin Dashboard',
    route: '/admin',
    icon: Shield,
    category: 'Admin',
    requiresAuth: true,
    requiresAdmin: true,
    description: 'Admin overview',
  },
  {
    label: 'Admin Analytics',
    route: '/admin/dashboard',
    icon: BarChart3,
    category: 'Admin',
    requiresAuth: true,
    requiresAdmin: true,
    description: 'System analytics',
  },
  {
    label: 'User Management',
    route: '/admin/user-actions',
    icon: Users,
    category: 'Admin',
    requiresAuth: true,
    requiresAdmin: true,
    description: 'Manage users',
  },
  {
    label: 'Verification Queue',
    route: '/admin/verification',
    icon: CheckCircle,
    category: 'Admin',
    requiresAuth: true,
    requiresAdmin: true,
    description: 'Review verifications',
  },
  {
    label: 'Moderation',
    route: '/admin/moderation',
    icon: Shield,
    category: 'Admin',
    requiresAuth: true,
    requiresAdmin: true,
    description: 'Content moderation',
  },
  {
    label: 'Refund Management',
    route: '/admin/refunds',
    icon: DollarSign,
    category: 'Admin',
    requiresAuth: true,
    requiresAdmin: true,
    description: 'Process refunds',
  },
  {
    label: 'System Health',
    route: '/admin/system-health',
    icon: Activity,
    category: 'Admin',
    requiresAuth: true,
    requiresAdmin: true,
    description: 'System status',
  },

  // Developer
  {
    label: 'Developer Portal',
    route: '/developer',
    icon: Globe,
    category: 'Developer',
    requiresAuth: true,
    description: 'API access',
  },

  // Test Screens
  {
    label: 'Test Stripe',
    route: '/test-stripe',
    icon: CreditCard,
    category: 'Testing',
    description: 'Stripe integration test',
  },
  {
    label: 'Test Payment Sheet',
    route: '/test-payment-sheet',
    icon: CreditCard,
    category: 'Testing',
    description: 'Payment sheet test',
  },
];

export default function DebugNavigationMenu() {
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { profile } = useAuth();

  const isProvider = profile?.user_type === 'Provider' || profile?.user_type === 'Hybrid';
  const isAdmin = profile?.user_type === 'Admin';

  const filteredItems = navigationItems.filter((item) => {
    // Filter by search query
    const matchesSearch =
      searchQuery === '' ||
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());

    // Filter by permissions
    if (item.requiresAuth && !profile) return false;
    if (item.requiresProvider && !isProvider) return false;
    if (item.requiresAdmin && !isAdmin) return false;

    return matchesSearch;
  });

  // Group items by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, NavigationItem[]>);

  const handleNavigate = (route: string) => {
    setVisible(false);
    setSearchQuery('');
    try {
      router.push(route as any);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <>
      {/* Burger Menu Button */}
      <TouchableOpacity
        style={styles.burgerButton}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <View style={styles.burgerIcon}>
          <View style={styles.burgerLine} />
          <View style={styles.burgerLine} />
          <View style={styles.burgerLine} />
        </View>
        <Text style={styles.burgerLabel}>Menu</Text>
      </TouchableOpacity>

      {/* Full Screen Modal */}
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Navigation Menu</Text>
              <Text style={styles.headerSubtitle}>Testing & Debug Mode</Text>
            </View>
            <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Search size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search screens..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textSecondary}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <XCircle size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Navigation List */}
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {Object.entries(groupedItems).map(([category, items]) => (
              <View key={category} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>{category}</Text>
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.route}
                      style={styles.navItem}
                      onPress={() => handleNavigate(item.route)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.iconContainer}>
                        <Icon size={20} color={colors.primary} />
                      </View>
                      <View style={styles.navItemContent}>
                        <Text style={styles.navItemLabel}>{item.label}</Text>
                        {item.description && (
                          <Text style={styles.navItemDescription}>{item.description}</Text>
                        )}
                        <Text style={styles.navItemRoute}>{item.route}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {filteredItems.length === 0 && (
              <View style={styles.emptyState}>
                <Search size={48} color={colors.textSecondary} />
                <Text style={styles.emptyStateText}>No screens found</Text>
                <Text style={styles.emptyStateSubtext}>Try a different search term</Text>
              </View>
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>Total Screens: {filteredItems.length}</Text>
              <Text style={styles.footerWarning}>⚠️ Debug Mode - Disable before production</Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  burgerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  burgerIcon: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  burgerLine: {
    width: '100%',
    height: 3,
    backgroundColor: colors.textSecondary,
    borderRadius: 2,
  },
  burgerLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.warning,
    marginTop: 2,
  },
  closeButton: {
    padding: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
    margin: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.sm,
    padding: 0,
  },
  scrollView: {
    flex: 1,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  navItemContent: {
    flex: 1,
  },
  navItemLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  navItemDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  navItemRoute: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyStateSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  footer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  footerWarning: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontWeight: fontWeight.semibold,
  },
});
