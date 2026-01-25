import React, { useState, useMemo } from 'react';
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

  const cachedUri = useMemo(() => {
    if (!uri) return null;
    return uri;
  }, [uri]);

  if (!cachedUri || imageError) {
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
      source={{ uri: cachedUri }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
      onError={() => setImageError(true)}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
