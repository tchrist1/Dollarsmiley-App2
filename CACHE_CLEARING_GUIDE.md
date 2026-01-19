# Cache Clearing Guide

## Issue
Your database has 71 active service listings and 4 open jobs, but the home screen shows "No listings available right now."

This is caused by stale cache data on the frontend.

## Solution

### Method 1: Use the Debug Menu (Recommended)
1. Open the app
2. Tap the "Menu" button in the bottom tab bar (far right)
3. Scroll down to the "Debug Actions" section
4. Tap "Clear All Caches"
5. You'll see a message: "All caches cleared. Pull down to refresh."
6. Go back to the Home screen
7. Pull down on the home screen to refresh the data
8. Listings should now appear!

### Method 2: Use Developer Console
If you're in dev mode with Expo:
1. Open the Expo Dev Tools or your browser console
2. Run: `forceRefreshAllData()`
3. Go to the Home screen in the app
4. Pull down to refresh

### Method 3: Restart the App
Simply close and reopen the app. The cache will expire after 3 minutes.

## What Was Fixed
1. Added `forceRefreshAllData()` utility function to clear all caches
2. Added "Clear All Caches" button to the Debug Menu
3. Added "View Cache Status" button to inspect cache state

## Data Verification
Your database currently contains:
- ✅ 71 active service listings
- ✅ 4 open jobs
- ✅ 24 profiles
- ✅ 85 active categories

All data is accessible and properly configured with RLS policies.

## Prevention
The cache automatically expires after 3 minutes for normal use. This issue typically only occurs during development when you're making database changes.
