import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity, Keyboard } from 'react-native';
import { router } from 'expo-router';
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
import AICategorySuggestion from '@/components/AICategorySuggestion';
import AITitleDescriptionAssist from '@/components/AITitleDescriptionAssist';
import TimeSlotPicker from '@/components/TimeSlotPicker';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { MapPin, DollarSign, FileText, Tag, Clock, RotateCcw, Sparkles } from 'lucide-react-native';

export default function PostJobScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const [aiAssistEnabled, setAiAssistEnabled] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const meetsAiThreshold = (text: string): boolean => {
    const trimmed = text.trim();
    const wordCount = trimmed.split(/\s+/).filter(word => word.length > 0).length;
    const charCount = trimmed.replace(/\s/g, '').length;
    return wordCount >= 2 || charCount >= 12;
  };

  const canUseAi = aiAssistEnabled && meetsAiThreshold(title);
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

  const hasFormData = () => {
    return (
      title.trim() !== '' ||
      description.trim() !== '' ||
      categoryId !== '' ||
      subcategoryId !== '' ||
      budgetMin !== '' ||
      budgetMax !== '' ||
      fixedPrice !== '' ||
      estimatedDuration !== '' ||
      address.street_address.trim() !== '' ||
      address.city.trim() !== '' ||
      address.state.trim() !== '' ||
      address.zip_code.trim() !== '' ||
      executionDate !== undefined ||
      photos.length > 0 ||
      preferredTime !== 'Flexible' ||
      specificTimeSlot !== '' ||
      pricingType !== 'quote_based'
    );
  };

  const clearAllFields = () => {
    Keyboard.dismiss();

    setTitle('');
    setDescription('');
    setCategoryId('');
    setCategoryName('');
    setSubcategoryId('');
    setSubcategoryName('');
    setBudgetMin('');
    setBudgetMax('');
    setFixedPrice('');
    setEstimatedDuration('');
    setAddress({
      street_address: '',
      city: '',
      state: '',
      zip_code: '',
      country: 'US',
    });
    setExecutionDate(undefined);
    setPhotos([]);
    setTimeSelectionMode('preferred');
    setPreferredTime('Flexible');
    setSpecificTimeSlot('');
    setPricingType('quote_based');
    setErrors({});
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
    if (!address.street_address.trim() || !address.city.trim() || !address.state.trim() || !address.zip_code.trim()) {
      newErrors.address = 'Complete address is required';
    }
    if (!executionDate) newErrors.executionDate = 'Date is required';

    if (pricingType === 'quote_based') {
      if (budgetMin && isNaN(Number(budgetMin))) newErrors.budgetMin = 'Invalid amount';
      if (budgetMax && isNaN(Number(budgetMax))) newErrors.budgetMax = 'Invalid amount';
      if (budgetMin && budgetMax && Number(budgetMin) > Number(budgetMax)) {
        newErrors.budgetMax = 'Max must be greater than min';
      }
    } else {
      if (!fixedPrice.trim()) newErrors.fixedPrice = 'Fixed price is required';
      if (fixedPrice && isNaN(Number(fixedPrice))) newErrors.fixedPrice = 'Invalid amount';
      if (fixedPrice && Number(fixedPrice) <= 0) newErrors.fixedPrice = 'Price must be greater than 0';
    }

    if (estimatedDuration) {
      if (isNaN(Number(estimatedDuration))) newErrors.estimatedDuration = 'Invalid duration';
      if (Number(estimatedDuration) <= 0) newErrors.estimatedDuration = 'Duration must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert('Validation Error', 'Please fix the errors before submitting');
      return;
    }

    if (!profile) {
      Alert.alert('Error', 'You must be logged in to post a job');
      return;
    }

    setLoading(true);

    const jobData = {
      customer_id: profile.id,
      category_id: categoryId,
      title: title.trim(),
      description: description.trim(),
      pricing_type: pricingType,
      budget_min: pricingType === 'quote_based' && budgetMin ? Number(budgetMin) : null,
      budget_max: pricingType === 'quote_based' && budgetMax ? Number(budgetMax) : null,
      fixed_price: pricingType === 'fixed_price' && fixedPrice ? Number(fixedPrice) : null,
      location: `${address.city}, ${address.state}`,
      street_address: address.street_address.trim(),
      city: address.city.trim(),
      state: address.state.trim(),
      zip_code: address.zip_code.trim(),
      country: address.country,
      latitude: address.latitude || null,
      longitude: address.longitude || null,
      execution_date_start: executionDate?.toISOString().split('T')[0],
      preferred_time: timeSelectionMode === 'preferred' ? preferredTime : null,
      start_time: timeSelectionMode === 'specific' ? specificTimeSlot : null,
      end_time: null,
      estimated_duration_hours: estimatedDuration ? Number(estimatedDuration) : null,
      photos: JSON.stringify(photos),
      status: 'Open',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const { data, error } = await supabase.from('jobs').insert(jobData).select().single();

    setLoading(false);

    if (error) {
      Alert.alert('Error', 'Failed to post job. Please try again.');
      console.error('Job post error:', error);
    } else {
      const message = pricingType === 'fixed_price'
        ? 'Your fixed-price job has been posted. Providers can now accept it at your set price.'
        : 'Your job has been posted successfully. Providers can now send you quotes.';

      Alert.alert(
        'Success!',
        message,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
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
            <Text style={styles.title}>Post a Job</Text>
            <Text style={styles.subtitle}>Describe what you need done</Text>
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
            onPress={() => setAiAssistEnabled(!aiAssistEnabled)}
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
        <Input
          label="Job Title"
          placeholder="e.g., Need help moving furniture"
          value={title}
          onChangeText={setTitle}
          error={errors.title}
        />

        <AITitleDescriptionAssist
          currentTitle={title}
          currentDescription={description}
          onAccept={(newTitle, newDescription) => {
            setTitle(newTitle);
            setDescription(newDescription);
          }}
          disabled={!canUseAi}
          type="job"
          visible={aiAssistEnabled}
        />

        <TextArea
          label="Description"
          placeholder="Provide details about the job, what needs to be done, any special requirements..."
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
          suggestionType="job"
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

        {/* Pricing Type Selection */}
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Job Pricing Type</Text>
          <Text style={styles.helperText}>Choose how providers should respond to your job</Text>
          <View style={styles.pricingTypeContainer}>
            <Button
              title="Get offers"
              onPress={() => setPricingType('quote_based')}
              variant={pricingType === 'quote_based' ? 'primary' : 'outline'}
              size="small"
              style={styles.pricingTypeButton}
              icon={<FileText size={18} color={pricingType === 'quote_based' ? colors.white : colors.text} />}
            />
            <Button
              title="Set a fixed price"
              onPress={() => setPricingType('fixed_price')}
              variant={pricingType === 'fixed_price' ? 'primary' : 'outline'}
              size="small"
              style={styles.pricingTypeButton}
              icon={<Tag size={18} color={pricingType === 'fixed_price' ? colors.white : colors.text} />}
            />
          </View>
          {pricingType === 'quote_based' ? (
            <Text style={styles.pricingTypeHint}>
              Providers will send you their own offers. You choose the best one.
            </Text>
          ) : (
            <Text style={styles.pricingTypeHint}>
              Providers will see this price and can instantly accept your job
            </Text>
          )}
        </View>

        {/* Budget or Fixed Price based on pricing type */}
        {pricingType === 'quote_based' ? (
          <>
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Input
                  label="Min Budget (optional)"
                  placeholder="$0"
                  value={budgetMin}
                  onChangeText={setBudgetMin}
                  keyboardType="numeric"
                  leftIcon={<DollarSign size={20} color={colors.textSecondary} />}
                  error={errors.budgetMin}
                />
              </View>
              <View style={styles.halfWidth}>
                <Input
                  label="Max Budget (optional)"
                  placeholder="$0"
                  value={budgetMax}
                  onChangeText={setBudgetMax}
                  keyboardType="numeric"
                  leftIcon={<DollarSign size={20} color={colors.textSecondary} />}
                  error={errors.budgetMax}
                />
              </View>
            </View>
            <Text style={styles.budgetHint}>
              Set a budget range to help providers understand your expectations
            </Text>
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
              How many hours do you estimate this job will take? (Optional but helps providers)
            </Text>
          </>
        ) : (
          <>
            <Input
              label="Fixed Price"
              placeholder="Enter the exact price you'll pay"
              value={fixedPrice}
              onChangeText={setFixedPrice}
              keyboardType="numeric"
              leftIcon={<DollarSign size={20} color={colors.textSecondary} />}
              error={errors.fixedPrice}
            />
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
              Estimated time to complete (helps providers plan their schedule)
            </Text>
          </>
        )}

        <View style={styles.fieldContainer}>
          <Text style={styles.sectionLabel}>Job Location</Text>
          <AddressInput
            value={address}
            onChange={setAddress}
            error={errors.address}
            required
          />
        </View>

        <DatePicker
          label="When do you need this done?"
          value={executionDate}
          onChange={setExecutionDate}
          minimumDate={new Date()}
          error={errors.executionDate}
        />

        {/* Time Selection Mode Switcher */}
        <View style={styles.fieldContainer}>
          <View style={styles.timeModeSwitcher}>
            <Button
              title="Preferred Time"
              onPress={() => setTimeSelectionMode('preferred')}
              variant={timeSelectionMode === 'preferred' ? 'primary' : 'outline'}
              size="small"
              style={styles.timeModeButton}
            />
            <Button
              title="Specific Time Slot"
              onPress={() => setTimeSelectionMode('specific')}
              variant={timeSelectionMode === 'specific' ? 'primary' : 'outline'}
              size="small"
              style={styles.timeModeButton}
            />
          </View>
        </View>

        {/* Preferred Time Mode */}
        {timeSelectionMode === 'preferred' && (
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Preferred Time</Text>
            <View style={styles.timeOptions}>
              {timeOptions.map((time) => (
                <Button
                  key={time}
                  title={time}
                  onPress={() => setPreferredTime(time)}
                  variant={preferredTime === time ? 'primary' : 'outline'}
                  size="small"
                  style={styles.timeButton}
                />
              ))}
            </View>
          </View>
        )}

        {/* Specific Time Slot Mode */}
        {timeSelectionMode === 'specific' && (
          <View style={styles.fieldContainer}>
            <Text style={styles.helperText}>
              Choose a specific start time. Overnight jobs are supported.
            </Text>
            <TimeSlotPicker
              label="Time Slot"
              value={specificTimeSlot}
              onChange={setSpecificTimeSlot}
            />
          </View>
        )}

        <PhotoPicker
          label="Job Photos"
          helperText="Upload photos that help providers understand the job (space, damage, setup, or requirements)."
          photos={photos}
          onPhotosChange={setPhotos}
          maxPhotos={5}
        />

        <Text style={styles.smsOptInText}>
          I agree to receive SMS alerts about jobs, bookings, and account updates. Msg & data rates may apply. Reply STOP to opt out.
        </Text>

        <View style={styles.buttonContainer}>
          <Button title="Post Job" onPress={handleSubmit} loading={loading} />
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="outline"
            style={styles.cancelButton}
          />
        </View>
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
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  timeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeButton: {
    flex: 0,
    minWidth: 80,
  },
  pricingTypeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  pricingTypeButton: {
    flex: 1,
  },
  helperText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  budgetHint: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  pricingTypeHint: {
    fontSize: fontSize.sm,
    color: colors.info,
    marginTop: spacing.sm,
  },
  smsOptInText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'left',
  },
  buttonContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  cancelButton: {
    marginTop: spacing.md,
  },
  timeModeSwitcher: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timeModeButton: {
    flex: 1,
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
});
