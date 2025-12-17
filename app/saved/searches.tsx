import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import SavedSearchesList from '@/components/SavedSearchesList';
import { colors, fontSize, fontWeight } from '@/constants/theme';

export default function SavedSearchesScreen() {
  const router = useRouter();

  const handleCreatePress = () => {
    router.push('/create-saved-search' as any);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Saved Searches',
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
        <SavedSearchesList onCreatePress={handleCreatePress} />
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
