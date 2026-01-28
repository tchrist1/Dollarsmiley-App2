/**
 * WEEK 3: Animated FilterModal with Polish
 *
 * Adds smooth animations and visual polish to FilterModalOptimized.
 * Provides professional, native-feeling interactions.
 */

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
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
import { X, Check } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
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
  ServiceTypeSection,
} from '@/components/FilterSections';
import { FilterOptions, defaultFilters } from './FilterModal';
import { filterPerf, useFilterPerformance } from '@/lib/filter-performance';

// ============================================================================
// INTERFACE
// ============================================================================

interface FilterModalAnimatedProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const FilterModalAnimated = memo(function FilterModalAnimated({
  visible,
  onClose,
  onApply,
  currentFilters,
}: FilterModalAnimatedProps) {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);

  // Performance tracking
  const { trackOperation, measureAsync } = useFilterPerformance('FilterModal');

  // Reducer pattern with stable callbacks
  const { filters: draftFilters, actions } = useFilterReducer(currentFilters);

  // Local state for price inputs with debouncing
  const [localPriceMin, setLocalPriceMin] = useState(currentFilters.priceMin);
  const [localPriceMax, setLocalPriceMax] = useState(currentFilters.priceMax);
  const debouncedPriceMin = useDebounce(localPriceMin, 300);
  const debouncedPriceMax = useDebounce(localPriceMax, 300);

  // UI state
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [sectionsReady, setSectionsReady] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);

  // Animation values
  const overlayOpacity = useSharedValue(0);
  const modalTranslateY = useSharedValue(1000);
  const successScale = useSharedValue(0);

  const mountInteractionRef = useRef<any>(null);

  // Fetch categories with session cache
  const fetchCategories = useCallback(async () => {
    const endTrack = trackOperation('fetch_categories');
    const cached = getCachedCategories(null);
    if (cached) {
      setCategories(cached as Category[]);
      endTrack();
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
    endTrack();
  }, [trackOperation]);

  useEffect(() => {
    if (visible && categories.length === 0) {
      fetchCategories();
    }
  }, [visible, categories.length, fetchCategories]);

  // Animate modal open/close
  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 200 });
      modalTranslateY.value = withSpring(0, {
        damping: 30,
        stiffness: 300,
      });

      // Reset states
      setSectionsReady(false);
      actions.setAllFilters(currentFilters);
      setLocalPriceMin(currentFilters.priceMin);
      setLocalPriceMax(currentFilters.priceMax);
      setSelectedPreset(null);
      setUseCurrentLocation(false);
      setApplySuccess(false);

      // Defer heavy rendering
      mountInteractionRef.current = InteractionManager.runAfterInteractions(() => {
        setSectionsReady(true);
      });
    } else {
      overlayOpacity.value = withTiming(0, { duration: 150 });
      modalTranslateY.value = withTiming(1000, { duration: 200 });

      if (mountInteractionRef.current) {
        mountInteractionRef.current.cancel();
      }
      setSectionsReady(false);
    }
  }, [visible, currentFilters]);

  // Cleanup
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
  // HANDLERS
  // ============================================================================

  const handleApply = useCallback(() => {
    const endTrack = trackOperation('apply_filters', {
      categoriesCount: draftFilters.categories.length,
      hasLocation: !!draftFilters.location,
      hasPriceFilter: !!(draftFilters.priceMin || draftFilters.priceMax),
    });

    // Non-blocking validation (DEV-only)
    if (__DEV__) {
      requestAnimationFrame(() => {
        if (draftFilters.priceMin && draftFilters.priceMax) {
          const min = parseFloat(draftFilters.priceMin);
          const max = parseFloat(draftFilters.priceMax);
          if (min > max) {
            console.warn('[FilterModalAnimated Safety] Invalid price range: min > max');
          }
        }
        if (draftFilters.distance && draftFilters.distance < 0) {
          console.warn('[FilterModalAnimated Safety] Invalid distance value');
        }
        // PHASE 1C: Location state consistency check
        const hasLocation = !!draftFilters.location?.trim();
        const hasCoords = draftFilters.userLatitude != null && draftFilters.userLongitude != null;
        if (hasLocation && !hasCoords) {
          console.warn('[FilterModalAnimated Safety] Location has address but no coordinates - may need geocoding');
        }
        if (!hasLocation && hasCoords) {
          console.warn('[FilterModalAnimated Safety] Location has coordinates but no address - potential desync');
        }
      });
    }

    // Close modal immediately
    onClose();

    // Apply filters in background (non-blocking)
    requestAnimationFrame(() => {
      onApply(draftFilters);
      endTrack();
    });
  }, [draftFilters, onApply, onClose, trackOperation]);

  const handleReset = useCallback(() => {
    const endTrack = trackOperation('reset_filters');
    actions.resetFilters(defaultFilters);
    setLocalPriceMin('');
    setLocalPriceMax('');
    setUseCurrentLocation(false);
    setSelectedPreset(null);
    endTrack();
  }, [actions, trackOperation]);

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
        console.warn('[FilterModalAnimated] Location error:', error);
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
  // ANIMATED STYLES
  // ============================================================================

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalTranslateY.value }],
  }));

  const successIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
  }));

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidView}
      >
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <TouchableOpacity
            style={styles.overlayTouchable}
            activeOpacity={1}
            onPress={onClose}
          />
          <View
            style={styles.modalWrapper}
            pointerEvents="box-none"
          >
            <Animated.View style={[styles.modalContainer, modalStyle]}>
                {/* Header */}
                <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.lg) }]}>
                  <Text style={styles.title}>Filters</Text>
                  {applySuccess && (
                    <Animated.View style={[styles.successIcon, successIconStyle]}>
                      <Check size={20} color={colors.white} />
                    </Animated.View>
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

                  {/* Service Type - Show immediately after Listing Type */}
                  <ServiceTypeSection
                    serviceType={draftFilters.serviceType}
                    onServiceTypeChange={actions.setServiceType}
                    showForServices={draftFilters.listingType === 'Service'}
                  />

                  {/* Loading indicator */}
                  {!sectionsReady && (
                    <View style={styles.loadingSection}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={styles.loadingText}>Loading filters...</Text>
                    </View>
                  )}

                  {/* All sections memoized */}
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
                        distance={draftFilters.distance}
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

                {/* Footer - Fixed at bottom, does not intercept scroll gestures */}
                <View
                  style={[styles.footer, { paddingBottom: insets.bottom || spacing.md }]}
                  pointerEvents="box-none"
                >
                  <Button
                    title="Reset"
                    onPress={handleReset}
                    variant="outline"
                    style={styles.resetButton}
                  />
                  <Button
                    title={applySuccess ? 'Applied!' : 'Apply Filters'}
                    onPress={handleApply}
                    style={styles.applyButton}
                    disabled={applySuccess}
                  />
                </View>
              </Animated.View>
          </View>
        </Animated.View>
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
  overlayTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardAvoidView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '90%',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.lg,
    flexShrink: 1,
    maxHeight: '100%',
    flex: 1,
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
  successIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
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
