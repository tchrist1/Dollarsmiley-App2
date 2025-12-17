import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { VerificationStatusTracker } from '@/components/VerificationStatusTracker';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing, fontSize, fontWeight } from '@/constants/theme';
import { Plus, FileText } from 'lucide-react-native';

export default function VerificationStatusScreen() {
  const { user } = useAuth();

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Please log in to view verification status</Text>
      </View>
    );
  }

  const handleRequestPress = (request: any) => {
    Alert.alert(
      'Verification Request',
      `Status: ${request.status}\nType: ${request.verification_type}`,
      [
        { text: 'OK' },
        {
          text: 'View Details',
          onPress: () => {
            console.log('View request details:', request);
          },
        },
      ]
    );
  };

  const handleNewVerification = () => {
    router.push('/verification/submit');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Verification Status',
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity onPress={handleNewVerification} style={styles.headerButton}>
              <Plus size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.header}>
        <FileText size={32} color={colors.primary} />
        <Text style={styles.headerTitle}>Verification Status</Text>
        <Text style={styles.headerSubtitle}>
          Track your verification requests in real-time
        </Text>
      </View>

      <VerificationStatusTracker userId={user.id} onRequestPress={handleRequestPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  headerButton: {
    padding: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
    padding: spacing.xl,
  },
});
