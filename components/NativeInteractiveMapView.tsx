import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import {
  MapPin,
  Navigation,
  Plus,
  Minus,
  Maximize2,
  List,
  User,
  Star,
  BadgeCheck,
  Clock,
  TrendingUp,
  Layers,
  X,
  Briefcase,
  Sparkles,
} from 'lucide-react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '@/constants/theme';
import { MAPBOX_CONFIG } from '@/config/native-modules';
import { formatCurrency } from '@/lib/currency-utils';

Mapbox.setAccessToken(MAPBOX_CONFIG.accessToken);

interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  price?: number;
  type?: 'listing' | 'provider';
  listingType?: 'Service' | 'CustomService' | 'Job';
  pricingType?: 'fixed_price' | 'quote_based';
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

interface NativeInteractiveMapViewProps {
  markers: MapMarker[];
  onMarkerPress?: (marker: MapMarker) => void;
  initialRegion?: MapRegion;
  style?: any;
  showUserLocation?: boolean;
  enableClustering?: boolean;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onRecenter?: () => void;
  onLayersPress?: () => void;
  onZoomChange?: (zoom: number) => void;
  onMapGestureStart?: () => void;
  onMapGestureEnd?: () => void;
}

export interface NativeInteractiveMapViewRef {
  zoomIn: () => void;
  zoomOut: () => void;
  recenter: () => void;
  toggleLayers: () => void;
}

const MAP_STYLES = [
  { id: 'streets', name: 'Streets', uri: 'mapbox://styles/mapbox/streets-v12' },
  { id: 'satellite', name: 'Satellite', uri: 'mapbox://styles/mapbox/satellite-streets-v12' },
  { id: 'dark', name: 'Dark', uri: 'mapbox://styles/mapbox/dark-v11' },
  { id: 'light', name: 'Light', uri: 'mapbox://styles/mapbox/light-v11' },
];

const DEFAULT_COORDINATES = [-74.006, 40.7128];

const NativeInteractiveMapView = forwardRef<NativeInteractiveMapViewRef, NativeInteractiveMapViewProps>(({
  markers,
  onMarkerPress,
  initialRegion,
  style,
  showUserLocation = true,
  enableClustering = true,
  onZoomIn: externalOnZoomIn,
  onZoomOut: externalOnZoomOut,
  onRecenter: externalOnRecenter,
  onLayersPress: externalOnLayersPress,
  onZoomChange,
  onMapGestureStart,
  onMapGestureEnd,
}, ref) => {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<Mapbox.Camera>(null);
  const mapRef = useRef<Mapbox.MapView>(null);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const gestureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isGesturingRef = useRef(false);
  const [currentMapStyle, setCurrentMapStyle] = useState(MAP_STYLES[0]);
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(12);

  useEffect(() => {
    return () => {
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current);
      }
    };
  }, []);

  const getMarkerConfig = (listingType?: 'Service' | 'CustomService' | 'Job') => {
    switch (listingType) {
      case 'Service':
        return {
          bubbleColor: '#10B981',
          icon: MapPin,
        };
      case 'CustomService':
        return {
          bubbleColor: '#8B5CF6',
          icon: Sparkles,
        };
      case 'Job':
        return {
          bubbleColor: '#F59E0B',
          icon: Briefcase,
        };
      default:
        return {
          bubbleColor: '#10B981',
          icon: MapPin,
        };
    }
  };

  // Build GeoJSON FeatureCollection for native marker rendering
  const markerFeatureCollection = React.useMemo(() => {
    const features = markers.map((marker) => {
      const config = getMarkerConfig(marker.listingType);
      const isSelected = selectedMarker?.id === marker.id;

      // Determine letter text for marker
      let letterText = 'S'; // Default to Service
      if (marker.type === 'provider') {
        letterText = 'SP';
      } else if (marker.listingType === 'Job') {
        letterText = marker.pricingType === 'fixed_price' ? 'FJ' : 'QJ';
      } else if (marker.listingType === 'Service' || marker.listingType === 'CustomService') {
        letterText = 'S';
      }

      return {
        type: 'Feature' as const,
        id: marker.id,
        geometry: {
          type: 'Point' as const,
          coordinates: [marker.longitude, marker.latitude],
        },
        properties: {
          markerId: marker.id,
          entityId: marker.id,
          entityType: marker.listingType || 'listing',
          title: marker.title,
          price: marker.price,
          isSelected: isSelected,
          isProvider: marker.type === 'provider',
          bubbleColor: config.bubbleColor,
          iconType: marker.listingType || 'Service',
          letterText: letterText,
        },
      };
    });

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [markers, selectedMarker]);

  const centerCoordinate = initialRegion
    ? [initialRegion.longitude, initialRegion.latitude]
    : markers.length > 0
    ? [markers[0].longitude, markers[0].latitude]
    : DEFAULT_COORDINATES;

  useEffect(() => {
    if (markers.length > 0 && cameraRef.current && mapLoaded) {
      fitBoundsToMarkers();
    }
  }, [markers.length, mapLoaded]);

  const fitBoundsToMarkers = () => {
    if (markers.length === 0 || !cameraRef.current) return;

    const coordinates = markers.map((m) => [m.longitude, m.latitude]);

    if (coordinates.length === 1) {
      cameraRef.current.setCamera({
        centerCoordinate: coordinates[0] as [number, number],
        zoomLevel: 14,
        animationDuration: 1000,
      });
    } else {
      const bounds = calculateBounds(markers);
      cameraRef.current.fitBounds(
        [bounds.ne[0], bounds.ne[1]],
        [bounds.sw[0], bounds.sw[1]],
        [80, 80, 80, 200],
        1000
      );
    }
  };

  const calculateBounds = (points: MapMarker[]) => {
    if (points.length === 0) {
      return {
        ne: centerCoordinate,
        sw: centerCoordinate,
      };
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

    return {
      ne: [maxLng, maxLat],
      sw: [minLng, minLat],
    };
  };

  const handleMarkerPress = (marker: MapMarker) => {
    setSelectedMarker(marker);
    onMarkerPress?.(marker);

    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [marker.longitude, marker.latitude],
        zoomLevel: Math.max(zoomLevel, 15),
        animationDuration: 500,
      });
    }
  };

  const handleZoomIn = () => {
    if (cameraRef.current) {
      const newZoom = Math.min(zoomLevel + 1, 20);
      setZoomLevel(newZoom);
      cameraRef.current.zoomTo(newZoom, 300);
      externalOnZoomIn?.();
    }
  };

  const handleZoomOut = () => {
    if (cameraRef.current) {
      const newZoom = Math.max(zoomLevel - 1, 0);
      setZoomLevel(newZoom);
      cameraRef.current.zoomTo(newZoom, 300);
      externalOnZoomOut?.();
    }
  };

  const handleRecenter = () => {
    fitBoundsToMarkers();
    externalOnRecenter?.();
  };

  const handleLayersPress = () => {
    setShowStyleSelector(!showStyleSelector);
    externalOnLayersPress?.();
  };

  useImperativeHandle(ref, () => ({
    zoomIn: handleZoomIn,
    zoomOut: handleZoomOut,
    recenter: handleRecenter,
    toggleLayers: handleLayersPress,
  }));

  // Native marker press handler via ShapeSource
  const handleShapeSourcePress = (event: any) => {
    if (!event.features || event.features.length === 0) return;

    const feature = event.features[0];
    const { markerId } = feature.properties || {};

    if (markerId) {
      const marker = markers.find((m) => m.id === markerId);
      if (marker) {
        handleMarkerPress(marker);
      }
    }
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

  const renderMarkerContent = (marker: MapMarker) => {
    const isSelected = selectedMarker?.id === marker.id;
    const isProvider = marker.type === 'provider';

    if (isProvider) {
      return (
        <View
          style={[
            styles.markerContainer,
            styles.markerProviderContainer,
            isSelected && styles.markerSelected,
          ]}
        >
          <View
            style={[
              styles.markerContent,
              styles.markerProviderContent,
              isSelected && styles.markerContentProviderSelected,
            ]}
          >
            <User
              size={20}
              color={isSelected ? colors.white : colors.success}
              strokeWidth={2.5}
            />
            {marker.isVerified && (
              <View style={styles.verifiedBadge}>
                <BadgeCheck size={10} color={colors.white} fill={colors.success} />
              </View>
            )}
          </View>
          {marker.rating !== undefined && marker.rating !== null && (
            <View style={[styles.markerPrice, isSelected && styles.markerPriceSelected]}>
              <Star size={8} color={isSelected ? colors.white : colors.warning} fill={isSelected ? colors.white : colors.warning} />
              <Text style={[styles.markerPriceText, isSelected && styles.markerPriceTextSelected]}>
                {typeof marker.rating === 'number' ? marker.rating.toFixed(1) : String(marker.rating)}
              </Text>
            </View>
          )}
        </View>
      );
    }

    const config = getMarkerConfig(marker.listingType);
    const Icon = config.icon;

    return (
      <View
        style={[
          styles.markerContainer,
          isSelected && styles.markerSelected,
        ]}
      >
        <View
          style={[
            styles.markerContent,
            { borderColor: config.bubbleColor, backgroundColor: isSelected ? config.bubbleColor : colors.white },
            isSelected && styles.markerContentSelected,
          ]}
        >
          <Icon
            size={20}
            color={isSelected ? colors.white : config.bubbleColor}
            strokeWidth={2.5}
          />
        </View>
        <View style={[styles.markerPointer, { borderTopColor: config.bubbleColor }]} />
        {((marker.price !== undefined && marker.price !== null) || marker.listingType === 'Job') && (
          <View style={[styles.markerPrice, { borderColor: config.bubbleColor, backgroundColor: isSelected ? config.bubbleColor : colors.white }, isSelected && styles.markerPriceSelected]}>
            <Text style={[styles.markerPriceText, { color: isSelected ? colors.white : config.bubbleColor }, isSelected && styles.markerPriceTextSelected]}>
              {marker.price !== undefined && marker.price !== null
                ? (typeof marker.price === 'number' ? formatCurrency(marker.price) : String(marker.price))
                : 'Quote'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (!MAPBOX_CONFIG.accessToken) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <MapPin size={48} color={colors.error} />
        <Text style={styles.errorText}>Mapbox Not Configured</Text>
        <Text style={styles.errorSubtext}>
          Add EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to your .env file
        </Text>
      </View>
    );
  }

  const handleCameraChanged = (state: any) => {
    const newZoom = state.properties.zoom;
    setZoomLevel(newZoom);
    onZoomChange?.(newZoom);

    if (!isGesturingRef.current) {
      isGesturingRef.current = true;
      onMapGestureStart?.();
    }
    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
    }
  };

  const handleMapIdle = () => {
    if (gestureTimeoutRef.current) {
      clearTimeout(gestureTimeoutRef.current);
    }
    gestureTimeoutRef.current = setTimeout(() => {
      if (isGesturingRef.current) {
        isGesturingRef.current = false;
        onMapGestureEnd?.();
      }
    }, 100);
  };

  return (
    <View style={[styles.container, style]} pointerEvents="box-none">
      <Mapbox.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={currentMapStyle.uri}
        logoEnabled={false}
        attributionEnabled={true}
        attributionPosition={{ bottom: 8, right: 8 }}
        scaleBarEnabled={false}
        compassEnabled={false}
        onDidFinishLoadingMap={() => setMapLoaded(true)}
        onCameraChanged={handleCameraChanged}
        onMapIdle={handleMapIdle}
      >
        <Mapbox.Camera
          ref={cameraRef}
          zoomLevel={initialRegion ? Math.log2(360 / initialRegion.longitudeDelta) : 12}
          centerCoordinate={centerCoordinate as [number, number]}
          animationMode="flyTo"
          animationDuration={1000}
        />

        {showUserLocation && (
          <Mapbox.UserLocation
            visible={true}
            showsUserHeadingIndicator={true}
            minDisplacement={10}
          />
        )}

        {/* Native marker rendering with reliable tap detection */}
        <Mapbox.ShapeSource
          id="markers-source"
          shape={markerFeatureCollection}
          onPress={handleShapeSourcePress}
        >
          {/* Circle background */}
          <Mapbox.CircleLayer
            id="markers-circle-layer"
            style={{
              circleRadius: [
                'case',
                ['get', 'isSelected'],
                22,
                18,
              ],
              circleColor: ['get', 'bubbleColor'],
              circleSortKey: [
                'case',
                ['get', 'isSelected'],
                1,
                0,
              ],
              circleOpacity: 1,
            }}
          />
          {/* White outer ring for selected state */}
          <Mapbox.CircleLayer
            id="markers-circle-selected-ring"
            filter={['==', ['get', 'isSelected'], true]}
            style={{
              circleRadius: 26,
              circleColor: 'transparent',
              circleStrokeWidth: 3,
              circleStrokeColor: '#FFFFFF',
              circleOpacity: 1,
            }}
          />
          {/* Letter text */}
          <Mapbox.SymbolLayer
            id="markers-text-layer"
            style={{
              textField: ['get', 'letterText'],
              textSize: 14,
              textColor: '#FFFFFF',
              textHaloColor: 'transparent',
              textHaloWidth: 0,
              textFont: ['Open Sans Bold', 'Arial Unicode MS Bold'],
              textAllowOverlap: true,
              textIgnorePlacement: true,
            }}
          />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>

      {!mapLoaded && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}

      {mapLoaded && markers.length === 0 && (
        <View style={styles.emptyStateOverlay}>
          <MapPin size={48} color={colors.textLight} />
          <Text style={styles.emptyStateTitle}>No Locations Available</Text>
          <Text style={styles.emptyStateText}>
            Listings don't have location data yet.{'\n'}Try using list or grid view.
          </Text>
        </View>
      )}

      <Modal
        visible={showStyleSelector}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStyleSelector(false)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowStyleSelector(false)}
        >
          <View
            style={[
              styles.styleSelectorModal,
              {
                top: insets.top + spacing.xl + spacing.lg + 60,
                left: spacing.md,
                right: spacing.md,
              }
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.styleSelectorHeader}>
              <View style={styles.styleSelectorTitleRow}>
                <Layers size={20} color={colors.text} />
                <Text style={styles.styleSelectorTitle}>Map Style</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowStyleSelector(false)}
                style={styles.styleSelectorClose}
                activeOpacity={0.7}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.styleSelectorContent}>
              {MAP_STYLES.map((style) => (
                <TouchableOpacity
                  key={style.id}
                  style={[
                    styles.styleOptionCard,
                    currentMapStyle.id === style.id && styles.styleOptionCardActive,
                  ]}
                  onPress={() => {
                    setCurrentMapStyle(style);
                    setShowStyleSelector(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.styleOptionCardText,
                      currentMapStyle.id === style.id && styles.styleOptionCardTextActive,
                    ]}
                  >
                    {style.name}
                  </Text>
                  {currentMapStyle.id === style.id && (
                    <View style={styles.styleOptionCheckmark}>
                      <Text style={styles.styleOptionCheckmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

      {selectedMarker && (
        <View style={styles.markerInfo} pointerEvents="box-none">
          <TouchableOpacity
            style={[
              styles.markerInfoCard,
              selectedMarker.type === 'provider' && styles.markerInfoCardExpanded,
            ]}
            onPress={() => onMarkerPress?.(selectedMarker)}
            activeOpacity={0.7}
          >
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

            {selectedMarker.subtitle && (
              <Text style={styles.markerInfoSubtitle} numberOfLines={1}>
                {selectedMarker.subtitle}
              </Text>
            )}

            {selectedMarker.type === 'provider' ? (
              <>
                {selectedMarker.rating !== undefined && selectedMarker.rating !== null && (
                  <View style={styles.providerRatingRow}>
                    <View style={styles.providerRatingStars}>
                      <Star size={16} color={colors.warning} fill={colors.warning} />
                      <Text style={styles.providerRatingValue}>
                        {typeof selectedMarker.rating === 'number' ? selectedMarker.rating.toFixed(1) : String(selectedMarker.rating)}
                      </Text>
                    </View>
                    {selectedMarker.reviewCount !== undefined && selectedMarker.reviewCount !== null && (
                      <Text style={styles.providerReviewCount}>
                        ({typeof selectedMarker.reviewCount === 'number' ? selectedMarker.reviewCount : String(selectedMarker.reviewCount)} {selectedMarker.reviewCount === 1 ? 'review' : 'reviews'})
                      </Text>
                    )}
                  </View>
                )}

                {selectedMarker.categories && selectedMarker.categories.length > 0 && (
                  <View style={styles.providerCategories}>
                    {selectedMarker.categories.slice(0, 3).map((category, index) => (
                      <View key={index} style={styles.providerCategoryBadge}>
                        <Text style={styles.providerCategoryText}>
                          {typeof category === 'string' ? category : String(category || '')}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.providerStatsRow}>
                  {selectedMarker.responseTime && (
                    <View style={styles.providerStat}>
                      <Clock size={14} color={colors.textSecondary} />
                      <Text style={styles.providerStatText}>
                        {String(selectedMarker.responseTime)}
                      </Text>
                    </View>
                  )}
                  {selectedMarker.completionRate !== undefined && selectedMarker.completionRate !== null && (
                    <View style={styles.providerStat}>
                      <TrendingUp size={14} color={colors.success} />
                      <Text style={styles.providerStatText}>
                        {typeof selectedMarker.completionRate === 'number' ? selectedMarker.completionRate : String(selectedMarker.completionRate)}%
                      </Text>
                    </View>
                  )}
                </View>
              </>
            ) : (
              <View style={styles.markerInfoDetails}>
                {((selectedMarker.price !== undefined && selectedMarker.price !== null) || selectedMarker.listingType === 'Job') && (
                  <Text style={styles.markerInfoPrice}>
                    {selectedMarker.price !== undefined && selectedMarker.price !== null
                      ? (typeof selectedMarker.price === 'number'
                        ? `$${Math.round(selectedMarker.price).toLocaleString('en-US')}`
                        : String(selectedMarker.price))
                      : 'Quote'
                    }
                  </Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={(e) => {
                setSelectedMarker(null);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

export default NativeInteractiveMapView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.error,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
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
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerProviderContainer: {
    transform: [{ scale: 1.1 }],
  },
  markerSelected: {
    transform: [{ scale: 1.3 }],
  },
  markerContent: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
    ...shadows.lg,
  },
  markerPointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  markerProviderContent: {
    borderColor: colors.success,
  },
  markerContentSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.white,
  },
  markerContentProviderSelected: {
    backgroundColor: colors.success,
    borderColor: colors.white,
  },
  verifiedBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPrice: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  markerPriceSelected: {
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
  markerRating: {
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
    ...shadows.md,
  },
  markerRatingSelected: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  markerRatingText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  controls: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.xxl + spacing.lg + 52 + spacing.sm,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  styleSelectorModal: {
    position: 'absolute',
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    ...shadows.lg,
    maxWidth: 400,
  },
  styleSelectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  styleSelectorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  styleSelectorTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  styleSelectorClose: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  styleSelectorContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  styleOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  styleOptionCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  styleOptionCardText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  styleOptionCardTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  styleOptionCheckmark: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleOptionCheckmarkText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  markerInfo: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
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
});
