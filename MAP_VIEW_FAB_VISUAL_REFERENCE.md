# Map View FAB — Visual Reference Guide

## Concentric Icon Design

### Dimensions
```
Overall: 18x18pt
Outer circle: 18x18pt, border 2pt
Inner circle: 14x14pt, filled
Text: 7pt bold
```

### Color Scheme

| Icon Type | Label | Outer Border | Inner Fill | Text Color |
|-----------|-------|--------------|------------|------------|
| Services | S | #10B981 (Green) | White → Green* | Green → White* |
| All Jobs | J | #F59E0B (Amber) | White → Amber* | Amber → White* |
| Fixed Jobs | FJ | #F59E0B (Amber) | White → Amber* | Amber → White* |
| Quoted Jobs | QJ | #F59E0B (Amber) | White → Amber* | Amber → White* |

*Inactive → Active state

### Visual States

#### Inactive State
```
        ┌─────────┐
        │ ╔═════╗ │  ← Colored border (2pt)
        │ ║     ║ │
        │ ║  S  ║ │  ← Colored text on white
        │ ║     ║ │
        │ ╚═════╝ │  ← White inner circle
        └─────────┘
```

#### Active State
```
        ┌─────────┐
        │ ╔═════╗ │  ← White border (2pt)
        │ ║█████║ │
        │ ║█ S █║ │  ← White text on colored fill
        │ ║█████║ │
        │ ╚═════╝ │  ← Colored inner circle
        └─────────┘
```

## Complete FAB Menu

### Layout Structure
```
┌─────────────────────────────────────┐
│                                     │
│  [ 📍  icon ]  Listings            │  ← 44pt height
│                                     │
├─────────────────────────────────────┤  ← spacing.xs gap
│                                     │
│  [ 👤  icon ]  Providers           │  ← 44pt height
│                                     │
├─────────────────────────────────────┤  ← spacing.xs gap
│                                     │
│  [ ◎S  icon ]  Services            │  ← 44pt height
│                                     │
├─────────────────────────────────────┤  ← spacing.xs gap
│                                     │
│  [ ◎J  icon ]  All Jobs            │  ← 44pt height
│                                     │
├─────────────────────────────────────┤  ← spacing.xs gap
│                                     │
│  [ ◎FJ icon ]  Fixed-priced Jobs   │  ← 44pt height
│                                     │
├─────────────────────────────────────┤  ← spacing.xs gap
│                                     │
│  [ ◎QJ icon ]  Quoted Jobs         │  ← 44pt height
│                                     │
└─────────────────────────────────────┘
```

### Item Anatomy
```
┌─────────────────────────────────────┐
│  padding.md                         │
│  ↓                                  │
│  ┌──┐  ← icon (18x18)              │
│  │◎S│  ← gap (spacing.sm)          │
│  └──┘  Services ← text (sm)        │
│        ↑                            │
│        padding.sm vertical          │
└─────────────────────────────────────┘
```

## Icon Types

### Standard Icons (Lucide)
Used for Listings and Providers:
- Maintains native Lucide icon appearance
- Size: 18pt
- Color: Adapts to active/inactive state

### Concentric Icons (Custom)
Used for Services and Jobs:
- Matches map pin design language
- Provides visual consistency
- Clearly identifies listing types

## Color Palette

### Primary Colors
```
Green:   #10B981  (Services)
Amber:   #F59E0B  (Jobs)
Primary: colors.primary (Active state background)
White:   #FFFFFF  (Inactive background)
Text:    colors.text (Inactive text)
```

### Shadow & Elevation
```
Menu items: shadows.md
FAB button: shadows.lg
```

## Touch Targets

All menu items:
- Minimum height: 44pt (iOS Human Interface Guidelines)
- Minimum width: Dynamic (content-based)
- Active opacity: 0.7
- Hit slop: Default (adequate for pill shape)

## Animation

FAB expansion:
- Duration: 150ms
- Timing: Linear (Animated.timing)
- Direction: Vertical (bottom to top)
- Rotation: 0° → 45° (X icon transform)

## Responsive Behavior

Right-side placement:
- Right: spacing.md
- Bottom: insets.bottom + 16pt
- Z-index: 999
- Position: Absolute

Backdrop:
- Full screen coverage (-1000 offset)
- Invisible pressable layer
- Z-index: -1
- Tap to dismiss

## Implementation Code

### ConcentricIcon Usage
```typescript
<ConcentricIcon
  label="FJ"
  color="#F59E0B"
  isActive={mode === 'jobs_fixed'}
/>
```

### Full Menu Item
```typescript
<TouchableOpacity
  style={[styles.menuItem, mode === 'jobs_fixed' && styles.menuItemActive]}
  onPress={() => handleModeSelect('jobs_fixed')}
  activeOpacity={0.7}
>
  <ConcentricIcon label="FJ" color="#F59E0B" isActive={mode === 'jobs_fixed'} />
  <Text style={[styles.menuText, mode === 'jobs_fixed' && styles.menuTextActive]}>
    Fixed-priced Jobs
  </Text>
</TouchableOpacity>
```

## Platform Compatibility

### iOS
- Uses UIKit standard shadows
- Touch targets meet Apple guidelines
- Safe area insets respected

### Android
- Uses elevation for shadows
- Material Design touch feedback
- Status bar clearance handled

### Web
- CSS box-shadow for elevation
- Hover states (optional enhancement)
- Pointer cursor on hover

## Accessibility

- Text labels clearly describe function
- Icons supplement text (not replace)
- Touch targets exceed 44x44pt
- Color contrast meets WCAG AA
- Active state clearly indicated

## Design Rationale

### Why Concentric Circles?
1. Visual consistency with map pins
2. Clear association between FAB and map
3. Distinctive appearance from standard icons
4. Space-efficient for 2-character labels
5. Professional, polished aesthetic

### Why Flat Layout?
1. No visual hierarchy reduces cognitive load
2. Uniform spacing improves scanability
3. Clean, modern appearance
4. Easier to extend with new options
5. Matches mobile design best practices

### Why Right-Side Placement?
1. Thumb-friendly for right-handed users
2. Doesn't obscure map content
3. Follows FAB conventions
4. Clear separation from map controls
5. Avoids map attribution overlap
