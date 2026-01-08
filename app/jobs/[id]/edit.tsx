import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { TextArea } from '@/components/TextArea';
import { CategoryPicker } from '@/components/CategoryPicker';
import { DatePicker } from '@/components/DatePicker';
import { PhotoPicker } from '@/components/PhotoPicker';
import AddressInput, { AddressData } from '@/components/AddressInput';
import TimeSlotPicker from '@/components/TimeSlotPicker';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { ArrowLeft, Save, MapPin, DollarSign, FileText, Clock } from 'lucide-react-native';

export default function EditJobScreen() {
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
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [address, setAddress] = useState<AddressData>({
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'US',
  });
  const [executionDate, setExecutionDate] = useState<Date>();
  const [photos, setPhotos] = useState<string[]>([]);
  const [timeSelectionMode, setTimeSelectionMode] = useState<'preferred' | 'specific'>('preferred');
  const [preferredTime, setPreferredTime] = useState('Flexible');
  const [specificTimeSlot, setSpecificTimeSlot] = useState('');
  const [pricingType, setPricingType] = useState<'quote_based' | 'fixed_price'>('quote_based');
  const [fixedPrice, setFixedPrice] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const timeOptions = ['Morning', 'Afternoon', 'Evening', 'Flexible'];

  useEffect(() => {
    if (id) {
      fetchJobDetails();
    }
  }, [id]);

  const fetchJobDetails = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      Alert.alert('Error', 'Failed to load job details');
      console.error('Job fetch error:', error);
      router.back();
      return;
    }

    if (data.customer_id !== profile?.id) {
      Alert.alert('Error', 'You do not have permission to edit this job');
      router.back();
      return;
    }

    setTitle(data.title || '');
    setDescription(data.description || '');
    setCategoryId(data.category_id || '');
    setSubcategoryId(data.subcategory_id || '');
    setBudgetMin(data.budget_min?.toString() || '');
    setBudgetMax(data.budget_max?.toString() || '');
    setPricingType(data.pricing_type || 'quote_based');
    setFixedPrice(data.fixed_price?.toString() || '');
    setEstimatedDuration(data.estimated_duration?.toString() || '');

    setAddress({
      street_address: data.street_address || '',
      city: data.city || '',
      state: data.state || '',
      zip_code: data.zip_code || '',
      country: data.country || 'US',
    });

    if (data.execution_date_start) {
      setExecutionDate(new Date(data.execution_date_start));
    }

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

    setPreferredTime(data.preferred_time || 'Flexible');
    if (data.time_window_start && data.time_window_end) {
      setTimeSelectionMode('specific');
      setSpecificTimeSlot(`${data.time_window_start}-${data.time_window_end}`);
    }

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

    if (pricingType === 'fixed_price') {
      if (!fixedPrice || parseFloat(fixedPrice) <= 0) {
        newErrors.fixedPrice = 'Valid fixed price is required';
      }
    } else {
      if (!budgetMin || parseFloat(budgetMin) <= 0) {
        newErrors.budgetMin = 'Minimum budget is required';
      }
    }

    if (!estimatedDuration.trim()) {
      newErrors.estimatedDuration = 'Estimated duration is required';
    } else if (isNaN(Number(estimatedDuration))) {
      newErrors.estimatedDuration = 'Invalid duration';
    } else if (Number(estimatedDuration) <= 0) {
      newErrors.estimatedDuration = 'Duration must be greater than 0';
    }

    if (!address.street_address.trim()) newErrors.address = 'Street address is required';
    if (!address.city.trim()) newErrors.city = 'City is required';
    if (!address.state.trim()) newErrors.state = 'State is required';
    if (!address.zip_code.trim()) newErrors.zipCode = 'ZIP code is required';
    if (!executionDate) newErrors.date = 'Execution date is required';

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
      const location = `${address.city}, ${address.state}`;
      let timeWindowStart = null;
      let timeWindowEnd = null;

      if (timeSelectionMode === 'specific' && specificTimeSlot) {
        const [start, end] = specificTimeSlot.split('-');
        timeWindowStart = start;
        timeWindowEnd = end;
      }

      const updateData: any = {
        title: title.trim(),
        description: description.trim(),
        category_id: categoryId,
        subcategory_id: subcategoryId,
        pricing_type: pricingType,
        location,
        street_address: address.street_address.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        zip_code: address.zip_code.trim(),
        country: address.country,
        execution_date_start: executionDate?.toISOString(),
        preferred_time: timeSelectionMode === 'preferred' ? preferredTime : null,
        time_window_start: timeWindowStart,
        time_window_end: timeWindowEnd,
        photos: photos.length > 0 ? JSON.stringify(photos) : null,
        estimated_duration: estimatedDuration ? parseFloat(estimatedDuration) : null,
      };

      if (pricingType === 'fixed_price') {
        updateData.fixed_price = parseFloat(fixedPrice);
        updateData.budget_min = null;
        updateData.budget_max = null;
      } else {
        updateData.budget_min = parseFloat(budgetMin);
        updateData.budget_max = budgetMax ? parseFloat(budgetMax) : null;
        updateData.fixed_price = null;
      }

      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      Alert.alert(
        'Success',
        'Job updated successfully',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update job');
      console.error('Job update error:', error);
    } finally {
      setSaving(false);
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
        <Text style={styles.headerTitle}>Edit Job</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <Input
            label="Job Title"
            placeholder="e.g., Need a plumber for kitchen sink"
            value={title}
            onChangeText={setTitle}
            error={errors.title}
            leftIcon={<FileText size={20} color={colors.textSecondary} />}
          />

          <TextArea
            label="Description"
            placeholder="Describe the job in detail..."
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
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing</Text>

          <View style={styles.pricingTypeSelector}>
            {[
              { value: 'quote_based', label: 'Request Quotes' },
              { value: 'fixed_price', label: 'Fixed Price' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.pricingTypeButton,
                  pricingType === option.value && styles.pricingTypeButtonActive,
                ]}
                onPress={() => setPricingType(option.value as any)}
              >
                <Text
                  style={[
                    styles.pricingTypeButtonText,
                    pricingType === option.value && styles.pricingTypeButtonTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {pricingType === 'fixed_price' ? (
            <Input
              label="Fixed Price"
              placeholder="Enter fixed price"
              value={fixedPrice}
              onChangeText={setFixedPrice}
              keyboardType="decimal-pad"
              error={errors.fixedPrice}
              leftIcon={<DollarSign size={20} color={colors.textSecondary} />}
            />
          ) : (
            <>
              <Input
                label="Minimum Budget"
                placeholder="Enter minimum budget"
                value={budgetMin}
                onChangeText={setBudgetMin}
                keyboardType="decimal-pad"
                error={errors.budgetMin}
                leftIcon={<DollarSign size={20} color={colors.textSecondary} />}
              />

              <Input
                label="Maximum Budget (Optional)"
                placeholder="Enter maximum budget"
                value={budgetMax}
                onChangeText={setBudgetMax}
                keyboardType="decimal-pad"
                leftIcon={<DollarSign size={20} color={colors.textSecondary} />}
              />
            </>
          )}

          <Input
            label="Estimated Duration (hours)"
            placeholder="e.g., 2 or 4.5"
            value={estimatedDuration}
            onChangeText={setEstimatedDuration}
            keyboardType="decimal-pad"
            leftIcon={<Clock size={20} color={colors.textSecondary} />}
            error={errors.estimatedDuration}
          />
          <Text style={styles.helperText}>
            Required. Helps providers price and schedule your job accurately.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>

          <AddressInput
            value={address}
            onChange={setAddress}
            errors={{
              street_address: errors.address,
              city: errors.city,
              state: errors.state,
              zip_code: errors.zipCode,
            }}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>

          <DatePicker
            label="Execution Date"
            date={executionDate}
            onDateChange={setExecutionDate}
            error={errors.date}
            minimumDate={new Date()}
          />

          <View style={styles.timeSelector}>
            <TouchableOpacity
              style={[
                styles.timeSelectorButton,
                timeSelectionMode === 'preferred' && styles.timeSelectorButtonActive,
              ]}
              onPress={() => setTimeSelectionMode('preferred')}
            >
              <Text
                style={[
                  styles.timeSelectorButtonText,
                  timeSelectionMode === 'preferred' && styles.timeSelectorButtonTextActive,
                ]}
              >
                Preferred Time
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timeSelectorButton,
                timeSelectionMode === 'specific' && styles.timeSelectorButtonActive,
              ]}
              onPress={() => setTimeSelectionMode('specific')}
            >
              <Text
                style={[
                  styles.timeSelectorButtonText,
                  timeSelectionMode === 'specific' && styles.timeSelectorButtonTextActive,
                ]}
              >
                Specific Time
              </Text>
            </TouchableOpacity>
          </View>

          {timeSelectionMode === 'preferred' ? (
            <View style={styles.timeOptions}>
              {timeOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.timeOptionButton,
                    preferredTime === option && styles.timeOptionButtonActive,
                  ]}
                  onPress={() => setPreferredTime(option)}
                >
                  <Text
                    style={[
                      styles.timeOptionButtonText,
                      preferredTime === option && styles.timeOptionButtonTextActive,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TimeSlotPicker
              value={specificTimeSlot}
              onChange={setSpecificTimeSlot}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos (Optional)</Text>
          <PhotoPicker
            photos={photos}
            onPhotosChange={setPhotos}
            maxPhotos={5}
          />
        </View>
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
  pricingTypeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  pricingTypeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  pricingTypeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pricingTypeButtonText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  pricingTypeButtonTextActive: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  timeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  timeSelectorButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  timeSelectorButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeSelectorButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  timeSelectorButtonTextActive: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  timeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeOptionButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  timeOptionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeOptionButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  timeOptionButtonTextActive: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  helperText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
