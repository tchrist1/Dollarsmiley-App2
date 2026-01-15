// ========================================
// NATIVE MAP MARKER COMPONENT (INSPECTION ONLY)
// ========================================
// Extracted from: components/NativeInteractiveMapView.tsx
// Lines 389-457
// Platform: Native (iOS/Android)
// Library: @rnmapbox/maps
// ========================================

// MARKER INSTANTIATION WITHIN MAPVIEW
// Located at lines 389-401 in parent component

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

// ========================================
// RENDER MARKER CONTENT FUNCTION
// ========================================
// Located at lines 314-393 in parent component
// Returns the visual marker bubble (View hierarchy)

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
// HANDLE MARKER PRESS FUNCTION
// ========================================
// Located at lines 197-208 in parent component

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
// TOUCH EVENT FLOW (NATIVE)
// ========================================
// 1. User taps marker bubble on screen
// 2. TouchableOpacity.onPress fires → calls handleMarkerPress(marker)
// 3. handleMarkerPress sets selectedMarker state
// 4. handleMarkerPress calls onMarkerPress callback prop (parent navigation)
// 5. Camera animates to marker position

// ========================================
// KNOWN TOUCH INTERCEPTION POINTS
// ========================================
// • Mapbox.MarkerView (native view wrapper)
// • TouchableOpacity (RN gesture handler)
// • hitSlop: { top: 30, bottom: 30, left: 30, right: 30 }
// • padding: spacing.sm (applied to TouchableOpacity container)
// • Child View hierarchy (3-4 levels deep)

// ========================================
// MARKER PROPERTIES
// ========================================
interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  price?: number;
  type?: 'listing' | 'provider';
  listingType?: 'Service' | 'CustomService' | 'Job';
  subtitle?: string;
  rating?: number;
  isVerified?: boolean;
  reviewCount?: number;
  categories?: string[];
  responseTime?: string;
  completionRate?: number;
  avatarUrl?: string;
}

// ========================================
// MARKER STYLING (RELEVANT EXCERPTS)
// ========================================
const styles = {
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
};

// ========================================
// PERFORMANCE FLAGS
// ========================================
// • No tracksViewChanges flag present on Mapbox.MarkerView
// • No React.memo() wrapper on renderMarkerContent
// • No useMemo() on marker rendering
// • markers.map() re-renders all markers on any state change

// ========================================
// OBSERVED TAP FAILURE PATTERN
// ========================================
// • First tap on marker bubble often fails to trigger onPress
// • Visual feedback (activeOpacity) sometimes shows without onPress firing
// • Subsequent taps may work inconsistently
// • Issue occurs on both iOS and Android native platforms
// • Invisible hit-test layer recently added as mitigation (lines 374-387)
