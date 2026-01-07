import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MapPin, Navigation, Plus, Minus, Maximize2, List, User, Star, BadgeCheck, Clock, TrendingUp, Award, MessageCircle } from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { MapMarkerPin, MarkerType } from './MapMarkerPin';

interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  price?: number;
  type?: 'listing' | 'provider';
  listingType?: MarkerType;
  subtitle?: string;
  rating?: number;
  isVerified?: boolean;
  reviewCount?: number;
  categories?: string[];
  responseTime?: string;
  completionRate?: number;
  avatarUrl?: string;
}

interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface Cluster {
  id: string;
  latitude: number;
  longitude: number;
  markers: MapMarker[];
  count: number;
}

interface InteractiveMapViewProps {
  markers: MapMarker[];
  onMarkerPress?: (marker: MapMarker) => void;
  initialRegion?: MapRegion;
  style?: any;
  showControls?: boolean;
  onSwitchToList?: () => void;
  enableClustering?: boolean;
  clusterRadius?: number;
}

const { width, height } = Dimensions.get('window');

export default function InteractiveMapView({
  markers,
  onMarkerPress,
  initialRegion,
  style,
  showControls = true,
  onSwitchToList,
  enableClustering = true,
  clusterRadius = 60,
}: InteractiveMapViewProps) {
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const [region, setRegion] = useState<MapRegion>(
    initialRegion || {
      latitude: markers[0]?.latitude || 40.7128,
      longitude: markers[0]?.longitude || -74.006,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    }
  );
  const [mapLoaded, setMapLoaded] = useState(false);

  const mapContainerRef = useRef<View>(null);

  useEffect(() => {
    if (markers.length > 0 && !initialRegion) {
      const bounds = calculateBounds(markers);
      setRegion(bounds);
    }
    // Set map as loaded after a short delay
    const timer = setTimeout(() => {
      setMapLoaded(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [markers]);

  const calculateBounds = (points: MapMarker[]): MapRegion => {
    if (points.length === 0) {
      return region;
    }

    let minLat = points[0].latitude;
    let maxLat = points[0].latitude;
    let minLng = points[0].longitude;
    let maxLng = points[0].longitude;

    points.forEach((point) => {
      minLat = Math.min(minLat, point.latitude);
      maxLat = Math.max(maxLat, point.latitude);
      minLng = Math.min(minLng, point.longitude);
      maxLng = Math.max(maxLng, point.longitude);
    });

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latDelta = (maxLat - minLat) * 1.5 || 0.0922;
    const lngDelta = (maxLng - minLng) * 1.5 || 0.0421;

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  };

  const handleZoomIn = () => {
    setRegion((prev) => ({
      ...prev,
      latitudeDelta: prev.latitudeDelta * 0.5,
      longitudeDelta: prev.longitudeDelta * 0.5,
    }));
  };

  const handleZoomOut = () => {
    setRegion((prev) => ({
      ...prev,
      latitudeDelta: prev.latitudeDelta * 2,
      longitudeDelta: prev.longitudeDelta * 2,
    }));
  };

  const handleRecenter = () => {
    if (markers.length > 0) {
      const bounds = calculateBounds(markers);
      setRegion(bounds);
    }
  };

  const handleMarkerPress = (marker: MapMarker) => {
    setSelectedMarker(marker);
    setRegion((prev) => ({
      ...prev,
      latitude: marker.latitude,
      longitude: marker.longitude,
    }));
    onMarkerPress?.(marker);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
    const R = 3959;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    if (distance < 1) {
      return `${(distance * 5280).toFixed(0)} ft`;
    }
    return `${distance.toFixed(1)} mi`;
  };

  const getMarkerPosition = (marker: MapMarker | Cluster) => {
    const latMin = region.latitude - region.latitudeDelta / 2;
    const lngMin = region.longitude - region.longitudeDelta / 2;

    const x = ((marker.longitude - lngMin) / region.longitudeDelta) * width;
    const y = ((region.latitude + region.latitudeDelta / 2 - marker.latitude) / region.latitudeDelta) * (height - 200);

    return { x, y };
  };

  const isMarkerInView = (marker: MapMarker): boolean => {
    const latMin = region.latitude - region.latitudeDelta / 2;
    const latMax = region.latitude + region.latitudeDelta / 2;
    const lngMin = region.longitude - region.longitudeDelta / 2;
    const lngMax = region.longitude + region.longitudeDelta / 2;

    return (
      marker.latitude >= latMin &&
      marker.latitude <= latMax &&
      marker.longitude >= lngMin &&
      marker.longitude <= lngMax
    );
  };

  const getPixelDistance = (marker1: MapMarker, marker2: MapMarker): number => {
    const pos1 = getMarkerPosition(marker1);
    const pos2 = getMarkerPosition(marker2);
    return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
  };

  const clusterMarkers = (markersToCluster: MapMarker[]): (MapMarker | Cluster)[] => {
    if (!enableClustering || region.latitudeDelta < 0.02) {
      return markersToCluster;
    }

    const clusters: Cluster[] = [];
    const processedMarkers = new Set<string>();

    markersToCluster.forEach((marker) => {
      if (processedMarkers.has(marker.id)) return;

      const nearbyMarkers = markersToCluster.filter((otherMarker) => {
        if (processedMarkers.has(otherMarker.id) || marker.id === otherMarker.id) {
          return false;
        }
        const distance = getPixelDistance(marker, otherMarker);
        return distance < clusterRadius;
      });

      if (nearbyMarkers.length > 0) {
        const clusterMarkers = [marker, ...nearbyMarkers];
        const avgLat = clusterMarkers.reduce((sum, m) => sum + m.latitude, 0) / clusterMarkers.length;
        const avgLng = clusterMarkers.reduce((sum, m) => sum + m.longitude, 0) / clusterMarkers.length;

        clusters.push({
          id: `cluster-${marker.id}`,
          latitude: avgLat,
          longitude: avgLng,
          markers: clusterMarkers,
          count: clusterMarkers.length,
        });

        clusterMarkers.forEach((m) => processedMarkers.add(m.id));
      } else {
        processedMarkers.add(marker.id);
      }
    });

    const unclustered = markersToCluster.filter((m) => !processedMarkers.has(m.id));
    return [...clusters, ...unclustered];
  };

  const handleClusterPress = (cluster: Cluster) => {
    setSelectedCluster(cluster);
    setSelectedMarker(null);
    const bounds = calculateBounds(cluster.markers);
    setRegion({
      ...bounds,
      latitudeDelta: bounds.latitudeDelta * 0.5,
      longitudeDelta: bounds.longitudeDelta * 0.5,
    });
  };

  const isCluster = (item: MapMarker | Cluster): item is Cluster => {
    return 'count' in item && 'markers' in item;
  };

  const visibleMarkers = markers.filter(isMarkerInView);
  const clusteredItems = clusterMarkers(visibleMarkers);

  return (
    <View style={[styles.container, style]}>
      {/* Map Canvas */}
      <View style={styles.mapCanvas} ref={mapContainerRef}>
        {/* Grid Background */}
        <View style={styles.gridBackground} pointerEvents="none">
          <View style={styles.gridLines} />
        </View>

        {/* Center Crosshair */}
        <View style={styles.crosshair} pointerEvents="none">
          <View style={styles.crosshairVertical} />
          <View style={styles.crosshairHorizontal} />
        </View>

        {/* Markers and Clusters */}
        {clusteredItems.map((item) => {
          const position = getMarkerPosition(item);

          if (isCluster(item)) {
            const cluster = item;
            const isSelected = selectedCluster?.id === cluster.id;

            return (
              <TouchableOpacity
                key={cluster.id}
                style={[
                  styles.markerContainer,
                  {
                    left: position.x - 25,
                    top: position.y - 25,
                  },
                ]}
                onPress={() => handleClusterPress(cluster)}
                activeOpacity={0.7}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <View style={[styles.clusterMarker, isSelected && styles.clusterMarkerSelected]}>
                  <Text style={styles.clusterCount}>{cluster.count}</Text>
                </View>
              </TouchableOpacity>
            );
          }

          const marker = item;
          const isSelected = selectedMarker?.id === marker.id;
          const isProvider = marker.type === 'provider';

          if (isProvider) {
            return (
              <TouchableOpacity
                key={marker.id}
                style={[
                  styles.markerContainer,
                  {
                    left: position.x - 20,
                    top: position.y - 40,
                  },
                ]}
                onPress={() => handleMarkerPress(marker)}
                activeOpacity={0.7}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <View style={[
                  styles.marker,
                  styles.markerProvider,
                  isSelected && styles.markerProviderSelected
                ]}>
                  <User
                    size={24}
                    color={isSelected ? colors.white : colors.success}
                    strokeWidth={2.5}
                  />
                  {marker.isVerified && (
                    <View style={styles.verifiedBadge}>
                      <BadgeCheck size={12} color={colors.white} fill={colors.success} />
                    </View>
                  )}
                </View>
                {marker.rating !== undefined && marker.rating !== null && (
                  <View style={[styles.markerRatingTag, isSelected && styles.markerRatingTagSelected]}>
                    <Star size={10} color={isSelected ? colors.white : colors.warning} fill={isSelected ? colors.white : colors.warning} />
                    <Text style={[styles.markerRatingText, isSelected && styles.markerRatingTextSelected]}>
                      {Number(marker.rating).toFixed(1)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }

          return (
            <View
              key={marker.id}
              style={[
                styles.markerContainer,
                styles.markerContainerListing,
                {
                  left: position.x - 24,
                  top: position.y - 60,
                },
              ]}
              pointerEvents="box-none"
            >
              <MapMarkerPin
                type={marker.listingType || 'Service'}
                price={marker.price}
                isSelected={isSelected}
                onPress={() => handleMarkerPress(marker)}
              />
            </View>
          );
        })}

        {/* Info Overlay */}
        {!mapLoaded && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading map...</Text>
          </View>
        )}

        {/* Empty State */}
        {mapLoaded && markers.length === 0 && (
          <View style={styles.emptyStateOverlay}>
            <MapPin size={48} color={colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Locations Available</Text>
            <Text style={styles.emptyStateText}>
              Listings don't have location data yet.{'\n'}Try using list or grid view.
            </Text>
          </View>
        )}
      </View>

      {/* Map Controls */}
      {showControls && (
        <View style={styles.controls}>
          <View style={styles.controlsColumn}>
            <TouchableOpacity style={styles.controlButton} onPress={handleZoomIn} activeOpacity={0.7}>
              <Plus size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handleZoomOut} activeOpacity={0.7}>
              <Minus size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handleRecenter} activeOpacity={0.7}>
              <Maximize2 size={20} color={colors.text} />
            </TouchableOpacity>
            {onSwitchToList && (
              <TouchableOpacity
                style={[styles.controlButton, styles.controlButtonPrimary]}
                onPress={onSwitchToList}
                activeOpacity={0.7}
              >
                <List size={20} color={colors.white} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Selected Marker Info */}
      {selectedMarker && (
        <View style={styles.markerInfo}>
          <TouchableOpacity
            style={[
              styles.markerInfoCard,
              selectedMarker.type === 'provider' && styles.markerInfoCardExpanded
            ]}
            onPress={() => onMarkerPress?.(selectedMarker)}
            activeOpacity={0.7}
          >
            {/* Header */}
            <View style={styles.markerInfoHeader}>
              {selectedMarker.type === 'provider' ? (
                <>
                  <User size={18} color={colors.success} />
                  {selectedMarker.isVerified && (
                    <BadgeCheck size={16} color={colors.success} fill={colors.success} />
                  )}
                </>
              ) : (
                <MapPin size={18} color={colors.primary} />
              )}
              <Text style={styles.markerInfoTitle} numberOfLines={1}>
                {selectedMarker.title}
              </Text>
            </View>

            {/* Subtitle */}
            {selectedMarker.subtitle && (
              <Text style={styles.markerInfoSubtitle} numberOfLines={1}>
                {selectedMarker.subtitle}
              </Text>
            )}

            {/* Provider-specific content */}
            {selectedMarker.type === 'provider' ? (
              <>
                {/* Rating and Reviews */}
                {selectedMarker.rating !== undefined && selectedMarker.rating !== null && (
                  <View style={styles.providerRatingRow}>
                    <View style={styles.providerRatingStars}>
                      <Star size={16} color={colors.warning} fill={colors.warning} />
                      <Text style={styles.providerRatingValue}>{Number(selectedMarker.rating).toFixed(1)}</Text>
                    </View>
                    {selectedMarker.reviewCount !== undefined && selectedMarker.reviewCount !== null && (
                      <Text style={styles.providerReviewCount}>
                        ({String(selectedMarker.reviewCount)} {selectedMarker.reviewCount === 1 ? 'review' : 'reviews'})
                      </Text>
                    )}
                  </View>
                )}

                {/* Categories */}
                {selectedMarker.categories && selectedMarker.categories.length > 0 && (
                  <View style={styles.providerCategories}>
                    {selectedMarker.categories.slice(0, 3).map((category, index) => (
                      <View key={index} style={styles.providerCategoryBadge}>
                        <Text style={styles.providerCategoryText}>{String(category || '')}</Text>
                      </View>
                    ))}
                    {selectedMarker.categories.length > 3 && (
                      <Text style={styles.providerCategoryMore}>
                        +{selectedMarker.categories.length - 3}
                      </Text>
                    )}
                  </View>
                )}

                {/* Stats Row */}
                <View style={styles.providerStatsRow}>
                  {selectedMarker.responseTime && (
                    <View style={styles.providerStat}>
                      <Clock size={14} color={colors.textSecondary} />
                      <Text style={styles.providerStatText}>{String(selectedMarker.responseTime)}</Text>
                    </View>
                  )}
                  {selectedMarker.completionRate !== undefined && selectedMarker.completionRate !== null && (
                    <View style={styles.providerStat}>
                      <TrendingUp size={14} color={colors.success} />
                      <Text style={styles.providerStatText}>{String(selectedMarker.completionRate)}% complete</Text>
                    </View>
                  )}
                </View>

                {/* Distance */}
                <View style={styles.providerDistance}>
                  <Navigation size={14} color={colors.primary} />
                  <Text style={styles.providerDistanceText}>
                    {calculateDistance(
                      region.latitude,
                      region.longitude,
                      selectedMarker.latitude,
                      selectedMarker.longitude
                    )} away
                  </Text>
                </View>

                {/* Action Hint */}
                <View style={styles.providerActionHint}>
                  <Text style={styles.providerActionHintText}>Tap to view full profile</Text>
                  <Navigation size={12} color={colors.primary} style={{ transform: [{ rotate: '-90deg' }] }} />
                </View>
              </>
            ) : (
              /* Listing content */
              <View style={styles.markerInfoDetails}>
                {selectedMarker.price && (
                  <Text style={styles.markerInfoPrice}>${Math.round(selectedMarker.price).toLocaleString('en-US')}</Text>
                )}
                <View style={styles.markerInfoDistance}>
                  <Navigation size={12} color={colors.textSecondary} />
                  <Text style={styles.markerInfoDistanceText}>
                    {calculateDistance(
                      region.latitude,
                      region.longitude,
                      selectedMarker.latitude,
                      selectedMarker.longitude
                    )}
                  </Text>
                </View>
              </View>
            )}

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={(e) => {
                e.stopPropagation();
                setSelectedMarker(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}

      {/* Map Stats - Positioned below the toggle */}
      <View style={styles.statsBar} pointerEvents="none">
        <View style={styles.statItem}>
          <MapPin size={14} color={colors.white} />
          <Text style={styles.statText}>
            {clusteredItems.length} items ({markers.length} total)
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statText}>
            {region.latitude.toFixed(4)}, {region.longitude.toFixed(4)}
          </Text>
        </View>
      </View>

      {/* Load indicator */}
      <View style={styles.hidden}>
        <Text onLayout={() => setMapLoaded(true)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
  },
  mapCanvas: {
    flex: 1,
    backgroundColor: '#E5E3DF',
    position: 'relative',
  },
  gridBackground: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
  },
  gridLines: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'solid',
  },
  crosshair: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.1,
  },
  crosshairVertical: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: colors.text,
  },
  crosshairHorizontal: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: colors.text,
  },
  markerContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 100,
    elevation: 100,
  },
  markerContainerListing: {
    zIndex: 150,
    elevation: 150,
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    ...shadows.lg,
  },
  markerSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.white,
    transform: [{ scale: 1.2 }],
  },
  markerPriceTag: {
    marginTop: 4,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  markerPriceTagSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  markerPriceText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  markerPriceTextSelected: {
    color: colors.white,
  },
  markerProvider: {
    borderColor: colors.success,
    backgroundColor: colors.white,
  },
  markerProviderSelected: {
    backgroundColor: colors.success,
    borderColor: colors.white,
    transform: [{ scale: 1.2 }],
  },
  verifiedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerRatingTag: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  markerRatingTagSelected: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  markerRatingText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  markerRatingTextSelected: {
    color: colors.white,
  },
  controls: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.xxl + spacing.lg + 52 + spacing.sm + 36,
    zIndex: 10,
  },
  controlsColumn: {
    gap: spacing.xs,
  },
  controlButton: {
    width: 44,
    height: 44,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  controlButtonPrimary: {
    backgroundColor: colors.primary,
  },
  markerInfo: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    zIndex: 50,
    elevation: 50,
  },
  markerInfoCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.lg,
  },
  markerInfoCardExpanded: {
    paddingBottom: spacing.lg,
  },
  markerInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  markerInfoTitle: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  markerInfoSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  markerInfoRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  markerInfoRatingText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  markerInfoDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  markerInfoPrice: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  markerInfoDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  markerInfoDistanceText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.textLight,
    lineHeight: 24,
  },
  statsBar: {
    position: 'absolute',
    top: spacing.xxl + spacing.lg + 52,
    left: '50%',
    transform: [{ translateX: -120 }],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    ...shadows.lg,
    zIndex: 5,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.white,
    opacity: 0.3,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  hidden: {
    position: 'absolute',
    opacity: 0,
  },
  clusterMarker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    ...shadows.lg,
  },
  clusterMarkerSelected: {
    backgroundColor: colors.success,
    transform: [{ scale: 1.1 }],
  },
  clusterCount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  emptyStateOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: spacing.xl,
  },
  emptyStateTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  providerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  providerRatingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  providerRatingValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  providerReviewCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  providerCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  providerCategoryBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  providerCategoryText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  providerCategoryMore: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    alignSelf: 'center',
  },
  providerStatsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  providerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  providerStatText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  providerDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  providerDistanceText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  providerActionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  providerActionHintText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
