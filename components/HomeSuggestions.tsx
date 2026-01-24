import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Search, TrendingUp } from 'lucide-react-native';
import { colors } from '@/constants/theme';

interface SearchSuggestion {
  suggestion: string;
  search_count: number;
}

interface HomeSuggestionsProps {
  showSuggestions: boolean;
  searchQuery: string;
  suggestions: SearchSuggestion[];
  trendingSearches: SearchSuggestion[];
  onSelectSuggestion: (suggestion: string) => void;
  styles: any;
}

export function HomeSuggestions({
  showSuggestions,
  searchQuery,
  suggestions,
  trendingSearches,
  onSelectSuggestion,
  styles,
}: HomeSuggestionsProps) {
  if (!showSuggestions || (searchQuery.length === 0 && trendingSearches.length === 0)) {
    return null;
  }

  return (
    <View style={styles.suggestionsContainer}>
      {searchQuery.length > 0 ? (
        <>
          {suggestions.length > 0 && (
            <>
              <Text style={styles.suggestionsTitle}>Suggestions</Text>
              {suggestions.map((s, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => onSelectSuggestion(s.suggestion)}
                >
                  <Search size={16} color={colors.textLight} />
                  <Text style={styles.suggestionText}>{s.suggestion}</Text>
                  <Text style={styles.suggestionCount}>({s.search_count})</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </>
      ) : (
        <>
          {trendingSearches.length > 0 && (
            <>
              <View style={styles.trendingHeader}>
                <TrendingUp size={16} color={colors.primary} />
                <Text style={styles.suggestionsTitle}>Trending Searches</Text>
              </View>
              {trendingSearches.map((s, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => onSelectSuggestion(s.suggestion)}
                >
                  <TrendingUp size={16} color={colors.textLight} />
                  <Text style={styles.suggestionText}>{s.suggestion}</Text>
                  <Text style={styles.suggestionCount}>({s.search_count})</Text>
                </TouchableOpacity>
              ))}
            </>
          )}
        </>
      )}
    </View>
  );
}
