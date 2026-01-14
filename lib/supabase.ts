import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Fallback credentials for development
const FALLBACK_URL = 'https://lmjaeulvzxiszyoiegsw.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtamFldWx2enhpc3p5b2llZ3N3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDQ3NTYsImV4cCI6MjA3OTgyMDc1Nn0.8nnSwErmg3Ri8ji7hkgtgDuznGCQ2JEB4B_CQuekEcI';

const supabaseUrl =
  Constants.expoConfig?.extra?.supabaseUrl ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  FALLBACK_URL;

const supabaseAnonKey =
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  FALLBACK_KEY;

console.log('🔧 Supabase Configuration:');
console.log('  Source:', Constants.expoConfig?.extra?.supabaseUrl ? 'Config' : process.env.EXPO_PUBLIC_SUPABASE_URL ? 'Env' : 'Fallback');
console.log('  URL:', supabaseUrl);
console.log('  Key Present:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials');
} else {
  console.log('✅ Supabase client initialized');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
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
