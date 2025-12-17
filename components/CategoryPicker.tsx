import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Check, ChevronDown, Search, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Category } from '@/types/database';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface CategoryPickerProps {
  label?: string;
  value?: string;
  onSelect: (categoryId: string, categoryName: string, subcategoryId?: string, subcategoryName?: string) => void;
  error?: string;
}

export function CategoryPicker({ label, value, onSelect, error }: CategoryPickerProps) {
  const [visible, setVisible] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedName, setSelectedName] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (value && categories.length > 0) {
      const category = categories.find(c => c.id === value);
      if (category) {
        setSelectedName(category.name);
      }
    }
  }, [value, categories]);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (data && !error) {
      setCategories(data);
    }
    setLoading(false);
  };

  const getParentCategory = (parentId: string) => {
    return categories.find(c => c.id === parentId);
  };

  const handleSelect = (category: Category) => {
    if (category.parent_id) {
      const parentCategory = getParentCategory(category.parent_id);
      if (parentCategory) {
        setSelectedName(parentCategory.name);
        onSelect(parentCategory.id, parentCategory.name, category.id, category.name);
      }
    } else {
      setSelectedName(category.name);
      onSelect(category.id, category.name);
    }
    setVisible(false);
    setSearchQuery('');
  };

  const filteredCategories = useMemo(() => {
    const subcategories = categories.filter(cat => cat.parent_id);

    if (!searchQuery.trim()) {
      return subcategories;
    }

    const query = searchQuery.toLowerCase();
    return subcategories.filter((cat) =>
      cat.name.toLowerCase().includes(query) ||
      (cat.description && cat.description.toLowerCase().includes(query))
    );
  }, [categories, searchQuery]);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.picker, error && styles.pickerError]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.pickerText, !selectedName && styles.placeholder]}>
          {selectedName || 'Select a category'}
        </Text>
        <ChevronDown size={20} color={colors.textSecondary} />
      </TouchableOpacity>
      {error && <Text style={styles.error}>{error}</Text>}

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setVisible(false);
          setSearchQuery('');
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
          keyboardVerticalOffset={0}
        >
          <TouchableOpacity
            style={styles.modalOverlayTouchable}
            activeOpacity={1}
            onPress={() => {
              setVisible(false);
              setSearchQuery('');
            }}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderSection}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Category</Text>
                <TouchableOpacity
                  onPress={() => {
                    setVisible(false);
                    setSearchQuery('');
                  }}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={styles.searchContainer}>
                <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search subcategories..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={colors.textLight}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                    <X size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView
              style={styles.categoriesList}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={[styles.categoriesListContent, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
            >
              {loading ? (
                <Text style={styles.loadingText}>Loading subcategories...</Text>
              ) : filteredCategories.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No subcategories found</Text>
                  <Text style={styles.emptySubtext}>Try a different search term</Text>
                </View>
              ) : (
                filteredCategories.map((subcategory) => {
                  const parentCategory = subcategory.parent_id ? getParentCategory(subcategory.parent_id) : null;
                  const isSelected = value === (parentCategory?.id || subcategory.id);

                  return (
                    <TouchableOpacity
                      key={subcategory.id}
                      style={[
                        styles.categoryItem,
                        isSelected && styles.categoryItemSelected,
                      ]}
                      onPress={() => handleSelect(subcategory)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.categoryItemContent}>
                        {parentCategory && (
                          <Text style={styles.parentCategoryLabel}>
                            {parentCategory.name}
                          </Text>
                        )}
                        <Text
                          style={[
                            styles.categoryItemText,
                            isSelected && styles.categoryItemTextSelected,
                          ]}
                        >
                          {subcategory.name}
                        </Text>
                        {subcategory.description && (
                          <Text style={styles.categoryDescription}>{subcategory.description}</Text>
                        )}
                      </View>
                      {isSelected && <Check size={20} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  pickerError: {
    borderColor: colors.error,
  },
  pickerText: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  placeholder: {
    color: colors.textLight,
  },
  error: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalOverlayTouchable: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    height: '70%',
    display: 'flex',
    flexDirection: 'column',
    ...shadows.lg,
  },
  modalHeaderSection: {
    flexShrink: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeButtonText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
  },
  clearButton: {
    padding: spacing.xs,
  },
  categoriesList: {
    flexGrow: 1,
    flexShrink: 1,
  },
  categoriesListContent: {
    padding: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.xl,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  categoryItemSelected: {
    backgroundColor: colors.surface,
  },
  subCategoryItem: {
    paddingLeft: spacing.xl,
  },
  categoryItemContent: {
    flex: 1,
  },
  categoryItemText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  categoryItemTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  parentCategoryText: {
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.lg,
    marginTop: spacing.sm,
  },
  categoryDescription: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  parentCategoryLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
});
