import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Dimensions,
  Linking,
  Animated,
} from 'react-native';
import {
  Navigation,
  MapPin,
  Clock,
  Car,
  ChevronRight,
  Phone,
  MessageCircle,
  AlertCircle,
  CheckCircle,
  Circle,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { BrandedVehicleMarker, StaticVehicleMarker } from './BrandedVehicleMarker';
import { supabase } from '@/lib/supabase';

interface Trip {
  id: string;
  booking_id: string;
  leg_number: number;
  total_legs: number;
  mover_id: string;
  mover_type: 'provider' | 'customer';
  trip_type: string;
  service_type: 'job' | 'service' | 'custom_service';
  origin_address?: string;
  origin_latitude?: number;
  origin_longitude?: number;
  destination_address: string;
  destination_latitude: number;
  destination_longitude: number;
  current_latitude?: number;
  current_longitude?: number;
  current_heading?: number;
  last_location_update_at?: string;
  trip_status: 'not_started' | 'on_the_way' | 'arriving_soon' | 'arrived' | 'completed' | 'canceled';
  started_at?: string;
  arrived_at?: string;
  estimated_arrival_time?: string;
  estimated_distance_meters?: number;
  estimated_duration_seconds?: number;
}

interface MoverInfo {
  id: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
}

interface LiveTripTrackerProps {
  tripId: string;
  moverInfo?: MoverInfo;
  isViewer?: boolean;
  onContactPress?: () => void;
  onNavigatePress?: () => void;
  showFullMap?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LiveTripTracker({
  tripId,
  moverInfo,
  isViewer = true,
  onContactPress,
  onNavigatePress,
  showFullMap = false,
}: LiveTripTrackerProps) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchTrip();

    const channel = supabase
      .channel(`trip:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId}`,
        },
        (payload) => {
          setTrip(payload.new as Trip);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  useEffect(() => {
    if (trip) {
      const progress = getProgressPercentage(trip.trip_status);
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [trip?.trip_status]);

  const fetchTrip = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (fetchError) throw fetchError;
      setTrip(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (status: string): number => {
    switch (status) {
      case 'not_started': return 0;
      case 'on_the_way': return 0.4;
      case 'arriving_soon': return 0.75;
      case 'arrived': return 0.95;
      case 'completed': return 1;
      default: return 0;
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'not_started':
        return {
          label: 'Waiting to start',
          color: colors.gray500,
          icon: Circle,
        };
      case 'on_the_way':
        return {
          label: 'On the way',
          color: colors.info,
          icon: Car,
        };
      case 'arriving_soon':
        return {
          label: 'Arriving soon',
          color: colors.warning,
          icon: Navigation,
        };
      case 'arrived':
        return {
          label: 'Arrived',
          color: colors.success,
          icon: CheckCircle,
        };
      case 'completed':
        return {
          label: 'Completed',
          color: colors.success,
          icon: CheckCircle,
        };
      case 'canceled':
        return {
          label: 'Canceled',
          color: colors.error,
          icon: AlertCircle,
        };
      default:
        return {
          label: 'Unknown',
          color: colors.gray500,
          icon: Circle,
        };
    }
  };

  const formatETA = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.max(0, Math.round(diffMs / 60000));

    if (diffMins < 1) return 'Less than a minute';
    if (diffMins === 1) return '1 minute';
    if (diffMins < 60) return `${diffMins} minutes`;

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters}m`;
    const km = (meters / 1000).toFixed(1);
    return `${km} km`;
  };

  const getTimeSinceUpdate = () => {
    if (!trip?.last_location_update_at) return null;
    const lastUpdate = new Date(trip.last_location_update_at);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

    if (diffSec < 10) return null;
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    return `${diffMin}m ago`;
  };

  const openNavigation = () => {
    if (!trip) return;

    const { destination_latitude, destination_longitude, destination_address } = trip;
    const encodedAddress = encodeURIComponent(destination_address);

    if (Platform.OS === 'ios') {
      Linking.openURL(`maps://app?daddr=${destination_latitude},${destination_longitude}&q=${encodedAddress}`);
    } else if (Platform.OS === 'android') {
      Linking.openURL(`google.navigation:q=${destination_latitude},${destination_longitude}`);
    } else {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination_latitude},${destination_longitude}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading trip...</Text>
      </View>
    );
  }

  if (error || !trip) {
    return (
      <View style={styles.errorContainer}>
        <AlertCircle size={40} color={colors.error} />
        <Text style={styles.errorText}>{error || 'Trip not found'}</Text>
      </View>
    );
  }

  const statusInfo = getStatusInfo(trip.trip_status);
  const StatusIcon = statusInfo.icon;
  const timeSinceUpdate = getTimeSinceUpdate();
  const isActive = ['on_the_way', 'arriving_soon'].includes(trip.trip_status);
  const vehicleStatus = timeSinceUpdate && parseInt(timeSinceUpdate) > 30
    ? 'signal_lost'
    : trip.trip_status as any;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, showFullMap && styles.fullMap]}>
      {showFullMap && Platform.OS !== 'web' ? (
        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderText}>Map View</Text>
            {isActive && trip.current_latitude && trip.current_longitude && (
              <View style={styles.vehicleOnMap}>
                <BrandedVehicleMarker
                  serviceType={trip.service_type}
                  profilePhoto={moverInfo?.avatar_url}
                  profileName={moverInfo?.full_name}
                  heading={trip.current_heading || 0}
                  status={vehicleStatus}
                  lastUpdateTime={trip.last_location_update_at ? new Date(trip.last_location_update_at) : undefined}
                />
              </View>
            )}
          </View>
        </View>
      ) : null}

      <View style={styles.infoPanel}>
        {trip.total_legs > 1 && (
          <View style={styles.legIndicator}>
            <Text style={styles.legText}>
              Leg {trip.leg_number} of {trip.total_legs}
            </Text>
          </View>
        )}

        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '20' }]}>
            <StatusIcon size={16} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>

          {timeSinceUpdate && (
            <View style={styles.lastUpdateBadge}>
              <Clock size={12} color={colors.gray500} />
              <Text style={styles.lastUpdateText}>Updated {timeSinceUpdate}</Text>
            </View>
          )}
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                { width: progressWidth, backgroundColor: statusInfo.color }
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabel}>Start</Text>
            <Text style={styles.progressLabel}>Destination</Text>
          </View>
        </View>

        {moverInfo && (
          <View style={styles.moverInfo}>
            <View style={styles.moverAvatar}>
              <StaticVehicleMarker
                serviceType={trip.service_type}
                profilePhoto={moverInfo.avatar_url}
                profileName={moverInfo.full_name}
                status={vehicleStatus}
              />
            </View>
            <View style={styles.moverDetails}>
              <Text style={styles.moverName}>{moverInfo.full_name}</Text>
              <Text style={styles.moverRole}>
                {trip.mover_type === 'provider' ? 'Service Provider' : 'Customer'}
              </Text>
            </View>
            {onContactPress && (
              <TouchableOpacity
                style={styles.contactButton}
                onPress={onContactPress}
              >
                <MessageCircle size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.tripDetails}>
          <View style={styles.detailRow}>
            <MapPin size={16} color={colors.primary} />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Destination</Text>
              <Text style={styles.detailValue} numberOfLines={2}>
                {trip.destination_address}
              </Text>
            </View>
          </View>

          {trip.estimated_arrival_time && isActive && (
            <View style={styles.detailRow}>
              <Clock size={16} color={colors.info} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Estimated Arrival</Text>
                <Text style={styles.detailValue}>
                  {formatETA(trip.estimated_arrival_time)}
                </Text>
              </View>
            </View>
          )}

          {trip.estimated_distance_meters && isActive && (
            <View style={styles.detailRow}>
              <Navigation size={16} color={colors.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Distance Remaining</Text>
                <Text style={styles.detailValue}>
                  {formatDistance(trip.estimated_distance_meters)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {!isViewer && isActive && (
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={onNavigatePress || openNavigation}
          >
            <Navigation size={20} color={colors.white} />
            <Text style={styles.navigateButtonText}>Navigate</Text>
            <ChevronRight size={20} color={colors.white} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export function TripNotAvailable() {
  return (
    <View style={styles.notAvailableContainer}>
      <Car size={40} color={colors.gray400} />
      <Text style={styles.notAvailableTitle}>Tracking not available yet</Text>
      <Text style={styles.notAvailableText}>
        Trip tracking will be available once the service provider starts traveling.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  fullMap: {
    flex: 1,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  errorContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: 'center',
  },
  mapContainer: {
    height: 250,
    backgroundColor: colors.gray100,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  mapPlaceholderText: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  vehicleOnMap: {
    position: 'absolute',
  },
  infoPanel: {
    padding: spacing.md,
  },
  legIndicator: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  legText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  lastUpdateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  lastUpdateText: {
    fontSize: fontSize.xs,
    color: colors.gray500,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.gray200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  progressLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  moverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  moverAvatar: {
    marginRight: spacing.md,
  },
  moverDetails: {
    flex: 1,
  },
  moverName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  moverRole: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  contactButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripDetails: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  navigateButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
    flex: 1,
    textAlign: 'center',
  },
  notAvailableContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.lg,
  },
  notAvailableTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.md,
  },
  notAvailableText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
