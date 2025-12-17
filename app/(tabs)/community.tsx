import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { PlusCircle, Users, TrendingUp, Star, HelpCircle, Lightbulb } from 'lucide-react-native';
import { CommunityFeed } from '@/components/CommunityFeed';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

type FilterType = 'all' | 'update' | 'showcase' | 'question' | 'tip';

export default function CommunityScreen() {
  const { profile } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filters = [
    { type: 'all' as FilterType, label: 'All', icon: TrendingUp },
    { type: 'showcase' as FilterType, label: 'Showcase', icon: Star },
    { type: 'question' as FilterType, label: 'Questions', icon: HelpCircle },
    { type: 'tip' as FilterType, label: 'Tips', icon: Lightbulb },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Users size={28} color={colors.primary} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Community</Text>
            <Text style={styles.subtitle}>Connect with service providers</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push('/post/create' as any)}
          activeOpacity={0.7}
        >
          <PlusCircle size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContainer}
      >
        {filters.map((filter) => {
          const Icon = filter.icon;
          const isActive = activeFilter === filter.type;

          return (
            <TouchableOpacity
              key={filter.type}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setActiveFilter(filter.type)}
              activeOpacity={0.7}
            >
              <Icon size={16} color={isActive ? '#FFFFFF' : '#333333'} />
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <CommunityFeed
        userId={profile?.id}
        postType={activeFilter === 'all' ? undefined : activeFilter}
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
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  filtersScroll: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 58,
  },
  filtersContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F4F4F4',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#006634',
    borderColor: '#006634',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#333333',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
});
