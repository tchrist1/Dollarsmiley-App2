import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Bell, Filter, Archive } from 'lucide-react-native';
import {
  getUserAnnouncements,
  subscribeToAnnouncements,
  type UserAnnouncement,
  type AnnouncementType,
  type AnnouncementPriority,
  getAnnouncementTypeColor,
  getAnnouncementTypeIcon,
  getPriorityColor,
} from '@/lib/announcements';
import AnnouncementModal from '@/components/AnnouncementModal';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

type FilterType = 'all' | 'unread' | 'read';

export default function AnnouncementsScreen() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<UserAnnouncement[]>([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<UserAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<UserAnnouncement | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (user?.id) {
      loadAnnouncements();
      const unsubscribe = subscribeToAnnouncements(loadAnnouncements);
      return unsubscribe;
    }
  }, [user?.id]);

  useEffect(() => {
    applyFilter();
  }, [announcements, filter]);

  const loadAnnouncements = async () => {
    if (!user?.id) return;

    try {
      const data = await getUserAnnouncements(user.id);
      setAnnouncements(data);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilter = () => {
    let filtered = announcements;

    switch (filter) {
      case 'unread':
        filtered = announcements.filter((a) => !a.is_read && !a.is_dismissed);
        break;
      case 'read':
        filtered = announcements.filter((a) => a.is_read || a.is_dismissed);
        break;
      default:
        filtered = announcements.filter((a) => !a.is_dismissed);
    }

    setFilteredAnnouncements(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnnouncements();
  };

  const handleAnnouncementPress = (announcement: UserAnnouncement) => {
    setSelectedAnnouncement(announcement);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedAnnouncement(null);
  };

  const handleAcknowledge = () => {
    loadAnnouncements();
  };

  const getUnreadCount = () => {
    return announcements.filter((a) => !a.is_read && !a.is_dismissed).length;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Bell size={24} color={colors.text} />
          <Text style={styles.title}>Announcements</Text>
          {getUnreadCount() > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{getUnreadCount()}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'all' && styles.filterButtonTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === 'unread' && styles.filterButtonActive,
          ]}
          onPress={() => setFilter('unread')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'unread' && styles.filterButtonTextActive,
            ]}
          >
            Unread
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'read' && styles.filterButtonActive]}
          onPress={() => setFilter('read')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filter === 'read' && styles.filterButtonTextActive,
            ]}
          >
            Read
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredAnnouncements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Archive size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>
              {filter === 'unread'
                ? 'No unread announcements'
                : filter === 'read'
                ? 'No read announcements'
                : 'No announcements'}
            </Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all'
                ? "You're all caught up!"
                : 'Check back later for updates'}
            </Text>
          </View>
        ) : (
          <View style={styles.announcementsList}>
            {filteredAnnouncements.map((announcement) => {
              const typeColor = getAnnouncementTypeColor(announcement.type);
              const typeIcon =
                announcement.icon || getAnnouncementTypeIcon(announcement.type);
              const priorityColor = getPriorityColor(announcement.priority);
              const isUnread = !announcement.is_read && !announcement.is_dismissed;

              return (
                <TouchableOpacity
                  key={announcement.id}
                  style={[
                    styles.announcementCard,
                    { borderLeftColor: typeColor },
                    isUnread && styles.announcementCardUnread,
                  ]}
                  onPress={() => handleAnnouncementPress(announcement)}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardIcon}>{typeIcon}</Text>
                    <View style={styles.cardContent}>
                      <View style={styles.cardTitleRow}>
                        <Text
                          style={[
                            styles.cardTitle,
                            isUnread && styles.cardTitleUnread,
                          ]}
                          numberOfLines={1}
                        >
                          {announcement.title}
                        </Text>
                        {isUnread && <View style={styles.unreadDot} />}
                      </View>
                      <Text style={styles.cardMessage} numberOfLines={2}>
                        {announcement.content}
                      </Text>
                      <View style={styles.cardFooter}>
                        <View style={styles.badges}>
                          <View
                            style={[
                              styles.typeBadge,
                              { backgroundColor: typeColor + '20' },
                            ]}
                          >
                            <Text style={[styles.typeText, { color: typeColor }]}>
                              {announcement.type}
                            </Text>
                          </View>
                          {announcement.priority !== 'low' && (
                            <View
                              style={[
                                styles.priorityBadge,
                                { backgroundColor: priorityColor + '20' },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.priorityText,
                                  { color: priorityColor },
                                ]}
                              >
                                {announcement.priority}
                              </Text>
                            </View>
                          )}
                          {announcement.is_acknowledged && (
                            <View style={styles.acknowledgedBadge}>
                              <Text style={styles.acknowledgedText}>
                                Acknowledged
                              </Text>
                            </View>
                          )}
                        </View>
                        {announcement.published_at && (
                          <Text style={styles.dateText}>
                            {new Date(
                              announcement.published_at
                            ).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <AnnouncementModal
        visible={showModal}
        announcement={selectedAnnouncement}
        onClose={handleModalClose}
        onAcknowledge={handleAcknowledge}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.error,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  announcementsList: {
    padding: spacing.md,
    gap: spacing.md,
  },
  announcementCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  announcementCardUnread: {
    backgroundColor: colors.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardIcon: {
    fontSize: 28,
  },
  cardContent: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  cardTitleUnread: {
    fontWeight: fontWeight.bold,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  cardMessage: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  priorityText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  acknowledgedBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.success + '20',
  },
  acknowledgedText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.success,
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});
