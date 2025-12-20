# Optional Provider-Controlled Proofing System

## Overview

The Custom Services platform now supports **optional, provider-controlled proofing**. Providers can enable or disable the proofing workflow per listing, or apply settings in batch. This gives providers flexibility while maintaining all existing protections and workflows.

## Key Principles

1. **Backward Compatible**: Existing listings default to proofing required (true)
2. **Provider Control**: Only the provider can enable/disable proofing for their listings
3. **Clear Communication**: Customers are informed whether proofing is included
4. **Authoritative When Enabled**: Proof approval overrides all other inputs when proofing is used
5. **Personalization Snapshot When Disabled**: Captured at add-to-cart, becomes production reference
6. **No Retroactive Changes**: Existing orders maintain their original workflow

## How It Works

### When Proofing Is ENABLED (Default)

The traditional workflow applies:

```
1. Customer orders Custom Service
2. Provider receives order
3. Provider submits design proof
4. Customer reviews proof
   → Approve: Production begins
   → Request revisions: Provider submits new version
   → Reject: Refund per policy
5. Approved proof locks personalization for production
6. Provider completes production
7. Order delivered
```

**Key Points:**
- Provider MUST submit proof before production
- Customer MUST approve proof before production begins
- Proof approval is authoritative
- Personalization data captured at cart is guidance only
- Live preview (if enabled) is guidance only

### When Proofing Is DISABLED

Streamlined workflow for simple or time-sensitive services:

```
1. Customer customizes service (personalization if available)
2. Personalization snapshot captured at add-to-cart
3. Customer places order
4. Provider receives order
5. Provider proceeds directly to production
   → Snapshot is the authoritative reference
6. Provider completes production
7. Order delivered
```

**Key Points:**
- NO proof submission required
- NO customer approval step
- Personalization snapshot is authoritative
- Live preview (if enabled) is guidance for customer but snapshot is what matters
- Provider proceeds faster

## Provider Configuration

### Enable/Disable Proofing for Single Listing

```typescript
import { CustomServicePayments } from '@/lib/custom-service-payments';

const result = await CustomServicePayments.setListingProofingRequirement(
  listingId,
  providerId,
  false, // Disable proofing
  'Service is simple and doesn\'t require proof approval'
);

if (result.success) {
  console.log('Proofing requirement updated');
  console.log('Previous value:', result.previousValue);
  console.log('Changed:', result.changed);
}
```

### Batch Update Multiple Listings

```typescript
const listingIds = [
  'listing-1-id',
  'listing-2-id',
  'listing-3-id'
];

const result = await CustomServicePayments.batchUpdateListingProofing(
  listingIds,
  providerId,
  true, // Enable proofing for all
  'These services require customer approval before production'
);

if (result.success) {
  console.log(`Updated ${result.updatedCount} of ${result.totalRequested} listings`);
}
```

### Check Listing Proofing Status

```typescript
const status = await CustomServicePayments.getListingProofingStatus(listingId);

console.log('Proofing required:', status.proofingRequired);
console.log('Last updated:', status.proofingUpdatedAt);
console.log('Updated by:', status.proofingUpdatedBy);
```

## Order Processing

### Check If Order Can Proceed Without Proof

```typescript
const check = await CustomServicePayments.canProceedWithoutProof(productionOrderId);

if (check.canProceed) {
  console.log('Order can proceed without proofing');
  console.log('Reason:', check.reason);
  console.log('Has personalization snapshot:', check.hasPersonalizationSnapshot);
} else {
  console.log('Proofing is required for this order');
}
```

### Mark Order as Proceeding Without Proofing

```typescript
const result = await CustomServicePayments.markOrderProofingBypassed(
  productionOrderId,
  'Proofing not required for this listing'
);

if (result.success) {
  console.log('Order marked as proofing bypassed');
  console.log('Current status:', result.currentStatus);
  // Provider can now proceed to production
}
```

## UI Guidelines

### For Providers

#### Listing Configuration Screen

```tsx
function ListingProofingSettings({ listing, providerId }) {
  const [proofingRequired, setProofingRequired] = useState(listing.proofing_required);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);

    const result = await CustomServicePayments.setListingProofingRequirement(
      listing.id,
      providerId,
      !proofingRequired,
      proofingRequired
        ? 'Disabling proofing for faster turnaround'
        : 'Enabling proofing for quality control'
    );

    if (result.success) {
      setProofingRequired(result.proofingRequired);
      Alert.alert('Success', 'Proofing setting updated');
    } else {
      Alert.alert('Error', result.error);
    }

    setLoading(false);
  };

  return (
    <View>
      <Text>Require Proof Approval</Text>
      <Text>
        When enabled, customers must approve your design proof before production.
        When disabled, you can proceed directly to production using customer's
        personalization choices.
      </Text>

      <Switch
        value={proofingRequired}
        onValueChange={handleToggle}
        disabled={loading}
      />

      <Text>
        {proofingRequired
          ? 'Proofing Required: Customers will review and approve proofs'
          : 'Proofing Disabled: Proceed directly to production'}
      </Text>
    </View>
  );
}
```

#### Batch Management

```tsx
function BatchProofingManager({ listings, providerId }) {
  const [selectedListings, setSelectedListings] = useState<string[]>([]);

  const handleBatchUpdate = async (proofingRequired: boolean) => {
    if (selectedListings.length === 0) {
      Alert.alert('Error', 'Please select at least one listing');
      return;
    }

    const result = await CustomServicePayments.batchUpdateListingProofing(
      selectedListings,
      providerId,
      proofingRequired,
      `Batch update: ${proofingRequired ? 'enabling' : 'disabling'} proofing`
    );

    if (result.success) {
      Alert.alert(
        'Success',
        `Updated ${result.updatedCount} of ${result.totalRequested} listings`
      );
      setSelectedListings([]);
    }
  };

  return (
    <View>
      <Text>Select listings to update:</Text>
      {listings.map(listing => (
        <CheckBox
          key={listing.id}
          label={listing.title}
          checked={selectedListings.includes(listing.id)}
          onPress={() => toggleSelection(listing.id)}
        />
      ))}

      <Button onPress={() => handleBatchUpdate(true)}>
        Enable Proofing for Selected
      </Button>

      <Button onPress={() => handleBatchUpdate(false)}>
        Disable Proofing for Selected
      </Button>
    </View>
  );
}
```

### For Customers

#### Display Proofing Status on Listing

```tsx
function CustomServiceListing({ listing }) {
  const [proofingStatus, setProofingStatus] = useState(null);

  useEffect(() => {
    loadProofingStatus();
  }, [listing.id]);

  const loadProofingStatus = async () => {
    const status = await CustomServicePayments.getListingProofingStatus(listing.id);
    setProofingStatus(status);
  };

  return (
    <View>
      <Text>{listing.title}</Text>
      <Text>{listing.description}</Text>

      {proofingStatus?.proofingRequired ? (
        <View style={styles.badge}>
          <Icon name="check-circle" />
          <Text>Includes Proof Approval</Text>
          <Text>You'll review and approve the design before production</Text>
        </View>
      ) : (
        <View style={styles.badge}>
          <Icon name="fast-forward" />
          <Text>Express Production</Text>
          <Text>Provider will start immediately based on your customization</Text>
        </View>
      )}
    </View>
  );
}
```

#### Order Flow Display

```tsx
function OrderWorkflow({ productionOrder }) {
  const [canBypass, setCanBypass] = useState(false);

  useEffect(() => {
    checkProofingRequirement();
  }, [productionOrder.id]);

  const checkProofingRequirement = async () => {
    const check = await CustomServicePayments.canProceedWithoutProof(
      productionOrder.id
    );
    setCanBypass(check.canProceed);
  };

  if (canBypass) {
    return (
      <View>
        <Text>Order Status: In Production</Text>
        <Text>
          Provider is working on your order using your customization choices.
          No proof approval is required for this service.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text>Order Status: Awaiting Proof</Text>
      <Text>
        Provider will submit a design proof for your review and approval
        before starting production.
      </Text>
    </View>
  );
}
```

## Database Schema

### service_listings Table Additions

```sql
proofing_required     boolean  DEFAULT true
proofing_updated_at   timestamptz
proofing_updated_by   uuid  REFERENCES profiles(id)
```

### production_orders Table Additions

```sql
proofing_bypassed        boolean  DEFAULT false
proofing_bypass_reason   text
```

## Business Logic Rules

### When to Enable Proofing

**Enable proofing when:**
- Design complexity requires customer approval
- High-value items where accuracy is critical
- Custom artwork or branding involved
- Risk of customer dissatisfaction without preview
- Professional services requiring specification confirmation

### When to Disable Proofing

**Disable proofing when:**
- Service is simple and straightforward
- Personalization options are limited and clear
- Fast turnaround is a competitive advantage
- Preview rendering is highly accurate
- Low-risk personalization (e.g., text only with standard fonts)

## Security & Permissions

### Provider Permissions

- Can enable/disable proofing for own listings only
- Can batch update own listings only
- Cannot modify proofing requirement for existing orders
- Changes are logged with provider ID and timestamp

### Customer Permissions

- Can view proofing status of any listing
- Cannot modify proofing requirements
- Informed about proofing status before purchase
- Existing order workflow cannot be changed retroactively

### System Rules

- RLS policies enforce provider ownership
- Proofing status changes create audit trail
- Timeline events track all configuration changes
- Existing orders maintain original workflow

## Timeline Events

The system creates these events:

```
listing_proofing_changed
  → Provider enabled/disabled proofing for listing

proofing_bypassed
  → Order proceeding without proofing (listing has it disabled)

proof_submitted
  → Provider submitted proof (only when proofing enabled)

proof_approved
  → Customer approved proof (only when proofing enabled)
```

## Analytics & Reporting

### Provider View

Query to see proofing usage:

```sql
SELECT * FROM provider_listing_proofing_summary
WHERE provider_id = 'provider-id';
```

Returns:
- Total orders per listing
- Orders without proofing
- Total proofs submitted
- Proofing requirement status

### Performance Metrics

Track these metrics:
- Average time-to-completion with proofing vs. without
- Customer satisfaction scores by proofing status
- Refund rates by proofing status
- Revision requests per order

## Migration Notes

- Migration: `add_optional_provider_controlled_proofing.sql`
- All existing Custom Service listings default to `proofing_required = true`
- No existing orders are affected
- Providers must explicitly disable proofing if desired
- Backward compatible with all existing code

## Testing Checklist

### Provider Tests
- [ ] Enable proofing for listing
- [ ] Disable proofing for listing
- [ ] Batch enable for multiple listings
- [ ] Batch disable for multiple listings
- [ ] View proofing status for own listing
- [ ] Cannot modify proofing for other provider's listing

### Order Flow Tests
- [ ] Order with proofing enabled follows traditional workflow
- [ ] Order with proofing disabled skips proof submission
- [ ] Personalization snapshot captured at add-to-cart
- [ ] Provider can proceed to production without proof when disabled
- [ ] Provider cannot skip proofing when enabled
- [ ] Timeline events created correctly

### Customer Experience Tests
- [ ] Customer sees proofing status on listing page
- [ ] Customer informed about workflow before purchase
- [ ] Customer receives appropriate status updates
- [ ] Customer knows whether to expect proof approval

### Edge Cases
- [ ] Changing proofing setting doesn't affect existing orders
- [ ] Orders created before feature launch work unchanged
- [ ] Proofing status clear when listing has no personalization
- [ ] Works correctly with consultation workflow
- [ ] Works correctly with price adjustment workflow

## Support Scenarios

### Customer: "Why didn't I get to approve a proof?"

**Check:** Was proofing disabled for this listing?

```typescript
const status = await CustomServicePayments.getListingProofingStatus(listingId);
if (!status.proofingRequired) {
  // Explain that proof approval was not included
}
```

### Provider: "Can I skip proofing for rush orders?"

**Answer:** Proofing must be configured per listing, not per order. If you frequently need rush orders, consider:
1. Creating a separate "Express" listing with proofing disabled
2. Disabling proofing for specific listings permanently

### Customer: "I want proof approval even though listing doesn't include it"

**Answer:** Proofing availability is set by the provider per listing. If proof approval is important to you, look for listings that include it (indicated by "Includes Proof Approval" badge) or contact the provider before ordering.

## Best Practices

1. **Be Transparent**: Clearly communicate proofing status in listing description
2. **Start Conservative**: Enable proofing until you're confident in your process
3. **Monitor Results**: Track customer satisfaction and refund rates by proofing status
4. **Use Batch Wisely**: Group similar services when batch updating
5. **Document Decisions**: Use the reason parameter when changing proofing settings
6. **Test First**: Try with a few listings before batch updating many
7. **Customer Communication**: Set clear expectations about timeline differences

## FAQ

**Q: What happens to existing orders if I change the proofing setting?**
A: Nothing. Existing orders maintain their original workflow. The setting only affects new orders.

**Q: Can I enable proofing for some orders but not others of the same listing?**
A: No. Proofing is configured per listing, not per order. Create separate listings if you need different workflows.

**Q: What if a customer requests a proof even when not required?**
A: You can voluntarily submit a proof through the normal proof submission flow, but it's not enforced by the system.

**Q: How does this affect refunds?**
A: Refund policies follow existing rules based on order status. Proofing-disabled orders can still be refunded per the standard policy.

**Q: Can I change proofing setting after receiving orders?**
A: Yes, but it only affects new orders. Existing orders continue with their original workflow.

**Q: Does disabling proofing affect pricing?**
A: No. Pricing is independent of proofing requirement. You may choose to price services differently based on included features.
