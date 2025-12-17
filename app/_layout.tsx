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
]);

if (typeof window !== 'undefined') {
  const originalHandler = window.onunhandledrejection;
  window.onunhandledrejection = (event: any) => {
    const message = event?.reason?.message || event?.reason || '';
    if (String(message).includes('keep awake') || String(message).includes('Unable to activate')) {
      event.preventDefault();
      return;
    }
    if (originalHandler) {
      originalHandler.call(window, event);
    }
  };
}

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

let StripeProvider: any = ({ children }: any) => children;

if (Platform.OS !== 'web') {
  const stripe = require('@stripe/stripe-react-native');
  StripeProvider = stripe.StripeProvider;
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
