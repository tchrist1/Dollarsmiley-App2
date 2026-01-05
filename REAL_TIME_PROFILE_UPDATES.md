# Real-Time Profile Update System

## Overview

This app implements a comprehensive real-time profile update system that ensures profile changes are immediately reflected across all screens without requiring app restart.

## Implementation

### 1. AuthContext with Real-Time Subscriptions

The `AuthContext` (`contexts/AuthContext.tsx`) provides:

- **Profile State Management**: Centralized profile state accessible app-wide
- **Real-Time Subscriptions**: Automatic profile updates via Supabase Realtime
- **Manual Refresh**: `refreshProfile()` function for forced updates
- **Cache Busting**: Image URLs include timestamps to prevent stale images

```typescript
const { profile, refreshProfile } = useAuth();
```

### 2. Real-Time Subscription Mechanism

When a user is authenticated, the AuthContext subscribes to profile changes:

```typescript
useEffect(() => {
  if (!user) return;

  const profileSubscription = supabase
    .channel(`profile:${user.id}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`,
      },
      (payload) => {
        setProfile(payload.new as Profile);
      }
    )
    .subscribe();

  return () => {
    profileSubscription.unsubscribe();
  };
}, [user]);
```

### 3. Profile Update Flow

When a profile is updated:

1. **Save to Database**: Update profile in Supabase
2. **Refresh Profile**: Call `refreshProfile()` to force state update
3. **Real-Time Broadcast**: Supabase automatically broadcasts changes
4. **UI Re-render**: All components consuming `profile` re-render instantly

### 4. Avatar Cache Busting

Avatar URLs include timestamps to prevent browser/app caching:

```typescript
const urlWithCacheBusting = `${urlData.publicUrl}?t=${Date.now()}`;
```

### 5. CachedAvatar Component

Use the `CachedAvatar` component for displaying user avatars:

```typescript
import CachedAvatar from '@/components/CachedAvatar';

<CachedAvatar
  uri={profile.avatar_url}
  size={120}
  fallbackIconSize={48}
/>
```

**Features:**
- Automatic cache busting
- Fallback to placeholder icon
- Error handling
- Consistent styling

## Best Practices for Developers

### Always Use AuthContext Profile

✅ **Correct:**
```typescript
const { profile } = useAuth();

return <Text>{profile.full_name}</Text>;
```

❌ **Incorrect:**
```typescript
const [profile, setProfile] = useState(null);

useEffect(() => {
  // Fetching profile directly - won't get real-time updates
  fetchProfile();
}, []);
```

### Call refreshProfile After Updates

When updating profile data, always call `refreshProfile()`:

```typescript
const { refreshProfile } = useAuth();

async function updateProfile(data) {
  await supabase.from('profiles').update(data).eq('id', userId);
  await refreshProfile(); // Force immediate update
}
```

### Use CachedAvatar for Avatars

Replace direct Image components with CachedAvatar:

```typescript
// Before
<Image source={{ uri: profile.avatar_url }} style={styles.avatar} />

// After
<CachedAvatar uri={profile.avatar_url} size={48} />
```

### Subscribe to Profile Changes in Components

For components that need to react to profile changes:

```typescript
const { profile } = useAuth();

useEffect(() => {
  // This will automatically re-run when profile changes
  updateLocalState(profile);
}, [profile]);
```

## Testing Real-Time Updates

1. Open the app on two devices/simulators
2. Edit profile on Device A
3. Verify changes appear instantly on Device B (within ~1 second)
4. Check that avatar updates appear without app restart
5. Verify all profile fields update (name, bio, location, phone)

## Components Updated

The following components have been updated to use real-time profile data:

- ✅ `app/(tabs)/profile.tsx` - Uses CachedAvatar and AuthContext
- ✅ `app/settings/edit-profile.tsx` - Calls refreshProfile() after save
- ✅ `contexts/AuthContext.tsx` - Real-time subscriptions implemented
- ✅ `lib/avatar-upload.ts` - Cache busting on uploads
- ✅ `components/CachedAvatar.tsx` - New component for consistent avatars

## Troubleshooting

### Profile Not Updating Immediately

1. Verify `refreshProfile()` is called after database update
2. Check Supabase Realtime is enabled for the profiles table
3. Ensure component is using `profile` from `useAuth()`

### Avatar Not Updating

1. Verify cache-busting timestamp is in URL
2. Use `CachedAvatar` component instead of direct Image
3. Check that avatar upload includes timestamp parameter

### Stale Data in Components

1. Ensure component uses `profile` from `useAuth()`, not local state
2. Add `profile` to useEffect dependency array
3. Verify component re-renders when profile changes

## Performance Considerations

- **Single Subscription**: One real-time subscription per user session
- **Efficient Updates**: Only updates when profile actually changes
- **Smart Caching**: Cache busting only for avatars, not all profile data
- **Minimal Re-renders**: Components only re-render when profile changes

## Future Enhancements

- [ ] Optimistic UI updates (update UI before server confirms)
- [ ] Offline support with sync on reconnect
- [ ] Profile update notifications across devices
- [ ] Conflict resolution for simultaneous edits
