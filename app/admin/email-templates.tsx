import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Plus,
  Search,
  Filter,
  Mail,
  Edit,
  Copy,
  Trash2,
  Tag,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import Input from '@/components/Input';
import Button from '@/components/Button';
import EmailTemplateEditor from '@/components/EmailTemplateEditor';
import {
  getEmailTemplates,
  getTemplateCategories,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  duplicateTemplate,
  searchTemplates,
  type EmailTemplate,
  type EmailTemplateCategory,
} from '@/lib/email-templates';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export default function EmailTemplatesScreen() {
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [categories, setCategories] = useState<EmailTemplateCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | undefined>();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [templatesData, categoriesData] = await Promise.all([
        getEmailTemplates(),
        getTemplateCategories(),
      ]);
      setTemplates(templatesData);
      setCategories(categoriesData);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 0) {
      const results = await searchTemplates(query);
      setTemplates(results);
    } else {
      loadData();
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(undefined);
    setShowEditor(true);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleSaveTemplate = async (templateData: Partial<EmailTemplate>) => {
    try {
      if (editingTemplate) {
        await updateEmailTemplate(editingTemplate.id, templateData);
        Alert.alert('Success', 'Template updated successfully');
      } else {
        await createEmailTemplate(templateData);
        Alert.alert('Success', 'Template created successfully');
      }
      setShowEditor(false);
      setEditingTemplate(undefined);
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save template');
    }
  };

  const handleDuplicateTemplate = async (template: EmailTemplate) => {
    Alert.prompt(
      'Duplicate Template',
      'Enter a name for the duplicated template:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Duplicate',
          onPress: async (name) => {
            if (name) {
              await duplicateTemplate(template.id, name);
              loadData();
            }
          },
        },
      ],
      'plain-text',
      `${template.name} (Copy)`
    );
  };

  const handleDeleteTemplate = async (template: EmailTemplate) => {
    if (template.is_system) {
      Alert.alert('Error', 'System templates cannot be deleted');
      return;
    }

    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteEmailTemplate(template.id);
            if (success) {
              loadData();
            } else {
              Alert.alert('Error', 'Failed to delete template');
            }
          },
        },
      ]
    );
  };

  const filteredTemplates = selectedCategory
    ? templates.filter((t) => t.category_id === selectedCategory)
    : templates;

  const renderTemplate = ({ item }: { item: EmailTemplate }) => (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={() => handleEditTemplate(item)}
    >
      <View style={styles.templateHeader}>
        <View style={styles.templateTitleContainer}>
          <Mail size={20} color={colors.primary} />
          <View style={styles.templateInfo}>
            <Text style={styles.templateName}>{item.name}</Text>
            {item.description && (
              <Text style={styles.templateDescription} numberOfLines={1}>
                {item.description}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.templateStatus}>
          {item.is_active ? (
            <CheckCircle size={16} color={colors.success} />
          ) : (
            <XCircle size={16} color={colors.textSecondary} />
          )}
        </View>
      </View>

      <View style={styles.templateMeta}>
        <Text style={styles.templateSubject} numberOfLines={1}>
          {item.subject}
        </Text>
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsList}>
            {item.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Tag size={10} color={colors.textSecondary} />
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.templateFooter}>
        <Text style={styles.templateStats}>
          Used {item.usage_count || 0} times
        </Text>
        <View style={styles.templateActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDuplicateTemplate(item)}
          >
            <Copy size={16} color={colors.textSecondary} />
          </TouchableOpacity>
          {!item.is_system && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteTemplate(item)}
            >
              <Trash2 size={16} color={colors.error} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditTemplate(item)}
          >
            <Edit size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {item.is_system && (
        <View style={styles.systemBadge}>
          <Text style={styles.systemBadgeText}>System Template</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (showEditor) {
    return (
      <EmailTemplateEditor
        template={editingTemplate}
        onSave={handleSaveTemplate}
        onCancel={() => {
          setShowEditor(false);
          setEditingTemplate(undefined);
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Email Templates</Text>
        <Button
          title="New Template"
          onPress={handleCreateTemplate}
          icon={<Plus size={16} color={colors.white} />}
        />
      </View>

      <View style={styles.searchBar}>
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChangeText={handleSearch}
          leftIcon={<Search size={20} color={colors.textSecondary} />}
        />
      </View>

      <View style={styles.categoriesContainer}>
        <TouchableOpacity
          style={[
            styles.categoryChip,
            !selectedCategory && styles.categoryChipActive,
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text
            style={[
              styles.categoryChipText,
              !selectedCategory && styles.categoryChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === category.id &&
                  styles.categoryChipTextActive,
              ]}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTemplates}
        renderItem={renderTemplate}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={loadData}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Mail size={48} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No templates found</Text>
            <Button
              title="Create First Template"
              onPress={handleCreateTemplate}
            />
          </View>
        }
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
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  searchBar: {
    padding: spacing.md,
    backgroundColor: colors.white,
  },
  categoriesContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  templateCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  templateTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    flex: 1,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  templateDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  templateStatus: {
    marginLeft: spacing.sm,
  },
  templateMeta: {
    gap: spacing.sm,
  },
  templateSubject: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  tagText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  templateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  templateStats: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  templateActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
  },
  systemBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  systemBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
});
