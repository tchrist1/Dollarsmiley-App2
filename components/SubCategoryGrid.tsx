import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Category } from '@/types/database';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width > 600 ? (width - spacing.lg * 4) / 3 : (width - spacing.lg * 3) / 2;

interface SubCategoryGridProps {
  parentCategoryId: string;
  onSelect?: (subCategoryId: string) => void;
}

export function SubCategoryGrid({ parentCategoryId, onSelect }: SubCategoryGridProps) {
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubCategories();
  }, [parentCategoryId]);

  const fetchSubCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('parent_id', parentCategoryId)
        .order('name');

      if (error) throw error;
      if (data) setSubCategories(data);
    } catch (error) {
      console.error('Error fetching sub-categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSubCategoryImage = (name: string): string => {
    const imageMap: { [key: string]: string } = {
      balloon: '🎈',
      flower: '💐',
      cake: '🎂',
      photography: '📸',
      music: '🎵',
      venue: '🏛️',
      catering: '🍽️',
      decoration: '🎨',
      makeup: '💄',
      hair: '💇',
      massage: '💆',
      fitness: '🏋️',
      yoga: '🧘',
      cleaning: '🧹',
      plumbing: '🔧',
      electrical: '💡',
      painting: '🎨',
      moving: '📦',
      gardening: '🌱',
      pest: '🐛',
      repair: '🔨',
      tutoring: '📚',
      art: '🎨',
      dance: '💃',
      coding: '💻',
      design: '🎨',
      writing: '✍️',
      translation: '🗣️',
      legal: '⚖️',
      accounting: '📊',
      consulting: '💼',
    };

    const lowerName = name.toLowerCase();
    for (const [key, emoji] of Object.entries(imageMap)) {
      if (lowerName.includes(key)) {
        return emoji;
      }
    }

    return '📋';
  };

  const renderSubCategoryCard = ({ item }: { item: Category }) => {
    const imageSource = item.image_url && typeof item.image_url === 'string'
      ? { uri: item.image_url }
      : null;

    return (
      <TouchableOpacity
        style={[styles.subCategoryCard, { width: CARD_WIDTH }]}
        onPress={() => {
          if (onSelect) {
            onSelect(item.id);
          } else {
            router.push({
              pathname: '/discover',
              params: { categoryId: item.id },
            });
          }
        }}
        activeOpacity={0.8}
      >
        <View style={styles.imageContainer}>
          {imageSource ? (
            <Image
              source={imageSource}
              style={styles.subCategoryImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.subCategoryEmoji}>
              {getSubCategoryImage(item.name)}
            </Text>
          )}
        </View>

        <Text style={styles.subCategoryName} numberOfLines={2}>
          {item.name || 'Unnamed Category'}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading sub-categories...</Text>
      </View>
    );
  }

  if (subCategories.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No sub-categories available</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={subCategories}
      keyExtractor={(item) => item.id}
      renderItem={renderSubCategoryCard}
      numColumns={width > 600 ? 3 : 2}
      key={width > 600 ? 'three-columns' : 'two-columns'}
      columnWrapperStyle={styles.gridRow}
      contentContainerStyle={styles.gridContent}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  gridContent: {
    padding: spacing.md,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  subCategoryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  subCategoryImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  subCategoryEmoji: {
    fontSize: 32,
  },
  subCategoryName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xxs,
  },
});
