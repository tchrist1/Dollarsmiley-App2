# Trust Badges Quick Reference

## Overview
Trust achievement badges appear on Provider Store Fronts to signal excellence without exposing internal Trust Scores.

---

## Badge Types

### Top Job Provider 🏆
**Criteria:**
- ✅ 10+ completed jobs
- ✅ Job rating ≥ 4.5 ⭐
- ✅ Trust level ≤ 1
- ✅ Incident rate < 10%
- ✅ 5+ jobs in last 90 days

### Top Service Provider 🏆
**Criteria:**
- ✅ 10+ completed services (standard + custom)
- ✅ Service rating ≥ 4.6 ⭐
- ✅ Trust level ≤ 1
- ✅ Incident rate < 10%
- ✅ 5+ completions in last 90 days

---

## Component Usage

### ProviderTrustBadge
```typescript
import ProviderTrustBadge from '@/components/ProviderTrustBadge';

<ProviderTrustBadge type="job" />
<ProviderTrustBadge type="service" />
```

**Props:**
- `type`: "job" | "service"

---

## Database Functions

### Get Badge Status
```typescript
const { data } = await supabase
  .rpc('get_provider_trust_badges', { p_provider_id: providerId })
  .single();

// Returns:
{
  has_top_job_badge: boolean,
  has_top_service_badge: boolean
}
```

### Individual Checks
```typescript
// Check job badge eligibility
const { data: jobBadge } = await supabase
  .rpc('evaluate_job_badge_eligibility', { p_provider_id: providerId });

// Check service badge eligibility
const { data: serviceBadge } = await supabase
  .rpc('evaluate_service_badge_eligibility', { p_provider_id: providerId });
```

---

## Store Front Integration

### Header Layout Order
1. Provider avatar
2. Provider name
3. Jobs rating
4. Services rating
5. **Trust badges** ← NEW
6. Capability badges
7. Stats row
8. Service radius
9. Contact button

### Display Logic
```typescript
{trustBadges && (trustBadges.has_top_job_badge || trustBadges.has_top_service_badge) && (
  <View style={styles.trustBadgesContainer}>
    {trustBadges.has_top_job_badge && <ProviderTrustBadge type="job" />}
    {trustBadges.has_top_service_badge && <ProviderTrustBadge type="service" />}
  </View>
)}
```

---

## Trust Level Reference

| Level | Name | Badge Eligible |
|-------|------|----------------|
| 0 | Good Standing | ✅ Yes |
| 1 | Advisory | ✅ Yes |
| 2 | Reliability Risk | ❌ No |
| 3 | High Risk | ❌ No |

---

## Styling

### Colors
- Background: `#FFF9E6` (light gold)
- Border: `theme.colors.warning` (gold)
- Text: `#B8860B` (dark goldenrod)
- Icon: Award trophy filled gold

### Container Spacing
```typescript
trustBadgesContainer: {
  flexDirection: 'row',
  gap: spacing.sm,
  marginBottom: spacing.sm,
}
```

---

## Key Principles

1. **No Numeric Scores** - Only boolean badge flags exposed
2. **Dynamic & Revocable** - Badges auto-update based on performance
3. **Earned, Not Given** - Strict criteria must be met
4. **Transparent Criteria** - Providers know what's required
5. **Trust Reinforcement** - Badges support ratings, don't replace them

---

## Testing Providers

To manually test badge display:

1. Create provider with 10+ completed jobs/services
2. Ensure high rating average (4.5+ / 4.6+)
3. Maintain low incident rate (<10%)
4. Keep recent activity (5+ in 90 days)
5. Navigate to Store Front
6. Badges should appear between ratings and capability badges

---

## Common Issues

### Badge Not Showing
- Check completion count (minimum 10)
- Check rating average (4.5 / 4.6 threshold)
- Check trust level (must be ≤ 1)
- Check incident rate (must be < 10%)
- Check recent activity (5+ in 90 days)

### Badge Disappeared
- Trust level may have increased
- Incident rate may have risen
- Rating average may have dropped
- Recent activity may have stopped

---

## Performance

**Database Queries:**
- Single RPC call per provider
- Efficient aggregation server-side
- Minimal client processing

**Rendering:**
- Lightweight components
- Conditional rendering
- No layout shifts

---

## Security

**Access Control:**
- Functions are `SECURITY DEFINER`
- Only authenticated users can query
- Badge evaluation server-side only
- No client-side manipulation

**Data Privacy:**
- No Trust Scores exposed
- No incident details exposed
- Only boolean flags returned

---

## Future Considerations

### Potential Expansions
- Additional badge types (Rising Star, Quick Responder)
- Badge tiers (Bronze, Silver, Gold)
- Category-specific badges
- Time-based badges (2024 Top Provider)

### Data Tracking
- Badge distribution metrics
- Conversion impact analysis
- Badge dynamics (gain/loss rates)
- Provider satisfaction surveys

---

## Support Links

- Full Documentation: `PROVIDER_STOREFRONT_TRUST_BADGES_ENHANCEMENT.md`
- Trust Score System: `MARKETPLACE_TRUST_SCORING_SYSTEM.md`
- Ratings System: `TWO_SIDED_RATING_SYSTEM_IMPLEMENTATION.md`
