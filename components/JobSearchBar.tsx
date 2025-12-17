import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Search, X, Filter, Clock, TrendingUp } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

export interface SearchSuggestion {
  text: string;
  type: 'job' | 'category' | 'location' | 'keyword';
  icon?: string;
  category?: string;
  count?: number;
}

interface JobSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSearch: (query: string) => void;
  onFilterPress: () => void;
  activeFiltersCount?: number;
  suggestions?: SearchSuggestion[];
  recentSearches?: string[];
  popularSearches?: string[];
  loading?: boolean;
  placeholder?: string;
  showCategories?: boolean;
}

export function JobSearchBar({
  value,
  onChangeText,
  onSearch,
  onFilterPress,
  activeFiltersCount = 0,
  suggestions = [],
  recentSearches = [],
  popularSearches = [],
  loading = false,
  placeholder = 'Search jobs...',
  showCategories = true,
}: JobSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (isFocused && (value.length > 0 || recentSearches.length > 0)) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [isFocused, value, recentSearches]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
    }, 200);
  };

  const handleClear = () => {
    onChangeText('');
    inputRef.current?.focus();
  };

  const handleSuggestionSelect = (suggestion: string) => {
    onChangeText(suggestion);
    onSearch(suggestion);
    Keyboard.dismiss();
    setShowSuggestions(false);
  };

  const handleSubmit = () => {
    if (value.trim().length > 0) {
      onSearch(value.trim());
      Keyboard.dismiss();
      setShowSuggestions(false);
    }
  };

  const displaySuggestions = value.length > 0 ? suggestions : [];
  const showRecent = isFocused && value.length === 0 && recentSearches.length > 0;
  const showPopular =
    isFocused && value.length === 0 && popularSearches.length > 0 && recentSearches.length === 0;

  const getSuggestionIcon = (suggestion: SearchSuggestion) => {
    switch (suggestion.type) {
      case 'category':
        return suggestion.icon || '🏷️';
      case 'location':
        return '📍';
      case 'keyword':
        return '🔍';
      default:
        return '💼';
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchBox}>
        <View style={[styles.inputContainer, isFocused && styles.inputContainerFocused]}>
          <Search size={20} color={isFocused ? colors.primary : colors.textSecondary} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={colors.textLight}
            value={value}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {loading && <ActivityIndicator size="small" color={colors.primary} />}
          {!loading && value.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Button */}
        <TouchableOpacity
          style={[styles.filterButton, activeFiltersCount > 0 && styles.filterButtonActive]}
          onPress={onFilterPress}
        >
          <Filter
            size={20}
            color={activeFiltersCount > 0 ? colors.white : colors.textSecondary}
          />
          {activeFiltersCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          <ScrollView
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Enhanced Search Suggestions */}
            {displaySuggestions.length > 0 && (
              <View style={styles.suggestionSection}>
                <Text style={styles.suggestionSectionTitle}>Suggestions</Text>
                {displaySuggestions.map((suggestion, index) => {
                  const isString = typeof suggestion === 'string';
                  const suggestionText = isString ? suggestion : suggestion.text;
                  const suggestionObj = isString
                    ? { text: suggestion, type: 'job' as const }
                    : suggestion;

                  return (
                    <TouchableOpacity
                      key={`suggestion-${index}`}
                      style={styles.suggestionItem}
                      onPress={() => handleSuggestionSelect(suggestionText)}
                    >
                      <Text style={styles.suggestionIcon}>{getSuggestionIcon(suggestionObj)}</Text>
                      <View style={styles.suggestionContent}>
                        <Text style={styles.suggestionText}>{suggestionText}</Text>
                        {suggestionObj.category && (
                          <Text style={styles.suggestionCategory}>{suggestionObj.category}</Text>
                        )}
                      </View>
                      {suggestionObj.count && suggestionObj.count > 0 && (
                        <View style={styles.suggestionCountBadge}>
                          <Text style={styles.suggestionCountText}>{suggestionObj.count}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Recent Searches */}
            {showRecent && (
              <View style={styles.suggestionSection}>
                <View style={styles.suggestionSectionHeader}>
                  <Clock size={16} color={colors.textSecondary} />
                  <Text style={styles.suggestionSectionTitle}>Recent Searches</Text>
                </View>
                {recentSearches.map((search, index) => (
                  <TouchableOpacity
                    key={`recent-${index}`}
                    style={styles.suggestionItem}
                    onPress={() => handleSuggestionSelect(search)}
                  >
                    <Clock size={16} color={colors.textLight} />
                    <Text style={styles.suggestionText}>{search}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Popular Searches */}
            {showPopular && (
              <View style={styles.suggestionSection}>
                <View style={styles.suggestionSectionHeader}>
                  <TrendingUp size={16} color={colors.textSecondary} />
                  <Text style={styles.suggestionSectionTitle}>Popular Searches</Text>
                </View>
                {popularSearches.map((search, index) => (
                  <TouchableOpacity
                    key={`popular-${index}`}
                    style={styles.suggestionItem}
                    onPress={() => handleSuggestionSelect(search)}
                  >
                    <TrendingUp size={16} color={colors.textLight} />
                    <Text style={styles.suggestionText}>{search}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  searchBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputContainerFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: 0,
  },
  clearButton: {
    padding: spacing.xs,
  },
  filterButton: {
    position: 'relative',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: borderRadius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  filterBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    maxHeight: 300,
    ...shadows.lg,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.border,
  },
  suggestionsList: {
    maxHeight: 300,
  },
  suggestionSection: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  suggestionSectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  suggestionIcon: {
    fontSize: fontSize.lg,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  suggestionCategory: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  suggestionCountBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  suggestionCountText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});
