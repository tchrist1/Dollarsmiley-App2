import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MapPin, X, Navigation } from 'lucide-react-native';
import * as Location from 'expo-location';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  searchMapboxPlaces,
  retrieveMapboxPlace,
  parseMapboxAddress,
  reverseGeocode,
  MapboxSuggestion,
  generateSessionToken,
} from '@/lib/mapbox-search';

export interface AddressData {
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  latitude?: number;
  longitude?: number;
  formatted_address?: string;
}

interface AddressInputProps {
  value: AddressData;
  onChange: (address: AddressData) => void;
  error?: string;
  required?: boolean;
}

export default function AddressInput({
  value,
  onChange,
  error,
  required = false,
}: AddressInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [sessionToken, setSessionToken] = useState<string>(generateSessionToken());
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const handleStreetChange = async (text: string) => {
    onChange({ ...value, street_address: text });

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
          types: ['address', 'street'],
          country: ['US'],
          limit: 10,
          sessionToken: sessionToken,
        });

        setSuggestions(results);
      } catch (error) {
        console.error('Error searching addresses:', error);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleCityChange = (text: string) => {
    onChange({ ...value, city: text });
  };

  const handleStateChange = (text: string) => {
    onChange({ ...value, state: text.toUpperCase() });
  };

  const handleZipChange = (text: string) => {
    // Only allow numbers and limit to 5 digits
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 5);
    onChange({ ...value, zip_code: cleaned });
  };

  const handleCountryChange = (text: string) => {
    onChange({ ...value, country: text.toUpperCase() });
  };

  const handleSuggestionSelect = async (suggestion: MapboxSuggestion) => {
    setLoading(true);

    try {
      const detailedPlace = await retrieveMapboxPlace(suggestion.id, sessionToken);
      const parsedAddress = detailedPlace
        ? parseMapboxAddress(detailedPlace)
        : parseMapboxAddress(suggestion);

      onChange({
        street_address: parsedAddress.street_address,
        city: parsedAddress.city,
        state: parsedAddress.state,
        zip_code: parsedAddress.zip_code,
        country: parsedAddress.country,
        latitude: parsedAddress.latitude,
        longitude: parsedAddress.longitude,
        formatted_address: parsedAddress.formatted_address,
      });

      setSessionToken(generateSessionToken());
    } catch (error) {
      console.error('Error selecting suggestion:', error);
      const parsedAddress = parseMapboxAddress(suggestion);
      onChange({
        street_address: parsedAddress.street_address,
        city: parsedAddress.city,
        state: parsedAddress.state,
        zip_code: parsedAddress.zip_code,
        country: parsedAddress.country,
        latitude: parsedAddress.latitude,
        longitude: parsedAddress.longitude,
        formatted_address: parsedAddress.formatted_address,
      });

      setSessionToken(generateSessionToken());
    } finally {
      setLoading(false);
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  const handleUseCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        maximumAge: 30000,
      });
      const { latitude, longitude } = location.coords;

      const address = await reverseGeocode(latitude, longitude);

      if (address) {
        onChange({
          street_address: address.street_address,
          city: address.city,
          state: address.state,
          zip_code: address.zip_code,
          country: address.country,
          latitude: address.latitude,
          longitude: address.longitude,
          formatted_address: address.formatted_address,
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
      alert('Failed to get current location');
    } finally {
      setGettingLocation(false);
    }
  };

  const handleClear = () => {
    onChange({
      street_address: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'US',
    });
  };

  const hasValue = value.street_address || value.city || value.state || value.zip_code;

  return (
    <View style={styles.container}>
      {/* Street Address */}
      <View style={styles.inputGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            Street Address {required && <Text style={styles.required}>*</Text>}
          </Text>
          <TouchableOpacity
            onPress={handleUseCurrentLocation}
            style={styles.locationButton}
            disabled={gettingLocation}
          >
            {gettingLocation ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Navigation size={16} color={colors.primary} />
                <Text style={styles.locationButtonText}>Use current location</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        <View style={[styles.inputContainer, error && styles.inputError]}>
          <MapPin size={20} color={colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Start typing an address..."
            value={value.street_address}
            onChangeText={handleStreetChange}
            placeholderTextColor={colors.textLight}
            autoCapitalize="words"
          />
          {value.street_address.length > 0 && (
            <TouchableOpacity onPress={() => handleStreetChange('')} style={styles.clearIcon}>
              <X size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          {loading && <ActivityIndicator size="small" color={colors.primary} style={styles.loadingIcon} />}
        </View>

        {/* Suggestions Dropdown */}
        {showSuggestions && !loading && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
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
          </View>
        )}

        {showSuggestions && !loading && suggestions.length === 0 && value.street_address.length >= 3 && (
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>No addresses found. Try a different search.</Text>
          </View>
        )}
      </View>

      {/* City, State, Zip Row */}
      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.cityInput]}>
          <Text style={styles.label}>
            City {required && <Text style={styles.required}>*</Text>}
          </Text>
          <TextInput
            style={[styles.inputContainer, error && styles.inputError]}
            placeholder="City"
            value={value.city}
            onChangeText={handleCityChange}
            placeholderTextColor={colors.textLight}
            autoCapitalize="words"
          />
        </View>

        <View style={[styles.inputGroup, styles.stateInput]}>
          <Text style={styles.label}>
            State {required && <Text style={styles.required}>*</Text>}
          </Text>
          <TextInput
            style={[styles.inputContainer, error && styles.inputError]}
            placeholder="CA"
            value={value.state}
            onChangeText={handleStateChange}
            placeholderTextColor={colors.textLight}
            autoCapitalize="characters"
            maxLength={2}
          />
        </View>

        <View style={[styles.inputGroup, styles.zipInput]}>
          <Text style={styles.label}>
            Zip {required && <Text style={styles.required}>*</Text>}
          </Text>
          <TextInput
            style={[styles.inputContainer, error && styles.inputError]}
            placeholder="12345"
            value={value.zip_code}
            onChangeText={handleZipChange}
            placeholderTextColor={colors.textLight}
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>
      </View>

      {/* Country */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Country</Text>
        <TextInput
          style={[styles.inputContainer, error && styles.inputError]}
          placeholder="US"
          value={value.country}
          onChangeText={handleCountryChange}
          placeholderTextColor={colors.textLight}
          autoCapitalize="characters"
          maxLength={2}
        />
      </View>

      {/* Clear Button */}
      {hasValue && (
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Clear Address</Text>
        </TouchableOpacity>
      )}

      {/* Error Message */}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  required: {
    color: colors.error,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  locationButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  clearIcon: {
    padding: spacing.xs,
  },
  loadingIcon: {
    marginLeft: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cityInput: {
    flex: 2,
  },
  stateInput: {
    flex: 1,
  },
  zipInput: {
    flex: 1,
  },
  suggestionsContainer: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    maxHeight: 200,
    marginTop: -spacing.xs,
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
  noResultsContainer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  noResultsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  clearButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
  },
  clearButtonText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: fontWeight.medium,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: -spacing.xs,
  },
});
