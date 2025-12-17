/**
 * Native Modules Configuration
 *
 * This file contains configuration and initialization for native modules
 * installed for the Dollarsmiley app.
 */

// Mapbox Maps Configuration
export const MAPBOX_CONFIG = {
  // Get your access token from https://account.mapbox.com/access-tokens/
  accessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
  // Download token for iOS builds (add to app.json)
  downloadToken: process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN || '',
};

// MMKV Storage Configuration
export const MMKV_CONFIG = {
  id: 'dollarsmiley-storage',
  encryptionKey: process.env.EXPO_PUBLIC_MMKV_ENCRYPTION_KEY || undefined,
};

// Background Fetch Configuration
export const BACKGROUND_FETCH_CONFIG = {
  taskName: 'DOLLARSMILEY_BACKGROUND_FETCH',
  minimumInterval: 15 * 60, // 15 minutes minimum
};

// Task Manager Configuration
export const TASK_MANAGER_CONFIG = {
  locationTask: 'DOLLARSMILEY_LOCATION_TASK',
  backgroundFetchTask: 'DOLLARSMILEY_BACKGROUND_FETCH',
};

// Network Configuration
export const NETWORK_CONFIG = {
  // Add any network-specific configuration here
};

// Application Info
export const APP_CONFIG = {
  name: 'Dollarsmiley',
  version: '1.0.0',
};

/**
 * Module Availability Checkers
 * These help determine if a module is available on the current platform
 */
export const isModuleAvailable = {
  maps: true,
  mmkv: true,
  secureStore: true,
  contacts: true,
  mediaLibrary: true,
  backgroundFetch: true,
  taskManager: true,
  updates: true,
  network: true,
  localization: true,
  deviceInfo: true,
};

/**
 * Notes on Deprecated/Removed Libraries:
 *
 * 1. expo-permissions - DEPRECATED (SDK 41+)
 *    - Use individual permission APIs from each module
 *    - Example: Camera.requestCameraPermissionsAsync()
 *
 * 2. expo-error-recovery - REMOVED
 *    - Use ErrorBoundary component from react-error-boundary
 *    - Or implement custom error handling
 *
 * 3. expo-analytics-amplitude - DEPRECATED
 *    - Use @amplitude/analytics-react-native directly
 *    - Or use analytics service of choice
 */
