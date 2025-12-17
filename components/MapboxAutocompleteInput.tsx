import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInputProps,
} from 'react-native';
import { MapPin } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  searchMapboxPlaces,
  retrieveMapboxPlace,
  MapboxSuggestion,
  generateSessionToken,
} from '@/lib/mapbox-search';

interface MapboxAutocompleteInputProps extends TextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onPlaceSelect?: (place: MapboxSuggestion) => void;
  searchTypes?: string[];
  placeholder?: string;
}

export default function MapboxAutocompleteInput({
  value,
  onChangeText,
  onPlaceSelect,
  searchTypes = ['place', 'locality', 'address'],
  placeholder = 'Enter location',
  ...textInputProps
}: MapboxAutocompleteInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string>(generateSessionToken());
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput>(null);

  const handleTextChange = (text: string) => {
    onChangeText(text);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (text.length < 3) {
      setShowSuggestions(false);
      setSuggestions([]);
      if (text.length === 0) {
        setSessionToken(generateSessionToken());
      }
      return;
    }

    setLoading(true);
    setShowSuggestions(true);

    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchMapboxPlaces(text, {
          types: searchTypes,
          limit: 8,
          sessionToken: sessionToken,
        });

        setSuggestions(results);
      } catch (error) {
        console.error('Error searching places:', error);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSuggestionSelect = async (suggestion: MapboxSuggestion) => {
    setLoading(true);

    try {
      const detailedPlace = await retrieveMapboxPlace(suggestion.id, sessionToken);
      const finalPlace = detailedPlace || suggestion;

      onChangeText(finalPlace.name || finalPlace.place_formatted);
      setShowSuggestions(false);
      setSuggestions([]);

      if (onPlaceSelect) {
        onPlaceSelect(finalPlace);
      }

      setSessionToken(generateSessionToken());

      inputRef.current?.blur();
    } catch (error) {
      console.error('Error selecting suggestion:', error);
      onChangeText(suggestion.name || suggestion.place_formatted);
      setShowSuggestions(false);
      setSuggestions([]);

      if (onPlaceSelect) {
        onPlaceSelect(suggestion);
      }

      setSessionToken(generateSessionToken());
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <MapPin size={20} color={colors.textSecondary} />
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
          value={value}
          onChangeText={handleTextChange}
          onFocus={() => {
            if (value.length >= 3 && suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          {...textInputProps}
        />
        {loading && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : suggestions.length > 0 ? (
            <ScrollView
              style={styles.suggestionsList}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {suggestions.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionSelect(item)}
                >
                  <MapPin size={16} color={colors.primary} />
                  <View style={styles.suggestionContent}>
                    <Text style={styles.suggestionText} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.suggestionSubtext} numberOfLines={1}>
                      {item.place_formatted}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No address found. Try a different search</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    maxHeight: 200,
    marginTop: spacing.xs,
    zIndex: 1000,
    elevation: 5,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestionsList: {
    flexGrow: 0,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
    marginBottom: 2,
  },
  suggestionSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
