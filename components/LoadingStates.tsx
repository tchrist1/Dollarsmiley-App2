/**
 * Loading States and Skeleton Screens
 *
 * Provides consistent loading experiences across the app
 */

import React from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({ width: w = '100%', height = 20, borderRadius = 4, style }: SkeletonProps) {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: w,
          height,
          borderRadius,
          backgroundColor: '#E0E0E0',
          opacity,
        },
        style,
      ]}
    />
  );
}

export function ListingCardSkeleton() {
  return (
    <View style={styles.listingCard}>
      <Skeleton width="100%" height={200} borderRadius={12} />
      <View style={styles.cardContent}>
        <Skeleton width="80%" height={24} />
        <Skeleton width="60%" height={16} style={{ marginTop: 8 }} />
        <View style={styles.cardFooter}>
          <Skeleton width={80} height={20} />
          <Skeleton width={60} height={20} />
        </View>
      </View>
    </View>
  );
}

export function BookingCardSkeleton() {
  return (
    <View style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <Skeleton width={60} height={60} borderRadius={30} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Skeleton width="70%" height={20} />
          <Skeleton width="50%" height={16} style={{ marginTop: 6 }} />
        </View>
      </View>
      <View style={styles.divider} />
      <Skeleton width="100%" height={16} />
      <Skeleton width="80%" height={16} style={{ marginTop: 8 }} />
      <View style={styles.bookingFooter}>
        <Skeleton width={100} height={32} borderRadius={16} />
        <Skeleton width={80} height={20} />
      </View>
    </View>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <View style={styles.profileHeader}>
      <Skeleton width={100} height={100} borderRadius={50} />
      <Skeleton width={200} height={28} style={{ marginTop: 16 }} />
      <Skeleton width={150} height={16} style={{ marginTop: 8 }} />
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Skeleton width={60} height={24} />
          <Skeleton width={80} height={14} style={{ marginTop: 4 }} />
        </View>
        <View style={styles.statItem}>
          <Skeleton width={60} height={24} />
          <Skeleton width={80} height={14} style={{ marginTop: 4 }} />
        </View>
        <View style={styles.statItem}>
          <Skeleton width={60} height={24} />
          <Skeleton width={80} height={14} style={{ marginTop: 4 }} />
        </View>
      </View>
    </View>
  );
}

export function CartItemSkeleton() {
  return (
    <View style={styles.cartItem}>
      <Skeleton width={80} height={80} borderRadius={8} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Skeleton width="80%" height={20} />
        <Skeleton width="60%" height={16} style={{ marginTop: 6 }} />
        <Skeleton width={100} height={24} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function MessageSkeleton() {
  return (
    <View style={styles.message}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="90%" height={14} style={{ marginTop: 6 }} />
      </View>
      <Skeleton width={60} height={12} />
    </View>
  );
}

export function NotificationSkeleton() {
  return (
    <View style={styles.notification}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Skeleton width="80%" height={16} />
        <Skeleton width="100%" height={14} style={{ marginTop: 6 }} />
        <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export function TransactionSkeleton() {
  return (
    <View style={styles.transaction}>
      <Skeleton width={48} height={48} borderRadius={8} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Skeleton width="70%" height={18} />
        <Skeleton width="50%" height={14} style={{ marginTop: 6 }} />
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Skeleton width={80} height={20} />
        <Skeleton width={60} height={14} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

export function SearchResultsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.searchResults}>
      {Array.from({ length: count }).map((_, index) => (
        <ListingCardSkeleton key={index} />
      ))}
    </View>
  );
}

export function GridSkeleton({ columns = 2, rows = 3 }: { columns?: number; rows?: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: rows * columns }).map((_, index) => (
        <View key={index} style={[styles.gridItem, { width: `${100 / columns}%` }]}>
          <Skeleton width="90%" height={150} borderRadius={12} />
          <Skeleton width="80%" height={16} style={{ marginTop: 8 }} />
          <Skeleton width="60%" height={14} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  );
}

export function FormSkeleton() {
  return (
    <View style={styles.form}>
      <Skeleton width="30%" height={16} style={{ marginBottom: 8 }} />
      <Skeleton width="100%" height={48} borderRadius={8} style={{ marginBottom: 24 }} />

      <Skeleton width="30%" height={16} style={{ marginBottom: 8 }} />
      <Skeleton width="100%" height={48} borderRadius={8} style={{ marginBottom: 24 }} />

      <Skeleton width="30%" height={16} style={{ marginBottom: 8 }} />
      <Skeleton width="100%" height={120} borderRadius={8} style={{ marginBottom: 24 }} />

      <Skeleton width="100%" height={48} borderRadius={24} />
    </View>
  );
}

export function FullScreenLoading() {
  const rotation = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.fullScreenLoading}>
      <Animated.View style={[styles.spinner, { transform: [{ rotate }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  listingCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    padding: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  bookingCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFF',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 24,
    width: '100%',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  cartItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 12,
  },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  notification: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 8,
  },
  transaction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginBottom: 12,
  },
  searchResults: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  gridItem: {
    padding: 8,
  },
  form: {
    padding: 16,
  },
  fullScreenLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  spinner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: '#E0E0E0',
    borderTopColor: '#007AFF',
  },
});
