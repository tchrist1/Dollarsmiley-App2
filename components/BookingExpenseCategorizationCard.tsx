import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { Tag, FolderOpen, Plus, X } from 'lucide-react-native';
import ExpenseCategoryPicker from './ExpenseCategoryPicker';
import {
  getBookingCategorization,
  getBookingTags,
  getExpenseCategory,
  addBookingTag,
  removeBookingTag,
  categorizeBooking,
  getUserExpenseTags,
  type ExpenseCategory,
  type ExpenseTag,
} from '@/lib/expense-categorization';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface BookingExpenseCategorizationCardProps {
  bookingId: string;
  userId: string;
  onUpdate?: () => void;
}

export default function BookingExpenseCategorizationCard({
  bookingId,
  userId,
  onUpdate,
}: BookingExpenseCategorizationCardProps) {
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [tags, setTags] = useState<ExpenseTag[]>([]);
  const [availableTags, setAvailableTags] = useState<ExpenseTag[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);

  useEffect(() => {
    loadData();
  }, [bookingId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [categorization, bookingTags, userTags] = await Promise.all([
        getBookingCategorization(bookingId),
        getBookingTags(bookingId),
        getUserExpenseTags(userId),
      ]);

      if (categorization?.expense_category_id) {
        const cat = await getExpenseCategory(categorization.expense_category_id);
        setCategory(cat);
      }

      setTags(bookingTags);
      setAvailableTags(userTags);
    } catch (error) {
      console.error('Error loading categorization:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = async (selectedCategory: ExpenseCategory) => {
    const success = await categorizeBooking(bookingId, selectedCategory.id);
    if (success) {
      setCategory(selectedCategory);
      onUpdate?.();
    } else {
      Alert.alert('Error', 'Failed to categorize expense');
    }
  };

  const handleAddTag = async (tag: ExpenseTag) => {
    const success = await addBookingTag(bookingId, tag.id);
    if (success) {
      setTags([...tags, tag]);
      setShowTagSelector(false);
      onUpdate?.();
    } else {
      Alert.alert('Error', 'Failed to add tag');
    }
  };

  const handleRemoveTag = async (tag: ExpenseTag) => {
    const success = await removeBookingTag(bookingId, tag.id);
    if (success) {
      setTags(tags.filter((t) => t.id !== tag.id));
      onUpdate?.();
    } else {
      Alert.alert('Error', 'Failed to remove tag');
    }
  };

  const getUnusedTags = () => {
    const usedTagIds = new Set(tags.map((t) => t.id));
    return availableTags.filter((t) => !usedTagIds.has(t.id));
  };

  if (loading) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Category Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Category</Text>
        <TouchableOpacity
          style={styles.categoryButton}
          onPress={() => setShowCategoryPicker(true)}
        >
          <FolderOpen size={20} color={category?.color || colors.textSecondary} />
          <Text style={styles.categoryText}>
            {category?.name || 'Select category'}
          </Text>
          {category?.is_tax_deductible && (
            <View style={styles.taxBadge}>
              <Text style={styles.taxBadgeText}>Tax Deductible</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Tags Section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Tags</Text>
        <View style={styles.tagsContainer}>
          {tags.map((tag) => (
            <View key={tag.id} style={[styles.tag, { backgroundColor: tag.color + '20' }]}>
              <Text style={[styles.tagText, { color: tag.color }]}>{tag.name}</Text>
              <TouchableOpacity onPress={() => handleRemoveTag(tag)}>
                <X size={14} color={tag.color} />
              </TouchableOpacity>
            </View>
          ))}
          {getUnusedTags().length > 0 && (
            <TouchableOpacity
              style={styles.addTagButton}
              onPress={() => setShowTagSelector(true)}
            >
              <Plus size={16} color={colors.primary} />
              <Text style={styles.addTagText}>Add Tag</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Picker Modal */}
      <ExpenseCategoryPicker
        visible={showCategoryPicker}
        selectedCategoryId={category?.id}
        onSelect={handleSelectCategory}
        onClose={() => setShowCategoryPicker(false)}
      />

      {/* Tag Selector */}
      {showTagSelector && (
        <View style={styles.tagSelector}>
          <View style={styles.tagSelectorHeader}>
            <Text style={styles.tagSelectorTitle}>Select Tag</Text>
            <TouchableOpacity onPress={() => setShowTagSelector(false)}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.tagSelectorList}>
            {getUnusedTags().map((tag) => (
              <TouchableOpacity
                key={tag.id}
                style={[styles.tagOption, { borderColor: tag.color }]}
                onPress={() => handleAddTag(tag)}
              >
                <View style={[styles.tagColorDot, { backgroundColor: tag.color }]} />
                <Text style={styles.tagOptionText}>{tag.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  taxBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.success + '20',
  },
  taxBadgeText: {
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: fontWeight.semibold,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  addTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addTagText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  tagSelector: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    zIndex: 1000,
  },
  tagSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tagSelectorTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  tagSelectorList: {
    gap: spacing.sm,
  },
  tagOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    backgroundColor: colors.surface,
  },
  tagColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  tagOptionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
});
