/**
 * Mapbox Maps Components
 *
 * Platform-aware map components that automatically use native Mapbox SDK
 * on iOS/Android and fallback to web-compatible views on web platforms.
 */

// Platform-aware components (RECOMMENDED)
export { default as MapViewPlatform } from '../MapViewPlatform';
export { default as InteractiveMapViewPlatform } from '../InteractiveMapViewPlatform';

// Native implementations (iOS/Android only)
export { default as NativeMapView } from '../NativeMapView';
export { default as NativeInteractiveMapView } from '../NativeInteractiveMapView';

// Web fallbacks
export { default as MapView } from '../MapView';
export { default as InteractiveMapView } from '../InteractiveMapView';

// Utilities
export * from '../../lib/mapbox-utils';

// Re-export common types for convenience
export type {
  MapboxLocation,
  MapboxBounds,
  MapboxRegion,
} from '../../lib/mapbox-utils';
