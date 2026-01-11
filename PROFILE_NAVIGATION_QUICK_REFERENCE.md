# Profile Navigation - Quick Reference

## Navigation Rules

| Account Type | Public Profile | URL Pattern |
|--------------|---------------|-------------|
| **Provider** | Store Front | `/provider/store/${id}` |
| **Hybrid** | Store Front | `/provider/store/${id}` |
| **Customer** | Job Board | `/customer/job-board/${id}` |

---

## Routing Logic

### From Job Detail Page
```typescript
// Check user_type
if (user_type === 'Provider' || user_type === 'Hybrid') {
  router.push(`/provider/store/${id}`);
} else {
  router.push(`/customer/job-board/${id}`);
}
```

### From Service/Listing Detail Page
```typescript
// Always routes to Store Front
router.push(`/provider/store/${provider.id}`);
```

---

## Store Front Tabs

| Account Type | Tabs Shown |
|--------------|------------|
| **Provider** | Services, Custom Services |
| **Hybrid** | Services, Custom Services, Jobs |

**Tab Logic:**
```typescript
const availableTabs = [];
if (services.length > 0) availableTabs.push('services');
if (customServices.length > 0) availableTabs.push('custom');
if (jobs.length > 0 && user_type === 'Hybrid') availableTabs.push('jobs');
```

---

## Job Board Access Control

```typescript
// Automatic redirect in Job Board
if (user_type === 'Provider' || user_type === 'Hybrid') {
  router.replace(`/provider/store/${customerId}`);
  return;
}
```

**Access:**
- ✅ Allowed: Customers
- ❌ Blocked: Providers (redirect to Store Front)
- ❌ Blocked: Hybrids (redirect to Store Front)

---

## Files Modified

1. **`app/jobs/[id].tsx`**
   - Added `user_type` to customer query
   - Smart routing based on account type

2. **`app/customer/job-board/[customerId].tsx`**
   - Added access guard
   - Automatic redirect for Providers/Hybrids

---

## Testing Quick Checks

### Provider Test
1. Provider posts job
2. View job → Tap "Posted By"
3. **Should:** Route to Store Front
4. **Should:** Show Services tab only

### Hybrid Test
1. Hybrid posts job
2. View job → Tap "Posted By"
3. **Should:** Route to Store Front
4. **Should:** Show Services + Jobs tabs

### Customer Test
1. Customer posts job
2. View job → Tap "Posted By"
3. **Should:** Route to Job Board
4. **Should:** Show customer's jobs

### Direct Access Test
1. Navigate to `/customer/job-board/${providerId}`
2. **Should:** Auto-redirect to Store Front

---

## User Type Values

- `'Provider'` - Service provider only
- `'Hybrid'` - Both provider and job poster
- `'Customer'` - Job poster only
- `null` / `undefined` - Treated as Customer

---

## Common Issues

### "Job Board shows empty for Provider"
- ✅ Fixed: Now redirects to Store Front

### "Provider has two profile pages"
- ✅ Fixed: Only Store Front accessible

### "Hybrid jobs not visible"
- ✅ Working: Jobs tab shows on Store Front

---

## Quick Stats

- **Files Modified:** 2
- **Schema Changes:** 0
- **Breaking Changes:** 0
- **New Fields Added:** 0 (uses existing user_type)
