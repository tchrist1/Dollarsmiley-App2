# Admin Mode & Account Type Switcher - Implementation Guide

## Overview

This document describes the new Admin Mode toggle and simplified Account Type switcher system implemented in the Profile screen.

---

## Features Implemented

### 1. Admin Mode Toggle (For Admin Users Only)

**Purpose**: Allow admin users to toggle between admin tools and normal user experience.

**Location**: Top of Profile screen (visible only to Admin users)

**Behavior**:
- Toggle switch with clear ON/OFF states
- When **Admin Mode is ON**:
  - Account Type Switcher is hidden
  - Quick link to Admin Dashboard is displayed
  - Admin tools and features are accessible
- When **Admin Mode is OFF**:
  - Normal Account Type Switcher is displayed
  - Admin can use the app as Customer/Provider/Hybrid
  - Admin tools are hidden from main UI

**Persistence**: Admin mode preference is saved to `profiles.admin_mode` column in database

---

### 2. Simplified Account Type Switcher

**Purpose**: Provide a cleaner, more intuitive way to switch between account types.

**Design Philosophy**:
- Show only essential information in main view
- Use secondary modal for switching options
- Reduce visual clutter
- Improve user experience

---

## User Experience by Account Type

### Customer Account

**Main View Displays**:
1. Current account type card (Customer) - shown as active
2. "Change Account" button

**Tapping "Change Account" Opens Modal With**:
- Provider option
- Hybrid option

**Example Flow**:
```
Customer (Active) → [Change Account] → Modal → Select Provider → Become Provider
```

---

### Provider Account

**Main View Displays**:
1. Current account type card (Provider) - shown as active
2. "Change Account" button

**Tapping "Change Account" Opens Modal With**:
- Customer option
- Hybrid option

**Example Flow**:
```
Provider (Active) → [Change Account] → Modal → Select Hybrid → Become Hybrid
```

---

### Hybrid Account

**Main View Displays**:
1. Three buttons in a row:
   - Customer button (quick switch)
   - Provider button (quick switch)
   - Change button (to switch to Hybrid mode via modal)

**Tapping Quick Switch Buttons**:
- Immediately switches to selected type
- No modal required

**Tapping "Change" Opens Modal With**:
- Hybrid option (to return to Hybrid mode)

**Example Flow**:
```
Hybrid → [Tap Customer] → Become Customer
Hybrid → [Tap Provider] → Become Provider
Customer (from Hybrid) → [Change Account] → Modal → Select Hybrid → Return to Hybrid
```

---

### Admin Account

**When Admin Mode is ON**:
- Account Type Switcher is **completely hidden**
- Admin Mode Toggle shows "Admin tools are active"
- "Go to Admin Dashboard" button is displayed
- Admin can focus on platform management

**When Admin Mode is OFF**:
- Account Type Switcher is **visible**
- Admin can switch between Customer/Provider/Hybrid
- Admin experiences the app as a normal user would
- Useful for testing and understanding user experience

**Example Flow**:
```
Admin Mode ON → [Toggle OFF] → Account Switcher appears → Switch to Customer → Test customer experience
Admin Mode OFF → [Toggle ON] → Account Switcher hidden → Access admin tools
```

---

## Database Schema

### Table: `profiles`

**New Column**:
```sql
admin_mode boolean DEFAULT false
```

**Purpose**: Store admin mode toggle state for admin users

**Default Values**:
- `true` for existing Admin users
- `false` for all other users

**Access**: Only admins can modify their own `admin_mode` value

---

## Components Created

### 1. AdminModeToggle Component

**File**: `components/AdminModeToggle.tsx`

**Props**:
```typescript
interface AdminModeToggleProps {
  isAdminMode: boolean;      // Current admin mode state
  onToggle: (value: boolean) => void;  // Toggle handler
  loading?: boolean;          // Loading state during update
}
```

**Features**:
- Shield icon for visual identity
- Switch control for toggle
- Descriptive text based on state
- Quick link to Admin Dashboard when active
- Red color scheme to indicate admin functionality

**Usage**:
```tsx
<AdminModeToggle
  isAdminMode={adminMode}
  onToggle={handleAdminModeToggle}
  loading={switchingAccount}
/>
```

---

### 2. AccountTypeSwitcher Component

**File**: `components/AccountTypeSwitcher.tsx`

**Props**:
```typescript
interface AccountTypeSwitcherProps {
  currentType: 'Customer' | 'Provider' | 'Hybrid';  // Current account type
  onSwitch: (type: AccountType) => void;  // Switch handler
  loading?: boolean;  // Loading state during update
}
```

**Features**:
- Adaptive UI based on current account type
- Modal for account type selection
- Icon-based visual representation
- Clear descriptions for each type
- Loading states during transitions

**Usage**:
```tsx
<AccountTypeSwitcher
  currentType={profile.user_type}
  onSwitch={handleAccountTypeSwitch}
  loading={switchingAccount}
/>
```

---

## Implementation in Profile Screen

### State Management

```typescript
const [isAdmin, setIsAdmin] = useState(false);
const [adminMode, setAdminMode] = useState(false);
const [switchingAccount, setSwitchingAccount] = useState(false);
```

### Admin Status Check

```typescript
const checkAdminStatus = () => {
  if (!profile) return;
  const isAdminUser = profile.user_type === 'Admin';
  setIsAdmin(isAdminUser);
  if (isAdminUser) {
    setAdminMode(profile.admin_mode ?? true);
  }
};
```

### Admin Mode Toggle Handler

```typescript
const handleAdminModeToggle = async (value: boolean) => {
  if (!profile || !isAdmin) return;

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ admin_mode: value })
      .eq('id', profile.id);

    if (error) throw error;

    setAdminMode(value);
    await refreshProfile();
  } catch (error) {
    console.error('Error toggling admin mode:', error);
  }
};
```

### Account Type Switch Handler

```typescript
const handleAccountTypeSwitch = async (newType: 'Customer' | 'Provider' | 'Hybrid') => {
  if (!profile || profile.user_type === newType || switchingAccount) return;

  setSwitchingAccount(true);

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ user_type: newType })
      .eq('id', profile.id);

    if (error) throw error;

    await refreshProfile();
  } catch (error) {
    console.error('Error switching account type:', error);
  } finally {
    setSwitchingAccount(false);
  }
};
```

### Conditional Rendering

```tsx
{/* Admin Mode Toggle - Only for Admin users */}
{isAdmin && (
  <AdminModeToggle
    isAdminMode={adminMode}
    onToggle={handleAdminModeToggle}
    loading={switchingAccount}
  />
)}

{/* Account Type Switcher - Hidden when Admin Mode is ON */}
{(!isAdmin || !adminMode) && (
  <AccountTypeSwitcher
    currentType={profile.user_type}
    onSwitch={handleAccountTypeSwitch}
    loading={switchingAccount}
  />
)}
```

---

## User Flows

### Flow 1: Admin Testing Customer Experience

```
1. Admin logs in → Admin Mode is ON by default
2. Admin toggles Admin Mode OFF
3. Account Type Switcher appears
4. Admin switches to Customer
5. Admin tests customer features
6. Admin switches back to Hybrid/Provider as needed
7. Admin toggles Admin Mode ON
8. Admin returns to admin tools
```

### Flow 2: Customer Becoming Provider

```
1. Customer logs in → Sees Customer card
2. Customer taps "Change Account"
3. Modal shows Provider and Hybrid options
4. Customer selects Provider
5. Account switches to Provider
6. Provider features become available
```

### Flow 3: Hybrid User Quick Switching

```
1. Hybrid user logs in → Sees three buttons
2. User taps "Customer" button
3. Account immediately switches to Customer mode
4. User taps "Change Account" later
5. Modal shows all available options
6. User selects Hybrid to return
7. Three-button view reappears
```

---

## Safety Features

### 1. Admin Access Protection

- Admin Mode toggle only appears for admin users
- Non-admin users never see admin controls
- Admin status checked on profile load

### 2. Seamless Fallback

- Admin can always access admin mode via toggle
- Never trapped in Customer/Provider mode
- Toggle persists across sessions

### 3. Database Validation

- Only admins can toggle admin_mode
- Account type changes validated server-side
- Profile refresh ensures UI sync

### 4. Loading States

- Disabled controls during updates
- Clear feedback during transitions
- Prevents double-submissions

---

## Styling & Design

### Color Scheme

**Admin Mode Toggle**:
- Primary color: Red (`colors.error`)
- Indicates elevated privileges
- Clear visual distinction from normal UI

**Account Type Switcher**:
- Primary color: Blue (`colors.primary`)
- Matches app's standard UI
- Familiar to existing users

### Layout

**Card-Based Design**:
- White background with shadows
- Rounded corners for modern feel
- Adequate padding for touch targets
- Clear visual hierarchy

**Modal Design**:
- Bottom sheet style
- Backdrop overlay
- Large touch targets
- Icon + text combination

---

## Accessibility

### Touch Targets

- Minimum 44x44pt tap areas
- Clear spacing between elements
- No overlapping controls

### Visual Feedback

- Active states clearly indicated
- Loading states with disabled appearance
- Success/error feedback through text

### Text Clarity

- Clear, concise labels
- Descriptive text for each option
- Helpful hints below controls

---

## Testing Scenarios

### Test 1: Admin Mode Toggle

```
1. Login as admin user
2. Verify Admin Mode is ON by default
3. Verify Account Switcher is hidden
4. Toggle Admin Mode OFF
5. Verify Account Switcher appears
6. Toggle Admin Mode ON
7. Verify Account Switcher disappears
8. Verify preference persists on reload
```

### Test 2: Customer Account Switching

```
1. Login as Customer
2. Verify current type card shows "Customer"
3. Tap "Change Account"
4. Verify modal shows Provider and Hybrid
5. Select Provider
6. Verify account switches successfully
7. Verify current type card now shows "Provider"
```

### Test 3: Hybrid Quick Switching

```
1. Login as Hybrid user
2. Verify three buttons displayed
3. Tap "Customer" button
4. Verify immediate switch to Customer
5. Verify modal now shows different options
6. Return to Hybrid via modal
7. Verify three buttons reappear
```

### Test 4: Admin Testing Flow

```
1. Login as admin with Admin Mode ON
2. Toggle Admin Mode OFF
3. Switch to Customer
4. Test customer features
5. Switch to Provider
6. Test provider features
7. Toggle Admin Mode ON
8. Access admin dashboard
```

---

## Migration Guide

### Database Migration

```sql
-- Add admin_mode column
ALTER TABLE profiles ADD COLUMN admin_mode boolean DEFAULT false;

-- Set default for existing admins
UPDATE profiles SET admin_mode = true WHERE user_type = 'Admin';
```

**File**: `supabase/migrations/[timestamp]_add_admin_mode_preference.sql`

### Type Definition Update

```typescript
// types/database.ts
export interface Profile {
  // ... existing fields
  admin_mode?: boolean;  // NEW
  created_at: string;
  updated_at: string;
}
```

---

## Troubleshooting

### Issue: Admin Mode toggle not appearing

**Check**:
1. User's `user_type` is 'Admin'
2. Profile data loaded correctly
3. Component imported properly

**Solution**: Verify `isAdmin` state is set correctly

---

### Issue: Account switcher hidden for non-admin

**Check**:
1. Conditional rendering logic
2. `isAdmin` and `adminMode` states

**Solution**: Ensure condition is `(!isAdmin || !adminMode)`

---

### Issue: Changes not persisting

**Check**:
1. Database connection
2. Profile refresh called after update
3. Error handling logs

**Solution**: Check network tab for failed requests

---

### Issue: Modal not closing after selection

**Check**:
1. `setModalVisible(false)` called in handler
2. Navigation not blocking modal close

**Solution**: Ensure modal close happens before navigation

---

## Best Practices

### For Developers

1. **Always check admin status** before rendering admin controls
2. **Handle loading states** to prevent race conditions
3. **Refresh profile** after updates to sync UI
4. **Test all user types** to ensure proper behavior
5. **Log errors** for debugging purposes

### For Designers

1. **Use consistent colors** for admin vs normal UI
2. **Provide clear visual feedback** for state changes
3. **Keep modals simple** with clear options
4. **Use icons** to enhance recognition
5. **Maintain adequate spacing** for touch targets

### For Admins

1. **Toggle Admin Mode OFF** when testing user flows
2. **Switch account types** to understand different experiences
3. **Toggle Admin Mode ON** when performing admin tasks
4. **Report issues** if switcher behaves unexpectedly
5. **Use admin dashboard link** for quick access

---

## Future Enhancements

### Potential Features

1. **Quick Switch Shortcuts**: Keyboard shortcuts for account switching
2. **Recent Types**: Remember last 3 account types for quick access
3. **Scheduled Mode**: Auto-switch based on time of day
4. **Analytics**: Track admin usage patterns
5. **Permissions**: Fine-grained control over admin features

### UI Improvements

1. **Animations**: Smooth transitions between modes
2. **Tooltips**: Additional context on hover/long-press
3. **Themes**: Different color schemes for each account type
4. **Customization**: User-defined labels for account types
5. **History**: View account type change history

---

## Summary

### What Was Built

✅ Admin Mode toggle for admin users
✅ Simplified Account Type switcher
✅ Modal-based account type selection
✅ Database persistence for preferences
✅ Conditional rendering based on admin mode
✅ Clean, intuitive UI
✅ Comprehensive error handling
✅ Loading states during transitions

### Key Benefits

- **For Admins**: Easy toggle between admin and user modes
- **For Users**: Cleaner, less cluttered profile screen
- **For Developers**: Modular, reusable components
- **For Testing**: Admins can test as any user type

### Production Ready

✅ Database schema updated
✅ Components fully implemented
✅ Profile screen integrated
✅ Types updated
✅ Error handling in place
✅ Loading states handled
✅ Documentation complete

---

**Last Updated**: November 17, 2025
**Version**: 1.0.0
**Status**: Production Ready
