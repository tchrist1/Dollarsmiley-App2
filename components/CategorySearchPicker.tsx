import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Search, X, ChevronRight, Folder, FolderOpen } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  icon?: string;
  image_url?: string;
}

interface CategorySearchPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (category: Category) => void;
  selectedCategoryId?: string;
  allowSubcategories?: boolean;
  placeholder?: string;
}

export default function CategorySearchPicker({
  visible,
  onClose,
  onSelect,
  selectedCategoryId,
  allowSubcategories = true,
  placeholder = 'Search categories...',
}: CategorySearchPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      fetchCategories();
    }
  }, [visible]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (!error && data) {
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return categories;
    }

    const query = searchQuery.toLowerCase();
    return categories.filter((cat) =>
      cat.name.toLowerCase().includes(query) ||
      cat.slug.toLowerCase().includes(query)
    );
  }, [categories, searchQuery]);

  const categoriesByParent = useMemo(() => {
    const map = new Map<string | null, Category[]>();
    filteredCategories.forEach((cat) => {
      const parentId = cat.parent_id || null;
      if (!map.has(parentId)) {
        map.set(parentId, []);
      }
      map.get(parentId)!.push(cat);
    });
    return map;
  }, [filteredCategories]);

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleSelect = (category: Category) => {
    onSelect(category);
    onClose();
    setSearchQuery('');
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const hasChildren = categoriesByParent.has(category.id);
    const isExpanded = expandedCategories.has(category.id);
    const isSelected = category.id === selectedCategoryId;
    const subcategories = categoriesByParent.get(category.id) || [];

    return (
      <View key={category.id}>
        <TouchableOpacity
          style={[
            styles.categoryItem,
            { paddingLeft: spacing.md + level * spacing.lg },
            isSelected && styles.selectedCategory,
          ]}
          onPress={() => {
            if (hasChildren && allowSubcategories) {
              toggleExpand(category.id);
            } else {
              handleSelect(category);
            }
          }}
        >
          <View style={styles.categoryLeft}>
            {hasChildren ? (
              isExpanded ? (
                <FolderOpen size={20} color={colors.primary} />
              ) : (
                <Folder size={20} color={colors.textSecondary} />
              )
            ) : (
              <View style={styles.iconPlaceholder} />
            )}
            <Text
              style={[
                styles.categoryName,
                isSelected && styles.selectedCategoryText,
                level === 0 && styles.parentCategoryName,
              ]}
            >
              {category.name}
            </Text>
          </View>
          {hasChildren && allowSubcategories && (
            <ChevronRight
              size={16}
              color={colors.textSecondary}
              style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
            />
          )}
          {!hasChildren && allowSubcategories && (
            <View style={styles.selectButton}>
              <Text style={styles.selectButtonText}>Select</Text>
            </View>
          )}
        </TouchableOpacity>

        {isExpanded && hasChildren && allowSubcategories && (
          <View>
            {subcategories.map((sub) => renderCategory(sub, level + 1))}
          </View>
        )}
      </View>
    );
  };

  const renderFlatCategory = ({ item }: { item: Category }) => {
    const isSelected = item.id === selectedCategoryId;
    const isParent = !item.parent_id;

    return (
      <TouchableOpacity
        style={[styles.flatCategoryItem, isSelected && styles.selectedCategory]}
        onPress={() => handleSelect(item)}
      >
        <View style={styles.categoryLeft}>
          {isParent ? (
            <Folder size={20} color={colors.primary} />
          ) : (
            <View style={styles.subCategoryDot} />
          )}
          <Text
            style={[
              styles.categoryName,
              isSelected && styles.selectedCategoryText,
              isParent && styles.parentCategoryName,
            ]}
          >
            {item.name}
          </Text>
        </View>
        <View style={styles.selectButton}>
          <Text style={styles.selectButtonText}>Select</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const rootCategories = categoriesByParent.get(null) || [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.lg) }]}>
          <Text style={styles.headerTitle}>Select Category</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={placeholder}
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

        {/* Categories List */}
        <KeyboardAvoidingView
          style={styles.listContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : searchQuery.trim() ? (
            <FlatList
              data={filteredCategories}
              renderItem={renderFlatCategory}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No categories found</Text>
                </View>
              }
            />
          ) : (
            <FlatList
              data={rootCategories}
              renderItem={({ item }) => renderCategory(item, 0)}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No categories available</Text>
                </View>
              }
            />
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
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
  listContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeButtonText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    margin: spacing.lg,
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
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  clearButton: {
    padding: spacing.sm,
  },
  listContent: {
    flexGrow: 1,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  flatCategoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  iconPlaceholder: {
    width: 20,
    height: 20,
  },
  categoryName: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  parentCategoryName: {
    fontWeight: fontWeight.semibold,
  },
  selectedCategory: {
    backgroundColor: colors.primaryLight,
  },
  selectedCategoryText: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  subCategoryDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  selectButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  selectButtonText: {
    fontSize: fontSize.sm,
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});
