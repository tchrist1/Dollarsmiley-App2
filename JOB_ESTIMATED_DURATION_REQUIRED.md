# Job Estimated Duration - Now Required

## Summary

Updated job posting and editing flows to **require Estimated Duration** for all jobs. This improves pricing accuracy, provider scheduling, and overall offer quality.

---

## Changes Made

### 1. Post Job Screen (`/app/(tabs)/post-job.tsx`)

#### Validation Updates
- **Added required validation** for `estimatedDuration` field
- Field must be:
  - Non-empty
  - Valid numeric value (decimals allowed: 1.5, 2, 4.75)
  - Greater than 0
- Shows inline error message if missing or invalid

#### UX Copy Updates
**Before:**
```
"How many hours do you estimate this job will take? (Optional but helps providers)"
```

**After:**
```
"Required. Helps providers price and schedule your job accurately."
```

Applied to both pricing types:
- Quote-based jobs (lines 426-428)
- Fixed-price jobs (lines 450-452)

---

### 2. Edit Job Screen (`/app/jobs/[id]/edit.tsx`)

#### Validation Updates
- **Added required validation** for `estimatedDuration` field when editing
- Same validation rules as post job:
  - Non-empty
  - Valid numeric value
  - Greater than 0

#### UX Updates
- Updated label from `"Estimated Duration (Hours, Optional)"` to `"Estimated Duration (hours)"`
- Added helper text: `"Required. Helps providers price and schedule your job accurately."`
- Added error display support
- Updated placeholder to show decimal support: `"e.g., 2 or 4.5"`

---

## Backward Compatibility

### Existing Jobs
- ✅ Jobs without Estimated Duration remain valid in the database
- ✅ No database schema changes required
- ✅ Legacy jobs can still receive offers and be viewed
- ✅ `estimated_duration_hours` remains nullable in database

### Editing Legacy Jobs
- When editing an existing job without duration, user is **prompted to add it**
- Validation requires it to be filled before saving
- This ensures updated jobs meet current quality standards

---

## Validation Logic

```typescript
// Both post-job.tsx and edit.tsx
if (!estimatedDuration.trim()) {
  newErrors.estimatedDuration = 'Estimated duration is required';
} else if (isNaN(Number(estimatedDuration))) {
  newErrors.estimatedDuration = 'Invalid duration';
} else if (Number(estimatedDuration) <= 0) {
  newErrors.estimatedDuration = 'Duration must be greater than 0';
}
```

---

## User Experience

### For Customers Posting Jobs
1. **Clear requirement**: Field is labeled as required with explanation
2. **Helpful placeholder**: Shows decimal examples (2 or 4.5)
3. **Inline validation**: Error appears immediately if missing or invalid
4. **Cannot submit** without valid duration

### For Providers
1. **Better pricing**: Can accurately quote based on time estimate
2. **Better scheduling**: Can plan availability and resource allocation
3. **Higher quality offers**: More informed pricing decisions

---

## Files Modified

1. `/app/(tabs)/post-job.tsx`
   - Lines 157-163: Added required validation
   - Lines 426-428: Updated helper text (quote-based)
   - Lines 450-452: Updated helper text (fixed-price)

2. `/app/jobs/[id]/edit.tsx`
   - Lines 171-177: Added required validation
   - Lines 383-394: Updated field label, placeholder, and helper text
   - Lines 628-633: Added helper text style

---

## Testing Checklist

### New Job Posts
- [ ] Try to submit without duration → Shows error
- [ ] Enter invalid duration (e.g., "abc") → Shows error
- [ ] Enter zero or negative → Shows error
- [ ] Enter valid duration (e.g., 2.5) → Accepts and submits

### Editing Jobs
- [ ] Edit job with existing duration → Pre-fills correctly
- [ ] Edit legacy job without duration → Prompts to add
- [ ] Try to save without adding duration → Shows error
- [ ] Add valid duration and save → Updates successfully

### Backward Compatibility
- [ ] View legacy jobs without duration → Works normally
- [ ] Providers can send offers on legacy jobs → No issues
- [ ] Job detail screens display correctly → No breaking changes

---

## Success Criteria

✅ **New jobs require Estimated Duration**
✅ **Clear user guidance on why it's required**
✅ **Existing jobs remain unaffected**
✅ **Providers receive better-scoped jobs**
✅ **No database schema changes**
✅ **No changes to Service or Custom Service flows**
✅ **No changes to pricing or offer logic**

---

## Notes

- **No scope creep**: Only job posting/editing affected
- **No service listing changes**: Services remain unaffected
- **No pricing logic changes**: Backend calculation unchanged
- **No offer logic changes**: Provider submission flows unchanged
- **Field accepts decimals**: 1.5, 2, 4.75 all valid
- **Database field remains nullable**: Legacy data preserved
