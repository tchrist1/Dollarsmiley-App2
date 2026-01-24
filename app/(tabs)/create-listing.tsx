import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity, Keyboard, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useAiAssist, meetsAiThreshold } from '@/hooks/useAiAssist';
import { supabase } from '@/lib/supabase';
import { uploadMultipleListingPhotos } from '@/lib/listing-photo-upload';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { TextArea } from '@/components/TextArea';
import { CategoryPicker } from '@/components/CategoryPicker';
import { PhotoPicker } from '@/components/PhotoPicker';
import { AvailabilityCalendar } from '@/components/AvailabilityCalendar';
import CustomServiceOptionsForm from '@/components/CustomServiceOptionsForm';
import CustomServiceOptionsFormAutoSave from '@/components/CustomServiceOptionsFormAutoSave';
import AICategorySuggestion from '@/components/AICategorySuggestion';
import AITitleDescriptionAssist from '@/components/AITitleDescriptionAssist';
import AIPhotoAssistModal from '@/components/AIPhotoAssistModal';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { DollarSign, Clock, Package, Truck, RotateCcw, Sparkles, ArrowLeftRight, Users, FileText, Boxes, CalendarClock, CheckCircle2, Save } from 'lucide-react-native';
import uuid from 'react-native-uuid';
import { validateListingForPublish, ListingStatus } from '@/lib/listing-status-manager';

export default function CreateListingScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [listingId, setListingId] = useState<string | null>(null);

  const { aiAssistEnabled, toggleAiAssist } = useAiAssist();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const canUseAi = aiAssistEnabled && meetsAiThreshold(title);
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [subcategoryName, setSubcategoryName] = useState('');
  const [listingType, setListingType] = useState<'Service' | 'CustomService'>('Service');
  const [serviceType, setServiceType] = useState<'In-Person' | 'Remote' | 'Both'>('In-Person');
  const [priceType, setPriceType] = useState<'hourly' | 'fixed'>('hourly');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [tags, setTags] = useState('');

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
  const [showAiPhotoModal, setShowAiPhotoModal] = useState(false);
  const [autoSaveDraftCreated, setAutoSaveDraftCreated] = useState(false);
  const [hasCustomOptions, setHasCustomOptions] = useState(false);

  React.useEffect(() => {
    if (listingType === 'CustomService' && !listingId && !autoSaveDraftCreated && profile) {
      createAutoDraft();
    }
  }, [listingType, listingId, autoSaveDraftCreated, profile]);

  const createAutoDraft = async () => {
    if (!profile) return;

    const newListingId = uuid.v4() as string;
    setListingId(newListingId);

    const minimalDraft: any = {
      id: newListingId,
      provider_id: profile.id,
      category_id: null,
      title: title.trim() || 'Untitled Custom Service',
      description: description.trim() || '',
      pricing_type: 'Fixed',
      base_price: 0,
      price: 0,
      estimated_duration: null,
      photos: [],
      availability: JSON.stringify([]),
      tags: [],
      is_active: false,
      status: 'Draft',
      listing_type: 'CustomService',
      service_type: 'In-Person',
      requires_fulfilment: false,
      requires_agreement: false,
      requires_damage_deposit: false,
      damage_deposit_amount: 0,
      proofing_required: proofingRequired,
      inventory_mode: 'none',
      location: profile.location || null,
      latitude: profile.latitude || null,
      longitude: profile.longitude || null,
    };

    try {
      const { error } = await supabase
        .from('service_listings')
        .insert(minimalDraft);

      if (error) {
        console.error('Auto-draft creation error:', error);
        setListingId(null);
      } else {
        setAutoSaveDraftCreated(true);
      }
    } catch (error) {
      console.error('Auto-draft creation failed:', error);
      setListingId(null);
    }
  };

  const hasFormData = () => {
    return (
      title.trim() !== '' ||
      description.trim() !== '' ||
      categoryId !== '' ||
      subcategoryId !== '' ||
      price !== '' ||
      duration !== '' ||
      photos.length > 0 ||
      availableDays.length > 0 ||
      tags.trim() !== '' ||
      listingType !== 'Service' ||
      serviceType !== 'In-Person' ||
      priceType !== 'hourly' ||
      requiresFulfilment !== false ||
      fulfillmentType.length > 0 ||
      itemWeight !== '' ||
      itemLength !== '' ||
      itemWidth !== '' ||
      itemHeight !== '' ||
      fulfillmentWindow !== '' ||
      requiresAgreement !== false ||
      requiresDamageDeposit !== false ||
      damageDepositAmount !== '' ||
      proofingRequired !== false ||
      inventoryEnabled !== false ||
      stockQuantity !== '' ||
      lowStockThreshold !== ''
    );
  };

  const clearAllFields = () => {
    Keyboard.dismiss();

    setListingId(null);
    setTitle('');
    setDescription('');
    setCategoryId('');
    setCategoryName('');
    setSubcategoryId('');
    setSubcategoryName('');
    setListingType('Service');
    setServiceType('In-Person');
    setPriceType('hourly');
    setPrice('');
    setDuration('');
    setPhotos([]);
    setAvailableDays([]);
    setTags('');
    setRequiresFulfilment(false);
    setFulfillmentType([]);
    setItemWeight('');
    setItemLength('');
    setItemWidth('');
    setItemHeight('');
    setFulfillmentWindow('');
    setRequiresAgreement(false);
    setRequiresDamageDeposit(false);
    setDamageDepositAmount('');
    setProofingRequired(false);
    setInventoryEnabled(false);
    setInventoryMode('quantity');
    setStockQuantity('');
    setLowStockThreshold('');
    setRentalPricingModel('per_day');
    setTurnaroundHours('2');
    setErrors({});
    setShowAiPhotoModal(false);
    setLoading(false);
    setAutoSaveDraftCreated(false);
    setHasCustomOptions(false);
  };

  const handleClearAll = () => {
    if (!hasFormData()) {
      return;
    }

    Alert.alert(
      'Clear all fields?',
      'This will reset the entire form to its initial state.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: clearAllFields,
        },
      ]
    );
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = 'Title is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!categoryId) newErrors.category = 'Category is required';
    if (!price || isNaN(Number(price))) newErrors.price = 'Valid price is required';
    if (Number(price) <= 0) newErrors.price = 'Price must be greater than 0';
    if (duration) {
      if (isNaN(Number(duration))) {
        newErrors.duration = 'Invalid duration';
      } else if (Number(duration) <= 0) {
        newErrors.duration = 'Duration must be greater than 0';
      }
    }
    if (availableDays.length === 0) newErrors.availability = 'Select at least one available day';

    if (requiresFulfilment) {
      if (!fulfillmentWindow || isNaN(Number(fulfillmentWindow))) {
        newErrors.fulfillmentWindow = 'Valid fulfillment timeline is required when fulfillment is enabled';
      } else if (Number(fulfillmentWindow) < 1) {
        newErrors.fulfillmentWindow = 'Fulfillment timeline must be at least 1 business day';
      }

      if (fulfillmentType.length === 0) {
        newErrors.fulfillment = 'Select at least one fulfillment method when fulfillment is required';
      }

      if (fulfillmentType.includes('Shipping')) {
        if (!itemWeight || isNaN(Number(itemWeight))) {
          newErrors.itemWeight = 'Valid weight is required for shipping';
        }
        if (!itemLength || !itemWidth || !itemHeight) {
          newErrors.dimensions = 'All dimensions are required for shipping';
        }
      }
    }

    if (requiresDamageDeposit) {
      if (!damageDepositAmount || isNaN(Number(damageDepositAmount))) {
        newErrors.damageDeposit = 'Valid deposit amount is required';
      } else if (Number(damageDepositAmount) <= 0) {
        newErrors.damageDeposit = 'Deposit amount must be greater than 0';
      }
    }

    if (inventoryEnabled) {
      if (!stockQuantity || isNaN(Number(stockQuantity))) {
        newErrors.stockQuantity = 'Valid quantity is required when inventory is enabled';
      } else if (Number(stockQuantity) < 1) {
        newErrors.stockQuantity = 'Quantity must be at least 1';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  function toggleFulfillmentType(type: string) {
    if (fulfillmentType.includes(type)) {
      setFulfillmentType(fulfillmentType.filter(t => t !== type));
    } else {
      setFulfillmentType([...fulfillmentType, type]);
    }
  }

  const createListingData = async (newListingId: string, targetStatus: ListingStatus) => {
    let photoUrls: string[] = [];
    if (photos.length > 0) {
      const uploadResult = await uploadMultipleListingPhotos(newListingId, photos);
      if (!uploadResult.success) {
        Alert.alert('Error', 'Failed to upload photos. Please try again.');
        console.error('Photo upload errors:', uploadResult.errors);
        return null;
      }
      photoUrls = uploadResult.urls;
    }

    const tagsList = tags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const listingData: any = {
      id: newListingId,
      provider_id: profile!.id,
      category_id: categoryId || null,
      title: title.trim(),
      description: description.trim(),
      pricing_type: priceType === 'hourly' ? 'Hourly' : 'Fixed',
      base_price: price ? Number(price) : 0,
      price: price ? Number(price) : 0,
      estimated_duration: duration ? Number(duration) : null,
      photos: photoUrls,
      availability: JSON.stringify(availableDays),
      tags: tagsList,
      is_active: targetStatus === 'Active',
      status: targetStatus,
      listing_type: listingType,
      service_type: serviceType,
      requires_fulfilment: requiresFulfilment,
      requires_agreement: requiresAgreement,
      requires_damage_deposit: requiresDamageDeposit,
      damage_deposit_amount: requiresDamageDeposit ? Number(damageDepositAmount) : 0,
      proofing_required: listingType === 'CustomService' ? proofingRequired : false,
      inventory_mode: inventoryEnabled ? inventoryMode : 'none',
      location: profile!.location || null,
      latitude: profile!.latitude || null,
      longitude: profile!.longitude || null,
    };

    if (inventoryEnabled) {
      listingData.stock_quantity = Number(stockQuantity);
      listingData.low_stock_threshold = lowStockThreshold ? Number(lowStockThreshold) : null;
    }

    if (inventoryEnabled && inventoryMode === 'rental') {
      listingData.rental_pricing_model = rentalPricingModel;
      listingData.turnaround_buffer_hours = Number(turnaroundHours) || 2;
    }

    if (requiresFulfilment) {
      listingData.fulfillment_window_days = Number(fulfillmentWindow);

      if (fulfillmentType.includes('Shipping')) {
        listingData.item_weight_oz = itemWeight ? Number(itemWeight) : null;
        if (itemLength && itemWidth && itemHeight) {
          listingData.item_dimensions = {
            length: Number(itemLength),
            width: Number(itemWidth),
            height: Number(itemHeight),
          };
        }
      }
    }

    return listingData;
  };

  const handleSaveDraft = async () => {
    if (!profile) {
      Alert.alert('Error', 'You must be logged in to create a listing');
      return;
    }

    if (profile.user_type === 'Customer') {
      Alert.alert(
        'Upgrade Required',
        'Only Provider and Hybrid accounts can create listings. Would you like to upgrade your account?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upgrade',
            onPress: () => router.push('/settings/account-type' as any),
          },
        ]
      );
      return;
    }

    setLoading(true);

    const draftListingId = listingId || (uuid.v4() as string);
    const listingData = await createListingData(draftListingId, 'Draft');

    if (!listingData) {
      setLoading(false);
      return;
    }

    let error;
    if (listingId && autoSaveDraftCreated) {
      const { error: updateError } = await supabase
        .from('service_listings')
        .update(listingData)
        .eq('id', listingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('service_listings')
        .insert(listingData);
      error = insertError;
    }

    if (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to save draft. Please try again.');
      console.error('Draft save error:', error);
      return;
    }

    if (!listingId) {
      setListingId(draftListingId);
    }

    if (requiresFulfilment && fulfillmentType.length > 0) {
      const fulfillmentOptions = fulfillmentType.map(type => ({
        listing_id: draftListingId,
        fulfillment_type: type,
        is_active: true,
      }));

      const { error: fulfillmentError } = await supabase
        .from('fulfillment_options')
        .insert(fulfillmentOptions);

      if (fulfillmentError) {
        console.error('Fulfillment options error:', fulfillmentError);
      }
    }

    setLoading(false);

    Alert.alert(
      'Draft Saved',
      'Your listing has been saved as a draft. You can publish it later from My Listings.',
      [
        {
          text: 'Create Another Listing',
          onPress: () => {
            clearAllFields();
          },
        },
        {
          text: 'View My Listings',
          onPress: () => router.push('/provider/my-listings' as any),
        },
      ]
    );
  };

  const handlePublish = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please fix the errors before publishing');
      return;
    }

    if (!profile) {
      Alert.alert('Error', 'You must be logged in to create a listing');
      return;
    }

    if (profile.user_type === 'Customer') {
      Alert.alert(
        'Upgrade Required',
        'Only Provider and Hybrid accounts can create listings. Would you like to upgrade your account?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Upgrade',
            onPress: () => router.push('/settings/account-type' as any),
          },
        ]
      );
      return;
    }

    const validationResult = validateListingForPublish({
      title,
      category_id: categoryId,
      photos,
      base_price: price ? Number(price) : 0,
      pricing_type: priceType === 'hourly' ? 'Hourly' : 'Fixed',
      listing_type: listingType,
    });

    if (!validationResult.valid) {
      const errorMessages = validationResult.errors.map(e => e.message).join('\n');
      Alert.alert('Cannot Publish', errorMessages);
      return;
    }

    setLoading(true);

    const publishListingId = listingId || (uuid.v4() as string);
    const listingData = await createListingData(publishListingId, 'Active');

    if (!listingData) {
      setLoading(false);
      return;
    }

    let error;
    if (listingId && autoSaveDraftCreated) {
      const { error: updateError } = await supabase
        .from('service_listings')
        .update(listingData)
        .eq('id', listingId);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('service_listings')
        .insert(listingData);
      error = insertError;
    }

    if (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to publish listing. Please try again.');
      console.error('Listing publish error:', error);
      return;
    }

    if (!listingId) {
      setListingId(publishListingId);
    }

    if (requiresFulfilment && fulfillmentType.length > 0) {
      const fulfillmentOptions = fulfillmentType.map(type => ({
        listing_id: publishListingId,
        fulfillment_type: type,
        is_active: true,
      }));

      const { error: fulfillmentError } = await supabase
        .from('fulfillment_options')
        .insert(fulfillmentOptions);

      if (fulfillmentError) {
        console.error('Fulfillment options error:', fulfillmentError);
      }
    }

    setLoading(false);

    if (listingType === 'CustomService') {
      Alert.alert(
        'Custom Service Published!',
        hasCustomOptions
          ? 'Your custom service is now live with customization options.'
          : 'Your custom service is now live. Customers can book it immediately.',
        [
          {
            text: 'Create Another Listing',
            onPress: () => {
              clearAllFields();
            },
          },
          {
            text: 'View My Listings',
            onPress: () => router.push('/provider/my-listings' as any),
          },
        ]
      );
    } else {
      Alert.alert(
        'Service Published!',
        'Your service listing is now live and visible to customers.',
        [
          {
            text: 'Create Another Listing',
            onPress: () => {
              clearAllFields();
            },
          },
          {
            text: 'View My Listings',
            onPress: () => router.push('/provider/my-listings' as any),
          },
        ]
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.title}>Create Service Listing</Text>
            <Text style={styles.subtitle}>Showcase your services to attract customers</Text>
          </View>
          <TouchableOpacity
            onPress={handleClearAll}
            style={styles.clearButton}
            disabled={!hasFormData()}
          >
            <RotateCcw size={18} color={hasFormData() ? colors.error : colors.textLight} />
            <Text style={[styles.clearButtonText, !hasFormData() && styles.clearButtonTextDisabled]}>
              Clear All
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.aiAssistToggleContainer}>
          <View style={styles.aiAssistToggleLeft}>
            <Sparkles size={18} color={colors.primary} />
            <Text style={styles.aiAssistLabel}>AI Assist</Text>
          </View>
          <TouchableOpacity
            style={[styles.toggleButton, aiAssistEnabled && styles.toggleButtonActive]}
            onPress={toggleAiAssist}
          >
            <View style={[styles.toggleCircle, aiAssistEnabled && styles.toggleCircleActive]} />
          </TouchableOpacity>
        </View>
        {aiAssistEnabled && !meetsAiThreshold(title) && (
          <Text style={styles.aiHelperText}>Type a few words in the title to get AI help</Text>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Listing Type</Text>
          <View style={styles.listingTypeContainer}>
            <TouchableOpacity
              style={[
                styles.listingTypeButton,
                listingType === 'Service' && styles.listingTypeButtonActive,
              ]}
              onPress={() => setListingType('Service')}
            >
              <Text
                style={[
                  styles.listingTypeText,
                  listingType === 'Service' && styles.listingTypeTextActive,
                ]}
              >
                Standard Service
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.listingTypeButton,
                listingType === 'CustomService' && styles.listingTypeButtonActive,
              ]}
              onPress={() => setListingType('CustomService')}
            >
              <Text
                style={[
                  styles.listingTypeText,
                  listingType === 'CustomService' && styles.listingTypeTextActive,
                ]}
              >
                Custom Service
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <AITitleDescriptionAssist
          currentTitle={title}
          currentDescription={description}
          onAccept={(newTitle, newDescription) => {
            setTitle(newTitle);
            setDescription(newDescription);
          }}
          disabled={!canUseAi}
          type="service"
          visible={aiAssistEnabled}
        />

        <Input
          label="Service Title"
          placeholder="e.g., Professional House Cleaning"
          value={title}
          onChangeText={setTitle}
          error={errors.title}
        />

        <TextArea
          label="Service Description"
          placeholder="Describe your service in detail. What do you offer? What makes your service special? What's included?"
          value={description}
          onChangeText={setDescription}
          error={errors.description}
          numberOfLines={6}
          maxWords={120}
          showWordCount={true}
        />

        <AICategorySuggestion
          title={title}
          description={description}
          onAccept={(id, name, subcatId, subcatName) => {
            setCategoryId(id);
            setCategoryName(name);
            if (subcatId && subcatName) {
              setSubcategoryId(subcatId);
              setSubcategoryName(subcatName);
            }
          }}
          disabled={!canUseAi}
          suggestionType="listing"
          visible={aiAssistEnabled}
        />

        <CategoryPicker
          label="Category"
          value={categoryId}
          onSelect={(id, name, subcatId, subcatName) => {
            setCategoryId(id);
            setCategoryName(name);
            if (subcatId && subcatName) {
              setSubcategoryId(subcatId);
              setSubcategoryName(subcatName);
            } else {
              setSubcategoryId('');
              setSubcategoryName('');
            }
          }}
          error={errors.category}
        />

        {subcategoryName && (
          <Input
            label="Subcategory"
            value={subcategoryName}
            editable={false}
            style={styles.readOnlyField}
          />
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Service Location</Text>
          <View style={styles.serviceTypeContainer}>
            <TouchableOpacity
              style={[
                styles.serviceTypeButton,
                serviceType === 'In-Person' && styles.serviceTypeButtonActive,
              ]}
              onPress={() => setServiceType('In-Person')}
            >
              <Text
                style={[
                  styles.serviceTypeText,
                  serviceType === 'In-Person' && styles.serviceTypeTextActive,
                ]}
              >
                In-Person
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.serviceTypeButton,
                serviceType === 'Remote' && styles.serviceTypeButtonActive,
              ]}
              onPress={() => setServiceType('Remote')}
            >
              <Text
                style={[
                  styles.serviceTypeText,
                  serviceType === 'Remote' && styles.serviceTypeTextActive,
                ]}
              >
                Remote
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.serviceTypeButton,
                serviceType === 'Both' && styles.serviceTypeButtonActive,
              ]}
              onPress={() => setServiceType('Both')}
            >
              <Text
                style={[
                  styles.serviceTypeText,
                  serviceType === 'Both' && styles.serviceTypeTextActive,
                ]}
              >
                Both
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Pricing</Text>
          <View style={styles.priceTypeContainer}>
            <Button
              title="Hourly Rate"
              onPress={() => setPriceType('hourly')}
              variant={priceType === 'hourly' ? 'primary' : 'outline'}
              size="small"
              style={styles.priceTypeButton}
            />
            <Button
              title="Fixed Price"
              onPress={() => setPriceType('fixed')}
              variant={priceType === 'fixed' ? 'primary' : 'outline'}
              size="small"
              style={styles.priceTypeButton}
            />
          </View>

          {priceType === 'hourly' ? (
            <>
              <Input
                label="Hourly Rate"
                placeholder="0"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                leftIcon={<DollarSign size={20} color={colors.textSecondary} />}
                error={errors.price}
              />
              <Input
                label="Typical Duration (hours)"
                placeholder="e.g., 2 or 4.5"
                value={duration}
                onChangeText={setDuration}
                keyboardType="decimal-pad"
                leftIcon={<Clock size={20} color={colors.textSecondary} />}
                error={errors.duration}
              />
              <Text style={styles.helperText}>
                How long does this service typically take?
              </Text>
            </>
          ) : (
            <>
              <Input
                label="Fixed Price"
                placeholder="0"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                leftIcon={<DollarSign size={20} color={colors.textSecondary} />}
                error={errors.price}
              />
              <Text style={styles.priceHelperText}>
                The total price customers will pay for this service
              </Text>
              <Input
                label="Estimated Duration (hours)"
                placeholder="e.g., 2 or 4.5"
                value={duration}
                onChangeText={setDuration}
                keyboardType="decimal-pad"
                leftIcon={<Clock size={20} color={colors.textSecondary} />}
                error={errors.duration}
              />
              <Text style={styles.helperText}>
                Estimated duration helps customers plan their schedule
              </Text>
            </>
          )}
        </View>

        <PhotoPicker
          label="Service Photos"
          photos={photos}
          onPhotosChange={setPhotos}
          maxPhotos={5}
          aiAssistEnabled={aiAssistEnabled}
          onAiImageAssist={() => setShowAiPhotoModal(true)}
        />

        <AIPhotoAssistModal
          visible={showAiPhotoModal}
          onClose={() => setShowAiPhotoModal(false)}
          onPhotoGenerated={(photoUrl) => {
            if (photos.length < 5) {
              setPhotos([...photos, photoUrl]);
            }
          }}
          onMultiplePhotosGenerated={(photoUrls) => {
            const available = 5 - photos.length;
            const toAdd = photoUrls.slice(0, available);
            if (toAdd.length > 0) {
              setPhotos([...photos, ...toAdd]);
            }
          }}
          sourceContext={{
            title: title.trim() || undefined,
            description: description.trim() || undefined,
            category: categoryName || undefined,
            subcategory: subcategoryName || undefined,
            listingType: listingType,
            fulfillmentType: requiresFulfilment ? fulfillmentType : undefined,
          }}
          maxPhotos={5}
          currentPhotoCount={photos.length}
        />

        <AvailabilityCalendar
          label="Availability"
          selectedDays={availableDays}
          onDaysChange={setAvailableDays}
          error={errors.availability}
        />

        <Input
          label="Tags (optional)"
          placeholder="e.g., deep cleaning, eco-friendly, same-day"
          value={tags}
          onChangeText={setTags}
          helperText="Separate tags with commas"
        />

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.fulfilmentToggleContainer}
            onPress={() => {
              setRequiresFulfilment(!requiresFulfilment);
              if (requiresFulfilment) {
                setFulfillmentType([]);
                setItemWeight('');
                setItemLength('');
                setItemWidth('');
                setItemHeight('');
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.fulfilmentToggleLeft}>
              <Package size={20} color={colors.primary} />
              <View style={styles.fulfilmentToggleTextContainer}>
                <Text style={styles.fulfilmentToggleLabel}>Requires Fulfilment</Text>
                <Text style={styles.fulfilmentToggleDescription}>
                  Enable if this service requires physical delivery, pickup, or shipping
                </Text>
              </View>
            </View>
            <View style={[
              styles.toggleSwitch,
              requiresFulfilment && styles.toggleSwitchActive
            ]}>
              <View style={[
                styles.toggleThumb,
                requiresFulfilment && styles.toggleThumbActive
              ]} />
            </View>
          </TouchableOpacity>
        </View>

        {requiresFulfilment && (
          <>
            <Input
              label="Fulfillment Timeline (business days)"
              placeholder="7"
              value={fulfillmentWindow}
              onChangeText={setFulfillmentWindow}
              keyboardType="numeric"
              error={errors.fulfillmentWindow}
              helperText="Number of business days from order confirmation to when the service will be ready for delivery or pickup"
            />

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Fulfillment Methods</Text>
              <Text style={styles.helperText}>
                Select at least one method for how the service will be fulfilled
              </Text>
              {errors.fulfillment && (
                <Text style={styles.errorText}>{errors.fulfillment}</Text>
              )}
              <View style={styles.fulfillmentGrid}>
                <TouchableOpacity
                  style={[
                    styles.fulfillmentOption,
                    fulfillmentType.includes('PickupByCustomer') && styles.fulfillmentOptionActive,
                  ]}
                  onPress={() => toggleFulfillmentType('PickupByCustomer')}
                >
                  <Package size={20} color={fulfillmentType.includes('PickupByCustomer') ? colors.white : colors.textSecondary} />
                  <Text
                    style={[
                      styles.fulfillmentText,
                      fulfillmentType.includes('PickupByCustomer') && styles.fulfillmentTextActive,
                    ]}
                  >
                    Pick-up by Customer
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.fulfillmentOption,
                    fulfillmentType.includes('DropOffByProvider') && styles.fulfillmentOptionActive,
                  ]}
                  onPress={() => toggleFulfillmentType('DropOffByProvider')}
                >
                  <Truck size={20} color={fulfillmentType.includes('DropOffByProvider') ? colors.white : colors.textSecondary} />
                  <Text
                    style={[
                      styles.fulfillmentText,
                      fulfillmentType.includes('DropOffByProvider') && styles.fulfillmentTextActive,
                    ]}
                  >
                    Drop-off by Provider
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.fulfillmentOption,
                    fulfillmentType.includes('PickupAndDropOffByCustomer') && styles.fulfillmentOptionActive,
                  ]}
                  onPress={() => toggleFulfillmentType('PickupAndDropOffByCustomer')}
                >
                  <ArrowLeftRight size={20} color={fulfillmentType.includes('PickupAndDropOffByCustomer') ? colors.white : colors.textSecondary} />
                  <Text
                    style={[
                      styles.fulfillmentText,
                      fulfillmentType.includes('PickupAndDropOffByCustomer') && styles.fulfillmentTextActive,
                    ]}
                  >
                    Pick-up & Drop-off by Customer
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.fulfillmentOption,
                    fulfillmentType.includes('PickupAndDropOffByProvider') && styles.fulfillmentOptionActive,
                  ]}
                  onPress={() => toggleFulfillmentType('PickupAndDropOffByProvider')}
                >
                  <Users size={20} color={fulfillmentType.includes('PickupAndDropOffByProvider') ? colors.white : colors.textSecondary} />
                  <Text
                    style={[
                      styles.fulfillmentText,
                      fulfillmentType.includes('PickupAndDropOffByProvider') && styles.fulfillmentTextActive,
                    ]}
                  >
                    Pick-up & Drop-off by Provider
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.fulfillmentOption,
                    fulfillmentType.includes('Shipping') && styles.fulfillmentOptionActive,
                  ]}
                  onPress={() => toggleFulfillmentType('Shipping')}
                >
                  <Package size={20} color={fulfillmentType.includes('Shipping') ? colors.white : colors.textSecondary} />
                  <Text
                    style={[
                      styles.fulfillmentText,
                      fulfillmentType.includes('Shipping') && styles.fulfillmentTextActive,
                    ]}
                  >
                    Shipping
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {fulfillmentType.includes('Shipping') && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Shipping Specifications</Text>
                <Text style={styles.helperText}>
                  Provide package details for accurate shipping cost calculation
                </Text>
                <Input
                  label="Item Weight (ounces)"
                  placeholder="16"
                  value={itemWeight}
                  onChangeText={setItemWeight}
                  keyboardType="numeric"
                  error={errors.itemWeight}
                  helperText="Total weight of packaged item in ounces (oz). Example: 1 pound = 16 oz"
                />

                <Text style={styles.dimensionsLabel}>Package Dimensions (inches)</Text>
                <View style={styles.row}>
                  <View style={styles.thirdWidth}>
                    <Input
                      label="Length"
                      placeholder="10"
                      value={itemLength}
                      onChangeText={setItemLength}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.thirdWidth}>
                    <Input
                      label="Width"
                      placeholder="8"
                      value={itemWidth}
                      onChangeText={setItemWidth}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.thirdWidth}>
                    <Input
                      label="Height"
                      placeholder="6"
                      value={itemHeight}
                      onChangeText={setItemHeight}
                      keyboardType="numeric"
                      error={errors.dimensions}
                    />
                  </View>
                </View>
                <Text style={styles.dimensionsHelperText}>
                  Measure the box or package in inches (in). Length × Width × Height
                </Text>
              </View>
            )}
          </>
        )}

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.fulfilmentToggleContainer}
            onPress={() => {
              setInventoryEnabled(!inventoryEnabled);
              if (inventoryEnabled) {
                setStockQuantity('');
                setLowStockThreshold('');
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.fulfilmentToggleLeft}>
              <Boxes size={20} color={colors.primary} />
              <View style={styles.fulfilmentToggleTextContainer}>
                <Text style={styles.fulfilmentToggleLabel}>Enable Inventory</Text>
                <Text style={styles.fulfilmentToggleDescription}>
                  Track availability and prevent overbooking for quantity-based or rental services
                </Text>
              </View>
            </View>
            <View style={[
              styles.toggleSwitch,
              inventoryEnabled && styles.toggleSwitchActive
            ]}>
              <View style={[
                styles.toggleThumb,
                inventoryEnabled && styles.toggleThumbActive
              ]} />
            </View>
          </TouchableOpacity>
        </View>

        {inventoryEnabled && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Inventory Type</Text>
            <View style={styles.inventoryModeContainer}>
              <TouchableOpacity
                style={[
                  styles.inventoryModeOption,
                  inventoryMode === 'quantity' && styles.inventoryModeOptionActive,
                ]}
                onPress={() => setInventoryMode('quantity')}
              >
                <Boxes size={18} color={inventoryMode === 'quantity' ? colors.white : colors.textSecondary} />
                <Text
                  style={[
                    styles.inventoryModeText,
                    inventoryMode === 'quantity' && styles.inventoryModeTextActive,
                  ]}
                >
                  Quantity
                </Text>
                <Text style={[
                  styles.inventoryModeDesc,
                  inventoryMode === 'quantity' && styles.inventoryModeDescActive,
                ]}>
                  Track available units
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.inventoryModeOption,
                  inventoryMode === 'rental' && styles.inventoryModeOptionActive,
                ]}
                onPress={() => setInventoryMode('rental')}
              >
                <CalendarClock size={18} color={inventoryMode === 'rental' ? colors.white : colors.textSecondary} />
                <Text
                  style={[
                    styles.inventoryModeText,
                    inventoryMode === 'rental' && styles.inventoryModeTextActive,
                  ]}
                >
                  Rental
                </Text>
                <Text style={[
                  styles.inventoryModeDesc,
                  inventoryMode === 'rental' && styles.inventoryModeDescActive,
                ]}>
                  Time-based availability with pickup & drop-off
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {inventoryEnabled && (
          <View style={styles.section}>
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Input
                  label="Stock Quantity"
                  placeholder="1"
                  value={stockQuantity}
                  onChangeText={setStockQuantity}
                  keyboardType="numeric"
                  error={errors.stockQuantity}
                />
              </View>
              <View style={styles.halfWidth}>
                <Input
                  label="Low Stock Alert"
                  placeholder="Optional"
                  value={lowStockThreshold}
                  onChangeText={setLowStockThreshold}
                  keyboardType="numeric"
                  helperText="Alert when below"
                />
              </View>
            </View>
          </View>
        )}

        {inventoryEnabled && inventoryMode === 'rental' && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Rental Pricing</Text>
            <View style={styles.rentalPricingContainer}>
              <TouchableOpacity
                style={[
                  styles.rentalPricingOption,
                  rentalPricingModel === 'flat' && styles.rentalPricingOptionActive,
                ]}
                onPress={() => setRentalPricingModel('flat')}
              >
                <Text
                  style={[
                    styles.rentalPricingText,
                    rentalPricingModel === 'flat' && styles.rentalPricingTextActive,
                  ]}
                >
                  Flat Rate
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.rentalPricingOption,
                  rentalPricingModel === 'per_day' && styles.rentalPricingOptionActive,
                ]}
                onPress={() => setRentalPricingModel('per_day')}
              >
                <Text
                  style={[
                    styles.rentalPricingText,
                    rentalPricingModel === 'per_day' && styles.rentalPricingTextActive,
                  ]}
                >
                  Per Day
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.rentalPricingOption,
                  rentalPricingModel === 'per_hour' && styles.rentalPricingOptionActive,
                ]}
                onPress={() => setRentalPricingModel('per_hour')}
              >
                <Text
                  style={[
                    styles.rentalPricingText,
                    rentalPricingModel === 'per_hour' && styles.rentalPricingTextActive,
                  ]}
                >
                  Per Hour
                </Text>
              </TouchableOpacity>
            </View>

            <Input
              label="Turnaround Time (hours)"
              placeholder="2"
              value={turnaroundHours}
              onChangeText={setTurnaroundHours}
              keyboardType="numeric"
              helperText="Buffer time between rentals for prep/cleaning"
            />
          </View>
        )}

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.fulfilmentToggleContainer}
            onPress={() => setRequiresAgreement(!requiresAgreement)}
            activeOpacity={0.7}
          >
            <View style={styles.fulfilmentToggleLeft}>
              <FileText size={20} color={colors.primary} />
              <View style={styles.fulfilmentToggleTextContainer}>
                <Text style={styles.fulfilmentToggleLabel}>Require Service Agreement</Text>
                <Text style={styles.fulfilmentToggleDescription}>
                  Customer must accept platform agreement at checkout
                </Text>
              </View>
            </View>
            <View style={[
              styles.toggleSwitch,
              requiresAgreement && styles.toggleSwitchActive
            ]}>
              <View style={[
                styles.toggleThumb,
                requiresAgreement && styles.toggleThumbActive
              ]} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.fulfilmentToggleContainer}
            onPress={() => {
              setRequiresDamageDeposit(!requiresDamageDeposit);
              if (requiresDamageDeposit) {
                setDamageDepositAmount('');
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.fulfilmentToggleLeft}>
              <DollarSign size={20} color={colors.primary} />
              <View style={styles.fulfilmentToggleTextContainer}>
                <Text style={styles.fulfilmentToggleLabel}>Require Damage Deposit</Text>
                <Text style={styles.fulfilmentToggleDescription}>
                  Refundable deposit to cover potential damages
                </Text>
              </View>
            </View>
            <View style={[
              styles.toggleSwitch,
              requiresDamageDeposit && styles.toggleSwitchActive
            ]}>
              <View style={[
                styles.toggleThumb,
                requiresDamageDeposit && styles.toggleThumbActive
              ]} />
            </View>
          </TouchableOpacity>
        </View>

        {requiresDamageDeposit && (
          <Input
            label="Damage Deposit Amount"
            placeholder="0"
            value={damageDepositAmount}
            onChangeText={setDamageDepositAmount}
            keyboardType="numeric"
            leftIcon={<DollarSign size={20} color={colors.textSecondary} />}
            error={errors.damageDeposit}
            helperText="Refundable amount held to cover potential damages. Will be automatically released if no damage is reported within 48 hours."
          />
        )}

        {listingType === 'CustomService' && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.fulfilmentToggleContainer}
              onPress={() => setProofingRequired(!proofingRequired)}
              activeOpacity={0.7}
            >
              <View style={styles.fulfilmentToggleLeft}>
                <CheckCircle2 size={20} color={colors.primary} />
                <View style={styles.fulfilmentToggleTextContainer}>
                  <Text style={styles.fulfilmentToggleLabel}>Require Proof Approval</Text>
                  <Text style={styles.fulfilmentToggleDescription}>
                    Customer must approve a proof before production begins
                  </Text>
                </View>
              </View>
              <View style={[
                styles.toggleSwitch,
                proofingRequired && styles.toggleSwitchActive
              ]}>
                <View style={[
                  styles.toggleThumb,
                  proofingRequired && styles.toggleThumbActive
                ]} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {listingType === 'CustomService' && (
          <View style={styles.customOptionsSection}>
            <View style={styles.customOptionsSectionHeader}>
              <Text style={styles.customOptionsSectionTitle}>Custom Service Options</Text>
              <Text style={styles.customOptionsSectionSubtitle}>
                Add customization options for customers to choose from
              </Text>
              {autoSaveDraftCreated && (
                <View style={styles.draftSavedBadge}>
                  <Text style={styles.draftSavedText}>Draft saved automatically</Text>
                </View>
              )}
            </View>

            <View style={styles.helperBox}>
              <Text style={styles.helperBoxText}>
                Custom options help customers personalize their order and reduce back-and-forth. Examples: size, color, material, quantity, add-ons.
              </Text>
            </View>

            {listingId ? (
              <CustomServiceOptionsFormAutoSave
                listingId={listingId}
                onOptionsChange={setHasCustomOptions}
              />
            ) : (
              <View style={styles.loadingOptionsContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingOptionsText}>Preparing options...</Text>
              </View>
            )}
          </View>
        )}

        <Text style={styles.smsOptInText}>
          I agree to receive SMS alerts about jobs, bookings, and account updates. Msg & data rates may apply. Reply STOP to opt out.
        </Text>

        {!listingId && (
          <View style={styles.buttonContainer}>
            <Button
              title="Publish"
              onPress={handlePublish}
              loading={loading}
              leftIcon={<CheckCircle2 size={20} color={colors.white} />}
            />
            <Button
              title="Save Draft"
              onPress={handleSaveDraft}
              variant="outline"
              loading={loading}
              leftIcon={<Save size={20} color={colors.primary} />}
              style={styles.draftButton}
            />
            <Button
              title="Cancel"
              onPress={() => router.back()}
              variant="outline"
              style={styles.cancelButton}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  clearButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.error,
  },
  clearButtonTextDisabled: {
    color: colors.textLight,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  priceTypeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  priceTypeButton: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  thirdWidth: {
    flex: 1,
  },
  helperText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  priceHelperText: {
    fontSize: fontSize.sm,
    color: colors.info,
    marginTop: spacing.xs,
  },
  dimensionsLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  dimensionsHelperText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  listingTypeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  listingTypeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  listingTypeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  listingTypeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  listingTypeTextActive: {
    color: colors.white,
  },
  serviceTypeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  serviceTypeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTypeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  serviceTypeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  serviceTypeTextActive: {
    color: colors.white,
  },
  serviceTypeSubtext: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  serviceTypeSubtextActive: {
    color: colors.white,
    opacity: 0.9,
  },
  fulfillmentContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  fulfilmentToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fulfilmentToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  fulfilmentToggleTextContainer: {
    flex: 1,
  },
  fulfilmentToggleLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  fulfilmentToggleDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  fulfillmentGrid: {
    gap: spacing.sm,
  },
  fulfillmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  fulfillmentOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  fulfillmentText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    flex: 1,
  },
  fulfillmentTextActive: {
    color: colors.white,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  smsOptInText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'left',
  },
  customOptionsSection: {
    marginTop: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customOptionsSectionHeader: {
    marginBottom: spacing.md,
  },
  customOptionsSectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  customOptionsSectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  customOptionsPlaceholder: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  draftSavedBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  draftSavedText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  helperBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  helperBoxText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  loadingOptionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  loadingOptionsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  placeholderText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  draftButton: {
    marginTop: spacing.md,
  },
  cancelButton: {
    marginTop: spacing.md,
  },
  readOnlyField: {
    backgroundColor: colors.surface,
    opacity: 0.8,
  },
  aiAssistToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  aiAssistToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  aiAssistLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  toggleButton: {
    width: 51,
    height: 31,
    borderRadius: 16,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleCircle: {
    width: 27,
    height: 27,
    borderRadius: 13.5,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleCircleActive: {
    alignSelf: 'flex-end',
  },
  aiHelperText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  inventoryModeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inventoryModeOption: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    gap: spacing.xs,
  },
  inventoryModeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  inventoryModeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  inventoryModeTextActive: {
    color: colors.white,
  },
  inventoryModeDesc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  inventoryModeDescActive: {
    color: colors.white,
    opacity: 0.9,
  },
  rentalPricingContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  rentalPricingOption: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  rentalPricingOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  rentalPricingText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  rentalPricingTextActive: {
    color: colors.white,
  },
});
