import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  AlertCircle,
  CreditCard,
  User,
  Calendar,
  DollarSign,
  Shield,
  Lightbulb,
  HelpCircle,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import Input from '@/components/Input';
import TextArea from '@/components/TextArea';
import Button from '@/components/Button';
import {
  createSupportTicket,
  type SupportCategory,
  type SupportPriority,
  getCategoryLabel,
  getPriorityLabel,
} from '@/lib/priority-support';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';

export default function CreateTicketScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SupportCategory>('other');
  const [priority, setPriority] = useState<SupportPriority>('normal');

  const categories: SupportCategory[] = [
    'technical',
    'billing',
    'account',
    'booking',
    'payments',
    'verification',
    'feature_request',
    'other',
  ];

  const priorities: SupportPriority[] = ['low', 'normal', 'high', 'urgent'];

  const getCategoryIcon = (cat: SupportCategory) => {
    switch (cat) {
      case 'technical':
        return <AlertCircle size={20} color={colors.error} />;
      case 'billing':
        return <CreditCard size={20} color={colors.success} />;
      case 'account':
        return <User size={20} color={colors.primary} />;
      case 'booking':
        return <Calendar size={20} color={colors.info} />;
      case 'payments':
        return <DollarSign size={20} color={colors.warning} />;
      case 'verification':
        return <Shield size={20} color={colors.success} />;
      case 'feature_request':
        return <Lightbulb size={20} color={colors.warning} />;
      default:
        return <HelpCircle size={20} color={colors.textSecondary} />;
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to create a ticket');
      return;
    }

    if (!subject.trim()) {
      Alert.alert('Error', 'Please enter a subject');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please describe your issue');
      return;
    }

    setLoading(true);

    try {
      await createSupportTicket(user.id, {
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
      });

      Alert.alert(
        'Success',
        'Your support ticket has been created. Our team will respond shortly.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      Alert.alert('Error', error.message || 'Failed to create support ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Create Support Ticket',
          headerShown: true,
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoCard}>
          <AlertCircle size={24} color={colors.info} />
          <Text style={styles.infoText}>
            Our support team typically responds within 24 hours. Premium users receive priority
            support with faster response times.
          </Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Subject</Text>
          <Input
            placeholder="Brief description of your issue"
            value={subject}
            onChangeText={setSubject}
            maxLength={100}
          />
          <Text style={styles.helperText}>{subject.length}/100 characters</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Category</Text>
          <View style={styles.categoriesGrid}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryCard,
                  category === cat && styles.categoryCardActive,
                ]}
                onPress={() => setCategory(cat)}
              >
                <View
                  style={[
                    styles.categoryIcon,
                    category === cat && styles.categoryIconActive,
                  ]}
                >
                  {getCategoryIcon(cat)}
                </View>
                <Text
                  style={[
                    styles.categoryLabel,
                    category === cat && styles.categoryLabelActive,
                  ]}
                  numberOfLines={2}
                >
                  {getCategoryLabel(cat)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Priority</Text>
          <Text style={styles.helperText}>
            Select the urgency level. High and urgent priorities are for critical issues only.
          </Text>
          <View style={styles.priorityButtons}>
            {priorities.map(prio => (
              <TouchableOpacity
                key={prio}
                style={[
                  styles.priorityButton,
                  priority === prio && styles.priorityButtonActive,
                ]}
                onPress={() => setPriority(prio)}
              >
                <Text
                  style={[
                    styles.priorityButtonText,
                    priority === prio && styles.priorityButtonTextActive,
                  ]}
                >
                  {getPriorityLabel(prio)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.helperText}>
            Please provide as much detail as possible to help us resolve your issue quickly.
          </Text>
          <TextArea
            placeholder="Describe your issue in detail..."
            value={description}
            onChangeText={setDescription}
            minHeight={150}
            maxLength={2000}
          />
          <Text style={styles.helperText}>{description.length}/2000 characters</Text>
        </View>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips for faster resolution:</Text>
          <View style={styles.tipsList}>
            <Text style={styles.tipItem}>• Be specific about the issue you're experiencing</Text>
            <Text style={styles.tipItem}>• Include error messages if any</Text>
            <Text style={styles.tipItem}>• Mention steps to reproduce the problem</Text>
            <Text style={styles.tipItem}>• Add relevant booking IDs or transaction numbers</Text>
          </View>
        </View>

        <Button
          title="Submit Ticket"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || !subject.trim() || !description.trim()}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.info + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  formSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  helperText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  categoryIconActive: {
    backgroundColor: colors.primary + '20',
  },
  categoryLabel: {
    fontSize: fontSize.xs,
    color: colors.text,
    textAlign: 'center',
  },
  categoryLabelActive: {
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  priorityButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  priorityButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  priorityButtonTextActive: {
    color: colors.white,
  },
  tipsCard: {
    backgroundColor: colors.success + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  tipsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tipsList: {
    gap: spacing.xs,
  },
  tipItem: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
