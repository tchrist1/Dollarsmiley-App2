import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { theme } from '@/constants/theme';

// Mapbox is initialized once in app/_layout.tsx

interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  price?: number;
  type?: 'listing' | 'provider';
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

interface NativeMapViewProps {
  markers: MapMarker[];
  onMarkerPress?: (marker: MapMarker) => void;
  initialRegion?: MapRegion;
  style?: any;
  showUserLocation?: boolean;
  followUserLocation?: boolean;
  mapStyle?: string;
  showControls?: boolean;
}

const DEFAULT_COORDINATES = [-74.006, 40.7128];

export default function NativeMapView({
  markers,
  onMarkerPress,
  initialRegion,
  style,
  showUserLocation = true,
  followUserLocation = false,
  mapStyle = 'mapbox://styles/mapbox/streets-v12',
  showControls = true,
}: NativeMapViewProps) {
  const cameraRef = useRef<Mapbox.Camera>(null);
  const mapRef = useRef<Mapbox.MapView>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const centerCoordinate = initialRegion
    ? [initialRegion.longitude, initialRegion.latitude]
    : markers.length > 0
    ? [markers[0].longitude, markers[0].latitude]
    : DEFAULT_COORDINATES;

  const zoomLevel = initialRegion
    ? Math.log2(360 / initialRegion.longitudeDelta)
    : 12;

  useEffect(() => {
    if (markers.length > 0 && cameraRef.current) {
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
          [50, 50, 50, 50],
          1000
        );
      }
    }
  }, [markers.length]);

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
    setSelectedMarkerId(marker.id);
    onMarkerPress?.(marker);

    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [marker.longitude, marker.latitude],
        zoomLevel: 15,
        animationDuration: 500,
      });
    }
  };

  const renderMarkerContent = (marker: MapMarker) => {
    const isSelected = selectedMarkerId === marker.id;
    const isProvider = marker.type === 'provider';

    return (
      <View
        style={[
          styles.markerContainer,
          isProvider && styles.markerProviderContainer,
          isSelected && styles.markerSelected,
        ]}
      >
        <View style={styles.markerContent}>
          {isProvider ? (
            <Text style={styles.markerProviderIcon}>👤</Text>
          ) : (
            <Text style={styles.markerIcon}>📍</Text>
          )}
        </View>
        {marker.price && !isProvider && (
          <View style={[styles.markerPrice, isSelected && styles.markerPriceSelected]}>
            <Text style={[styles.markerPriceText, isSelected && styles.markerPriceTextSelected]}>
              ${Math.round(marker.price).toLocaleString('en-US')}
            </Text>
          </View>
        )}
        {isProvider && marker.rating && (
          <View style={[styles.markerRating, isSelected && styles.markerRatingSelected]}>
            <Text style={styles.markerRatingText}>⭐ {marker.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>
    );
  };

  if (!MAPBOX_CONFIG.accessToken) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Text style={styles.errorText}>Mapbox access token not configured</Text>
        <Text style={styles.errorSubtext}>
          Add EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to your .env file
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Mapbox.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={mapStyle}
        logoEnabled={false}
        attributionEnabled={true}
        attributionPosition={{ bottom: 8, right: 8 }}
        scaleBarEnabled={false}
        compassEnabled={showControls}
        compassPosition={{ top: 60, right: 16 }}
      >
        <Mapbox.Camera
          ref={cameraRef}
          zoomLevel={zoomLevel}
          centerCoordinate={centerCoordinate as [number, number]}
          animationMode="flyTo"
          animationDuration={1000}
          followUserLocation={followUserLocation}
        />

        {showUserLocation && (
          <Mapbox.UserLocation
            visible={true}
            showsUserHeadingIndicator={true}
            minDisplacement={10}
          />
        )}

        {markers.map((marker) => (
          <Mapbox.MarkerView
            key={marker.id}
            id={marker.id}
            coordinate={[marker.longitude, marker.latitude]}
            anchor={{ x: 0.5, y: 1 }}
            allowOverlap={true}
            isSelected={selectedMarkerId === marker.id}
          >
            <View style={{ alignItems: 'center' }}>
              {renderMarkerContent(marker)}
            </View>
          </Mapbox.MarkerView>
        ))}
      </Mapbox.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.error,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerIcon: {
    fontSize: 20,
  },
  markerProviderIcon: {
    fontSize: 18,
  },
  markerPrice: {
    marginTop: 4,
    backgroundColor: theme.colors.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  markerPriceSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  markerPriceText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  markerPriceTextSelected: {
    color: theme.colors.white,
  },
  markerRating: {
    marginTop: 4,
    backgroundColor: theme.colors.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  markerRatingSelected: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  markerRatingText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.text,
  },
});
