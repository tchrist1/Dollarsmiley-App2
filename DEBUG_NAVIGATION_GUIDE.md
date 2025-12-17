# Debug Navigation Menu - Testing Guide

## Overview

A comprehensive burger menu has been added to the bottom navigation bar for testing and debugging purposes. This menu provides quick access to all app screens, including hidden routes, admin screens, and nested navigation paths.

---

## Features

### 🍔 Burger Menu Button
- **Location**: Far-right position in the bottom tab bar
- **Icon**: Three horizontal lines (hamburger icon)
- **Label**: "Menu"
- **Behavior**: Opens full-screen modal with all available screens

### 🔍 Search Functionality
- Real-time search across:
  - Screen names
  - Categories
  - Descriptions
  - Route paths
- Clear button to reset search

### 📊 Organized Categories
Screens grouped by functional area:
- **Main Navigation** - Primary app tabs
- **Discovery** - Feed and recommendation screens
- **Jobs & Services** - Job posting and listings
- **Provider Tools** - Provider dashboard and management
- **Financial** - Wallet, transactions, payments
- **Reports & Tax** - Income/expense reports, tax forms
- **Analytics** - Performance metrics and insights
- **Communication** - Messages and chat
- **Verification** - ID and background checks
- **Settings** - App preferences and configuration
- **Subscription** - Plans and billing
- **Saved** - Bookmarked items and searches
- **Support** - Help and tickets
- **Updates** - Announcements
- **Admin** - Admin-only screens
- **Developer** - API and developer tools
- **Testing** - Test screens

### 🔐 Permission-Based Filtering
Screens are automatically filtered based on:
- **Authentication Status** - Login required
- **User Type** - Provider/Hybrid only screens
- **Admin Access** - Admin-only screens

### 📱 Screen Information
Each menu item shows:
- **Icon** - Visual indicator
- **Label** - Screen name
- **Description** - What the screen does
- **Route** - Full navigation path

### 📈 Statistics
- Total screen count displayed at bottom
- Warning reminder about debug mode

---

## Usage

### Accessing the Menu

1. **Launch the app** in development mode
2. **Navigate to any tab** in the main app
3. **Tap the burger icon** at the far-right of the bottom tab bar
4. **Full-screen menu opens** with all available screens

### Navigating to Screens

1. **Browse categories** - Scroll through organized sections
2. **Or search** - Type in search bar to filter screens
3. **Tap any screen** - Navigate directly to that route
4. **Menu auto-closes** - Returns to previous screen

### Search Examples

- Type `"job"` → Shows all job-related screens
- Type `"payment"` → Shows payment and financial screens
- Type `"admin"` → Shows admin dashboard screens
- Type `"provider"` → Shows provider tools
- Type `"verify"` → Shows verification screens

---

## Configuration

### Enable/Disable Debug Menu

**File:** `constants/debug.ts`

```typescript
export const DEBUG_CONFIG = {
  // Set to false to disable menu
  ENABLE_DEBUG_MENU: true,

  // Other debug options
  SHOW_DEBUG_INFO: false,
  VERBOSE_LOGGING: false,
} as const;
```

### How It Works

The menu checks two conditions:
1. `ENABLE_DEBUG_MENU` flag is `true`
2. App is running in `__DEV__` mode

```typescript
export const shouldShowDebugMenu = (): boolean => {
  return DEBUG_CONFIG.ENABLE_DEBUG_MENU && __DEV__;
};
```

---

## Production Deployment

### ⚠️ CRITICAL: Disable Before Production

**Before deploying to production:**

1. **Set flag to false:**
   ```typescript
   // constants/debug.ts
   ENABLE_DEBUG_MENU: false
   ```

2. **Or rely on __DEV__ check:**
   - Menu automatically disabled in production builds
   - `__DEV__` is false in release mode

3. **Verify:**
   - Build production version
   - Check that burger menu is not visible
   - Test bottom navigation still works

### Build Commands

```bash
# Development (menu visible)
npm run dev

# Production build (menu hidden)
npm run build:web
expo build:ios
expo build:android
```

---

## Architecture

### File Structure

```
project/
├── constants/
│   └── debug.ts                    # Debug configuration
├── components/
│   └── DebugNavigationMenu.tsx     # Menu component
└── app/
    └── (tabs)/
        ├── _layout.tsx             # Tab bar with burger button
        └── debug-menu.tsx          # Dummy screen
```

### Component Breakdown

#### `debug.ts`
- Configuration constants
- Feature flag management
- Environment checks

#### `DebugNavigationMenu.tsx`
- Full navigation menu UI
- 100+ screen definitions
- Search functionality
- Permission filtering
- Route navigation logic

#### `_layout.tsx`
- Conditional tab rendering
- Burger button integration
- Tab press prevention

#### `debug-menu.tsx`
- Placeholder screen
- Never actually displayed

---

## Navigation Items

### Total Screens: 100+

Categories include:

**Main (5 screens)**
- Home, Categories, Community, Notifications, Profile

**Discovery (2 screens)**
- Discover Feed, For You

**Jobs & Services (6 screens)**
- Post Job, Create Listing, Browse Jobs, My Jobs, Bookings, etc.

**Provider Tools (7 screens)**
- Dashboard, Availability, Schedule, Payouts, etc.

**Financial (10 screens)**
- Wallet, Earnings, Transactions, Payment Methods, etc.

**Reports & Tax (3 screens)**
- Expense Reports, Income Reports, Tax Forms

**Analytics (2 screens)**
- Advanced Analytics, Job Analytics

**Communication (1 screen)**
- Messages

**Verification (3 screens)**
- Status, ID Verification, Background Check

**Settings (7 screens)**
- Main Settings, Calendar, Phone, Payment, Reports, etc.

**Subscription (2 screens)**
- Plans, Checkout

**Saved (2 screens)**
- Saved Jobs, Saved Searches

**Support (2 screens)**
- Tickets, Create Ticket

**Updates (1 screen)**
- Announcements

**Admin (7 screens)**
- Dashboard, Users, Verification, Moderation, Refunds, etc.

**Developer (1 screen)**
- Developer Portal

**Testing (2 screens)**
- Test Stripe, Test Payment Sheet

---

## Permissions System

### Screen Access Rules

#### Public Screens
- No login required
- Visible to all users
- Examples: Home, Categories, Subscription Plans

#### Authenticated Screens
- Login required
- `requiresAuth: true`
- Examples: Bookings, Wallet, Messages

#### Provider Screens
- Provider or Hybrid user type required
- `requiresProvider: true`
- Examples: Create Listing, Provider Dashboard, Analytics

#### Admin Screens
- Admin user type required
- `requiresAdmin: true`
- Examples: Admin Dashboard, Moderation, User Management

### Filter Logic

```typescript
// Automatically filtered based on:
if (item.requiresAuth && !profile) return false;
if (item.requiresProvider && !isProvider) return false;
if (item.requiresAdmin && !isAdmin) return false;
```

---

## Adding New Screens

To add new screens to the menu:

1. **Open:** `components/DebugNavigationMenu.tsx`

2. **Add to array:**
   ```typescript
   const navigationItems: NavigationItem[] = [
     // ... existing items
     {
       label: 'New Screen',
       route: '/new-screen',
       icon: IconName,
       category: 'Category Name',
       requiresAuth: true, // optional
       requiresProvider: true, // optional
       requiresAdmin: true, // optional
       description: 'What this screen does',
     },
   ];
   ```

3. **Import icon:**
   ```typescript
   import { IconName } from 'lucide-react-native';
   ```

4. **Save and test** - Screen appears in menu

---

## Troubleshooting

### Menu Not Showing

**Check:**
1. `DEBUG_CONFIG.ENABLE_DEBUG_MENU` is `true`
2. Running in development mode (`__DEV__` is `true`)
3. No build errors in console

**Solution:**
```typescript
// constants/debug.ts
ENABLE_DEBUG_MENU: true // Make sure this is true
```

### Navigation Not Working

**Check:**
1. Route path is correct
2. Screen file exists
3. Screen is properly exported

**Example Error:**
```
Navigation error: [route] does not exist
```

**Solution:**
- Verify route exists in app directory
- Check for typos in route path
- Ensure screen has default export

### Screen Not Listed

**Check:**
1. Screen added to `navigationItems` array
2. Permission requirements met
3. Category name is correct

**Solution:**
- Add to navigationItems in DebugNavigationMenu.tsx
- Set appropriate permission flags
- Choose existing category or create new one

### Search Not Finding Screens

**Check:**
1. Search includes screen name, category, or description
2. Case-insensitive matching
3. Partial matches supported

**Solution:**
- Try different keywords
- Check screen description
- Browse categories instead

---

## Best Practices

### Testing Workflow

1. **Start Development:**
   ```bash
   npm run dev
   ```

2. **Open App:**
   - Launch in simulator/emulator
   - Or scan QR code on device

3. **Access Menu:**
   - Tap burger icon
   - Search or browse for screen

4. **Test Navigation:**
   - Navigate to screen
   - Verify functionality
   - Return and test another

5. **Rapid Testing:**
   - Use search for quick access
   - Jump between screens
   - No need to navigate through app

### Development Tips

- **Use search** for quick navigation during development
- **Bookmark frequently used** test screens
- **Add new screens** as you create them
- **Update descriptions** for clarity
- **Group related screens** in same category

### Code Organization

- **Keep navigationItems sorted** by category
- **Use descriptive labels** and descriptions
- **Choose appropriate icons** for visual recognition
- **Set correct permissions** to avoid access errors

---

## Security Notes

### ⚠️ Important Security Considerations

1. **Debug Mode Only:**
   - Menu exposes all routes
   - Including admin screens
   - Should never be in production

2. **Double Protection:**
   - Debug flag check
   - DEV mode check
   - Both must be true

3. **Production Safety:**
   - `__DEV__` is false in production
   - Menu automatically hidden
   - No security risk if properly configured

4. **Access Control:**
   - Permission filtering prevents unauthorized access
   - RLS policies still enforced
   - UI filtering is not security

---

## Performance

### Impact on App

- **Minimal overhead** - Only loads when opened
- **Lazy rendering** - Items rendered on demand
- **Efficient search** - Client-side filtering
- **No network calls** - Static menu data

### Optimization

- Component unmounts when closed
- Search state cleared on close
- No persistent state
- Minimal memory footprint

---

## Examples

### Example 1: Quick Testing

```
1. Open app
2. Tap burger menu
3. Search "stripe"
4. Tap "Test Stripe"
5. Test payment flow
6. Close menu
7. Back to normal navigation
```

### Example 2: Provider Flow Testing

```
1. Login as provider
2. Tap burger menu
3. Browse "Provider Tools"
4. Test each provider screen:
   - Dashboard
   - Availability
   - Payouts
   - Analytics
5. Verify all features work
```

### Example 3: Admin Testing

```
1. Login as admin
2. Tap burger menu
3. Navigate to "Admin" category
4. Test admin screens:
   - User Management
   - Moderation
   - Verification Queue
   - System Health
5. Verify admin features
```

---

## FAQ

### Q: Will this affect production?
**A:** No, if `__DEV__` check is in place. Menu only appears in development mode.

### Q: Can users access admin screens?
**A:** No, screens are filtered by user type. Admin screens only show for admins.

### Q: How do I disable for specific testing?
**A:** Set `ENABLE_DEBUG_MENU: false` in `constants/debug.ts`

### Q: Can I customize the menu?
**A:** Yes, edit `navigationItems` array in `DebugNavigationMenu.tsx`

### Q: Does search work offline?
**A:** Yes, search is client-side and works without internet.

### Q: What if a route doesn't exist?
**A:** Navigation will fail with error. Verify route exists in app directory.

---

## Support

### Need Help?

1. **Check Console** - Look for navigation errors
2. **Verify Routes** - Ensure screens exist
3. **Check Permissions** - Verify user type matches requirements
4. **Review Configuration** - Check debug.ts settings

### Common Issues

- **Menu not appearing** → Check debug flag and DEV mode
- **Navigation failing** → Verify route path
- **Screens missing** → Check permission filters
- **Search not working** → Try different keywords

---

## Changelog

### Version 1.0.0
- Initial implementation
- 100+ screens catalogued
- Search functionality
- Category organization
- Permission filtering
- Debug flag system

---

## Summary

The debug navigation menu provides:
- ✅ Quick access to all screens
- ✅ Search functionality
- ✅ Category organization
- ✅ Permission-based filtering
- ✅ Production-safe (when disabled)
- ✅ Easy to configure
- ✅ Minimal performance impact

**Remember:** Disable before production deployment!

---

**For technical questions, refer to:**
- `components/DebugNavigationMenu.tsx` - Component code
- `constants/debug.ts` - Configuration
- `app/(tabs)/_layout.tsx` - Integration

**Last Updated:** November 17, 2025
