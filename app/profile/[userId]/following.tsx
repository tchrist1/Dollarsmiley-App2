import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import FollowerFollowingList from '@/components/FollowerFollowingList';
import { colors } from '@/constants/theme';

export default function FollowingScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();

  if (!userId) {
    return null;
  }

  const handleUserPress = (selectedUserId: string) => {
    router.push(`/profile/${selectedUserId}`);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Following',
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.white,
          },
          headerTintColor: colors.text,
        }}
      />
      <FollowerFollowingList
        userId={userId}
        type="following"
        onUserPress={handleUserPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
});
