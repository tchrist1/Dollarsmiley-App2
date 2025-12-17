import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, MapPin, Sparkles } from 'lucide-react-native';
import { spacing, borderRadius } from '@/constants/theme';

const { width } = Dimensions.get('window');

const BRAND_COLORS = {
  primaryGreen: '#006634',
  accentYellow: '#FFC72C',
  softGreen: '#E8F5F0',
  white: '#FFFFFF',
  darkGrey: '#333333',
};

interface BannerSlide {
  id: string;
  title: string;
  subtitle: string;
  backgroundColor: string;
  gradientColors: string[];
  textColor: string;
  subtitleColor: string;
  icon: 'shield' | 'pin' | 'sparkles';
}

const BANNER_SLIDES: BannerSlide[] = [
  {
    id: '1',
    title: 'Book With Confidence',
    subtitle: 'All providers verified. Secure payments. Outstanding service guaranteed.',
    backgroundColor: BRAND_COLORS.softGreen,
    gradientColors: [BRAND_COLORS.softGreen, BRAND_COLORS.softGreen],
    textColor: BRAND_COLORS.primaryGreen,
    subtitleColor: BRAND_COLORS.darkGrey,
    icon: 'shield',
  },
  {
    id: '2',
    title: 'Find Local Pros in Minutes',
    subtitle: 'Fast booking for cleaning, handyman, beauty, events, and more.',
    backgroundColor: BRAND_COLORS.white,
    gradientColors: [BRAND_COLORS.white, '#FFF9E6'],
    textColor: BRAND_COLORS.primaryGreen,
    subtitleColor: BRAND_COLORS.darkGrey,
    icon: 'pin',
  },
  {
    id: '3',
    title: 'Smarter Way to Book Services',
    subtitle: 'Personalized recommendations and instant scheduling—just for you.',
    backgroundColor: BRAND_COLORS.primaryGreen,
    gradientColors: [BRAND_COLORS.primaryGreen, '#008844'],
    textColor: BRAND_COLORS.white,
    subtitleColor: BRAND_COLORS.white,
    icon: 'sparkles',
  },
];

interface AdminBannerProps {
  autoRotate?: boolean;
  interval?: number;
}

export default function AdminBanner({ autoRotate = true, interval = 4500 }: AdminBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const iconScaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!autoRotate) return;

    const timer = setInterval(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -20,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % BANNER_SLIDES.length);

        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, interval);

    return () => clearInterval(timer);
  }, [autoRotate, interval]);

  useEffect(() => {
    const iconAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(iconScaleAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(iconScaleAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    iconAnimation.start();

    return () => iconAnimation.stop();
  }, []);

  const currentSlide = BANNER_SLIDES[currentIndex];

  const renderIcon = () => {
    const iconProps = {
      size: 40,
      color: currentSlide.textColor,
      strokeWidth: 2.5,
    };

    const AnimatedIcon = Animated.createAnimatedComponent(View);

    return (
      <AnimatedIcon style={{ transform: [{ scale: iconScaleAnim }] }}>
        {currentSlide.icon === 'shield' && <Shield {...iconProps} />}
        {currentSlide.icon === 'pin' && <MapPin {...iconProps} />}
        {currentSlide.icon === 'sparkles' && <Sparkles {...iconProps} />}
      </AnimatedIcon>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.bannerCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={currentSlide.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.contentContainer}>
            <View style={styles.iconContainer}>{renderIcon()}</View>
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: currentSlide.textColor }]}>
                {currentSlide.title}
              </Text>
              <Text style={[styles.subtitle, { color: currentSlide.subtitleColor }]}>
                {currentSlide.subtitle}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <View style={styles.pagination}>
        {BANNER_SLIDES.map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.paginationDot,
              index === currentIndex && styles.paginationDotActive,
              {
                opacity: index === currentIndex ? 1 : 0.4,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  bannerCard: {
    width: '100%',
    height: 160,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    opacity: 0.9,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D0D0D0',
    transition: 'all 0.3s ease',
  },
  paginationDotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND_COLORS.primaryGreen,
  },
});
