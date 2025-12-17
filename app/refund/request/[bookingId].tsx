import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import RefundRequestForm from '@/components/RefundRequestForm';
import { colors, spacing, fontSize, fontWeight } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function RefundRequestScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { user } = useAuth();

  if (!user || !bookingId) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Invalid request</Text>
      </View>
    );
  }

  const handleSuccess = (refundId: string) => {
    router.replace(`/refund/status/${refundId}`);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Request Refund</Text>
        <View style={styles.placeholder} />
      </View>

      <RefundRequestForm
        bookingId={bookingId}
        userId={user.id}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </View>
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
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  errorText: {
    fontSize: fontSize.lg,
    color: colors.error,
    textAlign: 'center',
    padding: spacing.xl,
  },
});
