// ========================================
// EXACT CODE EXTRACT — NATIVE MAP MARKER IMPLEMENTATION
// ========================================
// Source: components/NativeInteractiveMapView.tsx
// Extraction Date: 2026-01-15
// Purpose: Debugging unreliable marker tap events on Native
// ========================================

import React, { useState, useRef, useEffect } from 'react';
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

// ========================================
// COMPONENT STATE (Lines 93-99)
// ========================================
const mapRef = useRef<Mapbox.MapView>(null);
const cameraRef = useRef<Mapbox.Camera>(null);
const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
const [mapLoaded, setMapLoaded] = useState(false);
const [currentMapStyle, setCurrentMapStyle] = useState(MAP_STYLES[0]);
const [showStyleSelector, setShowStyleSelector] = useState(false);
const [zoomLevel, setZoomLevel] = useState(12);

// ========================================
// HIT-TEST FEATURE COLLECTION (Lines 113-135)
// ========================================
const hitTestFeatureCollection = React.useMemo(() => {
  const features = markers.map((marker) => ({
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
    },
  }));

  return {
    type: 'FeatureCollection' as const,
    features,
  };
}, [markers]);

// ========================================
// HANDLE MARKER PRESS (Lines 197-208)
// ========================================
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

// ========================================
// MAP PRESS HANDLER (Lines 230-269)
// ========================================
const handleMapPress = async (event: any) => {
  if (!mapRef.current) return;

  try {
    const { geometry } = event;
    if (!geometry || !geometry.coordinates) return;

    // Query rendered features at the tap point for hit-test layer only
    const features = await mapRef.current.queryRenderedFeaturesAtPoint(
      geometry.coordinates,
      undefined,
      ['marker-hit-layer']
    );

    if (features && features.features && features.features.length > 0) {
      const feature = features.features[0];
      const { markerId } = feature.properties || {};

      if (markerId) {
        // Find the corresponding marker
        const marker = markers.find((m) => m.id === markerId);
        if (marker) {
          if (__DEV__) {
            console.log('[MAP_PIN_TRACE] ✅ HIT_TEST_SUCCESS', {
              markerId,
              title: marker.title,
              timestamp: Date.now(),
            });
          }
          handleMarkerPress(marker);
        }
      }
    }
  } catch (error) {
    if (__DEV__) {
      console.log('[MAP_PIN_TRACE] ⚠️ HIT_TEST_ERROR', error);
    }
  }
};

// ========================================
// GET MARKER CONFIG (Lines 289-312)
// ========================================
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

// ========================================
// RENDER MARKER CONTENT (Lines 314-393)
// ========================================
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

// ========================================
// MAPVIEW RENDER (Lines 409-457)
// ========================================
return (
  <View style={[styles.container, style]}>
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
      onCameraChanged={(state) => {
        setZoomLevel(state.properties.zoom);
      }}
      onPress={handleMapPress}
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

      {/* ===== INVISIBLE HIT-TEST LAYER ===== */}
      <Mapbox.ShapeSource
        id="marker-hit-source"
        shape={hitTestFeatureCollection}
      >
        <Mapbox.CircleLayer
          id="marker-hit-layer"
          style={{
            circleRadius: 20,
            circleOpacity: 0,
            circleColor: '#000000',
          }}
        />
      </Mapbox.ShapeSource>

      {/* ===== MARKER INSTANTIATION ===== */}
      {markers.map((marker) => (
        <Mapbox.MarkerView
          key={marker.id}
          id={marker.id}
          coordinate={[marker.longitude, marker.latitude]}
          anchor={{ x: 0.5, y: 1 }}
          allowOverlap={true}
          isSelected={selectedMarker?.id === marker.id}
        >
          <TouchableOpacity
            onPress={() => handleMarkerPress(marker)}
            activeOpacity={0.7}
            hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
            style={{ padding: spacing.sm }}
          >
            {renderMarkerContent(marker)}
          </TouchableOpacity>
        </Mapbox.MarkerView>
      ))}
    </Mapbox.MapView>

    {/* UI overlays omitted */}
  </View>
);

// ========================================
// RELEVANT STYLES
// ========================================
const styles = StyleSheet.create({
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
});

// ========================================
// CRITICAL OBSERVATIONS
// ========================================

/*
TOUCH EVENT CHAIN:
1. User taps marker bubble
2. Native layer (UIView/AndroidView)
3. Mapbox.MarkerView (native view manager)
4. TouchableOpacity (RN gesture handler)
5. TouchableOpacity.onPress fires
6. handleMarkerPress(marker) executes
7. Parent callback onMarkerPress?.(marker)

FAILURE POINTS:
• Step 3→4: Native view may consume touch
• Step 4→5: Gesture may be cancelled by map gestures
• Step 5: Arrow function creates new ref each render

MITIGATION ADDED:
• Invisible hit-test layer (ShapeSource + CircleLayer)
• MapView.onPress queries layer as fallback
• Ensures taps are caught even if MarkerView fails

KEY FACTS:
• No tracksViewChanges flag (defaults to true, causes re-renders)
• No React.memo or useMemo on markers (all re-render frequently)
• hitSlop: 30px all sides (should be sufficient)
• Transform scale on selection (may affect hit zones)
• Arrow function in onPress (new ref each render)

LIBRARY VERSIONS:
• @rnmapbox/maps: ^10.2.7
• react-native-gesture-handler: ~2.28.0
• react-native: 0.81.5
*/
