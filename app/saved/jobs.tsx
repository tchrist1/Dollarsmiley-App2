import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Stack } from 'expo-router';
import SavedJobsList from '@/components/SavedJobsList';
import { colors, spacing, fontSize, fontWeight } from '@/constants/theme';

export default function SavedJobsScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Saved Jobs',
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.white,
          },
          headerTintColor: colors.text,
          headerTitleStyle: {
            fontWeight: fontWeight.bold,
            fontSize: fontSize.lg,
          },
        }}
      />
      <View style={styles.container}>
        <SavedJobsList />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
