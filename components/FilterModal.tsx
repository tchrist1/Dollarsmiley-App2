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
  categories: Category[];
}

type DraftFilters = {
  selectedCategories: string[];
  location: string;
  priceMin: string;
  priceMax: string;
  sliderMinPrice: number;
  sliderMaxPrice: number;
  minRating: number;
  distance: number;
  availability: 'any' | 'today' | 'this_week' | 'this_month';
  sortBy: 'relevance' | 'price_low' | 'price_high' | 'rating' | 'popular' | 'recent' | 'distance';
  verified: boolean;
  instantBooking: boolean;
  listingType: 'all' | 'Job' | 'Service' | 'CustomService';
  fulfillmentTypes: string[];
  shippingMode: 'all' | 'Platform' | 'External';
  hasVAS: boolean;
  selectedTags: string[];
};

export function FilterModal({ visible, onClose, onApply, currentFilters, categories }: FilterModalProps) {
  const insets = useSafeAreaInsets();

  // Collapsed state object - single state update instead of 22
  const [draftFilters, setDraftFilters] = useState<DraftFilters>({
    selectedCategories: currentFilters.categories,
    location: currentFilters.location,
    priceMin: currentFilters.priceMin,
    priceMax: currentFilters.priceMax,
    sliderMinPrice: currentFilters.priceMin ? parseInt(currentFilters.priceMin) : 0,
    sliderMaxPrice: currentFilters.priceMax ? parseInt(currentFilters.priceMax) : 50000,
    minRating: currentFilters.minRating,
    distance: currentFilters.distance || 25,
    availability: currentFilters.availability || 'any',
    sortBy: currentFilters.sortBy || 'relevance',
    verified: currentFilters.verified || false,
    instantBooking: currentFilters.instant_booking || false,
    listingType: currentFilters.listingType || 'all',
    fulfillmentTypes: currentFilters.fulfillmentTypes || [],
    shippingMode: currentFilters.shippingMode || 'all',
    hasVAS: currentFilters.hasVAS || false,
    selectedTags: currentFilters.tags || [],
  });

  const [useSlider, setUseSlider] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [contentReady, setContentReady] = useState(false);

  // Defer content rendering by one frame for smooth modal animation
  useEffect(() => {
    if (visible) {
      setContentReady(false);
      const timer = requestAnimationFrame(() => {
        setTimeout(() => setContentReady(true), 0);
      });
      return () => cancelAnimationFrame(timer);
    } else {
      setContentReady(false);
    }
  }, [visible]);

  // Single state update when currentFilters changes - replaces 22 individual setState calls
  useEffect(() => {
    setDraftFilters({
      selectedCategories: currentFilters.categories,
      location: currentFilters.location,
      priceMin: currentFilters.priceMin,
      priceMax: currentFilters.priceMax,
      sliderMinPrice: currentFilters.priceMin ? parseInt(currentFilters.priceMin) : 0,
      sliderMaxPrice: currentFilters.priceMax ? parseInt(currentFilters.priceMax) : 50000,
      minRating: currentFilters.minRating,
      distance: currentFilters.distance || 25,
      availability: currentFilters.availability || 'any',
      sortBy: currentFilters.sortBy || 'relevance',
      verified: currentFilters.verified || false,
      instantBooking: currentFilters.instant_booking || false,
      listingType: currentFilters.listingType || 'all',
      fulfillmentTypes: currentFilters.fulfillmentTypes || [],
      shippingMode: currentFilters.shippingMode || 'all',
      hasVAS: currentFilters.hasVAS || false,
      selectedTags: currentFilters.tags || [],
    });
    setSelectedPreset(null);
  }, [currentFilters]);

  const parentCategories = useMemo(() => {
    return categories.filter((cat) => !cat.parent_id);
  }, [categories]);

  const toggleCategory = useCallback((categoryId: string) => {
    setDraftFilters(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(categoryId)
        ? prev.selectedCategories.filter((id) => id !== categoryId)
        : [...prev.selectedCategories, categoryId]
    }));
  }, []);

  const toggleFulfillmentType = useCallback((type: string) => {
    setDraftFilters(prev => ({
      ...prev,
      fulfillmentTypes: prev.fulfillmentTypes.includes(type)
        ? prev.fulfillmentTypes.filter((t) => t !== type)
        : [...prev.fulfillmentTypes, type]
    }));
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setDraftFilters(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter((t) => t !== tag)
        : [...prev.selectedTags, tag]
    }));
  }, []);

  const handleApply = useCallback(() => {
    const finalPriceMin = useSlider ? draftFilters.sliderMinPrice.toString() : draftFilters.priceMin;
    const finalPriceMax = useSlider ? draftFilters.sliderMaxPrice.toString() : draftFilters.priceMax;

    onApply({
      categories: draftFilters.selectedCategories,
      location: draftFilters.location,
      priceMin: finalPriceMin,
      priceMax: finalPriceMax,
      minRating: draftFilters.minRating,
      distance: draftFilters.distance,
      availability: draftFilters.availability,
      sortBy: draftFilters.sortBy,
      verified: draftFilters.verified,
      instant_booking: draftFilters.instantBooking,
      listingType: draftFilters.listingType,
      fulfillmentTypes: draftFilters.fulfillmentTypes,
      shippingMode: draftFilters.shippingMode,
      hasVAS: draftFilters.hasVAS,
      tags: draftFilters.selectedTags,
    });
    onClose();
  }, [useSlider, draftFilters, onApply, onClose]);

  const handleSliderChange = useCallback((min: number, max: number) => {
    setDraftFilters(prev => ({
      ...prev,
      sliderMinPrice: min,
      sliderMaxPrice: max,
      priceMin: min.toString(),
      priceMax: max.toString(),
    }));
    setSelectedPreset(null);
  }, []);

  const handleManualPriceChange = useCallback((type: 'min' | 'max', value: string) => {
    if (type === 'min') {
      const numValue = parseInt(value) || 0;
      setDraftFilters(prev => ({
        ...prev,
        priceMin: value,
        sliderMinPrice: numValue,
      }));
    } else {
      const numValue = parseInt(value) || 50000;
      setDraftFilters(prev => ({
        ...prev,
        priceMax: value,
        sliderMaxPrice: numValue,
      }));
    }
    setSelectedPreset(null);
  }, []);

  const handleReset = useCallback(() => {
    setDraftFilters({
      selectedCategories: [],
      location: '',
      priceMin: '',
      priceMax: '',
      sliderMinPrice: 0,
      sliderMaxPrice: 50000,
      minRating: 0,
      distance: 25,
      availability: 'any',
      sortBy: 'relevance',
      verified: false,
      instantBooking: false,
      listingType: 'all',
      fulfillmentTypes: [],
      shippingMode: 'all',
      hasVAS: false,
      selectedTags: [],
    });
    setUseSlider(true);
    setUseCurrentLocation(false);
    setSelectedPreset(null);

    onApply(defaultFilters);
    onClose();
  }, [onApply, onClose]);

  const handlePresetClick = useCallback((label: string, min: number, max: number) => {
    setDraftFilters(prev => ({
      ...prev,
      sliderMinPrice: min,
      sliderMaxPrice: max,
      priceMin: min.toString(),
      priceMax: max.toString(),
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

  // Don't render modal content until visible to improve performance
  if (!visible && !contentReady) {
    return null;
  }

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
            {!contentReady ? (
              <View style={styles.loadingPlaceholder} />
            ) : (
              <>
            {/* Listing Type - First */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Listing Type</Text>
              <View style={styles.optionsRow}>
                {LISTING_TYPES.map((type) => (
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
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <View style={styles.categoriesGrid}>
                {parentCategories.map((category) => {
                    const isSelected = draftFilters.selectedCategories.includes(category.id);
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
                value={draftFilters.location}
                onChangeText={(text) => setDraftFilters(prev => ({ ...prev, location: text }))}
                placeholder="Enter city, neighborhood, or zip"
                searchTypes={['place', 'locality', 'postcode', 'neighborhood']}
                onPlaceSelect={(place) => {
                  setDraftFilters(prev => ({ ...prev, location: place.name || place.place_formatted }));
                }}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Distance Radius</Text>
              <DistanceRadiusSelector
                distance={draftFilters.distance}
                onDistanceChange={(val) => setDraftFilters(prev => ({ ...prev, distance: val }))}
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
                  minPrice={draftFilters.sliderMinPrice}
                  maxPrice={draftFilters.sliderMaxPrice}
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
                      value={draftFilters.priceMin}
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
                      value={draftFilters.priceMax}
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
                minRating={draftFilters.minRating}
                onRatingChange={(val) => setDraftFilters(prev => ({ ...prev, minRating: val }))}
                showStats={false}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sort By</Text>
              <SortOptionsSelector
                sortBy={draftFilters.sortBy as SortOption}
                onSortChange={(newSort) => {
                  setDraftFilters(prev => ({ ...prev, sortBy: newSort as any }));
                }}
                showDistance={true}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Availability</Text>
              <View style={styles.availabilityContainer}>
                {AVAILABILITY_OPTIONS.map((avail) => {
                  const isSelected = draftFilters.availability === avail.value;
                  return (
                    <TouchableOpacity
                      key={avail.value}
                      style={[
                        styles.availabilityChip,
                        isSelected && styles.availabilityChipSelected,
                      ]}
                      onPress={() => setDraftFilters(prev => ({ ...prev, availability: avail.value as any }))}
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
                  const isSelected = draftFilters.listingType === type.value;
                  return (
                    <TouchableOpacity
                      key={type.value}
                      style={[
                        styles.availabilityChip,
                        isSelected && styles.availabilityChipSelected,
                      ]}
                      onPress={() => setDraftFilters(prev => ({ ...prev, listingType: type.value as any }))}
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
                      draftFilters.fulfillmentTypes.includes(type) && styles.fulfillmentChipSelected,
                    ]}
                    onPress={() => toggleFulfillmentType(type)}
                  >
                    <Text
                      style={[
                        styles.fulfillmentChipText,
                        draftFilters.fulfillmentTypes.includes(type) && styles.fulfillmentChipTextSelected,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {draftFilters.fulfillmentTypes.includes('Shipping') && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Shipping Mode</Text>
                <View style={styles.availabilityContainer}>
                  {SHIPPING_MODE_OPTIONS.map((mode) => {
                    const isSelected = draftFilters.shippingMode === mode.value;
                    return (
                      <TouchableOpacity
                        key={mode.value}
                        style={[
                          styles.availabilityChip,
                          isSelected && styles.availabilityChipSelected,
                        ]}
                        onPress={() => setDraftFilters(prev => ({ ...prev, shippingMode: mode.value as any }))}
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
                  const isSelected = draftFilters.selectedTags.includes(tag);
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
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setDraftFilters(prev => ({ ...prev, instantBooking: !prev.instantBooking }))}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, draftFilters.instantBooking && styles.checkboxSelected]}>
                  {draftFilters.instantBooking && <Clock size={16} color={colors.white} />}
                </View>
                <View style={styles.checkboxContent}>
                  <Text style={styles.checkboxLabel}>Instant Booking Available</Text>
                  <Text style={styles.checkboxSubtext}>Book immediately without approval</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setDraftFilters(prev => ({ ...prev, hasVAS: !prev.hasVAS }))}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, draftFilters.hasVAS && styles.checkboxSelected]}>
                  {draftFilters.hasVAS && <Star size={16} color={colors.white} />}
                </View>
                <View style={styles.checkboxContent}>
                  <Text style={styles.checkboxLabel}>Value-Added Services Available</Text>
                  <Text style={styles.checkboxSubtext}>Extra options and add-ons</Text>
                </View>
              </TouchableOpacity>
            </View>
              </>
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
  loadingPlaceholder: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
});
