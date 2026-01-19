import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Alert,
  KeyboardAvoidingView,
  FlatList,
  InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Award, Navigation } from 'lucide-react-native';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { Category } from '@/types/database';
import { Button } from '@/components/Button';
import { DistanceRadiusSelector } from '@/components/DistanceRadiusSelector';
import { RatingFilter } from '@/components/RatingFilter';
import { SortOptionsSelector, SortOption } from '@/components/SortOptionsSelector';
import MapboxAutocompleteInput from '@/components/MapboxAutocompleteInput';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { logPerfEvent, logRender } from '@/lib/performance-test-utils';
import { getCachedCategories, setCachedCategories } from '@/lib/session-cache';
import { useDebounce } from '@/hooks/useDebounce';

// ============================================================================
// PERFORMANCE OPTIMIZATION: Memoized chip components to prevent re-renders
// ============================================================================

interface CategoryChipProps {
  category: Category;
  isSelected: boolean;
  onPress: (id: string) => void;
}

const CategoryChip = memo(({ category, isSelected, onPress }: CategoryChipProps) => (
  <TouchableOpacity
    style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
    onPress={() => onPress(category.id)}
    activeOpacity={0.7}
  >
    <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextSelected]}>
      {category.name}
    </Text>
  </TouchableOpacity>
));

const LISTING_TYPES = ['all', 'Job', 'Service', 'CustomService'] as const;
const PRICE_PRESETS = [
  { label: 'Under $100', min: 0, max: 100 },
  { label: '$100 – $500', min: 100, max: 500 },
  { label: '$500 – $2,000', min: 500, max: 2000 },
  { label: '$2,000 – $10,000', min: 2000, max: 10000 },
  { label: '$10,000 – $25,000', min: 10000, max: 25000 },
  { label: '$25,000 – $50,000', min: 25000, max: 50000 },
] as const;

export interface FilterOptions {
  categories: string[];
  location: string;
  priceMin: string;
  priceMax: string;
  minRating: number;
  distance?: number;
  sortBy?: 'relevance' | 'price_low' | 'price_high' | 'rating' | 'popular' | 'recent' | 'distance';
  verified?: boolean;
  listingType?: 'all' | 'Job' | 'Service' | 'CustomService';
}

export const defaultFilters: FilterOptions = {
  categories: [],
  location: '',
  priceMin: '',
  priceMax: '',
  minRating: 0,
  distance: 25,
  sortBy: 'relevance',
  verified: false,
  listingType: 'all',
};

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

export const FilterModal = memo(function FilterModal({ visible, onClose, onApply, currentFilters }: FilterModalProps) {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);

  // DRAFT FILTER STATE - Isolated from parent, only committed on Apply
  const [draftFilters, setDraftFilters] = useState<FilterOptions>(currentFilters);

  // Local state for price inputs with debouncing
  const [localPriceMin, setLocalPriceMin] = useState(currentFilters.priceMin);
  const [localPriceMax, setLocalPriceMax] = useState(currentFilters.priceMax);
  const debouncedPriceMin = useDebounce(localPriceMin, 300);
  const debouncedPriceMax = useDebounce(localPriceMax, 300);

  // UI-only state
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  // ============================================================================
  // PRIORITY 1 FIX: Lazy rendering to prevent 38-second blocking
  // ============================================================================
  const [sectionsReady, setSectionsReady] = useState(false);
  const mountInteractionRef = useRef<any>(null);

  // ============================================================================
  // PHASE 3: PERFORMANCE INSTRUMENTATION - Modal responsiveness
  // ============================================================================
  const scrollStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (__DEV__) {
      logRender('FilterModal');
    }
  });

  // PHASE 3: Optimize category fetch - only fetch once, not on every modal open
  // PHASE 4: WITH SESSION CACHE (1-hour TTL, cross-component sharing)
  const fetchCategories = useCallback(async () => {
    // PHASE 4: Check global session cache first
    const cached = getCachedCategories(null); // Filter modal is user-agnostic
    if (cached) {
      setCategories(cached);
      return; // Cache hit - no network request
    }

    // Cache miss - fetch from network
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (data) {
      setCategories(data);
      // PHASE 4: Cache for all users (categories are global)
      setCachedCategories(data, null);
    }
  }, []);

  useEffect(() => {
    // Only fetch categories if we don't have them yet
    if (visible && categories.length === 0) {
      fetchCategories();
    }
  }, [visible, categories.length, fetchCategories]);

  // Reset draft filters when modal opens with current filters
  useEffect(() => {
    if (visible) {
      if (__DEV__) {
        const startTime = performance.now();
        logPerfEvent('FILTER_MODAL_OPENING', { filtersCount: Object.keys(currentFilters).length });

        // Log when modal is fully mounted
        requestAnimationFrame(() => {
          const mountTime = performance.now() - startTime;
          logPerfEvent('FILTER_MODAL_MOUNTED', { mountTime: `${mountTime.toFixed(2)}ms` });
        });
      }

      // Reset lazy loading states
      setSectionsReady(false);

      // Set initial state immediately (synchronous for responsiveness)
      setDraftFilters(currentFilters);
      setLocalPriceMin(currentFilters.priceMin);
      setLocalPriceMax(currentFilters.priceMax);
      setSelectedPreset(null);
      setUseCurrentLocation(false);

      // PRIORITY 1 FIX: Defer heavy rendering until after modal animation
      // This prevents the 38-second blocking issue
      mountInteractionRef.current = InteractionManager.runAfterInteractions(() => {
        // Show all sections including categories
        setSectionsReady(true);
      });
    } else {
      if (__DEV__) {
        logPerfEvent('FILTER_MODAL_CLOSED');
      }
      // Cancel any pending lazy loads
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

  const parentCategories = useMemo(() => {
    return categories.filter((cat) => !cat.parent_id);
  }, [categories]);

  // All toggle functions now update draft state only
  const toggleCategory = useCallback((categoryId: string) => {
    setDraftFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter((id) => id !== categoryId)
        : [...prev.categories, categoryId]
    }));
  }, []);

  // APPLY HANDLER - Only place where filters are committed
  const handleApply = useCallback(() => {
    if (__DEV__) {
      logPerfEvent('APPLY_FILTERS_TAP', {
        listingType: draftFilters.listingType,
        categoriesCount: draftFilters.categories.length,
        hasLocation: !!draftFilters.location,
        hasPriceFilter: !!(draftFilters.priceMin || draftFilters.priceMax),
      });
    }
    onApply(draftFilters);
    onClose();
    if (__DEV__) {
      logPerfEvent('FILTER_APPLY_COMPLETE');
    }
  }, [draftFilters, onApply, onClose]);

  // Update draftFilters when debounced price values change
  useEffect(() => {
    setDraftFilters(prev => ({
      ...prev,
      priceMin: debouncedPriceMin,
      priceMax: debouncedPriceMax,
    }));
  }, [debouncedPriceMin, debouncedPriceMax]);

  // Price handlers update local state only (debounced updates to draftFilters)
  const handleManualPriceChange = useCallback((type: 'min' | 'max', value: string) => {
    if (type === 'min') {
      setLocalPriceMin(value);
    } else {
      setLocalPriceMax(value);
    }
    setSelectedPreset(null);
  }, []);

  const handleReset = useCallback(() => {
    if (__DEV__) {
      logPerfEvent('CLEAR_ALL_TAP');
    }
    setDraftFilters(defaultFilters);
    setLocalPriceMin('');
    setLocalPriceMax('');
    setUseCurrentLocation(false);
    setSelectedPreset(null);
    onApply(defaultFilters);
    onClose();
    if (__DEV__) {
      logPerfEvent('CLEAR_ALL_COMPLETE');
    }
  }, [onApply, onClose]);

  const handlePresetClick = useCallback((label: string, min: number, max: number) => {
    const minStr = min.toString();
    const maxStr = max.toString();
    setLocalPriceMin(minStr);
    setLocalPriceMax(maxStr);
    setDraftFilters(prev => ({
      ...prev,
      priceMin: minStr,
      priceMax: maxStr,
    }));
    setSelectedPreset(label);
  }, []);

  const handleUseLocationToggle = useCallback(async () => {
    if (useCurrentLocation) {
      setUseCurrentLocation(false);
      setDraftFilters(prev => ({ ...prev, location: '' }));
      return;
    }

    setFetchingLocation(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        if (Platform.OS === 'web') {
          setDraftFilters(prev => ({ ...prev, location: '' }));
          setUseCurrentLocation(false);
        } else {
          Alert.alert(
            'Permission Denied',
            'Location permission is required to use current location. Please enable it in your device settings.',
            [{ text: 'OK' }]
          );
        }
        setFetchingLocation(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
      });

      const { latitude, longitude } = currentLocation.coords;

      const [geocode] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      let locationString = '';
      if (geocode) {
        const parts = [
          geocode.city,
          geocode.region,
          geocode.postalCode,
        ].filter(Boolean);
        locationString = parts.join(', ');
      } else {
        locationString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
      }

      setDraftFilters(prev => ({ ...prev, location: locationString }));
      setUseCurrentLocation(true);
    } catch (error) {
      console.error('Error getting location:', error);
      if (Platform.OS !== 'web') {
        Alert.alert(
          'Location Error',
          'Unable to get your current location. Please try again or enter location manually.',
          [{ text: 'OK' }]
        );
      }
      setUseCurrentLocation(false);
    } finally {
      setFetchingLocation(false);
    }
  }, [useCurrentLocation]);

  // ============================================================================
  // PHASE 3: MEMOIZED SECTIONS - Prevent unnecessary re-renders
  // PRIORITY 1 FIX: Use FlatList for virtualization instead of rendering all chips
  // ============================================================================

  // Render functions for FlatList (virtualized for performance)
  const renderCategoryItem = useCallback(({ item }: { item: Category }) => {
    const isSelected = draftFilters.categories.includes(item.id);
    return (
      <CategoryChip
        category={item}
        isSelected={isSelected}
        onPress={toggleCategory}
      />
    );
  }, [draftFilters.categories, toggleCategory]);

  // Key extractors for FlatList
  const categoryKeyExtractor = useCallback((item: Category) => item.id, []);

  // Memoize price preset chips
  const pricePresetChips = useMemo(() => {
    return PRICE_PRESETS.map((preset) => (
      <TouchableOpacity
        key={preset.label}
        style={[
          styles.presetChip,
          selectedPreset === preset.label && styles.presetChipSelected,
        ]}
        onPress={() => handlePresetClick(preset.label, preset.min, preset.max)}
      >
        <Text
          style={[
            styles.presetChipText,
            selectedPreset === preset.label && styles.presetChipTextSelected,
          ]}
        >
          {preset.label}
        </Text>
      </TouchableOpacity>
    ));
  }, [selectedPreset, handlePresetClick]);

  // Memoize listing type chips (first section)
  const listingTypeChips = useMemo(() => {
    return LISTING_TYPES.map((type) => (
      <TouchableOpacity
        key={type}
        style={[
          styles.optionChip,
          draftFilters.listingType === type && styles.optionChipSelected,
        ]}
        onPress={() => setDraftFilters(prev => ({ ...prev, listingType: type as any }))}
      >
        <Text
          style={[
            styles.optionText,
            draftFilters.listingType === type && styles.optionTextSelected,
          ]}
        >
          {type === 'all' ? 'All' : type === 'CustomService' ? 'Custom Service' : type}
        </Text>
      </TouchableOpacity>
    ));
  }, [draftFilters.listingType]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      onShow={() => {
        if (__DEV__) {
          logPerfEvent('FILTER_OPEN_VISIBLE');
        }
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidView}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => {
            if (__DEV__) {
              logPerfEvent('FILTER_CLOSE_TAP');
            }
            onClose();
            if (__DEV__) {
              logPerfEvent('FILTER_CLOSE_COMPLETE');
            }
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.modalWrapper}
          >
            <View style={styles.modalContainer}>
              <View style={styles.header}>
                <Text style={styles.title}>Filters</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.content}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                removeClippedSubviews={Platform.OS === 'android'}
                scrollEventThrottle={16}
                onScrollBeginDrag={() => {
                  if (__DEV__ && !scrollStartTimeRef.current) {
                    scrollStartTimeRef.current = performance.now();
                    logPerfEvent('FILTER_MODAL_SCROLL_START');
                  }
                }}
                onScrollEndDrag={() => {
                  if (__DEV__ && scrollStartTimeRef.current) {
                    const scrollDuration = performance.now() - scrollStartTimeRef.current;
                    logPerfEvent('FILTER_MODAL_SCROLL_END', {
                      duration: `${scrollDuration.toFixed(2)}ms`
                    });
                    scrollStartTimeRef.current = null;
                  }
                }}
              >
            {/* Listing Type - First - Always show immediately */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Listing Type</Text>
              <View style={styles.optionsRow}>
                {listingTypeChips}
              </View>
            </View>

            {/* Loading indicator while sections load */}
            {!sectionsReady && (
              <View style={styles.loadingSection}>
                <Text style={styles.loadingText}>Loading filters...</Text>
              </View>
            )}

            {/* Essential sections - Show after interaction */}
            {sectionsReady && (
              <>
                {/* Categories - Virtualized for performance */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Categories</Text>
                  <FlatList
                    data={parentCategories}
                    renderItem={renderCategoryItem}
                    keyExtractor={categoryKeyExtractor}
                    numColumns={3}
                    scrollEnabled={false}
                    columnWrapperStyle={styles.categoriesGrid}
                    initialNumToRender={12}
                    maxToRenderPerBatch={6}
                    updateCellsBatchingPeriod={50}
                    removeClippedSubviews={true}
                    windowSize={5}
                    getItemLayout={(data, index) => ({
                      length: 40,
                      offset: 40 * Math.floor(index / 3),
                      index,
                    })}
                  />
                </View>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Location</Text>
                  <MapboxAutocompleteInput
                    value={draftFilters.location}
                    onChangeText={(text) => setDraftFilters(prev => ({ ...prev, location: text }))}
                    placeholder="Enter city, neighborhood, or zip"
                    searchTypes={['place', 'locality', 'postcode', 'neighborhood']}
                    onPlaceSelect={(place) => {
                      setDraftFilters(prev => ({
                        ...prev,
                        location: place.name || place.place_formatted
                      }));
                    }}
                  />
                  <TouchableOpacity
                    style={[styles.locationToggle, useCurrentLocation && styles.locationToggleActive]}
                    onPress={handleUseLocationToggle}
                    activeOpacity={0.7}
                  >
                    <Navigation
                      size={18}
                      color={useCurrentLocation ? colors.white : colors.primary}
                      fill={useCurrentLocation ? colors.white : 'none'}
                    />
                    <Text
                      style={[
                        styles.locationToggleText,
                        useCurrentLocation && styles.locationToggleTextActive,
                      ]}
                    >
                      Use Current Location
                    </Text>
                  </TouchableOpacity>
                  {fetchingLocation && (
                    <Text style={styles.locationFetchingText}>Getting your location...</Text>
                  )}
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Distance Radius</Text>
                  <DistanceRadiusSelector
                    distance={draftFilters.distance || 25}
                    onDistanceChange={(distance) => setDraftFilters(prev => ({ ...prev, distance }))}
                  />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Price Range</Text>

                  <View style={styles.priceRange}>
                    <View style={styles.priceInput}>
                      <Text style={styles.priceLabel}>Min</Text>
                      <TextInput
                        style={styles.priceField}
                        placeholder="$0"
                        placeholderTextColor={colors.textLight}
                        value={localPriceMin}
                        onChangeText={(value) => handleManualPriceChange('min', value)}
                        keyboardType="numeric"
                      />
                    </View>
                    <Text style={styles.priceSeparator}>-</Text>
                    <View style={styles.priceInput}>
                      <Text style={styles.priceLabel}>Max</Text>
                      <TextInput
                        style={styles.priceField}
                        placeholder="Any"
                        placeholderTextColor={colors.textLight}
                        value={localPriceMax}
                        onChangeText={(value) => handleManualPriceChange('max', value)}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.pricePresets}>
                    {pricePresetChips}
                  </View>
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Minimum Rating</Text>
                  <RatingFilter
                    minRating={draftFilters.minRating}
                    onRatingChange={(rating) => setDraftFilters(prev => ({ ...prev, minRating: rating }))}
                    showStats={false}
                  />
                </View>

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Sort By</Text>
                  <SortOptionsSelector
                    sortBy={(draftFilters.sortBy || 'relevance') as SortOption}
                    onSortChange={(newSort) => setDraftFilters(prev => ({ ...prev, sortBy: newSort as any }))}
                    showDistance={true}
                  />
                </View>
              </>
            )}

            {sectionsReady && (
              <View style={styles.lastSection}>
                <Text style={styles.sectionTitle}>Additional Filters</Text>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setDraftFilters(prev => ({ ...prev, verified: !prev.verified }))}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, draftFilters.verified && styles.checkboxSelected]}>
                    {draftFilters.verified && <Award size={16} color={colors.white} />}
                  </View>
                  <View style={styles.checkboxContent}>
                    <Text style={styles.checkboxLabel}>Verified Providers Only</Text>
                    <Text style={styles.checkboxSubtext}>Background checked and verified</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
              </ScrollView>

              <View style={[styles.footer, { paddingBottom: insets.bottom || spacing.md }]}>
                <Button
                  title="Reset"
                  onPress={handleReset}
                  variant="outline"
                  style={styles.resetButton}
                />
                <Button title="Apply Filters" onPress={handleApply} style={styles.applyButton} />
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
});

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
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  lastSection: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary + '15',
    borderRadius: borderRadius.md,
  },
  toggleButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  categoryChipTextSelected: {
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  optionChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  optionTextSelected: {
    color: colors.white,
  },
  distanceOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  distanceChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 60,
    alignItems: 'center',
  },
  distanceChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  distanceChipText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  distanceChipTextSelected: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  priceRange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  priceInput: {
    flex: 1,
  },
  priceLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  priceField: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceSeparator: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  pricePresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetChipText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  presetChipTextSelected: {
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  ratingsContainer: {
    gap: spacing.sm,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratingChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ratingChipText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  ratingChipTextSelected: {
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  footer: {
    flexDirection: 'row',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
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
  sortContainer: {
    gap: spacing.sm,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortChipText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  sortChipTextSelected: {
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxContent: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  checkboxSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  locationFetchingText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontWeight: fontWeight.medium,
  },
  locationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    marginTop: spacing.md,
  },
  locationToggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  locationToggleText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  locationToggleTextActive: {
    color: colors.white,
  },
  loadingSection: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
});
