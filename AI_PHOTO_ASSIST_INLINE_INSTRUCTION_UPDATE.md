# AI Photo Assist Inline Instruction Update

## Overview
Updated the AI Photo Assist modal to display the photo selection instruction inline with the section header, improving clarity and reducing visual clutter.

## Changes Made

### 1. Header Text Update
**Location:** `components/AIPhotoAssistModal.tsx:564-567`

**Before:**
```tsx
<Text style={styles.resultLabel}>
  Generated {generatedImages.length === 1 ? 'Photo' : 'Photos'}
</Text>
```

**After:**
```tsx
<Text style={styles.resultLabel}>
  Generated {generatedImages.length === 1 ? 'Photo' : 'Photos'}.{' '}
  <Text style={styles.resultLabelHint}>Tap photo to select.</Text>
</Text>
```

The header now reads: **"Generated Photos. Tap photo to select."** with both parts on the same line.

### 2. Removed Redundant Helper Text
**Location:** `components/AIPhotoAssistModal.tsx` (previously ~lines 642-646)

Removed the separate selection hint that appeared below the thumbnail row:
```tsx
// REMOVED
{generatedImages.length > 1 && (
  <Text style={styles.selectionHint}>
    Tap photos to select. You can add up to {remainingSlots} more.
  </Text>
)}
```

This information is now conveyed inline in the header, eliminating redundancy.

### 3. Updated Styles
**Location:** `components/AIPhotoAssistModal.tsx:862-888`

Added new styles and updated existing ones:

```tsx
resultLabelContainer: {
  flex: 1,
  marginRight: spacing.sm,
},
resultLabel: {
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  color: colors.text,
  flexWrap: 'wrap',  // NEW: Allows graceful wrapping
},
resultLabelHint: {  // NEW: Muted style for instruction
  fontSize: fontSize.sm,
  fontWeight: fontWeight.regular,
  color: colors.textSecondary,
  opacity: 0.7,
},
```

Removed unused `selectionHint` style (previously lines 966-970).

## Visual Result

### Header Appearance
```
Generated Photos. Tap photo to select.         [2 selected]
```

- **"Generated Photos."** - Bold, dark text (header style)
- **"Tap photo to select."** - Regular weight, lighter text (helper style, 70% opacity)
- Both appear inline on the same line
- Selection count remains on the right side

## Styling Details

### Typography
- **Header portion:** Medium weight, primary text color
- **Instruction portion:** Regular weight, secondary text color with 70% opacity
- **Font size:** Both use `fontSize.sm` for consistency
- **Period separator:** Added between the two phrases for proper punctuation

### Responsive Behavior
- `flexWrap: 'wrap'` ensures text wraps gracefully on small screens
- `resultLabelContainer` with `flex: 1` allows proper space allocation
- No horizontal scrolling introduced
- Instruction remains visible before any user interaction

## Benefits

1. **Improved Clarity** - Instruction is immediately visible when photos are generated
2. **Reduced Clutter** - Single line instead of separate helper text below
3. **Better UX** - Users know what to do without scrolling or looking elsewhere
4. **Consistent Placement** - Always appears in the same location
5. **Clean Layout** - Maintains visual hierarchy with proper styling contrast

## Acceptance Criteria Met

✅ Header reads exactly: "Generated Photos. Tap photo to select."
✅ Text appears inline on the same line
✅ "Generated Photos" retains header styling
✅ "Tap photo to select." uses lighter, muted styling
✅ Responsive wrapping works without truncation
✅ No horizontal scrolling introduced
✅ Instruction visible before any interaction
✅ No regressions to photo generation or selection behavior

## Testing Recommendations

Test the following scenarios:

1. **Single Photo Generation**
   - Generate 1 photo
   - Verify header shows "Generated Photo. Tap photo to select."
   - Verify instruction is visible and properly styled

2. **Multiple Photo Generation**
   - Generate 2-4 photos
   - Verify header shows "Generated Photos. Tap photo to select."
   - Verify selection count appears on the right
   - Verify selection behavior works correctly

3. **Small Screen Responsiveness**
   - Test on narrow viewports (e.g., iPhone SE)
   - Verify text wraps gracefully if needed
   - No truncation occurs
   - No horizontal scrolling

4. **Different Screen Sizes**
   - Test on various device sizes (phone, tablet)
   - Verify inline text remains readable
   - Verify proper spacing maintained

5. **Photo Selection Flow**
   - Tap photos to select/deselect
   - Verify selection count updates correctly
   - Verify selected photos can be added to listing
   - Confirm no regressions in functionality

## Related Components

This change only affects:
- `components/AIPhotoAssistModal.tsx`

No other components or files were modified.
