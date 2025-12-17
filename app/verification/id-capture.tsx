import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import { IDVerificationFlow } from '@/components/IDVerificationFlow';
import { colors } from '@/constants/theme';

export default function IDCaptureScreen() {
  const [submitting, setSubmitting] = useState(false);

  const handleComplete = async (data: {
    frontPhoto: string;
    backPhoto: string;
    selfiePhoto: string;
  }) => {
    setSubmitting(true);

    try {
      // Here you would:
      // 1. Upload photos to Supabase Storage
      // 2. Create verification record
      // 3. Trigger verification process (Stripe Identity or manual review)

      console.log('ID Verification Data:', {
        frontPhoto: data.frontPhoto.substring(0, 50) + '...',
        backPhoto: data.backPhoto.substring(0, 50) + '...',
        selfiePhoto: data.selfiePhoto.substring(0, 50) + '...',
      });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      Alert.alert(
        'Verification Submitted',
        'Your ID verification has been submitted. We\'ll review it and notify you within 24 hours.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel Verification', 'Are you sure you want to cancel?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: () => router.back(),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <IDVerificationFlow onComplete={handleComplete} onCancel={handleCancel} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
});
