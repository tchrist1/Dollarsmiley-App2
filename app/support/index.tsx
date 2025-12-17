import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Phone,
  Award,
  TrendingUp,
  Shield,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import {
  checkPrioritySupportAccess,
  getUserTickets,
  getSupportMetrics,
  getPriorityLabel,
  getPriorityColor,
  getStatusLabel,
  getStatusColor,
  getCategoryLabel,
  formatResponseTime,
  type SupportTicket,
  type PrioritySupportAccess,
  type SupportMetrics,
} from '@/lib/priority-support';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export default function SupportScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [access, setAccess] = useState<PrioritySupportAccess | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [metrics, setMetrics] = useState<SupportMetrics | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      const [accessData, ticketsData, metricsData] = await Promise.all([
        checkPrioritySupportAccess(user.id),
        getUserTickets(user.id),
        getSupportMetrics(user.id),
      ]);

      setAccess(accessData);
      setTickets(ticketsData);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Error loading support data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getFilteredTickets = () => {
    switch (filter) {
      case 'open':
        return tickets.filter(t =>
          t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_customer'
        );
      case 'resolved':
        return tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
      default:
        return tickets;
    }
  };

  const renderTicketCard = (ticket: SupportTicket) => {
    const statusColor = getStatusColor(ticket.status);
    const priorityColor = getPriorityColor(ticket.priority);

    return (
      <TouchableOpacity
        key={ticket.id}
        style={styles.ticketCard}
        onPress={() => router.push(`/support/${ticket.id}`)}
        activeOpacity={0.8}
      >
        <View style={styles.ticketHeader}>
          <View style={styles.ticketBadges}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusLabel(ticket.status)}
              </Text>
            </View>
            {ticket.is_priority && (
              <View style={styles.priorityIndicator}>
                <Shield size={12} color={colors.warning} />
                <Text style={styles.priorityText}>Priority</Text>
              </View>
            )}
          </View>
          <Text style={styles.ticketId}>#{ticket.id.slice(0, 8)}</Text>
        </View>

        <Text style={styles.ticketSubject} numberOfLines={2}>
          {ticket.subject}
        </Text>

        <Text style={styles.ticketDescription} numberOfLines={2}>
          {ticket.description}
        </Text>

        <View style={styles.ticketFooter}>
          <View style={styles.ticketMeta}>
            <Text style={styles.categoryLabel}>{getCategoryLabel(ticket.category)}</Text>
            <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
            <Text style={[styles.priorityLabel, { color: priorityColor }]}>
              {getPriorityLabel(ticket.priority)}
            </Text>
          </View>
          <Text style={styles.ticketDate}>
            {new Date(ticket.created_at).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading support...</Text>
      </View>
    );
  }

  const filteredTickets = getFilteredTickets();
  const openCount = tickets.filter(t =>
    t.status === 'open' || t.status === 'in_progress' || t.status === 'waiting_customer'
  ).length;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Support',
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/support/create')}
              style={styles.headerButton}
            >
              <Plus size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Priority Support Badge */}
        {access?.hasAccess && (
          <View style={styles.priorityCard}>
            <View style={styles.priorityIcon}>
              <Shield size={32} color={colors.warning} />
            </View>
            <View style={styles.priorityContent}>
              <Text style={styles.priorityTitle}>Priority Support Active</Text>
              <Text style={styles.prioritySubtitle}>
                {access.plan} Plan · Response within {access.features.maxResponseTime}h
              </Text>
            </View>
            <View style={styles.priorityBadge}>
              <CheckCircle size={20} color={colors.success} />
            </View>
          </View>
        )}

        {/* Support Features */}
        {access && (
          <View style={styles.featuresCard}>
            <Text style={styles.featuresTitle}>Your Support Benefits</Text>
            <View style={styles.featuresGrid}>
              <View style={styles.featureItem}>
                <View
                  style={[
                    styles.featureIcon,
                    access.features.priorityQueue && styles.featureIconActive,
                  ]}
                >
                  <TrendingUp
                    size={20}
                    color={access.features.priorityQueue ? colors.success : colors.textSecondary}
                  />
                </View>
                <Text style={styles.featureLabel}>Priority Queue</Text>
              </View>

              <View style={styles.featureItem}>
                <View
                  style={[
                    styles.featureIcon,
                    access.features.liveChat && styles.featureIconActive,
                  ]}
                >
                  <MessageCircle
                    size={20}
                    color={access.features.liveChat ? colors.success : colors.textSecondary}
                  />
                </View>
                <Text style={styles.featureLabel}>Live Chat</Text>
              </View>

              <View style={styles.featureItem}>
                <View
                  style={[
                    styles.featureIcon,
                    access.features.phoneSupport && styles.featureIconActive,
                  ]}
                >
                  <Phone
                    size={20}
                    color={access.features.phoneSupport ? colors.success : colors.textSecondary}
                  />
                </View>
                <Text style={styles.featureLabel}>Phone Support</Text>
              </View>

              <View style={styles.featureItem}>
                <View
                  style={[
                    styles.featureIcon,
                    access.features.slaGuarantee && styles.featureIconActive,
                  ]}
                >
                  <Award
                    size={20}
                    color={access.features.slaGuarantee ? colors.success : colors.textSecondary}
                  />
                </View>
                <Text style={styles.featureLabel}>SLA Guarantee</Text>
              </View>
            </View>
          </View>
        )}

        {/* Support Metrics */}
        {metrics && metrics.resolvedTickets > 0 && (
          <View style={styles.metricsCard}>
            <Text style={styles.metricsTitle}>Your Support History</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Clock size={24} color={colors.primary} />
                <Text style={styles.metricValue}>
                  {formatResponseTime(metrics.averageResponseTime)}
                </Text>
                <Text style={styles.metricLabel}>Avg Response Time</Text>
              </View>

              <View style={styles.metricItem}>
                <CheckCircle size={24} color={colors.success} />
                <Text style={styles.metricValue}>{metrics.resolvedTickets}</Text>
                <Text style={styles.metricLabel}>Resolved</Text>
              </View>

              {metrics.satisfactionRating > 0 && (
                <View style={styles.metricItem}>
                  <Award size={24} color={colors.warning} />
                  <Text style={styles.metricValue}>
                    {metrics.satisfactionRating.toFixed(1)}/5
                  </Text>
                  <Text style={styles.metricLabel}>Satisfaction</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
              All ({tickets.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filter === 'open' && styles.filterTabActive]}
            onPress={() => setFilter('open')}
          >
            <Text style={[styles.filterTabText, filter === 'open' && styles.filterTabTextActive]}>
              Open ({openCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filter === 'resolved' && styles.filterTabActive]}
            onPress={() => setFilter('resolved')}
          >
            <Text
              style={[styles.filterTabText, filter === 'resolved' && styles.filterTabTextActive]}
            >
              Resolved ({tickets.length - openCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tickets List */}
        <View style={styles.ticketsSection}>
          {filteredTickets.length > 0 ? (
            filteredTickets.map(ticket => renderTicketCard(ticket))
          ) : (
            <View style={styles.emptyState}>
              <MessageCircle size={64} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No Tickets Yet</Text>
              <Text style={styles.emptyText}>
                {filter === 'all'
                  ? 'Create your first support ticket to get help from our team.'
                  : `No ${filter} tickets found.`}
              </Text>
              {filter === 'all' && (
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => router.push('/support/create')}
                >
                  <Plus size={20} color={colors.white} />
                  <Text style={styles.createButtonText}>Create Ticket</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>Need Help?</Text>

          {access?.features.liveChat && (
            <TouchableOpacity style={styles.actionCard}>
              <View style={styles.actionIcon}>
                <MessageCircle size={24} color={colors.primary} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Start Live Chat</Text>
                <Text style={styles.actionDescription}>
                  Get instant help from our support team
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {access?.features.phoneSupport && (
            <TouchableOpacity style={styles.actionCard}>
              <View style={styles.actionIcon}>
                <Phone size={24} color={colors.success} />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Call Support</Text>
                <Text style={styles.actionDescription}>
                  Speak directly with a support agent
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/support/create')}
          >
            <View style={styles.actionIcon}>
              <AlertCircle size={24} color={colors.warning} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Report an Issue</Text>
              <Text style={styles.actionDescription}>
                Submit a detailed support ticket
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Upgrade Prompt for Free Users */}
        {!access?.hasAccess && (
          <View style={styles.upgradeCard}>
            <Shield size={48} color={colors.primary} />
            <Text style={styles.upgradeTitle}>Upgrade for Priority Support</Text>
            <Text style={styles.upgradeText}>
              Get faster response times, live chat, and dedicated support with Pro or Enterprise plans.
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => router.push('/subscription')}
            >
              <Text style={styles.upgradeButtonText}>View Plans</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.xxl,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  headerButton: {
    marginRight: spacing.md,
  },
  priorityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  priorityIcon: {
    width: 48,
    height: 48,
    backgroundColor: colors.warning + '20',
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  priorityContent: {
    flex: 1,
  },
  priorityTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: 2,
  },
  prioritySubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  priorityBadge: {
    marginLeft: spacing.sm,
  },
  featuresCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  featuresTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  featureItem: {
    width: '48%',
    alignItems: 'center',
    padding: spacing.sm,
  },
  featureIcon: {
    width: 48,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  featureIconActive: {
    backgroundColor: colors.success + '20',
  },
  featureLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  metricsCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  metricsTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.xs,
  },
  metricLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  filterTabTextActive: {
    color: colors.white,
  },
  ticketsSection: {
    marginBottom: spacing.lg,
  },
  ticketCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ticketBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  priorityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  priorityText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.warning,
  },
  ticketId: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  ticketSubject: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ticketDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  categoryLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  ticketDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  createButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  quickActions: {
    marginBottom: spacing.lg,
  },
  quickActionsTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  upgradeCard: {
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  upgradeTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  upgradeText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  upgradeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  upgradeButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
