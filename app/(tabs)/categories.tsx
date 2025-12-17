import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  ScrollView,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Search } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Category } from '@/types/database';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import VoiceSearchButton from '@/components/VoiceSearchButton';
import ImageSearchButton from '@/components/ImageSearchButton';

const { width, height } = Dimensions.get('window');
const CATEGORY_WIDTH = 120;

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchSubCategories(selectedCategory.id);
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .is('parent_id', null)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        setCategories(data);
        // Select first category by default
        setSelectedCategory(data[0]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubCategories = async (categoryId: string) => {
    try {
      // Fetch child categories (which are the visual subcategories shown with images)
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('parent_id', categoryId)
        .order('name');

      if (error) throw error;
      setSubCategories(data || []);
    } catch (error) {
      console.error('Error fetching sub-categories:', error);
      setSubCategories([]);
    }
  };

  const getSubCategoryImage = (category: Category) => {
    return { uri: category.image_url || 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg' };
  };

  const handleSubCategoryPress = (subCategory: Category) => {
    // Navigate to home tab with category filter
    // Use href format for tab navigation
    const params = new URLSearchParams({
      categoryId: subCategory.id,
      categoryName: subCategory.name,
    });
    router.push(`/?${params.toString()}` as any);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const params = new URLSearchParams({
        search: query,
      });
      router.push(`/?${params.toString()}` as any);
    }
  };


  const renderCategoryItem = ({ item }: { item: Category }) => {
    const isSelected = selectedCategory?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.categoryItem, isSelected && styles.categoryItemSelected]}
        onPress={() => setSelectedCategory(item)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.categoryText,
            isSelected && styles.categoryTextSelected,
          ]}
          numberOfLines={2}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSubCategoryItem = ({ item }: { item: Category }) => {
    const imageSource = getSubCategoryImage(item);

    return (
      <TouchableOpacity
        style={styles.subCategoryCard}
        onPress={() => handleSubCategoryPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.imageContainer}>
          <Image
            source={imageSource}
            style={styles.subCategoryImage}
            resizeMode="cover"
          />
        </View>
        <Text style={styles.subCategoryName} numberOfLines={2}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Shop by Category</Text>

        <View style={styles.searchBarWrapper}>
          <View style={styles.searchContainer}>
            <Search size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for event services, party providers, and local jobs"
              placeholderTextColor="#7A7A7A"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => handleSearch(searchQuery)}
            />
            <VoiceSearchButton
              searchType="providers"
              onResults={(results) => {}}
              onError={(error) => {}}
            />
            <ImageSearchButton
              onResults={(results) => {}}
              onError={(error) => {}}
            />
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.categoriesPanel}>
          <Text style={styles.panelTitle}>Categories</Text>
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            renderItem={renderCategoryItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        <View style={styles.subCategoriesPanel}>
          {selectedCategory && (
            <>
              <Text style={styles.subCategoriesTitle}>{selectedCategory.name}</Text>
              <FlatList
                data={subCategories}
                keyExtractor={(item) => item.id}
                renderItem={renderSubCategoryItem}
                numColumns={3}
                columnWrapperStyle={styles.subCategoryRow}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.subCategoriesList}
              />
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#222222',
    marginBottom: spacing.sm,
  },
  searchBarWrapper: {
    marginTop: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.sm,
    height: '100%',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  categoriesPanel: {
    width: CATEGORY_WIDTH,
    backgroundColor: colors.backgroundSecondary,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  panelTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    textTransform: 'uppercase',
  },
  categoriesList: {
    paddingBottom: spacing.md,
  },
  categoryItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: '#F7F7F7',
    marginBottom: 2,
  },
  categoryItemSelected: {
    backgroundColor: '#006634',
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  categoryText: {
    fontSize: 14,
    color: '#444444',
    textAlign: 'left',
    fontWeight: '700' as const,
  },
  categoryTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
  },
  subCategoriesTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  selectedIndicator: {
    position: 'absolute',
    right: 0,
    top: '50%',
    marginTop: -6,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderTopColor: 'transparent',
    borderBottomWidth: 6,
    borderBottomColor: 'transparent',
    borderRightWidth: 6,
    borderRightColor: colors.white,
  },
  subCategoriesPanel: {
    flex: 1,
    backgroundColor: colors.white,
  },
  subCategoriesList: {
    padding: spacing.md,
  },
  subCategoryRow: {
    justifyContent: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  subCategoryCard: {
    width: (width - CATEGORY_WIDTH - spacing.md * 2 - spacing.sm * 2) / 3,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  subCategoryImage: {
    width: '100%',
    height: '100%',
  },
  subCategoryName: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 16,
  },
});
