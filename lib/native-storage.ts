/**
 * Native Storage Utilities
 * Using AsyncStorage for persistent storage and SecureStore for sensitive data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * AsyncStorage Operations (Persistent, Async)
 * Use for non-sensitive data that needs persistent storage
 */
export const asyncStorage = {
  getString: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setString: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('AsyncStorage setString error:', error);
    }
  },

  delete: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('AsyncStorage delete error:', error);
    }
  },

  clearAll: async (): Promise<void> => {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('AsyncStorage clearAll error:', error);
    }
  },

  getAllKeys: async (): Promise<string[]> => {
    try {
      return await AsyncStorage.getAllKeys();
    } catch {
      return [];
    }
  },
};

/**
 * Secure Storage Operations (Encrypted, Async)
 * Use for sensitive data like tokens, keys, credentials
 */
export const secureStorage = {
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(key, value);
  },

  getItem: async (key: string): Promise<string | null> => {
    return await SecureStore.getItemAsync(key);
  },

  deleteItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key);
  },
};

/**
 * Convenience functions for common storage patterns
 */
export const nativeStorage = {
  // Save user preferences (non-sensitive)
  savePreference: async (key: string, value: any): Promise<void> => {
    await asyncStorage.setString(key, JSON.stringify(value));
  },

  getPreference: async <T>(key: string): Promise<T | null> => {
    const value = await asyncStorage.getString(key);
    return value ? JSON.parse(value) : null;
  },

  // Save auth tokens (sensitive)
  saveAuthToken: async (token: string): Promise<void> => {
    await secureStorage.setItem('auth_token', token);
  },

  getAuthToken: async (): Promise<string | null> => {
    return await secureStorage.getItem('auth_token');
  },

  clearAuthToken: async (): Promise<void> => {
    await secureStorage.deleteItem('auth_token');
  },

  // Cache management
  setCache: async (key: string, data: any, ttl?: number): Promise<void> => {
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl: ttl || 3600000, // 1 hour default
    };
    await asyncStorage.setString(`cache_${key}`, JSON.stringify(cacheData));
  },

  getCache: async <T>(key: string): Promise<T | null> => {
    const cached = await asyncStorage.getString(`cache_${key}`);
    if (!cached) return null;

    try {
      const { data, timestamp, ttl } = JSON.parse(cached);
      if (Date.now() - timestamp > ttl) {
        await asyncStorage.delete(`cache_${key}`);
        return null;
      }
      return data as T;
    } catch {
      return null;
    }
  },

  clearCache: async (): Promise<void> => {
    const keys = await asyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith('cache_'));
    await Promise.all(cacheKeys.map((key) => asyncStorage.delete(key)));
  },
};
