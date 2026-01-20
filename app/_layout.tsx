import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';

LogBox.ignoreLogs([
  'Unable to activate keep awake',
  'Uncaught (in promise',
  'keep awake',
  'Error: Uncaught',
  'Unable to activate',
  'keepawake',
  'KeepAwake',
]);

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const originalHandler = window.onunhandledrejection;
  window.onunhandledrejection = (event: any) => {
    const message = event?.reason?.message || event?.reason || '';
    const messageStr = String(message).toLowerCase();
    if (
      messageStr.includes('keep awake') ||
      messageStr.includes('unable to activate') ||
      messageStr.includes('keepawake')
    ) {
      event.preventDefault();
      return;
    }
    if (originalHandler) {
      originalHandler.call(window, event);
    }
  };

  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const message = args.join(' ').toLowerCase();
    if (
      message.includes('keep awake') ||
      message.includes('unable to activate') ||
      message.includes('keepawake')
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args.join(' ').toLowerCase();
    if (
      message.includes('keep awake') ||
      message.includes('unable to activate') ||
      message.includes('keepawake')
    ) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };
}

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

let StripeProvider: any = ({ children }: any) => children;

if (Platform.OS !== 'web') {
  const stripe = require('@stripe/stripe-react-native');
  StripeProvider = stripe.StripeProvider;

  // Initialize Mapbox once for native platforms
  try {
    const Mapbox = require('@rnmapbox/maps').default;
    const nativeModules = require('../config/native-modules');
    if (nativeModules.MAPBOX_CONFIG?.accessToken) {
      Mapbox.setAccessToken(nativeModules.MAPBOX_CONFIG.accessToken);
    }
  } catch (error) {
    console.warn('Failed to initialize Mapbox:', error);
  }
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
          <AuthProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </AuthProvider>
        </StripeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
