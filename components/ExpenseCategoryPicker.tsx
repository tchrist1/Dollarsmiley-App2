import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Check, ChevronRight, X } from 'lucide-react-native';
import {
  getExpenseCategories,
  type ExpenseCategory,
} from '@/lib/expense-categorization';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface ExpenseCategoryPickerProps {
  visible: boolean;
  selectedCategoryId?: string;
  onSelect: (category: ExpenseCategory) => void;
  onClose: () => void;
}

export default function ExpenseCategoryPicker({
  visible,
  selectedCategoryId,
  onSelect,
  onClose,
}: ExpenseCategoryPickerProps) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [parentCategories, setParentCategories] = useState<ExpenseCategory[]>([]);
  const [childCategories, setChildCategories] = useState<Map<string, ExpenseCategory[]>>(
    new Map()
  );

  useEffect(() => {
    if (visible) {
      loadCategories();
    }
  }, [visible]);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const allCategories = await getExpenseCategories(true);
      setCategories(allCategories);

      const parents = allCategories.filter((cat) => !cat.parent_category_id);
      setParentCategories(parents);

      const childMap = new Map<string, ExpenseCategory[]>();
      allCategories
        .filter((cat) => cat.parent_category_id)
        .forEach((cat) => {
          const parentId = cat.parent_category_id!;
          if (!childMap.has(parentId)) {
            childMap.set(parentId, []);
          }
          childMap.get(parentId)!.push(cat);
        });
      setChildCategories(childMap);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCategory = (category: ExpenseCategory) => {
    onSelect(category);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Category</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {parentCategories.map((parent) => (
                <View key={parent.id} style={styles.categoryGroup}>
                  {/* Parent Category */}
                  <TouchableOpacity
                    style={[
                      styles.categoryItem,
                      selectedCategoryId === parent.id && styles.categoryItemSelected,
                    ]}
                    onPress={() => handleSelectCategory(parent)}
                  >
                    <View style={styles.categoryLeft}>
                      <View
                        style={[
                          styles.colorIndicator,
                          { backgroundColor: parent.color || colors.textSecondary },
                        ]}
                      />
                      <Text
                        style={[
                          styles.categoryName,
                          selectedCategoryId === parent.id && styles.categoryNameSelected,
                        ]}
                      >
                        {parent.name}
                      </Text>
                      {parent.is_tax_deductible && (
                        <View style={styles.taxBadge}>
                          <Text style={styles.taxBadgeText}>Tax Deductible</Text>
                        </View>
                      )}
                    </View>
                    {selectedCategoryId === parent.id && (
                      <Check size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>

                  {/* Subcategories */}
                  {childCategories.has(parent.id) &&
                    childCategories.get(parent.id)!.map((child) => (
                      <TouchableOpacity
                        key={child.id}
                        style={[
                          styles.categoryItem,
                          styles.subcategoryItem,
                          selectedCategoryId === child.id && styles.categoryItemSelected,
                        ]}
                        onPress={() => handleSelectCategory(child)}
                      >
                        <View style={styles.categoryLeft}>
                          <ChevronRight size={16} color={colors.textSecondary} />
                          <Text
                            style={[
                              styles.categoryName,
                              styles.subcategoryName,
                              selectedCategoryId === child.id && styles.categoryNameSelected,
                            ]}
                          >
                            {child.name}
                          </Text>
                          {child.is_tax_deductible && (
                            <View style={styles.taxBadge}>
                              <Text style={styles.taxBadgeText}>Tax Deductible</Text>
                            </View>
                          )}
                        </View>
                        {selectedCategoryId === child.id && (
                          <Check size={20} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  scrollView: {
    padding: spacing.lg,
  },
  categoryGroup: {
    marginBottom: spacing.md,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
  },
  categoryItemSelected: {
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  categoryNameSelected: {
    color: colors.primary,
  },
  subcategoryItem: {
    marginLeft: spacing.lg,
    backgroundColor: colors.white,
  },
  subcategoryName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
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
});
