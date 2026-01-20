// ========================================
// MINIMAL MAPVIEW RENDER CONTEXT (INSPECTION ONLY)
// ========================================
// Extracted from: components/NativeInteractiveMapView.tsx
// Lines 407-457
// Platform: Native (iOS/Android)
// Library: @rnmapbox/maps
// ========================================

// MAPVIEW INSTANTIATION AND MARKER MOUNTING
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

      {/* Invisible hit-test layer for reliable tap detection */}
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

    {/* UI overlays omitted for clarity */}
  </View>
);

// ========================================
// MAP PRESS HANDLER (RECENTLY ADDED)
// ========================================
// Located at lines 206-245 in parent component
// Purpose: Fallback tap detection via invisible GeoJSON layer

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
            console.log(
              '[MAP_PIN_TRACE] HIT_TEST_SUCCESS',
              'markerId:', markerId,
              'title:', marker.title,
              'timestamp:', Date.now()
            );
          }
          handleMarkerPress(marker);
        }
      }
    }
  } catch (error) {
    if (__DEV__) {
      console.error('[MAP_PIN_TRACE] HIT_TEST_ERROR', error);
    }
  }
};

// ========================================
// HIT-TEST FEATURE COLLECTION BUILDER
// ========================================
// Located at lines 113-135 in parent component
// Memoized GeoJSON for invisible tap layer

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
// COMPONENT STATE
// ========================================
const mapRef = useRef<Mapbox.MapView>(null);
const cameraRef = useRef<Mapbox.Camera>(null);
const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
const [mapLoaded, setMapLoaded] = useState(false);
const [zoomLevel, setZoomLevel] = useState(12);

// ========================================
// MARKER DATA FLOW
// ========================================
// 1. Parent component passes `markers` array prop
// 2. markers.map() iterates to create Mapbox.MarkerView instances
// 3. Each MarkerView wraps TouchableOpacity with onPress handler
// 4. TouchableOpacity wraps renderMarkerContent() View hierarchy
// 5. Tap → TouchableOpacity.onPress → handleMarkerPress → parent callback

// ========================================
// GESTURE HANDLER LIFECYCLE
// ========================================
// MapView Handlers:
// • onDidFinishLoadingMap: Sets mapLoaded state
// • onCameraChanged: Updates zoomLevel state
// • onPress: Queries hit-test layer for marker tap fallback

// Camera Handlers:
// • None directly affecting touch events

// Marker Handlers:
// • TouchableOpacity.onPress: Primary marker tap handler
// • hitSlop: Extended touch target (30px all sides)
// • activeOpacity: 0.7 visual feedback

// ========================================
// TOUCH EVENT COMPETITION SUSPECTS
// ========================================
// 1. Mapbox.MarkerView native wrapper
//    - May intercept/consume touch events at native layer
//    - No tracksViewChanges flag to optimize rendering
//
// 2. TouchableOpacity gesture recognizer
//    - Competes with map pan/zoom gestures
//    - hitSlop may not be sufficient for reliable taps
//
// 3. Child View hierarchy depth
//    - 3-4 nested Views between TouchableOpacity and visual bubble
//    - Transform styles (scale) on selected state
//    - Shadow styles may affect hit testing
//
// 4. Map gesture priority
//    - Pan/zoom gestures may take precedence over marker taps
//    - No explicit gesture priority configuration visible
//
// 5. Invisible hit-test layer
//    - Recently added ShapeSource + CircleLayer at opacity 0
//    - onPress queries this layer as fallback
//    - May create additional gesture competition

// ========================================
// PROPS AFFECTING TOUCH BEHAVIOR
// ========================================
// Mapbox.MarkerView:
// • allowOverlap: true (markers can overlap, may affect hit zones)
// • isSelected: boolean (triggers transform scale, may affect hit zone)
// • anchor: { x: 0.5, y: 1 } (positioning may affect tap coordinates)

// TouchableOpacity:
// • activeOpacity: 0.7 (visual feedback)
// • hitSlop: { top: 30, bottom: 30, left: 30, right: 30 }
// • style: { padding: spacing.sm } (additional hit area padding)

// ========================================
// RE-RENDER TRIGGERS
// ========================================
// markers.map() re-executes when:
// • markers array reference changes (parent re-render)
// • selectedMarker state changes (affects isSelected prop)
// • mapLoaded state changes
// • zoomLevel state changes (onCameraChanged fires frequently)
//
// No memoization or optimization present
// All MarkerView instances re-render on any state change

// ========================================
// LIBRARY VERSION CONTEXT
// ========================================
// @rnmapbox/maps: ^10.2.7 (from package.json)
// react-native-gesture-handler: ~2.28.0
// react-native: 0.81.5
//
// Mapbox RN SDK 10.x uses native view managers
// Touch event handling differs from earlier versions
