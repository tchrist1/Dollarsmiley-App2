import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Animated } from 'react-native';
import { Star, MapPin } from 'lucide-react-native';
import { router } from 'expo-router';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { formatCurrency, formatDistance, formatRating } from '@/lib/currency-utils';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 3) / 2;

interface CompactListingCardProps {
  id: string;
  title: string;
  price?: number;
  image_url?: string;
  provider_name?: string;
  provider_avatar?: string;
  rating?: number;
  rating_count?: number;
  listing_type?: string;
  location?: string;
  distance_miles?: number | null;
  customWidth?: number;
  description?: string;
}

const getServiceEmoji = (title: string, description?: string, listingType?: string): string => {
  const text = (title + ' ' + (description || '')).toLowerCase();

  const serviceMap: { [key: string]: string } = {
    'wedding': '💒', 'balloon': '🎈', 'flower': '💐', 'cake': '🎂',
    'photo': '📸', 'video': '🎥', 'dj': '🎧', 'music': '🎵',
    'makeup': '💄', 'hair': '💇', 'braid': '💇‍♀️', 'nail': '💅',
    'massage': '💆', 'spa': '🧖', 'fitness': '🏋️', 'gym': '💪',
    'yoga': '🧘', 'clean': '🧹', 'plumb': '🔧', 'electric': '💡',
    'paint': '🎨', 'carpenter': '🪚', 'handyman': '🔧', 'repair': '🔨',
    'garden': '🌱', 'lawn': '🌳', 'landscape': '🌳', 'pest': '🐛',
    'move': '📦', 'transport': '🚚', 'deliver': '📦', 'car': '🚗',
    'auto': '🔧', 'pet': '🐾', 'dog': '🐕', 'cat': '🐈',
    'tutor': '📚', 'teach': '📚', 'lesson': '📚', 'class': '🎓',
    'cook': '👨‍🍳', 'chef': '👨‍🍳', 'cater': '🍽️', 'food': '🍽️',
    'legal': '⚖️', 'lawyer': '⚖️', 'account': '📊', 'tax': '💰',
    'design': '🎨', 'graphic': '🎨', 'web': '💻', 'code': '💻',
    'write': '✍️', 'content': '📝', 'translate': '🌐', 'event': '🎉',
    'party': '🎊', 'decor': '🎨', 'consult': '💼', 'business': '💼',
  };

  for (const [keyword, emoji] of Object.entries(serviceMap)) {
    if (text.includes(keyword)) {
      return emoji;
    }
  }

  return listingType === 'Job' ? '💼' : '🛠️';
};

export const CompactListingCard = memo(function CompactListingCard({
  id,
  title,
  price,
  image_url,
  provider_name,
  provider_avatar,
  rating,
  rating_count,
  listing_type,
  location,
  distance_miles,
  customWidth,
  description,
}: CompactListingCardProps) {
  const cardWidth = customWidth || CARD_WIDTH;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageOpacity] = useState(new Animated.Value(0));

  const handleImageLoad = () => {
    setImageLoaded(true);
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      style={[styles.card, { width: cardWidth }]}
      onPress={() => router.push(`/listing/${id}`)}
      activeOpacity={0.7}
    >
      {image_url && typeof image_url === 'string' ? (
        <View style={styles.imageContainer}>
          {!imageLoaded && (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderEmoji}>
                {getServiceEmoji(title, description, listing_type)}
              </Text>
            </View>
          )}
          <Animated.Image
            source={{ uri: image_url }}
            style={[styles.image, { opacity: imageOpacity }]}
            resizeMode="cover"
            onLoad={handleImageLoad}
            progressiveRenderingEnabled={true}
            fadeDuration={0}
          />
        </View>
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderEmoji}>
            {getServiceEmoji(title, description, listing_type)}
          </Text>
        </View>
      )}

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
          {title}
        </Text>

        {price !== undefined && (
          <Text style={styles.price}>{formatCurrency(price)}</Text>
        )}

        {(() => {
          const ratingInfo = formatRating(rating, rating_count);
          return ratingInfo.display && (
            <View style={styles.ratingContainer}>
              <Star size={12} fill={colors.warning} color={colors.warning} />
              <Text style={styles.rating}>{ratingInfo.text}</Text>
            </View>
          );
        })()}

        {provider_name && (
          <View style={styles.providerContainer}>
            {provider_avatar ? (
              <Image source={{ uri: provider_avatar }} style={styles.providerAvatar} />
            ) : (
              <View style={styles.providerAvatarPlaceholder}>
                <Text style={styles.providerAvatarText}>
                  {provider_name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.provider} numberOfLines={1}>
              {provider_name}
            </Text>
          </View>
        )}

        {location && (
          <View style={styles.locationContainer}>
            <MapPin size={10} color={colors.textSecondary} />
            <Text style={styles.location} numberOfLines={1}>
              {location}
            </Text>
          </View>
        )}

        {formatDistance(distance_miles) && (
          <View style={styles.distanceContainer}>
            <Text style={styles.distance}>
              {formatDistance(distance_miles)}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push(`/listing/${id}`)}
        >
          <Text style={styles.buttonText}>
            {listing_type === 'Job' ? 'Apply' : 'Book'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border + '30',
    overflow: 'hidden',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: colors.surface,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  imagePlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 64,
  },
  content: {
    padding: spacing.md,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: 20,
    letterSpacing: -0.3,
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.success,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  rating: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginLeft: spacing.xxs,
  },
  providerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  providerAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  providerAvatarPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerAvatarText: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  provider: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    flex: 1,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  location: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginLeft: spacing.xxs,
    flex: 1,
  },
  distanceContainer: {
    marginBottom: spacing.xs,
  },
  distance: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.2,
  },
});
