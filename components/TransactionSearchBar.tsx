import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Text,
} from 'react-native';
import { Search, X, Clock } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TransactionSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder?: string;
  showHistory?: boolean;
}

const SEARCH_HISTORY_KEY = '@transaction_search_history';
const MAX_HISTORY_ITEMS = 10;

export function TransactionSearchBar({
  value,
  onChangeText,
  onClear,
  placeholder = 'Search transactions...',
  showHistory = true,
}: TransactionSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  useEffect(() => {
    if (showHistory) {
      loadSearchHistory();
    }
  }, []);

  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const saveToHistory = async (searchTerm: string) => {
    if (!searchTerm.trim() || !showHistory) return;

    try {
      const trimmedTerm = searchTerm.trim();
      let updatedHistory = [trimmedTerm];

      const existingHistory = searchHistory.filter((item) => item !== trimmedTerm);
      updatedHistory = [...updatedHistory, ...existingHistory].slice(0, MAX_HISTORY_ITEMS);

      setSearchHistory(updatedHistory);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

  const clearSearchHistory = async () => {
    try {
      setSearchHistory([]);
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  };

  const removeHistoryItem = async (item: string) => {
    try {
      const updatedHistory = searchHistory.filter((h) => h !== item);
      setSearchHistory(updatedHistory);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error removing history item:', error);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (showHistory && searchHistory.length > 0 && !value) {
      setShowHistoryDropdown(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    setTimeout(() => {
      setShowHistoryDropdown(false);
    }, 200);
  };

  const handleSubmit = () => {
    if (value.trim()) {
      saveToHistory(value);
      setShowHistoryDropdown(false);
    }
  };

  const handleHistoryItemPress = (item: string) => {
    onChangeText(item);
    setShowHistoryDropdown(false);
  };

  const handleClear = () => {
    onClear();
    setShowHistoryDropdown(false);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.searchBar, isFocused && styles.searchBarFocused]}>
        <Search size={20} color={colors.textSecondary} />

        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmit}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {value.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {showHistoryDropdown && searchHistory.length > 0 && (
        <View style={styles.historyDropdown}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyHeaderText}>Recent Searches</Text>
            <TouchableOpacity onPress={clearSearchHistory}>
              <Text style={styles.clearHistoryText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={searchHistory}
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={({ item }) => (
              <View style={styles.historyItem}>
                <TouchableOpacity
                  style={styles.historyItemButton}
                  onPress={() => handleHistoryItemPress(item)}
                >
                  <Clock size={16} color={colors.textSecondary} />
                  <Text style={styles.historyItemText}>{item}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => removeHistoryItem(item)}
                  style={styles.removeHistoryButton}
                >
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
            style={styles.historyList}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  searchBarFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  clearButton: {
    padding: spacing.xs,
  },
  historyDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyHeaderText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  clearHistoryText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  historyList: {
    maxHeight: 200,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyItemButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyItemText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  removeHistoryButton: {
    padding: spacing.xs,
  },
});
