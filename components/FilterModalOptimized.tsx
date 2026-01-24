/**
 * WEEK 2 CORE REFACTOR: Optimized FilterModal
 *
 * Integration of all Week 2 optimizations:
 * 1. Filter Reducer Pattern - Stable callbacks (zero deps)
 * 2. Memoized Sections - Prevents unnecessary re-renders
 * 3. Optimistic Updates - Instant perceived performance
 *
 * Expected performance gain: 70% (200-500ms faster)
 */

import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { Category } from '@/types/database';
import { Button } from '@/components/Button';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { getCachedCategories, setCachedCategories } from '@/lib/session-cache';
import { useDebounce } from '@/hooks/useDebounce';
import { useFilterReducer } from '@/hooks/useFilterReducer';
import {
  ListingTypeSection,
  CategoriesSection,
  LocationSection,
  DistanceSection,
  PriceRangeSection,
  RatingSection,
  SortSection,
  VerifiedSection,
} from '@/components/FilterSections';
import { FilterOptions, defaultFilters } from './FilterModal';

// ============================================================================
// INTERFACE
// ============================================================================

interface FilterModalOptimizedProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const FilterModalOptimized = memo(function FilterModalOptimized({
  visible,
  onClose,
  onApply,
  currentFilters,
}: FilterModalOptimizedProps) {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);

  // WEEK 2 OPTIMIZATION 1: Reducer pattern with stable callbacks
  const { filters: draftFilters, actions } = useFilterReducer(currentFilters);

  // Local state for price inputs with debouncing
  const [localPriceMin, setLocalPriceMin] = useState(currentFilters.priceMin);
  const [localPriceMax, setLocalPriceMax] = useState(currentFilters.priceMax);
  const debouncedPriceMin = useDebounce(localPriceMin, 300);
  const debouncedPriceMax = useDebounce(localPriceMax, 300);

  // UI-only state
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  // WEEK 2 OPTIMIZATION 3: Optimistic update state
  const [optimisticLoading, setOptimisticLoading] = useState(false);

  // Lazy rendering to prevent blocking
  const [sectionsReady, setSectionsReady] = useState(false);
  const mountInteractionRef = useRef<any>(null);


  // Fetch categories with session cache
  const fetchCategories = useCallback(async () => {
    const cached = getCachedCategories(null);
    if (cached) {
      setCategories(cached as Category[]);
      return;
    }

    const { data } = await supabase
      .from('categories')
      .select('id, name, parent_id, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order')
      .limit(100);

    if (data) {
      setCategories(data as Category[]);
      setCachedCategories(data, null);
    }
  }, []);

  useEffect(() => {
    if (visible && categories.length === 0) {
      fetchCategories();
    }
  }, [visible, categories.length, fetchCategories]);

  // Reset draft filters when modal opens
  useEffect(() => {
    if (visible) {
      // Reset states
      setSectionsReady(false);
      actions.setAllFilters(currentFilters);
      setLocalPriceMin(currentFilters.priceMin);
      setLocalPriceMax(currentFilters.priceMax);
      setSelectedPreset(null);
      setUseCurrentLocation(false);
      setOptimisticLoading(false);

      // Defer heavy rendering
      mountInteractionRef.current = InteractionManager.runAfterInteractions(() => {
        setSectionsReady(true);
      });
    } else {
      if (mountInteractionRef.current) {
        mountInteractionRef.current.cancel();
      }
      setSectionsReady(false);
    }
  }, [visible, currentFilters]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mountInteractionRef.current) {
        mountInteractionRef.current.cancel();
      }
    };
  }, []);

  // Update draft filters when debounced price values change
  useEffect(() => {
    actions.setPriceRange(debouncedPriceMin, debouncedPriceMax);
  }, [debouncedPriceMin, debouncedPriceMax]);

  // ============================================================================
  // HANDLERS WITH STABLE CALLBACKS
  // ============================================================================

  // WEEK 2 OPTIMIZATION 3: Optimistic apply - show loading immediately
  const handleApply = useCallback(() => {
    if (__DEV__) {
      if (draftFilters.priceMin && draftFilters.priceMax) {
        const min = parseFloat(draftFilters.priceMin);
        const max = parseFloat(draftFilters.priceMax);
        if (min > max) {
          console.warn('[FilterModalOptimized Safety] Invalid price range: min > max');
        }
      }
      if (draftFilters.distance && draftFilters.distance < 0) {
        console.warn('[FilterModalOptimized Safety] Invalid distance value');
      }
      // PHASE 1C: Location state consistency check
      const hasLocation = !!draftFilters.location?.trim();
      const hasCoords = draftFilters.userLatitude != null && draftFilters.userLongitude != null;
      if (hasLocation && !hasCoords) {
        console.warn('[FilterModalOptimized Safety] Location has address but no coordinates - may need geocoding');
      }
      if (!hasLocation && hasCoords) {
        console.warn('[FilterModalOptimized Safety] Location has coordinates but no address - potential desync');
      }
    }

    // Show optimistic loading state immediately
    setOptimisticLoading(true);

    // Close modal immediately (perceived instant performance)
    onClose();

    // Apply filters in background (non-blocking)
    requestAnimationFrame(() => {
      onApply(draftFilters);
    });
  }, [draftFilters, onApply, onClose]);

  const handleReset = useCallback(() => {
    actions.resetFilters(defaultFilters);
    setLocalPriceMin('');
    setLocalPriceMax('');
    setUseCurrentLocation(false);
    setSelectedPreset(null);
    onApply(defaultFilters);
    onClose();
  }, [actions, onApply, onClose]);

  const handlePriceChange = useCallback((type: 'min' | 'max', value: string) => {
    if (type === 'min') {
      setLocalPriceMin(value);
    } else {
      setLocalPriceMax(value);
    }
    setSelectedPreset(null);
  }, []);

  const handlePresetClick = useCallback((label: string, min: number, max: number) => {
    const minStr = min.toString();
    const maxStr = max.toString();
    setLocalPriceMin(minStr);
    setLocalPriceMax(maxStr);
    actions.setPriceRange(minStr, maxStr);
    setSelectedPreset(label);
  }, [actions]);

  const handleUseLocationToggle = useCallback(async () => {
    if (useCurrentLocation) {
      setUseCurrentLocation(false);
      actions.setLocation('');
      actions.setUserCoordinates(undefined, undefined);
      return;
    }

    setFetchingLocation(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        if (Platform.OS === 'web') {
          actions.setLocation('');
          actions.setUserCoordinates(undefined, undefined);
          setUseCurrentLocation(false);
        } else {
          Alert.alert(
            'Permission Denied',
            'Location permission is required to use current location.',
            [{ text: 'OK' }]
          );
        }
        setFetchingLocation(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = currentLocation.coords;

      const [geocode] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      let locationString = '';
      if (geocode) {
        const parts = [geocode.city, geocode.region, geocode.postalCode].filter(Boolean);
        locationString = parts.join(', ');
      } else {
        locationString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }

      // PHASE 1C: Atomic location update (address + coordinates together)
      actions.setLocation(locationString);
      actions.setUserCoordinates(latitude, longitude);
      setUseCurrentLocation(true);
    } catch (error) {
      if (__DEV__) {
        console.warn('[FilterModalOptimized] Location error:', error);
      }
      if (Platform.OS !== 'web') {
        Alert.alert('Location Error', 'Unable to get your current location.', [{ text: 'OK' }]);
      }
      setUseCurrentLocation(false);
    } finally {
      setFetchingLocation(false);
    }
  }, [useCurrentLocation, actions]);

  const handleLocationSelect = useCallback((place: any) => {
    if (place.name || place.place_formatted) {
      const locationName = place.name || place.place_formatted || '';
      // PHASE 1C: Atomic location update (address + coordinates together)
      if (place.geometry?.coordinates) {
        const [lng, lat] = place.geometry.coordinates;
        actions.setLocation(locationName);
        actions.setUserCoordinates(lat, lng);
      } else {
        actions.setLocation(locationName);
        actions.setUserCoordinates(undefined, undefined);
      }
    }
  }, [actions]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidView}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.modalWrapper}
          >
            <View style={styles.modalContainer}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Filters</Text>
                {optimisticLoading && (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                removeClippedSubviews={Platform.OS === 'android'}
                scrollEventThrottle={16}
              >
                {/* Listing Type - Always show immediately */}
                <ListingTypeSection
                  selectedType={draftFilters.listingType}
                  onSelectType={actions.setListingType}
                />

                {/* Loading indicator */}
                {!sectionsReady && (
                  <View style={styles.loadingSection}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading filters...</Text>
                  </View>
                )}

                {/* WEEK 2 OPTIMIZATION 2: All sections memoized */}
                {sectionsReady && (
                  <>
                    <CategoriesSection
                      categories={categories}
                      selectedCategories={draftFilters.categories}
                      onToggleCategory={actions.toggleCategory}
                    />

                    <LocationSection
                      location={draftFilters.location}
                      useCurrentLocation={useCurrentLocation}
                      fetchingLocation={fetchingLocation}
                      onLocationChange={actions.setLocation}
                      onUseLocationToggle={handleUseLocationToggle}
                      onLocationSelect={handleLocationSelect}
                    />

                    <DistanceSection
                      distance={draftFilters.distance || 25}
                      onDistanceChange={actions.setDistance}
                    />

                    <PriceRangeSection
                      priceMin={localPriceMin}
                      priceMax={localPriceMax}
                      selectedPreset={selectedPreset}
                      onPriceMinChange={(value) => handlePriceChange('min', value)}
                      onPriceMaxChange={(value) => handlePriceChange('max', value)}
                      onPresetClick={handlePresetClick}
                    />

                    <RatingSection
                      minRating={draftFilters.minRating}
                      onRatingChange={actions.setMinRating}
                    />

                    <SortSection
                      sortBy={draftFilters.sortBy}
                      onSortChange={actions.setSortBy}
                    />

                    <VerifiedSection
                      verified={draftFilters.verified || false}
                      onToggleVerified={actions.toggleVerified}
                    />
                  </>
                )}
              </ScrollView>

              {/* Footer */}
              <View style={[styles.footer, { paddingBottom: insets.bottom || spacing.md }]}>
                <Button
                  title="Reset"
                  onPress={handleReset}
                  variant="outline"
                  style={styles.resetButton}
                />
                <Button
                  title="Apply Filters"
                  onPress={handleApply}
                  style={styles.applyButton}
                />
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  keyboardAvoidView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalWrapper: {
    maxHeight: '85%',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.lg,
    flexShrink: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    maxHeight: 600,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  loadingSection: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  resetButton: {
    flex: 1,
  },
  applyButton: {
    flex: 2,
  },
});
