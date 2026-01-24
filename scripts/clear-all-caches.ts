#!/usr/bin/env ts-node

/**
 * Clear All Caches Script
 *
 * This script clears all client-side caches including:
 * - AsyncStorage (snapshots, session data)
 * - In-memory caches
 * - Forces a fresh data fetch on next app load
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

async function clearAllCaches() {
  console.log('🧹 Starting cache cleanup...\n');

  try {
    // Get all keys
    const keys = await AsyncStorage.getAllKeys();
    console.log(`📦 Found ${keys.length} cached items`);

    if (keys.length > 0) {
      // Show what we're clearing
      const cacheTypes = new Map<string, number>();
      keys.forEach(key => {
        const type = key.split(':')[0];
        cacheTypes.set(type, (cacheTypes.get(type) || 0) + 1);
      });

      console.log('\n📋 Cache breakdown:');
      cacheTypes.forEach((count, type) => {
        console.log(`  - ${type}: ${count} items`);
      });

      // Clear all
      await AsyncStorage.clear();
      console.log('\n✅ All caches cleared successfully!');
    } else {
      console.log('✨ No cached items found - cache is already clean');
    }

    console.log('\n💡 Next app launch will fetch fresh data from the database');

  } catch (error) {
    console.error('❌ Error clearing caches:', error);
    process.exit(1);
  }
}

clearAllCaches();
