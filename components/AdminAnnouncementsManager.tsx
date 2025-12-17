import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Switch,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  Users,
  BarChart3,
} from 'lucide-react-native';
import {
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementStats,
  getAnnouncementTypeColor,
  getAnnouncementTypeIcon,
  getPriorityColor,
  type Announcement,
  type AnnouncementType,
  type AnnouncementPriority,
  type TargetAudience,
} from '@/lib/announcements';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

const { width } = Dimensions.get('window');
const isWideScreen = width >= 768;

export default function AdminAnnouncementsManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, any>>({});

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info' as AnnouncementType,
    priority: 'medium' as AnnouncementPriority,
    icon: '',
    target_audience: 'all' as TargetAudience,
    published_at: '',
    expires_at: '',
    is_dismissible: true,
    show_in_banner: true,
    show_in_notifications: false,
    require_acknowledgment: false,
    action_text: '',
    action_url: '',
    is_active: true,
  });

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const data = await getAllAnnouncements();
      setAnnouncements(data);

      const statsPromises = data.map(async (announcement) => {
        const stat = await getAnnouncementStats(announcement.id);
        return { id: announcement.id, stats: stat };
      });

      const statsResults = await Promise.all(statsPromises);
      const statsMap: Record<string, any> = {};
      statsResults.forEach((result) => {
        if (result.stats) {
          statsMap[result.id] = result.stats;
        }
      });
      setStats(statsMap);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      Alert.alert('Required Fields', 'Title and content are required');
      return;
    }

    try {
      if (editingId) {
        const result = await updateAnnouncement(editingId, formData);
        if (result.success) {
          Alert.alert('Success', 'Announcement updated successfully');
          resetForm();
          loadAnnouncements();
        } else {
          Alert.alert('Error', result.error || 'Failed to update announcement');
        }
      } else {
        const result = await createAnnouncement(formData);
        if (result.success) {
          Alert.alert('Success', 'Announcement created successfully');
          resetForm();
          loadAnnouncements();
        } else {
          Alert.alert('Error', result.error || 'Failed to create announcement');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      priority: announcement.priority,
      icon: announcement.icon || '',
      target_audience: announcement.target_audience,
      published_at: announcement.published_at || '',
      expires_at: announcement.expires_at || '',
      is_dismissible: announcement.is_dismissible,
      show_in_banner: announcement.show_in_banner,
      show_in_notifications: announcement.show_in_notifications,
      require_acknowledgment: announcement.require_acknowledgment,
      action_text: announcement.action_text || '',
      action_url: announcement.action_url || '',
      is_active: announcement.is_active,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Announcement',
      'Are you sure you want to delete this announcement? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteAnnouncement(id);
            if (result.success) {
              Alert.alert('Success', 'Announcement deleted successfully');
              loadAnnouncements();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete announcement');
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      title: '',
      content: '',
      type: 'info',
      priority: 'medium',
      icon: '',
      target_audience: 'all',
      published_at: '',
      expires_at: '',
      is_dismissible: true,
      show_in_banner: true,
      show_in_notifications: false,
      require_acknowledgment: false,
      action_text: '',
      action_url: '',
      is_active: true,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Announcements Manager</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowForm(!showForm)}
          >
            <Plus size={20} color={colors.white} />
            <Text style={styles.createButtonText}>New</Text>
          </TouchableOpacity>
        </View>

        {showForm && (
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>
              {editingId ? 'Edit Announcement' : 'Create Announcement'}
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="Enter announcement title"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Content</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.content}
                onChangeText={(text) => setFormData({ ...formData, content: text })}
                placeholder="Enter announcement content"
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Type</Text>
              <View style={styles.chipContainer}>
                {(['info', 'success', 'warning', 'error', 'maintenance', 'feature', 'update'] as AnnouncementType[]).map(
                  (type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.chip,
                        formData.type === type && {
                          backgroundColor: getAnnouncementTypeColor(type),
                          borderColor: getAnnouncementTypeColor(type),
                        },
                      ]}
                      onPress={() => setFormData({ ...formData, type })}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          formData.type === type && styles.chipTextSelected,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Priority</Text>
              <View style={styles.chipContainer}>
                {(['low', 'medium', 'high', 'urgent'] as AnnouncementPriority[]).map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.chip,
                      formData.priority === priority && {
                        backgroundColor: getPriorityColor(priority),
                        borderColor: getPriorityColor(priority),
                      },
                    ]}
                    onPress={() => setFormData({ ...formData, priority })}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        formData.priority === priority && styles.chipTextSelected,
                      ]}
                    >
                      {priority}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Target Audience</Text>
              <View style={styles.chipContainer}>
                {(['all', 'providers', 'customers', 'verified', 'premium'] as TargetAudience[]).map(
                  (audience) => (
                    <TouchableOpacity
                      key={audience}
                      style={[
                        styles.chip,
                        formData.target_audience === audience && styles.chipSelected,
                      ]}
                      onPress={() =>
                        setFormData({ ...formData, target_audience: audience })
                      }
                    >
                      <Text
                        style={[
                          styles.chipText,
                          formData.target_audience === audience &&
                            styles.chipTextSelected,
                        ]}
                      >
                        {audience}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Icon (Emoji)</Text>
              <TextInput
                style={styles.input}
                value={formData.icon}
                onChangeText={(text) => setFormData({ ...formData, icon: text })}
                placeholder="e.g., 🎉"
                placeholderTextColor={colors.textSecondary}
                maxLength={2}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Action Button Text (Optional)</Text>
              <TextInput
                style={styles.input}
                value={formData.action_text}
                onChangeText={(text) =>
                  setFormData({ ...formData, action_text: text })
                }
                placeholder="e.g., Learn More"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Action Button URL (Optional)</Text>
              <TextInput
                style={styles.input}
                value={formData.action_url}
                onChangeText={(text) =>
                  setFormData({ ...formData, action_url: text })
                }
                placeholder="https://example.com"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Display Options</Text>

            <View style={styles.switchGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Active</Text>
                <Switch
                  value={formData.is_active}
                  onValueChange={(value) =>
                    setFormData({ ...formData, is_active: value })
                  }
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.white}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Dismissible</Text>
                <Switch
                  value={formData.is_dismissible}
                  onValueChange={(value) =>
                    setFormData({ ...formData, is_dismissible: value })
                  }
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.white}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Show in Banner</Text>
                <Switch
                  value={formData.show_in_banner}
                  onValueChange={(value) =>
                    setFormData({ ...formData, show_in_banner: value })
                  }
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.white}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Show in Notifications</Text>
                <Switch
                  value={formData.show_in_notifications}
                  onValueChange={(value) =>
                    setFormData({ ...formData, show_in_notifications: value })
                  }
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.white}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Require Acknowledgment</Text>
                <Switch
                  value={formData.require_acknowledgment}
                  onValueChange={(value) =>
                    setFormData({ ...formData, require_acknowledgment: value })
                  }
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.white}
                />
              </View>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleCreateOrUpdate}
              >
                <Text style={styles.saveButtonText}>
                  {editingId ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.listContainer}>
          {announcements.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No announcements yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Create your first announcement to get started
              </Text>
            </View>
          ) : (
            announcements.map((announcement) => {
              const typeColor = getAnnouncementTypeColor(announcement.type);
              const typeIcon =
                announcement.icon || getAnnouncementTypeIcon(announcement.type);
              const announcementStats = stats[announcement.id];

              return (
                <View
                  key={announcement.id}
                  style={[styles.announcementCard, { borderLeftColor: typeColor }]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <Text style={styles.cardIcon}>{typeIcon}</Text>
                      <View style={styles.cardTitleContainer}>
                        <Text style={styles.cardTitle}>{announcement.title}</Text>
                        <View style={styles.badges}>
                          <View
                            style={[
                              styles.badge,
                              { backgroundColor: typeColor + '20' },
                            ]}
                          >
                            <Text style={[styles.badgeText, { color: typeColor }]}>
                              {announcement.type}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.badge,
                              {
                                backgroundColor:
                                  getPriorityColor(announcement.priority) + '20',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.badgeText,
                                { color: getPriorityColor(announcement.priority) },
                              ]}
                            >
                              {announcement.priority}
                            </Text>
                          </View>
                          {!announcement.is_active && (
                            <View style={[styles.badge, styles.inactiveBadge]}>
                              <Text style={styles.inactiveBadgeText}>Inactive</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => handleEdit(announcement)}
                      >
                        <Edit size={18} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => handleDelete(announcement.id)}
                      >
                        <Trash2 size={18} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={styles.cardContent} numberOfLines={2}>
                    {announcement.content}
                  </Text>

                  {announcementStats && (
                    <View style={styles.statsContainer}>
                      <View style={styles.statItem}>
                        <Eye size={14} color={colors.textSecondary} />
                        <Text style={styles.statText}>
                          {announcementStats.unique_readers || 0} reads
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <EyeOff size={14} color={colors.textSecondary} />
                        <Text style={styles.statText}>
                          {announcementStats.dismissed_count || 0} dismissed
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <BarChart3 size={14} color={colors.textSecondary} />
                        <Text style={styles.statText}>
                          {announcementStats.acknowledged_count || 0} acknowledged
                        </Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.metaContainer}>
                    <View style={styles.metaItem}>
                      <Users size={14} color={colors.textSecondary} />
                      <Text style={styles.metaText}>
                        {announcement.target_audience}
                      </Text>
                    </View>
                    {announcement.published_at && (
                      <View style={styles.metaItem}>
                        <Calendar size={14} color={colors.textSecondary} />
                        <Text style={styles.metaText}>
                          {new Date(announcement.published_at).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
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
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  createButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  formContainer: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.white,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textTransform: 'capitalize',
  },
  chipTextSelected: {
    color: colors.white,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  switchGroup: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  switchLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  cancelButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  saveButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  listContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
  },
  announcementCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderLeftWidth: 4,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginRight: spacing.sm,
  },
  cardIcon: {
    fontSize: 24,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
  },
  inactiveBadge: {
    backgroundColor: colors.textSecondary + '20',
  },
  inactiveBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    padding: spacing.xs,
  },
  cardContent: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    textTransform: 'capitalize',
  },
});
