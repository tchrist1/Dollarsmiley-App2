# Mapbox Native Integration Guide

## Overview

This application now includes comprehensive native Mapbox maps integration for iOS and Android platforms using the `@rnmapbox/maps` SDK. The implementation provides platform-specific optimizations while maintaining a consistent API across web and mobile.

## Features

### ✅ Implemented

- **Native Map Rendering** - Real Mapbox tiles on iOS/Android
- **Platform-Specific Components** - Automatic fallback to web-compatible views
- **Multiple Map Styles** - Streets, Satellite, Dark, Light, Outdoors, Navigation
- **Interactive Markers** - Custom styled markers for listings and providers
- **User Location Tracking** - Real-time user position with heading indicator
- **Camera Controls** - Zoom, pan, fit bounds animations
- **Marker Clustering** - Automatic grouping of nearby markers
- **Rich Info Cards** - Detailed marker information with ratings and stats
- **Geocoding Support** - Address to coordinates and reverse geocoding
- **Distance Calculations** - Haversine formula for accurate measurements
- **Security** - Tokens properly managed via environment variables

## Architecture

### Component Structure

```
components/
├── NativeMapView.tsx                    # Core native Mapbox implementation
├── NativeInteractiveMapView.tsx         # Enhanced interactive native maps
├── MapView.tsx                          # Web-compatible fallback (list view)
├── InteractiveMapView.tsx               # Web-compatible fallback (simulated)
├── MapViewPlatform.tsx                  # Platform selector for basic maps
└── InteractiveMapViewPlatform.tsx       # Platform selector for interactive maps
```

### Utility Library

```
lib/
└── mapbox-utils.ts                      # Mapbox utilities and helpers
```

### Configuration

```
config/
└── native-modules.ts                    # Mapbox configuration and tokens
```

## Installation & Setup

### 1. Environment Variables

Add the following to your `.env` file:

```bash
# Public access token (runtime - starts with pk.)
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_public_token_here

# Download token (build time - starts with sk.)
RNMAPBOX_MAPS_DOWNLOAD_TOKEN=sk.your_download_token_here
```

**Get Your Tokens:**
1. Create account at [mapbox.com](https://account.mapbox.com/auth/signup/)
2. Access Token: [Account Dashboard](https://account.mapbox.com/access-tokens/)
3. Download Token: Create a secret token for iOS builds

### 2. App Configuration

The `app.json` is already configured with the Mapbox plugin:

```json
{
  "plugins": [
    [
      "@rnmapbox/maps",
      {
        "RNMapboxMapsDownloadToken": ""
      }
    ]
  ]
}
```

**Note:** The download token is intentionally empty in `app.json` for security. It's loaded from environment variables during build.

### 3. Build Requirements

Native maps require a development build:

```bash
# Cloud build with EAS
eas build --profile development --platform ios
eas build --profile development --platform android

# OR local build
npx expo prebuild
npx expo run:ios
npx expo run:android
```

**Important:** Native maps will NOT work in Expo Go or web browsers.

## Usage

### Basic Map (Platform-Aware)

```tsx
import MapViewPlatform from '@/components/MapViewPlatform';

function MyComponent() {
  const markers = [
    {
      id: '1',
      latitude: 40.7128,
      longitude: -74.006,
      title: 'New York',
      price: 100,
    },
  ];

  return (
    <MapViewPlatform
      markers={markers}
      onMarkerPress={(marker) => console.log('Pressed:', marker.title)}
      initialRegion={{
        latitude: 40.7128,
        longitude: -74.006,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }}
      showUserLocation={true}
      showControls={true}
    />
  );
}
```

### Interactive Map (Platform-Aware)

```tsx
import InteractiveMapViewPlatform from '@/components/InteractiveMapViewPlatform';

function MyComponent() {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  const providerMarkers = [
    {
      id: 'p1',
      latitude: 40.7128,
      longitude: -74.006,
      title: 'John Doe',
      type: 'provider' as const,
      subtitle: 'Professional Plumber',
      rating: 4.8,
      isVerified: true,
      reviewCount: 156,
      categories: ['Plumbing', 'Emergency', 'Commercial'],
      responseTime: '< 30 min',
      completionRate: 98,
    },
  ];

  return (
    <InteractiveMapViewPlatform
      markers={providerMarkers}
      onMarkerPress={(marker) => navigateToProfile(marker.id)}
      showControls={true}
      onSwitchToList={() => setViewMode('list')}
      showUserLocation={true}
      enableClustering={true}
    />
  );
}
```

### Direct Native Usage (iOS/Android Only)

```tsx
import NativeMapView from '@/components/NativeMapView';
import { Platform } from 'react-native';

function MyComponent() {
  if (Platform.OS === 'web') {
    return <Text>Maps not available on web</Text>;
  }

  return (
    <NativeMapView
      markers={markers}
      mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
      showUserLocation={true}
      followUserLocation={false}
      showControls={true}
    />
  );
}
```

## Marker Types

### Listing Markers

```typescript
{
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  price?: number;  // Shows as price tag below marker
  type?: 'listing';
}
```

**Visual:** 📍 icon with price tag

### Provider Markers

```typescript
{
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  type: 'provider';
  subtitle?: string;
  rating?: number;  // Shows as star rating tag
  isVerified?: boolean;  // Shows verification badge
  reviewCount?: number;
  categories?: string[];
  responseTime?: string;
  completionRate?: number;
}
```

**Visual:** 👤 icon with rating tag and optional verification badge

## Map Styles

Available styles in `NativeInteractiveMapView`:

- **Streets** (default) - Standard street map
- **Satellite** - Satellite imagery with labels
- **Dark** - Dark theme for night mode
- **Light** - Minimal light theme

Access via style selector button (layers icon) on map.

## Utility Functions

### Distance Calculations

```typescript
import { calculateDistance, formatDistance } from '@/lib/mapbox-utils';

const distance = calculateDistance(lat1, lon1, lat2, lon2, 'miles');
const formatted = formatDistance(distance); // "2.5 mi" or "850 ft"
```

### Geocoding

```typescript
import { geocodeToCoordinates, reverseGeocode } from '@/lib/mapbox-utils';

// Address to coordinates
const location = await geocodeToCoordinates('123 Main St, New York, NY');
// { latitude: 40.7128, longitude: -74.006 }

// Coordinates to address
const address = await reverseGeocode({ latitude: 40.7128, longitude: -74.006 });
// "123 Main St, New York, NY 10001, United States"
```

### Bounds & Regions

```typescript
import {
  calculateBounds,
  boundsToRegion,
  isLocationInRegion,
} from '@/lib/mapbox-utils';

// Calculate bounds from locations
const bounds = calculateBounds(markers);

// Convert bounds to region
const region = boundsToRegion(bounds, 0.1); // 10% padding

// Check if location is in view
const isVisible = isLocationInRegion(marker, currentRegion);
```

### Sorting & Filtering

```typescript
import {
  sortLocationsByDistance,
  filterLocationsByDistance,
} from '@/lib/mapbox-utils';

// Sort by distance from user
const sorted = sortLocationsByDistance(markers, userLocation);

// Get markers within 5 miles
const nearby = filterLocationsByDistance(markers, userLocation, 5);
```

## Platform Detection

```typescript
import { isMapboxConfigured, isNativeMapSupported } from '@/lib/mapbox-utils';

// Check if tokens are configured
if (isMapboxConfigured()) {
  // Mapbox is ready
}

// Check if native maps can be used
if (isNativeMapSupported()) {
  // Use native maps (iOS/Android with valid token)
} else {
  // Use web fallback
}
```

## Best Practices

### 1. Always Use Platform Wrappers

Use `MapViewPlatform` or `InteractiveMapViewPlatform` instead of direct native components. They automatically handle platform differences.

### 2. Handle Loading States

```tsx
const [mapReady, setMapReady] = useState(false);

<NativeMapView
  markers={markers}
  onMapLoad={() => setMapReady(true)}
/>
```

### 3. Optimize Marker Count

For performance, limit markers on screen:
- Use clustering for 100+ markers
- Filter by region bounds
- Load markers progressively

### 4. Memory Management

```tsx
useEffect(() => {
  // Cleanup when unmounting
  return () => {
    // Native maps handle cleanup automatically
  };
}, []);
```

### 5. Error Handling

```tsx
import { isMapboxConfigured } from '@/lib/mapbox-utils';

if (!isMapboxConfigured()) {
  return (
    <View>
      <Text>Map configuration missing</Text>
      <Text>Add EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to .env</Text>
    </View>
  );
}
```

## Troubleshooting

### Maps Not Showing

1. **Check token configuration**
   ```bash
   # Verify .env has both tokens
   cat .env | grep MAPBOX
   ```

2. **Verify native build**
   ```bash
   # Maps require development build, not Expo Go
   npx expo prebuild
   ```

3. **Check platform**
   ```typescript
   // Native maps only work on iOS/Android
   if (Platform.OS === 'web') {
     // Use web fallback
   }
   ```

### Token Errors

- **"Invalid access token"** - Check `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` starts with `pk.`
- **Build fails** - Verify `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` starts with `sk.`
- **Empty map** - Token might be revoked, generate new one

### Performance Issues

1. **Too many markers**
   - Enable clustering: `enableClustering={true}`
   - Filter by distance: `filterLocationsByDistance(markers, center, maxMiles)`

2. **Slow animations**
   - Reduce animation duration
   - Disable `followUserLocation` when not needed

3. **Memory warnings**
   - Limit marker count to 200-300
   - Use simpler marker designs
   - Clear unused markers

## Security

### ✅ Secure Implementation

- Download token removed from `app.json`
- Tokens loaded from environment variables
- Secret tokens never committed to repository
- Public tokens used only for runtime

### ⚠️ Important

- Never commit `.env` file
- Rotate tokens if exposed
- Use different tokens for dev/prod
- Monitor token usage in Mapbox dashboard

## API Reference

### MapViewPlatform Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `markers` | `MapMarker[]` | Required | Array of marker objects |
| `onMarkerPress` | `(marker: MapMarker) => void` | - | Marker press handler |
| `initialRegion` | `MapRegion` | - | Initial camera position |
| `style` | `ViewStyle` | - | Container style |
| `showUserLocation` | `boolean` | `true` | Show user location |
| `followUserLocation` | `boolean` | `false` | Track user movement |
| `mapStyle` | `string` | streets | Mapbox style URL |
| `showControls` | `boolean` | `true` | Show zoom controls |

### InteractiveMapViewPlatform Props

Includes all `MapViewPlatform` props plus:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onSwitchToList` | `() => void` | - | List view toggle handler |
| `enableClustering` | `boolean` | `true` | Enable marker clustering |
| `clusterRadius` | `number` | `60` | Cluster radius in pixels |

## Examples

### Complete Integration Example

```tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import InteractiveMapViewPlatform from '@/components/InteractiveMapViewPlatform';
import { supabase } from '@/lib/supabase';
import * as Location from 'expo-location';

export default function ServiceMapScreen() {
  const [listings, setListings] = useState([]);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    loadListings();
    getUserLocation();
  }, []);

  const loadListings = async () => {
    const { data } = await supabase
      .from('service_listings')
      .select('*')
      .not('latitude', 'is', null);

    setListings(
      data.map((listing) => ({
        id: listing.id,
        latitude: listing.latitude,
        longitude: listing.longitude,
        title: listing.title,
        price: listing.price_min,
        type: 'listing',
      }))
    );
  };

  const getUserLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  };

  return (
    <View style={styles.container}>
      <InteractiveMapViewPlatform
        markers={listings}
        initialRegion={userLocation}
        onMarkerPress={(marker) => {
          // Navigate to listing detail
        }}
        showControls={true}
        showUserLocation={true}
        enableClustering={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

## Support

- **Mapbox Documentation**: https://docs.mapbox.com/
- **@rnmapbox/maps GitHub**: https://github.com/rnmapbox/maps
- **Expo Location**: https://docs.expo.dev/versions/latest/sdk/location/

## Migration Notes

### From Web-Only Maps

If upgrading from web-only implementation:

1. Replace `MapView` with `MapViewPlatform`
2. Replace `InteractiveMapView` with `InteractiveMapViewPlatform`
3. Add environment variables
4. Create development build
5. Test on physical devices

### Backward Compatibility

Web functionality remains unchanged. The platform wrappers automatically use the original web components when running on web.

## License

Mapbox requires attribution. The native components automatically include required attribution in the bottom-right corner of the map.
