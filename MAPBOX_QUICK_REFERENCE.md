# Mapbox Native Maps - Quick Reference

## 🚀 Quick Start (30 seconds)

### 1. Add Your Tokens to .env
```bash
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_token_here
RNMAPBOX_MAPS_DOWNLOAD_TOKEN=sk.your_token_here
```

### 2. Use Platform-Aware Components
```tsx
import MapViewPlatform from '@/components/MapViewPlatform';

<MapViewPlatform markers={markers} showUserLocation={true} />
```

### 3. Build Native App
```bash
eas build --profile development --platform ios
```

**That's it!** Native maps on iOS/Android, web fallback automatic.

---

## 📦 Components

### MapViewPlatform
Basic map with markers - auto-detects platform

```tsx
import MapViewPlatform from '@/components/MapViewPlatform';

<MapViewPlatform
  markers={[
    { id: '1', latitude: 40.7128, longitude: -74.006, title: 'NYC', price: 100 }
  ]}
  onMarkerPress={(marker) => console.log(marker)}
  showUserLocation={true}
/>
```

### InteractiveMapViewPlatform
Enhanced map with controls and clustering

```tsx
import InteractiveMapViewPlatform from '@/components/InteractiveMapViewPlatform';

<InteractiveMapViewPlatform
  markers={providers}
  showControls={true}
  enableClustering={true}
  onSwitchToList={() => setView('list')}
/>
```

---

## 🔧 Utilities

### Distance
```tsx
import { calculateDistance, formatDistance } from '@/lib/mapbox-utils';

const miles = calculateDistance(lat1, lon1, lat2, lon2);
const text = formatDistance(miles); // "2.5 mi"
```

### Geocoding
```tsx
import { geocodeToCoordinates, reverseGeocode } from '@/lib/mapbox-utils';

const coords = await geocodeToCoordinates('Times Square, NYC');
const address = await reverseGeocode({ latitude: 40.7128, longitude: -74.006 });
```

### Sorting
```tsx
import { sortLocationsByDistance } from '@/lib/mapbox-utils';

const sorted = sortLocationsByDistance(markers, userLocation);
```

### Filtering
```tsx
import { filterLocationsByDistance } from '@/lib/mapbox-utils';

const nearby = filterLocationsByDistance(markers, userLocation, 5); // 5 miles
```

---

## 🎨 Marker Types

### Listing Marker
```tsx
{
  id: '1',
  latitude: 40.7128,
  longitude: -74.006,
  title: 'Service Name',
  price: 100,
  type: 'listing'
}
```
**Shows:** 📍 with price tag

### Provider Marker
```tsx
{
  id: 'p1',
  latitude: 40.7128,
  longitude: -74.006,
  title: 'John Doe',
  type: 'provider',
  rating: 4.8,
  isVerified: true,
  reviewCount: 156,
  categories: ['Plumbing'],
  responseTime: '< 30 min',
  completionRate: 98
}
```
**Shows:** 👤 with rating tag and verified badge

---

## ⚙️ Common Props

| Prop | Type | Description |
|------|------|-------------|
| `markers` | `MapMarker[]` | Array of locations to display |
| `onMarkerPress` | `function` | Called when marker tapped |
| `initialRegion` | `MapRegion` | Starting camera position |
| `showUserLocation` | `boolean` | Show user's location |
| `showControls` | `boolean` | Show zoom/pan controls |
| `enableClustering` | `boolean` | Group nearby markers |

---

## 🔍 Platform Detection

```tsx
import { isNativeMapSupported } from '@/lib/mapbox-utils';

if (isNativeMapSupported()) {
  // Native Mapbox available (iOS/Android + token)
} else {
  // Web fallback active
}
```

---

## 🗺️ Map Styles

Available in `NativeInteractiveMapView`:
- Streets (default)
- Satellite
- Dark
- Light

Access via layers button (📐) on map.

---

## 🐛 Troubleshooting

### Maps Not Showing
1. Check `.env` has both tokens
2. Verify building native app (not Expo Go)
3. Check Platform.OS !== 'web'

### Token Errors
- Access token starts with `pk.`
- Download token starts with `sk.`
- Both must be active in Mapbox dashboard

### Performance Issues
- Enable clustering: `enableClustering={true}`
- Limit markers to ~200-300
- Filter by distance or bounds

---

## 📱 Platform Support

| Platform | Native Maps | Fallback |
|----------|-------------|----------|
| iOS | ✅ @rnmapbox/maps | - |
| Android | ✅ @rnmapbox/maps | - |
| Web | - | ✅ List view |
| Expo Go | ❌ Not supported | ✅ Web fallback |

---

## 🔐 Security Checklist

- ✅ Token removed from app.json
- ✅ Tokens in .env (not committed)
- ✅ .env in .gitignore
- ✅ Use environment variables only

---

## 📚 Full Documentation

For complete guide see: `docs/MAPBOX_NATIVE_INTEGRATION.md`

---

## 💡 Pro Tips

1. **Always use platform wrappers** - Auto-handles web/native
2. **Enable clustering** - Better performance with many markers
3. **Request location permissions** - Better UX with user location
4. **Cache geocoding results** - Avoid repeated API calls
5. **Test on device** - Simulators have limited features

---

## 🎯 Example: Complete Integration

```tsx
import { useState, useEffect } from 'react';
import { View } from 'react-native';
import InteractiveMapViewPlatform from '@/components/InteractiveMapViewPlatform';
import * as Location from 'expo-location';

export default function MapScreen() {
  const [listings, setListings] = useState([]);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Get user location
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }

    // Load listings from database
    const { data } = await supabase
      .from('service_listings')
      .select('*')
      .not('latitude', 'is', null);

    setListings(data.map(item => ({
      id: item.id,
      latitude: item.latitude,
      longitude: item.longitude,
      title: item.title,
      price: item.price_min,
      type: 'listing',
    })));
  };

  return (
    <View style={{ flex: 1 }}>
      <InteractiveMapViewPlatform
        markers={listings}
        initialRegion={userLocation}
        onMarkerPress={(marker) => {
          // Navigate to detail
        }}
        showControls={true}
        showUserLocation={true}
        enableClustering={true}
      />
    </View>
  );
}
```

---

**Get Started:** Add tokens → Use platform components → Build native app 🚀
