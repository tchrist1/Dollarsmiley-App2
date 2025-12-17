/**
 * Debug Configuration
 *
 * Control debug features and testing tools
 * Set ENABLE_DEBUG_MENU to false before production release
 */

export const DEBUG_CONFIG = {
  // Enable the full navigation burger menu for testing
  ENABLE_DEBUG_MENU: true,

  // Show debug info overlays
  SHOW_DEBUG_INFO: false,

  // Enable console logging
  VERBOSE_LOGGING: false,
} as const;

/**
 * Check if debug menu should be shown
 */
export const shouldShowDebugMenu = (): boolean => {
  // You can add additional checks here (e.g., dev environment only)
  return DEBUG_CONFIG.ENABLE_DEBUG_MENU && __DEV__;
};
