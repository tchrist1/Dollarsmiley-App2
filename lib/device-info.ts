/**
 * Device Information Utilities
 * Provides access to device and application information
 */

import * as Application from 'expo-application';
import * as Device from 'expo-device';
import DeviceInfo from 'react-native-device-info';
import * as Network from 'expo-network';
import * as Localization from 'expo-localization';

/**
 * Get comprehensive device information
 */
export async function getDeviceInfo() {
  const [networkState, ipAddress] = await Promise.all([
    Network.getNetworkStateAsync(),
    Network.getIpAddressAsync().catch(() => null),
  ]);

  return {
    // Application Info
    appName: Application.applicationName,
    appVersion: Application.nativeApplicationVersion,
    buildNumber: Application.nativeBuildVersion,
    bundleId: Application.applicationId,

    // Device Info (Expo)
    deviceName: Device.deviceName,
    deviceType: Device.deviceType,
    manufacturer: Device.manufacturer,
    modelName: Device.modelName,
    osName: Device.osName,
    osVersion: Device.osVersion,
    platformApiLevel: Device.platformApiLevel,
    brand: Device.brand,
    designName: Device.designName,
    productName: Device.productName,
    totalMemory: Device.totalMemory,
    supportedCpuArchitectures: Device.supportedCpuArchitectures,

    // Device Info (react-native-device-info)
    uniqueId: DeviceInfo.getUniqueIdSync(),
    deviceId: DeviceInfo.getDeviceId(),
    systemName: DeviceInfo.getSystemName(),
    systemVersion: DeviceInfo.getSystemVersion(),
    buildId: DeviceInfo.getBuildIdSync(),
    readableVersion: DeviceInfo.getReadableVersion(),
    deviceType: DeviceInfo.getDeviceType(),
    isTablet: DeviceInfo.isTablet(),
    hasNotch: DeviceInfo.hasNotch(),
    hasDynamicIsland: DeviceInfo.hasDynamicIsland(),
    fontScale: DeviceInfo.getFontScaleSync(),

    // Network Info
    networkType: networkState.type,
    isConnected: networkState.isConnected,
    isInternetReachable: networkState.isInternetReachable,
    ipAddress,

    // Localization
    locale: Localization.locale,
    locales: Localization.locales,
    timezone: Localization.timezone,
    isRTL: Localization.isRTL,
    currency: Localization.currency,
    region: Localization.region,
  };
}

/**
 * Get network status
 */
export async function getNetworkStatus() {
  const state = await Network.getNetworkStateAsync();
  return {
    isConnected: state.isConnected,
    isInternetReachable: state.isInternetReachable,
    type: state.type,
  };
}

/**
 * Check if device has network connection
 */
export async function isOnline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return state.isConnected === true && state.isInternetReachable === true;
}

/**
 * Get user locale information
 */
export function getLocaleInfo() {
  return {
    locale: Localization.locale,
    locales: Localization.locales,
    timezone: Localization.timezone,
    isRTL: Localization.isRTL,
    currency: Localization.currency,
    region: Localization.region,
  };
}

/**
 * Get device capabilities
 */
export function getDeviceCapabilities() {
  return {
    hasNotch: DeviceInfo.hasNotch(),
    hasDynamicIsland: DeviceInfo.hasDynamicIsland(),
    isTablet: DeviceInfo.isTablet(),
    isEmulator: DeviceInfo.isEmulatorSync(),
    supportsVibration: true, // Most devices support this
  };
}

/**
 * Get app metadata for analytics
 */
export function getAppMetadata() {
  return {
    name: Application.applicationName,
    version: Application.nativeApplicationVersion,
    build: Application.nativeBuildVersion,
    bundleId: Application.applicationId,
    installTime: Application.getInstallationTimeAsync(),
  };
}

/**
 * Check if app needs update
 */
export async function checkAppVersion(latestVersion: string): Promise<boolean> {
  const currentVersion = Application.nativeApplicationVersion;
  if (!currentVersion) return false;

  // Simple version comparison (you might want a more robust solution)
  return currentVersion < latestVersion;
}
