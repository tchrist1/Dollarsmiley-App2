import { router } from 'expo-router';

/**
 * Navigates back to the previous screen.
 * Uses router.back() to return to the immediately previous screen in the navigation stack.
 *
 * This function ignores any fallback routes and always uses router.back().
 * Expo Router maintains its own navigation stack, and router.back() will:
 * - Go to the previous screen if there is navigation history
 * - Stay on the current screen if there's no history (edge case)
 * - Never force navigation to Home unless Home was actually the previous screen
 *
 * Usage:
 * ```tsx
 * import { safeGoBack } from '@/lib/navigation-utils';
 * <TouchableOpacity onPress={() => safeGoBack()}>
 * ```
 */
export function safeGoBack(_fallbackRoute?: string) {
  router.back();
}
