# Safe Button Layout Pattern

## Overview
This document defines the reusable layout pattern for ensuring bottom action buttons are always visible and accessible on all devices, respecting safe area insets.

## Pattern Summary
Use this pattern for **NEW screens** with bottom action buttons to prevent them from being hidden by system navigation bars or safe area insets.

## Implementation

### 1. Import Required Dependencies
```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';
```

### 2. Get Safe Area Insets
```typescript
export default function YourScreen() {
  const insets = useSafeAreaInsets();
  // ... rest of component
}
```

### 3. Apply to ScrollView Content
Ensure scrollable content has bottom padding to prevent overlap with fixed footer:

```typescript
<ScrollView
  style={styles.content}
  contentContainerStyle={{
    paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xxl
  }}
  showsVerticalScrollIndicator={false}
>
  {/* Your content */}
</ScrollView>
```

### 4. Apply to Fixed Footer/Button Container
Ensure the footer respects safe area:

```typescript
<View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md }]}>
  <Button
    title="Save"
    onPress={handleSave}
    loading={saving}
  />
</View>
```

### 5. Footer Style
```typescript
footer: {
  padding: spacing.lg,
  backgroundColor: colors.white,
  borderTopWidth: 1,
  borderTopColor: colors.border,
}
```

## Calculation Explained

### ScrollView Padding
```typescript
Math.max(insets.bottom, spacing.lg) + spacing.xxl
```
- `Math.max(insets.bottom, spacing.lg)`: Use device safe area OR minimum spacing, whichever is larger
- `+ spacing.xxl`: Add extra space for comfortable scrolling clearance

### Footer Padding
```typescript
Math.max(insets.bottom, spacing.md) + spacing.md
```
- `Math.max(insets.bottom, spacing.md)`: Use device safe area OR minimum spacing
- `+ spacing.md`: Add comfortable padding above system UI

## Applied To
This pattern has been applied to:
- ✅ `/app/listing/[id]/edit.tsx` - Full service listing edit
- ✅ `/app/listing/[id]/edit-options.tsx` - Service options edit
- ✅ `/app/my-jobs/[id]/interested-providers.tsx` - Provider selection
- ✅ `/app/jobs/[id].tsx` - Job details

## When to Use
✅ **Use this pattern for:**
- New screens with bottom action buttons
- Screens with save/submit buttons
- Screens with fixed bottom navigation
- Modal screens with bottom actions

❌ **Do NOT retroactively apply to:**
- Existing working screens unless explicitly updating them
- Screens without bottom actions
- Screens already handling safe areas correctly

## Platform Support
- ✅ iOS (handles notch, home indicator)
- ✅ Android (handles navigation bar, gesture areas)
- ✅ Works with keyboard avoiding views
- ✅ Supports landscape and portrait orientations

## Testing Checklist
- [ ] Button visible on small screens
- [ ] Button visible on large screens
- [ ] No overlap with system navigation
- [ ] Scrollable content fully accessible
- [ ] Works with keyboard open
- [ ] Works in both orientations

## Example Implementation
See `/app/listing/[id]/edit.tsx` for the complete reference implementation.
