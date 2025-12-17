# Mapbox Search Session Token Implementation

## Problem
The Mapbox Search Box API v1 `/suggest` and `/retrieve` endpoints require a mandatory `session_token` parameter for all requests. Without this parameter, the API returns empty results or errors, causing the address autocomplete to show "No address found" even for valid addresses.

## Solution
Added session token support to all Mapbox search implementations across the application.

## Changes Made

### 1. Core Library Updates (`lib/mapbox-search.ts`)

#### Added Session Token Generator
```typescript
import uuid from 'react-native-uuid';

export function generateSessionToken(): string {
  return uuid.v4() as string;
}
```

#### Updated `searchMapboxPlaces` Function
- Added `sessionToken` parameter to the options interface
- Automatically generates session token if not provided
- Includes session token in API request URL parameters
- Logs session token for debugging purposes

#### Updated `retrieveMapboxPlace` Function
- Added `sessionToken` parameter
- Automatically generates session token if not provided
- Includes session token in API request URL parameters
- Logs session token for debugging purposes

### 2. Component Updates

#### MapboxAutocompleteInput Component
- Added session token state management
- Generates new session token on component mount
- Passes session token to `searchMapboxPlaces`
- Passes session token to `retrieveMapboxPlace`
- Regenerates session token after place selection
- Regenerates session token when input is cleared

#### AddressInput Component
- Added session token state management
- Generates new session token on component mount
- Passes session token to `searchMapboxPlaces`
- Passes session token to `retrieveMapboxPlace`
- Regenerates session token after address selection
- Regenerates session token when input is cleared

#### LocationPicker Component
- Added session token state management
- Generates new session token on component mount
- Passes session token to `searchMapboxPlaces`
- Passes session token to `retrieveMapboxPlace`
- Regenerates session token after location selection
- Regenerates session token when search is cleared

## Session Token Lifecycle

### Session Start
A new session token is generated when:
- The component mounts
- The user clears the input field
- A place/address is successfully selected

### Session Usage
The same session token is used for:
- Multiple `/suggest` calls as the user types
- The final `/retrieve` call when a suggestion is selected

### Session End
A session ends when:
- A `/retrieve` call is made with the session token
- 50 consecutive `/suggest` calls are made without a `/retrieve`
- 60 minutes pass without a `/retrieve` call

## Benefits

1. **API Compliance**: Properly implements Mapbox Search Box API v1 requirements
2. **Billing Accuracy**: Sessions are properly grouped for billing purposes
3. **Analytics**: Enables Mapbox to track search sessions for analytics
4. **User Experience**: Address autocomplete now works correctly with valid suggestions

## Testing

To verify the fix:
1. Open any form with address autocomplete (e.g., FilterModal, post-job flow)
2. Type an address (minimum 3 characters)
3. Verify that address suggestions appear
4. Select a suggestion
5. Verify the address is populated correctly
6. Check console logs to see session tokens in use

## References

- [Mapbox Search Box API Documentation](https://docs.mapbox.com/api/search/search-box/)
- [Mapbox Search Session Documentation](https://docs.mapbox.com/mapbox-search-js/api/core/search_session/)
- [Session Token Requirements](https://docs.mapbox.com/playground/search-box/)

## Notes

- Session tokens are UUIDv4 strings
- The same token must be used for related suggest/retrieve calls
- A new token should be generated for each new search session
- Session tokens are logged for debugging purposes
