import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Star, MapPin, TrendingUp, Clock, Award, DollarSign } from 'lucide-react-native';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';
import { Category } from '@/types/database';
import { Button } from '@/components/Button';
import { PriceRangeSlider } from '@/components/PriceRangeSlider';
import { DistanceRadiusSelector } from '@/components/DistanceRadiusSelector';
import { RatingFilter } from '@/components/RatingFilter';
import { SortOptionsSelector, SortOption } from '@/components/SortOptionsSelector';
import MapboxAutocompleteInput from '@/components/MapboxAutocompleteInput';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';

const LISTING_TYPES = ['all', 'Job', 'Service', 'CustomService'] as const;
const AVAILABILITY_OPTIONS = [
  { value: 'any', label: 'Any Time' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
] as const;
const LISTING_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'Service', label: 'Standard Service' },
  { value: 'CustomService', label: 'Custom Service' },
] as const;
const FULFILLMENT_OPTIONS = ['Pickup', 'DropOff', 'Shipping'] as const;
const SHIPPING_MODE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Platform', label: 'Platform Shipping' },
  { value: 'External', label: 'External Shipping' },
] as const;
const AVAILABLE_TAGS = [
  'Wedding', 'QuickFix', 'SameDay', 'Handyman', 'Catering',
  'Braids', 'Moving', 'Cleaning', 'Emergency', 'Licensed',
  'Insured', 'Background Checked', 'Top Rated', 'Fast Response',
] as const;
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
  availability?: 'any' | 'today' | 'this_week' | 'this_month';
  sortBy?: 'relevance' | 'price_low' | 'price_high' | 'rating' | 'popular' | 'recent' | 'distance';
  verified?: boolean;
  instant_booking?: boolean;
  listingType?: 'all' | 'Job' | 'Service' | 'CustomService';
  fulfillmentTypes?: string[];
  shippingMode?: 'all' | 'Platform' | 'External';
  hasVAS?: boolean;
  tags?: string[];
}

export const defaultFilters: FilterOptions = {
  categories: [],
  location: '',
  priceMin: '',
  priceMax: '',
  minRating: 0,
  distance: 25,
  availability: 'any',
  sortBy: 'relevance',
  verified: false,
  instant_booking: false,
  listingType: 'all',
  fulfillmentTypes: [],
  shippingMode: 'all',
  hasVAS: false,
  tags: [],
};

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

export function FilterModal({ visible, onClose, onApply, currentFilters }: FilterModalProps) {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    currentFilters.categories
  );
  const [location, setLocation] = useState(currentFilters.location);
  const [priceMin, setPriceMin] = useState(currentFilters.priceMin);
  const [priceMax, setPriceMax] = useState(currentFilters.priceMax);
  const [sliderMinPrice, setSliderMinPrice] = useState(
    currentFilters.priceMin ? parseInt(currentFilters.priceMin) : 0
  );
  const [sliderMaxPrice, setSliderMaxPrice] = useState(
    currentFilters.priceMax ? parseInt(currentFilters.priceMax) : 50000
  );
  const [useSlider, setUseSlider] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [minRating, setMinRating] = useState(currentFilters.minRating);
  const [distance, setDistance] = useState(currentFilters.distance || 25);
  const [availability, setAvailability] = useState(currentFilters.availability || 'any');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [sortBy, setSortBy] = useState(currentFilters.sortBy || 'relevance');
  const [verified, setVerified] = useState(currentFilters.verified || false);
  const [instantBooking, setInstantBooking] = useState(currentFilters.instant_booking || false);
  const [listingType, setListingType] = useState(currentFilters.listingType || 'all');
  const [fulfillmentTypes, setFulfillmentTypes] = useState<string[]>(currentFilters.fulfillmentTypes || []);
  const [shippingMode, setShippingMode] = useState(currentFilters.shippingMode || 'all');
  const [hasVAS, setHasVAS] = useState(currentFilters.hasVAS || false);
  const [selectedTags, setSelectedTags] = useState<string[]>(currentFilters.tags || []);

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (data) {
      setCategories(data);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    setSelectedCategories(currentFilters.categories);
    setLocation(currentFilters.location);
    setPriceMin(currentFilters.priceMin);
    setPriceMax(currentFilters.priceMax);
    setSliderMinPrice(currentFilters.priceMin ? parseInt(currentFilters.priceMin) : 0);
    setSliderMaxPrice(currentFilters.priceMax ? parseInt(currentFilters.priceMax) : 50000);
    setMinRating(currentFilters.minRating);
    setDistance(currentFilters.distance || 25);
    setAvailability(currentFilters.availability || 'any');
    setSortBy(currentFilters.sortBy || 'relevance');
    setVerified(currentFilters.verified || false);
    setInstantBooking(currentFilters.instant_booking || false);
    setListingType(currentFilters.listingType || 'all');
    setFulfillmentTypes(currentFilters.fulfillmentTypes || []);
    setShippingMode(currentFilters.shippingMode || 'all');
    setHasVAS(currentFilters.hasVAS || false);
    setSelectedPreset(null);
  }, [currentFilters]);

  const parentCategories = useMemo(() => {
    return categories.filter((cat) => !cat.parent_id);
  }, [categories]);

  const toggleCategory = useCallback((categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  const toggleFulfillmentType = useCallback((type: string) => {
    setFulfillmentTypes(prev =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  }, []);

  const handleApply = useCallback(() => {
    const finalPriceMin = useSlider ? sliderMinPrice.toString() : priceMin;
    const finalPriceMax = useSlider ? sliderMaxPrice.toString() : priceMax;

    onApply({
      categories: selectedCategories,
      location,
      priceMin: finalPriceMin,
      priceMax: finalPriceMax,
      minRating,
      distance,
      availability,
      sortBy,
      verified,
      instant_booking: instantBooking,
      listingType,
      fulfillmentTypes,
      shippingMode,
      hasVAS,
      tags: selectedTags,
    });
    onClose();
  }, [
    useSlider, sliderMinPrice, sliderMaxPrice, priceMin, priceMax,
    selectedCategories, location, minRating, distance, availability,
    sortBy, verified, instantBooking, listingType, fulfillmentTypes,
    shippingMode, hasVAS, selectedTags, onApply, onClose
  ]);

  const handleSliderChange = useCallback((min: number, max: number) => {
    setSliderMinPrice(min);
    setSliderMaxPrice(max);
    setPriceMin(min.toString());
    setPriceMax(max.toString());
    setSelectedPreset(null);
  }, []);

  const handleManualPriceChange = useCallback((type: 'min' | 'max', value: string) => {
    if (type === 'min') {
      setPriceMin(value);
      const numValue = parseInt(value) || 0;
      setSliderMinPrice(numValue);
    } else {
      setPriceMax(value);
      const numValue = parseInt(value) || 50000;
      setSliderMaxPrice(numValue);
    }
    setSelectedPreset(null);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedCategories([]);
    setLocation('');
    setPriceMin('');
    setPriceMax('');
    setSliderMinPrice(0);
    setSliderMaxPrice(50000);
    setMinRating(0);
    setDistance(25);
    setAvailability('any');
    setSortBy('relevance');
    setVerified(false);
    setInstantBooking(false);
    setSelectedPreset(null);
  }, []);

  const handlePresetClick = useCallback((label: string, min: number, max: number) => {
    setSliderMinPrice(min);
    setSliderMaxPrice(max);
    setPriceMin(min.toString());
    setPriceMax(max.toString());
    setSelectedPreset(label);
  }, []);

  const handleUseLocationToggle = useCallback(async () => {
    if (useCurrentLocation) {
      setUseCurrentLocation(false);
      setLocation('');
      return;
    }

    setFetchingLocation(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        if (Platform.OS === 'web') {
          setLocation('');
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
        maximumAge: 30000,
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

      setLocation(locationString);
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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
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
              >
            {/* Listing Type - First */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Listing Type</Text>
              <View style={styles.optionsRow}>
                {LISTING_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.optionChip,
                      listingType === type && styles.optionChipSelected,
                    ]}
                    onPress={() => setListingType(type as any)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        listingType === type && styles.optionTextSelected,
                      ]}
                    >
                      {type === 'all' ? 'All' : type === 'CustomService' ? 'Custom Service' : type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <View style={styles.categoriesGrid}>
                {parentCategories.map((category) => {
                    const isSelected = selectedCategories.includes(category.id);
                    return (
                      <TouchableOpacity
                        key={category.id}
                        style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                        onPress={() => toggleCategory(category.id)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            isSelected && styles.categoryChipTextSelected,
                          ]}
                        >
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <MapboxAutocompleteInput
                value={location}
                onChangeText={setLocation}
                placeholder="Enter city, neighborhood, or zip"
                searchTypes={['place', 'locality', 'postcode', 'neighborhood']}
                onPlaceSelect={(place) => {
                  setLocation(place.name || place.place_formatted);
                }}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Distance Radius</Text>
              <DistanceRadiusSelector
                distance={distance}
                onDistanceChange={setDistance}
                useCurrentLocation={useCurrentLocation}
                onUseLocationToggle={handleUseLocationToggle}
              />
              {fetchingLocation && (
                <Text style={styles.locationFetchingText}>Getting your location...</Text>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Price Range</Text>
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={() => setUseSlider(!useSlider)}
                >
                  <DollarSign size={16} color={colors.primary} />
                  <Text style={styles.toggleButtonText}>
                    {useSlider ? 'Manual Input' : 'Use Slider'}
                  </Text>
                </TouchableOpacity>
              </View>

              {useSlider ? (
                <PriceRangeSlider
                  minValue={0}
                  maxValue={50000}
                  minPrice={sliderMinPrice}
                  maxPrice={sliderMaxPrice}
                  onValuesChange={handleSliderChange}
                  step={100}
                />
              ) : (
                <View style={styles.priceRange}>
                  <View style={styles.priceInput}>
                    <Text style={styles.priceLabel}>Min</Text>
                    <TextInput
                      style={styles.priceField}
                      placeholder="$0"
                      placeholderTextColor={colors.textLight}
                      value={priceMin}
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
                      value={priceMax}
                      onChangeText={(value) => handleManualPriceChange('max', value)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}

              <View style={styles.pricePresets}>
                {PRICE_PRESETS.map((preset) => (
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
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Minimum Rating</Text>
              <RatingFilter
                minRating={minRating}
                onRatingChange={setMinRating}
                showStats={false}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sort By</Text>
              <SortOptionsSelector
                sortBy={sortBy as SortOption}
                onSortChange={(newSort) => setSortBy(newSort)}
                showDistance={true}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Availability</Text>
              <View style={styles.availabilityContainer}>
                {AVAILABILITY_OPTIONS.map((avail) => {
                  const isSelected = availability === avail.value;
                  return (
                    <TouchableOpacity
                      key={avail.value}
                      style={[
                        styles.availabilityChip,
                        isSelected && styles.availabilityChipSelected,
                      ]}
                      onPress={() => setAvailability(avail.value as any)}
                      activeOpacity={0.7}
                    >
                      <Clock
                        size={16}
                        color={isSelected ? colors.white : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.availabilityChipText,
                          isSelected && styles.availabilityChipTextSelected,
                        ]}
                      >
                        {avail.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Listing Type</Text>
              <View style={styles.availabilityContainer}>
                {LISTING_TYPE_OPTIONS.map((type) => {
                  const isSelected = listingType === type.value;
                  return (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.availabilityChip,
                        isSelected && styles.availabilityChipSelected,
                      ]}
                      onPress={() => setListingType(type.value as any)}
                    >
                      <Text
                        style={[
                          styles.availabilityChipText,
                          isSelected && styles.availabilityChipTextSelected,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fulfillment Options</Text>
              <View style={styles.fulfillmentContainer}>
                {FULFILLMENT_OPTIONS.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.fulfillmentChip,
                      fulfillmentTypes.includes(type) && styles.fulfillmentChipSelected,
                    ]}
                    onPress={() => toggleFulfillmentType(type)}
                  >
                    <Text
                      style={[
                        styles.fulfillmentChipText,
                        fulfillmentTypes.includes(type) && styles.fulfillmentChipTextSelected,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {fulfillmentTypes.includes('Shipping') && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Shipping Mode</Text>
                <View style={styles.availabilityContainer}>
                  {SHIPPING_MODE_OPTIONS.map((mode) => {
                    const isSelected = shippingMode === mode.value;
                    return (
                      <TouchableOpacity
                        key={mode.value}
                        style={[
                          styles.availabilityChip,
                          isSelected && styles.availabilityChipSelected,
                        ]}
                        onPress={() => setShippingMode(mode.value as any)}
                      >
                        <Text
                          style={[
                            styles.availabilityChipText,
                            isSelected && styles.availabilityChipTextSelected,
                          ]}
                        >
                          {mode.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tags</Text>
              <View style={styles.tagsGrid}>
                {AVAILABLE_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagChip, isSelected && styles.tagChipSelected]}
                      onPress={() => toggleTag(tag)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.tagChipText,
                          isSelected && styles.tagChipTextSelected,
                        ]}
                      >
                        #{tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.lastSection}>
              <Text style={styles.sectionTitle}>Additional Filters</Text>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setVerified(!verified)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, verified && styles.checkboxSelected]}>
                  {verified && <Award size={16} color={colors.white} />}
                </View>
                <View style={styles.checkboxContent}>
                  <Text style={styles.checkboxLabel}>Verified Providers Only</Text>
                  <Text style={styles.checkboxSubtext}>Background checked and verified</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setInstantBooking(!instantBooking)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, instantBooking && styles.checkboxSelected]}>
                  {instantBooking && <Clock size={16} color={colors.white} />}
                </View>
                <View style={styles.checkboxContent}>
                  <Text style={styles.checkboxLabel}>Instant Booking Available</Text>
                  <Text style={styles.checkboxSubtext}>Book immediately without approval</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setHasVAS(!hasVAS)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, hasVAS && styles.checkboxSelected]}>
                  {hasVAS && <Star size={16} color={colors.white} />}
                </View>
                <View style={styles.checkboxContent}>
                  <Text style={styles.checkboxLabel}>Value-Added Services Available</Text>
                  <Text style={styles.checkboxSubtext}>Extra options and add-ons</Text>
                </View>
              </TouchableOpacity>
            </View>
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
}

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
  availabilityContainer: {
    gap: spacing.sm,
  },
  availabilityChip: {
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
  availabilityChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  availabilityChipText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  availabilityChipTextSelected: {
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
  fulfillmentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  fulfillmentChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fulfillmentChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  fulfillmentChipText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  fulfillmentChipTextSelected: {
    color: colors.white,
    fontWeight: fontWeight.medium,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tagChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  tagChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagChipText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  tagChipTextSelected: {
    color: colors.white,
  },
  locationFetchingText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontWeight: fontWeight.medium,
  },
});
