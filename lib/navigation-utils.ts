import { router } from 'expo-router';

/**
 * Navigates back to the previous screen in the navigation stack.
 *
 * This function uses Expo Router's built-in `router.back()` which:
 * - Navigates to the immediately previous screen if there is navigation history
 * - Stays on the current screen if there's no history (edge case)
 * - NEVER forces navigation to Home unless Home was actually the previous screen
 *
 * This ensures consistent back navigation behavior across the entire app,
 * preventing unexpected jumps to the Home screen.
 *
 * Usage:
 * ```tsx
 * import { safeGoBack } from '@/lib/navigation-utils';
 * <TouchableOpacity onPress={safeGoBack}>
 *   <ArrowLeft size={24} />
 * </TouchableOpacity>
 * ```
 */
export function safeGoBack() {
  router.back();
}
