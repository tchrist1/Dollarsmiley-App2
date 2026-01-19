import React, { memo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

interface SearchSuggestion {
  suggestion: string;
  search_count: number;
}

interface HomeSearchBarProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  suggestions: SearchSuggestion[];
  showSuggestions: boolean;
  onSelectSuggestion: (suggestion: string) => void;
  onClearSearch: () => void;
  trendingSearches: SearchSuggestion[];
  VoiceSearchButton?: React.ReactNode;
  ImageSearchButton?: React.ReactNode;
}

export const HomeSearchBar = memo<HomeSearchBarProps>(({
  searchQuery,
  onSearchChange,
  suggestions,
  showSuggestions,
  onSelectSuggestion,
  onClearSearch,
  trendingSearches,
  VoiceSearchButton,
  ImageSearchButton,
}) => {
  const displaySuggestions = searchQuery.length > 0 ? suggestions : trendingSearches;
  const suggestionsTitle = searchQuery.length > 0 ? 'Suggestions' : 'Trending Searches';

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputRow}>
          <Search size={20} color={colors.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search services, jobs, or providers..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={onSearchChange}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={onClearSearch} style={styles.clearButton}>
              <X size={18} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {VoiceSearchButton && ImageSearchButton && (
          <View style={styles.searchActions}>
            {VoiceSearchButton}
            {ImageSearchButton}
          </View>
        )}
      </View>

      {showSuggestions && displaySuggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>{suggestionsTitle}</Text>
          <FlatList
            data={displaySuggestions}
            keyExtractor={(item, index) => `${item.suggestion}-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => onSelectSuggestion(item.suggestion)}
              >
                <Search size={16} color={colors.textLight} />
                <Text style={styles.suggestionText}>{item.suggestion}</Text>
                {item.search_count > 0 && (
                  <Text style={styles.suggestionCount}>
                    {item.search_count > 999 ? '999+' : item.search_count}
                  </Text>
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.suggestionSeparator} />}
          />
        </View>
      )}
    </View>
  );
});

HomeSearchBar.displayName = 'HomeSearchBar';

const styles = StyleSheet.create({
  container: {
    zIndex: 100,
  },
  searchContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  clearButton: {
    padding: spacing.xs,
  },
  searchActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.xs,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  suggestionsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textLight,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  suggestionText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  suggestionCount: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  suggestionSeparator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
});
