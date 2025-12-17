import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  FlatList,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { MapPin, X, Navigation, Search } from 'lucide-react-native';
import * as Location from 'expo-location';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import {
  searchMapboxPlaces,
  retrieveMapboxPlace,
  reverseGeocode,
  MapboxSuggestion,
  generateSessionToken,
} from '@/lib/mapbox-search';

export interface LocationData {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
}

interface LocationPickerProps {
  onLocationSelected?: (location: LocationData | null) => void;
  selectedLocation?: LocationData | null;
}

export default function LocationPicker({
  onLocationSelected,
  selectedLocation,
}: LocationPickerProps) {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false);
  const [sessionToken, setSessionToken] = useState<string>(generateSessionToken());
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const searchPlaces = async (query: string) => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (query.length < 3) {
      setSuggestions([]);
      if (query.length === 0) {
        setSessionToken(generateSessionToken());
      }
      return;
    }

    setLoading(true);

    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await searchMapboxPlaces(query, {
          types: ['place', 'locality', 'address', 'poi'],
          limit: 10,
          sessionToken: sessionToken,
        });

        setSuggestions(results);
      } catch (error) {
        console.error('Error searching places:', error);
        Alert.alert('Error', 'Failed to search locations. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const getCurrentLocation = async () => {
    setGettingCurrentLocation(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant location access to use this feature');
        setGettingCurrentLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
        maximumAge: 30000,
      });

      const address = await reverseGeocode(
        location.coords.latitude,
        location.coords.longitude
      );

      const locationData: LocationData = {
        name: address?.formatted_address || 'Current Location',
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address?.street_address,
        city: address?.city,
        country: address?.country,
      };

      onLocationSelected?.(locationData);
      setShowModal(false);
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    }

    setGettingCurrentLocation(false);
  };

  const selectPlace = async (place: MapboxSuggestion) => {
    setLoading(true);

    try {
      const detailedPlace = await retrieveMapboxPlace(place.id, sessionToken);
      const finalPlace = detailedPlace || place;

      const [longitude, latitude] = finalPlace.geometry.coordinates;
      const context = finalPlace.context || {};

      const locationData: LocationData = {
        name: finalPlace.name || finalPlace.place_formatted,
        latitude,
        longitude,
        address: context.address?.name || finalPlace.name,
        city: context.place?.name,
        country: context.country?.name,
      };

      onLocationSelected?.(locationData);
      setShowModal(false);
      setSearchQuery('');
      setSuggestions([]);

      setSessionToken(generateSessionToken());
    } catch (error) {
      console.error('Error selecting place:', error);
      Alert.alert('Error', 'Failed to select location. Please try again.');

      setSessionToken(generateSessionToken());
    } finally {
      setLoading(false);
    }
  };

  const removeLocation = () => {
    onLocationSelected?.(null);
  };

  const renderSuggestion = ({ item }: { item: MapboxSuggestion }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => selectPlace(item)}
      activeOpacity={0.7}
    >
      <MapPin size={20} color={colors.primary} />
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.suggestionAddress} numberOfLines={1}>
          {item.place_formatted}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {selectedLocation ? (
        <View style={styles.selectedLocationContainer}>
          <View style={styles.selectedLocationInfo}>
            <MapPin size={20} color={colors.primary} />
            <View style={styles.selectedLocationText}>
              <Text style={styles.selectedLocationName} numberOfLines={1}>
                {selectedLocation.name}
              </Text>
              {selectedLocation.city && (
                <Text style={styles.selectedLocationDetail} numberOfLines={1}>
                  {selectedLocation.city}
                  {selectedLocation.country && `, ${selectedLocation.country}`}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={removeLocation} style={styles.removeButton}>
            <X size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addLocationButton}
          onPress={() => setShowModal(true)}
          activeOpacity={0.7}
        >
          <MapPin size={20} color={colors.primary} />
          <Text style={styles.addLocationText}>Add Location</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[styles.sheetContainer, { marginBottom: keyboardHeight }]}
          >
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Location</Text>
                  <TouchableOpacity onPress={() => setShowModal(false)}>
                    <X size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <View style={styles.searchContainer}>
                  <Search size={20} color={colors.textSecondary} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search for a place..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={(text) => {
                      setSearchQuery(text);
                      searchPlaces(text);
                    }}
                    autoFocus
                  />
                  {loading && <ActivityIndicator size="small" color={colors.primary} />}
                </View>

                <TouchableOpacity
                  style={styles.currentLocationButton}
                  onPress={getCurrentLocation}
                  disabled={gettingCurrentLocation}
                >
                  <Navigation size={20} color={colors.white} />
                  <Text style={styles.currentLocationText}>
                    {gettingCurrentLocation ? 'Getting location...' : 'Use Current Location'}
                  </Text>
                  {gettingCurrentLocation && (
                    <ActivityIndicator size="small" color={colors.white} />
                  )}
                </TouchableOpacity>

                {suggestions.length > 0 ? (
                  <FlatList
                    data={suggestions}
                    keyExtractor={(item) => item.id}
                    renderItem={renderSuggestion}
                    style={styles.suggestionsList}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  />
                ) : searchQuery.length >= 3 && !loading ? (
                  <View style={styles.emptyContainer}>
                    <MapPin size={48} color={colors.textSecondary} />
                    <Text style={styles.emptyText}>No locations found</Text>
                    <Text style={styles.emptySubtext}>Try a different search term</Text>
                  </View>
                ) : (
                  <View style={styles.emptyContainer}>
                    <MapPin size={48} color={colors.textSecondary} />
                    <Text style={styles.emptyText}>Search for a location</Text>
                    <Text style={styles.emptySubtext}>
                      Type at least 3 characters to search
                    </Text>
                  </View>
                )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  addLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addLocationText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  selectedLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  selectedLocationInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectedLocationText: {
    flex: 1,
  },
  selectedLocationName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  selectedLocationDetail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  removeButton: {
    padding: spacing.xs,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetContainer: {
    width: '100%',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: spacing.md,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  currentLocationText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  suggestionsList: {
    maxHeight: 300,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  suggestionAddress: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
