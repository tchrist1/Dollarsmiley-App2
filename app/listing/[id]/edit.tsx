import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { uploadMultipleListingPhotos } from '@/lib/listing-photo-upload';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { TextArea } from '@/components/TextArea';
import { CategoryPicker } from '@/components/CategoryPicker';
import { PhotoPicker } from '@/components/PhotoPicker';
import { AvailabilityCalendar } from '@/components/AvailabilityCalendar';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { ArrowLeft, Save, DollarSign, Clock, Package, Truck, CheckCircle2, FileText } from 'lucide-react-native';

export default function EditListingScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [subcategoryName, setSubcategoryName] = useState('');
  const [listingType, setListingType] = useState<'Service' | 'CustomService'>('Service');
  const [priceType, setPriceType] = useState<'hourly' | 'fixed'>('hourly');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [availableDays, setAvailableDays] = useState<string[]>([]);

  const [requiresFulfilment, setRequiresFulfilment] = useState(false);
  const [fulfillmentType, setFulfillmentType] = useState<string[]>([]);
  const [itemWeight, setItemWeight] = useState('');
  const [itemLength, setItemLength] = useState('');
  const [itemWidth, setItemWidth] = useState('');
  const [itemHeight, setItemHeight] = useState('');
  const [fulfillmentWindow, setFulfillmentWindow] = useState('');

  const [requiresAgreement, setRequiresAgreement] = useState(false);
  const [requiresDamageDeposit, setRequiresDamageDeposit] = useState(false);
  const [damageDepositAmount, setDamageDepositAmount] = useState('');
  const [proofingRequired, setProofingRequired] = useState(false);

  const [inventoryEnabled, setInventoryEnabled] = useState(false);
  const [inventoryMode, setInventoryMode] = useState<'quantity' | 'rental'>('quantity');
  const [stockQuantity, setStockQuantity] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [rentalPricingModel, setRentalPricingModel] = useState<'flat' | 'per_day' | 'per_hour'>('per_day');
  const [turnaroundHours, setTurnaroundHours] = useState('2');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) {
      fetchListingDetails();
    }
  }, [id]);

  const fetchListingDetails = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('service_listings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      Alert.alert('Error', 'Failed to load listing details');
      console.error('Listing fetch error:', error);
      router.back();
      return;
    }

    if (data.provider_id !== profile?.id) {
      Alert.alert('Error', 'You do not have permission to edit this listing');
      router.back();
      return;
    }

    setTitle(data.title || '');
    setDescription(data.description || '');
    setCategoryId(data.category_id || '');
    setSubcategoryId(data.subcategory_id || '');
    setListingType(data.listing_type || 'Service');
    setPriceType(data.pricing_type === 'Hourly' ? 'hourly' : 'fixed');
    setPrice(data.base_price?.toString() || '');
    setDuration(data.estimated_duration?.toString() || '');
    setAvailableDays(data.available_days || []);

    if (data.photos) {
      try {
        let parsedPhotos: string[] = [];
        if (Array.isArray(data.photos)) {
          parsedPhotos = data.photos.filter((p: any) => typeof p === 'string' && p.trim() !== '');
        } else if (typeof data.photos === 'string') {
          try {
            const parsed = JSON.parse(data.photos);
            parsedPhotos = Array.isArray(parsed) ? parsed.filter((p: any) => typeof p === 'string' && p.trim() !== '') : [];
          } catch {
            if (data.photos.trim() !== '') {
              parsedPhotos = [data.photos];
            }
          }
        }
        setPhotos(parsedPhotos);
      } catch (e) {
        console.error('Error parsing photos:', e);
      }
    }

    setRequiresFulfilment(data.requires_fulfilment || false);
    setFulfillmentType(data.fulfillment_options || []);
    setItemWeight(data.item_weight?.toString() || '');
    setItemLength(data.item_length?.toString() || '');
    setItemWidth(data.item_width?.toString() || '');
    setItemHeight(data.item_height?.toString() || '');
    setFulfillmentWindow(data.fulfillment_window_days?.toString() || '');

    setRequiresAgreement(data.requires_agreement || false);
    setRequiresDamageDeposit(data.requires_damage_deposit || false);
    setDamageDepositAmount(data.damage_deposit_amount?.toString() || '');
    setProofingRequired(data.proofing_required || false);

    setInventoryEnabled(data.inventory_enabled || false);
    setInventoryMode(data.inventory_mode || 'quantity');
    setStockQuantity(data.stock_quantity?.toString() || '');
    setLowStockThreshold(data.low_stock_threshold?.toString() || '');
    setRentalPricingModel(data.rental_pricing_model || 'per_day');
    setTurnaroundHours(data.turnaround_hours?.toString() || '2');

    const { data: categoryData } = await supabase
      .from('categories')
      .select('name')
      .eq('id', data.category_id)
      .single();

    if (categoryData) {
      setCategoryName(categoryData.name);
    }

    const { data: subcategoryData } = await supabase
      .from('categories')
      .select('name')
      .eq('id', data.subcategory_id)
      .single();

    if (subcategoryData) {
      setSubcategoryName(subcategoryData.name);
    }

    setLoading(false);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = 'Title is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!categoryId) newErrors.category = 'Category is required';
    if (!subcategoryId) newErrors.subcategory = 'Subcategory is required';
    if (!price || parseFloat(price) <= 0) newErrors.price = 'Valid price is required';

    if (requiresFulfilment && fulfillmentType.length === 0) {
      newErrors.fulfillment = 'Select at least one fulfillment option';
    }

    if (requiresDamageDeposit && (!damageDepositAmount || parseFloat(damageDepositAmount) <= 0)) {
      newErrors.damageDeposit = 'Valid damage deposit amount is required';
    }

    if (inventoryEnabled && inventoryMode === 'quantity') {
      if (!stockQuantity || parseInt(stockQuantity) <= 0) {
        newErrors.stockQuantity = 'Valid stock quantity is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    setSaving(true);

    try {
      let uploadedPhotos = photos;
      const localPhotos = photos.filter(p => !p.startsWith('http'));

      if (localPhotos.length > 0) {
        const uploaded = await uploadMultipleListingPhotos(localPhotos, id as string, profile!.id);
        const remotePhotos = photos.filter(p => p.startsWith('http'));
        uploadedPhotos = [...remotePhotos, ...uploaded];
      }

      const updateData: any = {
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId,
        subcategory_id: subcategoryId,
        listing_type: listingType,
        pricing_type: priceType === 'hourly' ? 'Hourly' : 'Fixed',
        base_price: parseFloat(price),
        estimated_duration: duration ? parseFloat(duration) : null,
        photos: uploadedPhotos.length > 0 ? JSON.stringify(uploadedPhotos) : null,
        available_days: availableDays.length > 0 ? availableDays : null,
        requires_fulfilment: requiresFulfilment,
        fulfillment_options: requiresFulfilment ? fulfillmentType : null,
        item_weight: requiresFulfilment && itemWeight ? parseFloat(itemWeight) : null,
        item_length: requiresFulfilment && itemLength ? parseFloat(itemLength) : null,
        item_width: requiresFulfilment && itemWidth ? parseFloat(itemWidth) : null,
        item_height: requiresFulfilment && itemHeight ? parseFloat(itemHeight) : null,
        fulfillment_window_days: requiresFulfilment && fulfillmentWindow ? parseInt(fulfillmentWindow) : null,
        requires_agreement: requiresAgreement,
        requires_damage_deposit: requiresDamageDeposit,
        damage_deposit_amount: requiresDamageDeposit && damageDepositAmount ? parseFloat(damageDepositAmount) : null,
        proofing_required: proofingRequired,
        inventory_enabled: inventoryEnabled,
        inventory_mode: inventoryEnabled ? inventoryMode : null,
        stock_quantity: inventoryEnabled && inventoryMode === 'quantity' && stockQuantity ? parseInt(stockQuantity) : null,
        low_stock_threshold: inventoryEnabled && lowStockThreshold ? parseInt(lowStockThreshold) : null,
        rental_pricing_model: inventoryEnabled && inventoryMode === 'rental' ? rentalPricingModel : null,
        turnaround_hours: inventoryEnabled && inventoryMode === 'rental' && turnaroundHours ? parseInt(turnaroundHours) : null,
      };

      const { error } = await supabase
        .from('service_listings')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      Alert.alert(
        'Success',
        'Listing updated successfully',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update listing');
      console.error('Listing update error:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleFulfillmentType = (type: string) => {
    if (fulfillmentType.includes(type)) {
      setFulfillmentType(fulfillmentType.filter(t => t !== type));
    } else {
      setFulfillmentType([...fulfillmentType, type]);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Listing</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <Input
            label="Service Title"
            placeholder="e.g., Professional Home Cleaning"
            value={title}
            onChangeText={setTitle}
            error={errors.title}
            leftIcon={<FileText size={20} color={colors.textSecondary} />}
          />

          <TextArea
            label="Description"
            placeholder="Describe your service in detail..."
            value={description}
            onChangeText={setDescription}
            error={errors.description}
            minHeight={120}
          />

          <CategoryPicker
            selectedCategoryId={categoryId}
            selectedCategoryName={categoryName}
            selectedSubcategoryId={subcategoryId}
            selectedSubcategoryName={subcategoryName}
            onCategorySelect={(id, name) => {
              setCategoryId(id);
              setCategoryName(name);
            }}
            onSubcategorySelect={(id, name) => {
              setSubcategoryId(id);
              setSubcategoryName(name);
            }}
            error={errors.category || errors.subcategory}
          />

          <View style={styles.listingTypeSelector}>
            {[
              { value: 'Service', label: 'Standard Service' },
              { value: 'CustomService', label: 'Custom Service' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.listingTypeButton,
                  listingType === option.value && styles.listingTypeButtonActive,
                ]}
                onPress={() => setListingType(option.value as any)}
              >
                <Text
                  style={[
                    styles.listingTypeButtonText,
                    listingType === option.value && styles.listingTypeButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing</Text>

          <View style={styles.priceTypeSelector}>
            {[
              { value: 'hourly', label: 'Hourly Rate' },
              { value: 'fixed', label: 'Fixed Price' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.priceTypeButton,
                  priceType === option.value && styles.priceTypeButtonActive,
                ]}
                onPress={() => setPriceType(option.value as any)}
              >
                <Text
                  style={[
                    styles.priceTypeButtonText,
                    priceType === option.value && styles.priceTypeButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label={priceType === 'hourly' ? 'Hourly Rate' : 'Fixed Price'}
            placeholder="Enter price"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            error={errors.price}
            leftIcon={<DollarSign size={20} color={colors.textSecondary} />}
          />

          {priceType === 'hourly' && (
            <Input
              label="Estimated Duration (Hours, Optional)"
              placeholder="e.g., 2"
              value={duration}
              onChangeText={setDuration}
              keyboardType="decimal-pad"
              leftIcon={<Clock size={20} color={colors.textSecondary} />}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <PhotoPicker
            photos={photos}
            onPhotosChange={setPhotos}
            maxPhotos={5}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>
          <AvailabilityCalendar
            availableDays={availableDays}
            onAvailabilityChange={setAvailableDays}
          />
        </View>

        {listingType === 'CustomService' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fulfillment Options</Text>

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setRequiresFulfilment(!requiresFulfilment)}
              >
                <Text style={styles.toggleLabel}>Requires Fulfillment</Text>
                <View style={[styles.toggle, requiresFulfilment && styles.toggleActive]}>
                  {requiresFulfilment && <CheckCircle2 size={16} color={colors.white} />}
                </View>
              </TouchableOpacity>

              {requiresFulfilment && (
                <>
                  <View style={styles.fulfillmentOptions}>
                    {['Shipping', 'Local Delivery', 'Pickup'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.fulfillmentOption,
                          fulfillmentType.includes(type) && styles.fulfillmentOptionActive,
                        ]}
                        onPress={() => toggleFulfillmentType(type)}
                      >
                        <Text
                          style={[
                            styles.fulfillmentOptionText,
                            fulfillmentType.includes(type) && styles.fulfillmentOptionTextActive,
                          ]}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {errors.fulfillment && (
                    <Text style={styles.errorText}>{errors.fulfillment}</Text>
                  )}

                  <Input
                    label="Item Weight (lbs, Optional)"
                    placeholder="e.g., 5"
                    value={itemWeight}
                    onChangeText={setItemWeight}
                    keyboardType="decimal-pad"
                    leftIcon={<Package size={20} color={colors.textSecondary} />}
                  />

                  <View style={styles.dimensionsRow}>
                    <Input
                      label="Length (in)"
                      placeholder="L"
                      value={itemLength}
                      onChangeText={setItemLength}
                      keyboardType="decimal-pad"
                      style={{ flex: 1 }}
                    />
                    <Input
                      label="Width (in)"
                      placeholder="W"
                      value={itemWidth}
                      onChangeText={setItemWidth}
                      keyboardType="decimal-pad"
                      style={{ flex: 1 }}
                    />
                    <Input
                      label="Height (in)"
                      placeholder="H"
                      value={itemHeight}
                      onChangeText={setItemHeight}
                      keyboardType="decimal-pad"
                      style={{ flex: 1 }}
                    />
                  </View>

                  <Input
                    label="Fulfillment Window (Days, Optional)"
                    placeholder="e.g., 7"
                    value={fulfillmentWindow}
                    onChangeText={setFulfillmentWindow}
                    keyboardType="number-pad"
                    leftIcon={<Truck size={20} color={colors.textSecondary} />}
                  />
                </>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Options</Text>

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setRequiresAgreement(!requiresAgreement)}
              >
                <Text style={styles.toggleLabel}>Requires Service Agreement</Text>
                <View style={[styles.toggle, requiresAgreement && styles.toggleActive]}>
                  {requiresAgreement && <CheckCircle2 size={16} color={colors.white} />}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setRequiresDamageDeposit(!requiresDamageDeposit)}
              >
                <Text style={styles.toggleLabel}>Requires Damage Deposit</Text>
                <View style={[styles.toggle, requiresDamageDeposit && styles.toggleActive]}>
                  {requiresDamageDeposit && <CheckCircle2 size={16} color={colors.white} />}
                </View>
              </TouchableOpacity>

              {requiresDamageDeposit && (
                <Input
                  label="Damage Deposit Amount"
                  placeholder="Enter amount"
                  value={damageDepositAmount}
                  onChangeText={setDamageDepositAmount}
                  keyboardType="decimal-pad"
                  error={errors.damageDeposit}
                  leftIcon={<DollarSign size={20} color={colors.textSecondary} />}
                />
              )}

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setProofingRequired(!proofingRequired)}
              >
                <Text style={styles.toggleLabel}>Requires Proof Before Fulfillment</Text>
                <View style={[styles.toggle, proofingRequired && styles.toggleActive]}>
                  {proofingRequired && <CheckCircle2 size={16} color={colors.white} />}
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Inventory Management</Text>

              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setInventoryEnabled(!inventoryEnabled)}
              >
                <Text style={styles.toggleLabel}>Enable Inventory Tracking</Text>
                <View style={[styles.toggle, inventoryEnabled && styles.toggleActive]}>
                  {inventoryEnabled && <CheckCircle2 size={16} color={colors.white} />}
                </View>
              </TouchableOpacity>

              {inventoryEnabled && (
                <>
                  <View style={styles.inventoryModeSelector}>
                    {[
                      { value: 'quantity', label: 'Quantity-Based' },
                      { value: 'rental', label: 'Rental/Time-Based' },
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.inventoryModeButton,
                          inventoryMode === option.value && styles.inventoryModeButtonActive,
                        ]}
                        onPress={() => setInventoryMode(option.value as any)}
                      >
                        <Text
                          style={[
                            styles.inventoryModeButtonText,
                            inventoryMode === option.value && styles.inventoryModeButtonTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {inventoryMode === 'quantity' && (
                    <>
                      <Input
                        label="Stock Quantity"
                        placeholder="Available quantity"
                        value={stockQuantity}
                        onChangeText={setStockQuantity}
                        keyboardType="number-pad"
                        error={errors.stockQuantity}
                      />
                      <Input
                        label="Low Stock Threshold (Optional)"
                        placeholder="Alert threshold"
                        value={lowStockThreshold}
                        onChangeText={setLowStockThreshold}
                        keyboardType="number-pad"
                      />
                    </>
                  )}

                  {inventoryMode === 'rental' && (
                    <>
                      <View style={styles.rentalModelSelector}>
                        {[
                          { value: 'flat', label: 'Flat Rate' },
                          { value: 'per_day', label: 'Per Day' },
                          { value: 'per_hour', label: 'Per Hour' },
                        ].map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.rentalModelButton,
                              rentalPricingModel === option.value && styles.rentalModelButtonActive,
                            ]}
                            onPress={() => setRentalPricingModel(option.value as any)}
                          >
                            <Text
                              style={[
                                styles.rentalModelButtonText,
                                rentalPricingModel === option.value && styles.rentalModelButtonTextActive,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <Input
                        label="Turnaround Time (Hours)"
                        placeholder="Time between rentals"
                        value={turnaroundHours}
                        onChangeText={setTurnaroundHours}
                        keyboardType="number-pad"
                      />
                    </>
                  )}
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
          leftIcon={<Save size={20} color={colors.white} />}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  listingTypeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  listingTypeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  listingTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  listingTypeButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  listingTypeButtonTextActive: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  priceTypeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  priceTypeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  priceTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  priceTypeButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  priceTypeButtonTextActive: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  toggleLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  toggle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  fulfillmentOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  fulfillmentOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  fulfillmentOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  fulfillmentOptionText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  fulfillmentOptionTextActive: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  dimensionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inventoryModeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  inventoryModeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  inventoryModeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  inventoryModeButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  inventoryModeButtonTextActive: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  rentalModelSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  rentalModelButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  rentalModelButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rentalModelButtonText: {
    fontSize: fontSize.xs,
    color: colors.text,
  },
  rentalModelButtonTextActive: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
