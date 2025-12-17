import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { PhoneVerificationInput } from '@/components/PhoneVerificationInput';
import { colors } from '@/constants/theme';

export default function PhoneVerificationScreen() {
  const handleVerified = (phoneNumber: string) => {
    console.log('Phone verified:', phoneNumber);
    router.back();
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Phone Verification',
          headerShown: true,
        }}
      />
      <PhoneVerificationInput onVerified={handleVerified} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
});
