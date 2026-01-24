import React, { useState } from 'react';
import { Image, ImageProps, View, StyleSheet } from 'react-native';
import { User } from 'lucide-react-native';

interface CachedAvatarProps extends Omit<ImageProps, 'source'> {
  uri: string | null | undefined;
  size?: number;
  fallbackColor?: string;
  fallbackIconSize?: number;
}

export default function CachedAvatar({
  uri,
  size = 48,
  fallbackColor = '#EEE',
  fallbackIconSize = 24,
  style,
  ...props
}: CachedAvatarProps) {
  const [imageError, setImageError] = useState(false);

  if (!uri || imageError) {
    return (
      <View
        style={[
          styles.fallback,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: fallbackColor,
          },
          style,
        ]}
      >
        <User size={fallbackIconSize} color="#999" />
      </View>
    );
  }

  return (
    <Image
      {...props}
      source={{
        uri,
        cache: 'force-cache'
      }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
      onError={() => setImageError(true)}
      // Prevent re-downloading on re-mount
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
