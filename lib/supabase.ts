import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env file.');
  console.error('Supabase URL:', supabaseUrl ? '✓ Present' : '✗ Missing');
  console.error('Supabase Anon Key:', supabaseAnonKey ? '✓ Present' : '✗ Missing');
} else {
  console.log('✓ Supabase initialized successfully');
  console.log('URL:', supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'x-client-info': 'dollarsmiley-mobile',
    },
  },
});

export async function clearAuthStorage() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const authKeys = keys.filter(key =>
      key.includes('supabase') ||
      key.includes('auth') ||
      key.includes('session')
    );

    if (authKeys.length > 0) {
      await AsyncStorage.multiRemove(authKeys);
      console.log('Cleared auth storage keys:', authKeys);
    }
  } catch (error) {
    console.error('Error clearing auth storage:', error);
  }
}
