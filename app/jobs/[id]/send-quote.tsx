import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { formatCurrency } from '@/lib/currency-utils';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import {
  ArrowLeft,
  DollarSign,
  Calendar,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react-native';

interface Job {
  id: string;
  title: string;
  description: string;
  pricing_type: string;
  budget_min: number | null;
  budget_max: number | null;
  location: string;
  execution_date_start: string;
  preferred_time: string | null;
  time_window_start: string | null;
  time_window_end: string | null;
  estimated_duration_hours: number | null;
  customer_id: string;
  customer: {
    full_name: string;
  };
}

export default function SendQuoteScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchJobDetails();
  }, [id]);

  const fetchJobDetails = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('jobs')
      .select(
        `
        *,
        customer:profiles!jobs_customer_id_fkey(full_name)
      `
      )
      .eq('id', id)
      .single();

    if (data && !error) {
      setJob(data as any);
      setMessage(`I'd like to quote ${formatCurrency(0)} for this job. I have experience in this area and can deliver quality work on time.`);
    }

    setLoading(false);
  };

  const handleSubmitQuote = async () => {
    if (!profile || !job) return;

    const priceNum = Number(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price greater than $0');
      return;
    }

    if (job.budget_max && priceNum > job.budget_max * 1.5) {
      Alert.alert(
        'High Quote',
        `Your quote is significantly higher than the customer's budget. Continue anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: submitQuote },
        ]
      );
      return;
    }

    submitQuote();
  };

  const submitQuote = async () => {
    if (!profile || !job) return;

    setSubmitting(true);

    const priceNum = Number(price);
    const bookingData = {
      customer_id: job.customer_id,
      provider_id: profile.id,
      job_id: job.id,
      title: job.title,
      description: message || `Quote for: ${job.title}`,
      scheduled_date: job.execution_date_start,
      scheduled_time: job.time_window_start && job.time_window_end
        ? `${job.time_window_start} - ${job.time_window_end}`
        : job.preferred_time || 'Flexible',
      location: job.location,
      price: priceNum,
      status: 'Requested',
      payment_status: 'Pending',
    };

    const { error } = await supabase.from('bookings').insert(bookingData);

    setSubmitting(false);

    if (error) {
      Alert.alert('Error', 'Failed to send quote. Please try again.');
      console.error('Quote error:', error);
    } else {
      Alert.alert(
        'Quote Sent!',
        'Your quote has been sent to the customer. You will be notified if they accept.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    }
  };

  const formatBudget = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Budget flexible';
    if (min && max) return `$${min} - $${max}`;
    if (min) return `From $${min}`;
    if (max) return `Up to $${max}`;
    return 'Budget flexible';
  };

  const updateMessage = (newPrice: string) => {
    const priceNum = Number(newPrice);
    if (!isNaN(priceNum) && priceNum > 0) {
      setMessage(`I'd like to quote ${formatCurrency(priceNum)} for this job. I have experience in this area and can deliver quality work on time.`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={64} color={colors.error} />
        <Text style={styles.errorText}>Job not found</Text>
        <Button title="Go Back" onPress={() => router.back()} variant="outline" />
      </View>
    );
  }

  const priceNum = Number(price);
  const isWithinBudget = !job.budget_max || priceNum <= job.budget_max;
  const isAboveBudget = job.budget_max && priceNum > job.budget_max;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Quote</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xxl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Job Summary</Text>
          <View style={styles.jobCard}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <View style={styles.jobDetails}>
              <View style={styles.jobDetailRow}>
                <DollarSign size={16} color={colors.textSecondary} />
                <Text style={styles.jobDetailText}>{formatBudget(job.budget_min, job.budget_max)}</Text>
              </View>
              <View style={styles.jobDetailRow}>
                <Calendar size={16} color={colors.textSecondary} />
                <Text style={styles.jobDetailText}>
                  {new Date(job.execution_date_start).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              {job.estimated_duration_hours && (
                <View style={styles.jobDetailRow}>
                  <Clock size={16} color={colors.textSecondary} />
                  <Text style={styles.jobDetailText}>{job.estimated_duration_hours}h estimated</Text>
                </View>
              )}
              <View style={styles.jobDetailRow}>
                <MapPin size={16} color={colors.textSecondary} />
                <Text style={styles.jobDetailText} numberOfLines={1}>
                  {job.location}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Quote Price</Text>
          <View style={styles.priceInputContainer}>
            <DollarSign size={24} color={colors.textSecondary} />
            <TextInput
              style={styles.priceInput}
              placeholder="0.00"
              placeholderTextColor={colors.textLight}
              value={price}
              onChangeText={(text) => {
                setPrice(text);
                updateMessage(text);
              }}
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>

          {priceNum > 0 && job.budget_max && (
            <View style={[
              styles.budgetIndicator,
              isWithinBudget ? styles.budgetIndicatorGood : styles.budgetIndicatorWarning
            ]}>
              {isWithinBudget ? (
                <CheckCircle size={16} color={colors.success} />
              ) : (
                <AlertCircle size={16} color={colors.warning} />
              )}
              <Text style={[
                styles.budgetIndicatorText,
                isWithinBudget ? styles.budgetIndicatorTextGood : styles.budgetIndicatorTextWarning
              ]}>
                {isWithinBudget
                  ? `Within customer's budget`
                  : `${Math.round(((priceNum - job.budget_max) / job.budget_max) * 100)}% above customer's max budget`
                }
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Message to Customer (Optional)</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="Tell the customer why you're the best fit for this job..."
            placeholderTextColor={colors.textLight}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.infoBox}>
          <AlertCircle size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Your quote will be sent to {job.customer.full_name}. They will review all quotes and may contact you for more details before accepting.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Button
          title="Send Quote"
          onPress={handleSubmitQuote}
          loading={submitting}
          disabled={!price || isNaN(priceNum) || priceNum <= 0 || submitting}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.error,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  jobCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  jobTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  jobDetails: {
    gap: spacing.sm,
  },
  jobDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  jobDetailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadows.sm,
  },
  priceInput: {
    flex: 1,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  budgetIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  budgetIndicatorGood: {
    backgroundColor: colors.success + '15',
  },
  budgetIndicatorWarning: {
    backgroundColor: colors.warning + '15',
  },
  budgetIndicatorText: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  budgetIndicatorTextGood: {
    color: colors.success,
  },
  budgetIndicatorTextWarning: {
    color: colors.warning,
  },
  messageInput: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 120,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
