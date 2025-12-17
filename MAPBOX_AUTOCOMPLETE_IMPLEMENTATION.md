# Mapbox Smart Address Autocomplete Implementation

## Overview

Implemented smart address autocomplete using Mapbox Search API across all location and address search fields in the app. Users now get real-time, intelligent address suggestions as they type.

## Changes Made

### 1. Created Mapbox Search Utilities (`lib/mapbox-search.ts`)

A unified service module providing:
- `searchMapboxPlaces()` - Search for places with autocomplete
- `retrieveMapboxPlace()` - Get detailed place information
- `parseMapboxAddress()` - Parse Mapbox data into app format
- `reverseGeocode()` - Convert coordinates to addresses

### 2. Updated AddressInput Component

**Location**: `components/AddressInput.tsx`

**Enhancements**:
- Real-time Mapbox Search integration
- Debounced search (300ms) for optimal performance
- Smart suggestions dropdown with formatted addresses
- Automatic field population (street, city, state, zip, coordinates)
- Loading indicators during search
- Keyboard avoidance for better UX
- "Use current location" with Mapbox reverse geocoding

**Used in**:
- Post a Job → Street Address field

### 3. Updated LocationPicker Component

**Location**: `components/LocationPicker.tsx`

**Enhancements**:
- Mapbox Search for places, addresses, and POIs
- Modal bottom sheet with keyboard handling
- Rich suggestion display with name and formatted address
- Automatic coordinate extraction
- "Use Current Location" button

**Used in**:
- Community → Create Post → Add Location

### 4. Created MapboxAutocompleteInput Component

**Location**: `components/MapboxAutocompleteInput.tsx`

**Features**:
- Reusable autocomplete text input
- Configurable search types (place, locality, address, etc.)
- Dropdown suggestions above keyboard
- Clean, minimal UI matching app design

**Used in**:
- Filters → Location field

### 5. Configuration Updates

**File**: `app.json`
- Added Mapbox access token to `extra` config for runtime access

## Features

### Smart Autocomplete
- Suggestions appear after typing 3+ characters
- Real-time search with 300ms debounce
- Up to 10 relevant suggestions per search

### Auto-Fill Capability
When a user selects a suggestion:
- Street address
- City
- State
- Postal code
- Country
- Latitude/Longitude coordinates

All fields auto-populate instantly.

### Keyboard Handling
- Suggestions stay visible above keyboard
- Proper `KeyboardAvoidingView` implementation
- `keyboardShouldPersistTaps="handled"` for tap-through

### Visual Polish
- Loading indicators during search
- Empty state messages
- Rich suggestion cards with primary and secondary text
- Consistent styling across all implementations

## Search Types by Context

### Address Input (Post a Job)
- Types: `address`, `street`
- Country filter: US only
- Focus: Precise street addresses

### Location Picker (Create Post)
- Types: `place`, `locality`, `address`, `poi`
- No country filter (global)
- Focus: Broad locations including landmarks

### Filter Location Input
- Types: `place`, `locality`, `postcode`, `neighborhood`
- No country filter
- Focus: Areas and neighborhoods

## Performance Optimizations

1. **Debouncing**: 300ms delay prevents excessive API calls
2. **Request Cancellation**: Previous requests canceled when new text entered
3. **Lazy Loading**: Suggestions only appear when needed
4. **Nested Scrolling**: Optimized for scrollable parent containers

## Testing Instructions

### Test AddressInput (Post a Job)
1. Navigate to Post a Job screen
2. Tap "Street Address" field
3. Type "123 Main" - watch suggestions appear
4. Select a suggestion
5. Verify all fields auto-fill (street, city, state, zip)
6. Verify keyboard doesn't cover suggestions

### Test LocationPicker (Create Post)
1. Navigate to Community → Create Post
2. Tap "Add Location"
3. Type a city or place name
4. Select from suggestions
5. Verify location appears as selected
6. Verify keyboard doesn't cover modal

### Test Filter Location
1. Open any listing search
2. Tap Filters
3. Find Location input
4. Type a city name
5. Select from autocomplete dropdown
6. Verify location is set

### Test Current Location
1. In any location field, tap "Use Current Location"
2. Grant location permissions if prompted
3. Verify Mapbox reverse geocoding fills in your address
4. Check that coordinates are captured

## API Usage

All requests use the Mapbox Search API v1:
- Suggest endpoint: `https://api.mapbox.com/search/searchbox/v1/suggest`
- Retrieve endpoint: `https://api.mapbox.com/search/searchbox/v1/retrieve`
- Reverse geocode: `https://api.mapbox.com/search/geocode/v6/reverse`

Access token configured in:
- `.env` as `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`
- `app.json` extra config as `mapboxAccessToken`

## Consistency Across App

All location/address inputs now share:
- Same Mapbox Search API integration
- Unified styling and behavior
- Consistent keyboard handling
- Same auto-fill logic
- Matching suggestion display format

## Future Enhancements

Potential improvements:
- Add user's location as proximity bias
- Cache recent searches
- Show search history
- Add map preview in suggestions
- Support multiple countries with country picker
