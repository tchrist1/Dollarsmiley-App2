# Service Agreements and Damage Deposits Implementation

## Overview
This document describes the complete implementation of platform-managed service agreements and optional damage deposits for Standard Services with fulfillment-based completion rules.

---

## Database Schema

### 1. New Tables

#### `standard_service_agreements`
Platform-managed agreement templates for different fulfillment modes.

**Columns:**
- `id` (uuid, PK) - Agreement ID
- `agreement_type` (text, unique) - Type of agreement
  - Valid values: `no_fulfillment`, `pickup_by_customer`, `dropoff_by_provider`, `pickup_dropoff_customer`, `pickup_dropoff_provider`, `shipping`
- `version` (integer) - Agreement version number
- `title` (text) - Agreement title
- `content` (text) - Full agreement text
- `summary` (text) - Brief summary
- `damage_scope` (jsonb) - JSON defining damage coverage
- `is_active` (boolean) - Whether agreement is active
- `effective_date` (timestamptz) - When agreement became effective
- `created_at` (timestamptz)
- `updated_at` (timestamptz)
- `created_by` (uuid, FK to profiles)

**Unique Constraint:** `(agreement_type, version)`

**Populated Templates:**
1. **no_fulfillment** - On-location services (usage damage only)
2. **pickup_by_customer** - Customer pickup (usage + transport damage)
3. **dropoff_by_provider** - Provider delivery (usage damage only)
4. **pickup_dropoff_customer** - Customer pickup & return (usage + transport damage)
5. **pickup_dropoff_provider** - Provider pickup & return (usage damage only)
6. **shipping** - Third-party carrier (usage damage, transit via insurance)

#### `fulfillment_tracking`
Tracks all fulfillment events for pickup, drop-off, and shipping.

**Columns:**
- `id` (uuid, PK)
- `booking_id` (uuid, FK to bookings) - Associated booking
- `fulfillment_type` (text) - Type of fulfillment
  - Valid values: `PickupByCustomer`, `DropOffByProvider`, `PickupAndDropOffByCustomer`, `PickupAndDropOffByProvider`, `Shipping`
- `event_type` (text) - Event milestone
  - Valid values: `PickupScheduled`, `PickupConfirmed`, `DropOffScheduled`, `DropOffConfirmed`, `ShipmentCreated`, `InTransit`, `Delivered`, `ReturnShipmentCreated`, `ReturnDelivered`
- `event_date` (timestamptz) - When event occurred
- `confirmed_by` (uuid, FK to profiles) - Who confirmed
- `confirmation_method` (text) - How confirmed
  - Valid values: `CustomerConfirm`, `ProviderConfirm`, `AutoExpired`, `CarrierConfirm`
- `notes` (text) - Additional notes
- `metadata` (jsonb) - Additional structured data
- `created_at` (timestamptz)

**Indexes:**
- `idx_fulfillment_tracking_booking`
- `idx_fulfillment_tracking_type`
- `idx_fulfillment_tracking_event`

#### `damage_assessments`
Tracks damage deposit assessments (already exists, no changes needed).

**Key Columns:**
- `booking_id` (uuid, FK)
- `assessed_by` (uuid, FK)
- `damage_reported` (boolean)
- `damage_description` (text)
- `damage_photos` (array)
- `damage_cost` (numeric)
- `status` (text)
- `assessment_window_start` (timestamptz)
- `assessment_window_end` (timestamptz)

---

### 2. Columns Added to `service_listings`

**New Columns:**
- `requires_agreement` (boolean, default: false)
  - Provider toggle: require customer to accept agreement at checkout
- `requires_damage_deposit` (boolean, default: false)
  - Provider toggle: require refundable damage deposit
- `damage_deposit_amount` (numeric, default: 0)
  - Amount of damage deposit if required

**Indexes:**
- `idx_service_listings_requires_agreement` (WHERE requires_agreement = true)
- `idx_service_listings_requires_deposit` (WHERE requires_damage_deposit = true)

---

### 3. Columns Added to `bookings`

**New Columns:**
- `agreement_id` (uuid, FK to standard_service_agreements)
  - Reference to agreement customer accepted
- `agreement_accepted_at` (timestamptz)
  - When customer accepted the agreement
- `damage_deposit_amount` (numeric, default: 0)
  - Actual damage deposit charged
- `damage_deposit_status` (text, default: 'None')
  - Valid values: `None`, `Authorized`, `Held`, `Assessed`, `PartialCaptured`, `FullyCaptured`, `Released`
- `damage_deposit_payment_intent_id` (text)
  - Stripe payment intent for deposit
- `fulfillment_status` (text, default: 'NotRequired')
  - Valid values: `NotRequired`, `Pending`, `InTransit`, `AwaitingPickup`, `AwaitingDropOff`, `AwaitingReturn`, `Completed`, `Expired`
- `fulfillment_completed_at` (timestamptz)
  - When fulfillment was confirmed complete

**Indexes:**
- `idx_bookings_agreement_id`
- `idx_bookings_deposit_status`
- `idx_bookings_fulfillment_status`

---

## Database Functions

### `get_applicable_agreement(p_listing_id uuid)`

**Purpose:** Returns the appropriate agreement ID based on listing's fulfillment modes.

**Logic:**
1. If `requires_fulfilment = false`: Return `no_fulfillment` agreement
2. Get active fulfillment modes from `fulfillment_options`
3. Select agreement type using priority order (most complex first):
   - Shipping
   - PickupAndDropOffByProvider
   - PickupAndDropOffByCustomer
   - DropOffByProvider
   - PickupByCustomer
4. Return most recent version of selected agreement type

**Type Mapping:**
- `PickupByCustomer` → `pickup_by_customer`
- `DropOffByProvider` → `dropoff_by_provider`
- `PickupAndDropOffByCustomer` → `pickup_dropoff_customer`
- `PickupAndDropOffByProvider` → `pickup_dropoff_provider`
- `Shipping` → `shipping`

**Returns:** Agreement UUID or NULL

---

### `check_fulfillment_completion(p_booking_id uuid)`

**Purpose:** Validates if fulfillment requirements are met for a booking.

**Logic:**
1. If `requires_fulfilment = false`: Return `true`
2. Get fulfillment modes for the listing
3. Get completed events from `fulfillment_tracking`
4. Check completion based on mode:
   - **Shipping:** Requires `Delivered` event (+ `ReturnDelivered` if return shipment created)
   - **PickupAndDropOffByProvider:** Requires both `PickupConfirmed` and `DropOffConfirmed`
   - **PickupAndDropOffByCustomer:** Requires both `PickupConfirmed` and `DropOffConfirmed`
   - **DropOffByProvider:** Requires `DropOffConfirmed`
   - **PickupByCustomer:** Requires `PickupConfirmed`

**Returns:** Boolean (true if complete, false otherwise)

---

## UI Implementation

### Create Listing Screen (`app/(tabs)/create-listing.tsx`)

#### New State Variables
```typescript
const [requiresAgreement, setRequiresAgreement] = useState(false);
const [requiresDamageDeposit, setRequiresDamageDeposit] = useState(false);
const [damageDepositAmount, setDamageDepositAmount] = useState('');
```

#### New UI Sections

**1. Require Service Agreement Toggle**
- Location: After fulfillment toggle, shown when `requiresFulfilment = true` AND `listingType = 'Service'`
- Toggle switch UI with description
- Label: "Require Service Agreement"
- Description: "Customer must accept platform agreement at checkout"

**2. Require Damage Deposit Toggle**
- Location: After agreement toggle
- Toggle switch UI with description
- Label: "Require Damage Deposit"
- Description: "Refundable deposit to cover potential damages"

**3. Damage Deposit Amount Input**
- Shown when `requiresDamageDeposit = true`
- Numeric input with dollar sign icon
- Label: "Damage Deposit Amount"
- Helper text: "Refundable amount held to cover potential damages. Will be automatically released if no damage is reported within 48 hours."
- Validation: Required, must be > 0

#### Validation

```typescript
if (requiresDamageDeposit) {
  if (!damageDepositAmount || isNaN(Number(damageDepositAmount))) {
    newErrors.damageDeposit = 'Valid deposit amount is required';
  } else if (Number(damageDepositAmount) <= 0) {
    newErrors.damageDeposit = 'Deposit amount must be greater than 0';
  }
}
```

#### Submission

```typescript
listingData.requires_agreement = requiresAgreement;
listingData.requires_damage_deposit = requiresDamageDeposit;
listingData.damage_deposit_amount = requiresDamageDeposit ? Number(damageDepositAmount) : 0;
```

---

## Helper Library (`lib/service-agreements.ts`)

### Key Functions

#### `getApplicableAgreement(listingId: string)`
Fetches the applicable agreement for a listing using the database function.

#### `getAgreementByType(agreementType: string)`
Fetches a specific agreement by type (snake_case).

#### `recordAgreementAcceptance(bookingId: string, agreementId: string)`
Records when a customer accepts an agreement at checkout.

#### `recordFulfillmentEvent(params)`
Records a fulfillment milestone (pickup, delivery, etc.).

**Parameters:**
- `bookingId` - Booking ID
- `fulfillmentType` - Type of fulfillment (PascalCase)
- `eventType` - Event milestone
- `confirmedBy` - User who confirmed (optional)
- `confirmationMethod` - How it was confirmed
- `notes` - Additional notes (optional)
- `metadata` - Additional data (optional)

#### `checkFulfillmentCompletion(bookingId: string)`
Checks if fulfillment is complete using the database function.

#### `getFulfillmentEvents(bookingId: string)`
Retrieves all fulfillment events for a booking.

#### `createDamageAssessment(params)`
Creates a damage assessment record.

**Parameters:**
- `bookingId` - Booking ID
- `assessedBy` - Provider user ID
- `damageReported` - Whether damage was found
- `damageDescription` - Description of damage
- `damagePhotos` - Array of photo URLs
- `assessedAmount` - Amount to capture from deposit
- `notes` - Additional notes

**Automatically calculates:**
- `assessment_window_end` - 48 hours from fulfillment completion

#### `getDamageAssessment(bookingId: string)`
Retrieves the damage assessment for a booking.

#### `updateDamageAssessmentStatus(assessmentId: string, status: string)`
Updates the status of a damage assessment.

#### `getBookingDamageDeposit(bookingId: string)`
Retrieves damage deposit info for a booking.

---

## Agreement Content

Each agreement includes:
1. **Fulfillment Responsibilities** - Who handles what
2. **Liability and Damages** - Damage scope and responsibility
3. **Damage Deposit (If Applicable)** - Deposit coverage and handling
4. **Fulfillment Windows** - Timing and expiration rules
5. **Disputes** - Dispute resolution process

### Damage Coverage Rules

| Fulfillment Mode | Usage Damage | Transport Damage | Notes |
|-----------------|--------------|------------------|-------|
| No Fulfillment | ✓ | ✗ | On-location only |
| Pickup by Customer | ✓ | ✓ | Customer responsible for transport |
| Drop-off by Provider | ✓ | ✗ | Provider handles transport |
| Pickup & Drop-off by Customer | ✓ | ✓ | Customer handles all transport |
| Pickup & Drop-off by Provider | ✓ | ✗ | Provider handles all transport |
| Shipping | ✓ | ✗* | *Transit via carrier insurance |

---

## Payment Flow Integration

### Standard Service Payment (No Changes)
1. Customer books service
2. Service price authorized/captured per existing flow
3. Escrow rules apply as before

### With Damage Deposit (New)
1. Customer books service
2. **Service price** authorized/captured (existing flow)
3. **Damage deposit** authorized separately
   - Separate Stripe Payment Intent
   - Stored in `damage_deposit_payment_intent_id`
   - Status tracked in `damage_deposit_status`
4. Both charges shown separately in UI

### Deposit Release Flow
1. Fulfillment completes
2. 48-hour assessment window begins
3. Provider creates damage assessment
4. Options:
   - **No damage:** Full deposit released automatically
   - **Damage found:** Provider requests partial/full capture
   - **Window expires:** Full deposit released automatically

---

## Fulfillment Completion Rules

### Standard Services

**Booking cannot be marked complete until:**
1. Service is performed (existing rule)
2. If `requires_fulfilment = true`:
   - Fulfillment events confirm completion via `check_fulfillment_completion()`
   - Required events depend on selected fulfillment mode(s)

**Example Flows:**

**Pickup by Customer:**
1. Provider marks items ready
2. Customer picks up and confirms → `PickupConfirmed` event
3. `check_fulfillment_completion()` returns `true`
4. Service can be marked complete

**Shipping:**
1. Provider creates shipment → `ShipmentCreated` event
2. Carrier marks in transit → `InTransit` event
3. Carrier confirms delivery → `Delivered` event
4. If return required:
   - Customer ships back → `ReturnShipmentCreated` event
   - Carrier confirms return → `ReturnDelivered` event
5. `check_fulfillment_completion()` returns `true`
6. Service can be marked complete

### Escrow Release with Damage Deposit

**If damage deposit is enabled:**
1. Service marked complete
2. Fulfillment confirmed complete
3. **Escrow release waits** for damage assessment
4. 48-hour assessment window
5. Options:
   - Provider reports no damage → Release escrow + deposit
   - Provider reports damage → Hold escrow, process deposit claim
   - Window expires → Auto-release escrow + deposit

---

## Backward Compatibility

### Existing Services
- All new columns default to `false` or `0`
- Existing services behave identically
- No migration required
- No agreement required for existing bookings

### Existing Bookings
- `agreement_id` = NULL (acceptable)
- `damage_deposit_status` = 'None'
- `fulfillment_status` = 'NotRequired'
- Complete normally without fulfillment tracking

### Existing Payment Flows
- No changes to service price capture timing
- No changes to escrow hold/release (unless deposit enabled)
- Stripe integration unchanged

---

## Security (RLS Policies)

### `standard_service_agreements`
- **Public Read:** Anyone can view active agreements

### `fulfillment_tracking`
- **Read:** Booking participants (customer and provider)
- **Insert:** Booking participants
- **Update:** Not allowed
- **Delete:** Not allowed

### `damage_assessments`
- **Read:** Booking participants
- **Insert:** Provider only (for their bookings)
- **Update:** Provider only (own assessments)
- **Delete:** Not allowed

---

## Testing Checklist

### Database
- [x] Migrations apply without errors
- [x] All 6 agreement templates populated
- [x] Columns added to service_listings
- [x] Columns added to bookings
- [x] fulfillment_tracking table created
- [x] Functions created and working
- [x] RLS policies applied

### UI - Create Listing
- [ ] Agreement toggle appears for Standard Services with fulfillment
- [ ] Deposit toggle appears for Standard Services with fulfillment
- [ ] Deposit amount input shows when deposit enabled
- [ ] Validation prevents submission without deposit amount
- [ ] Data saves correctly to database
- [ ] Clear all resets agreement and deposit fields

### Agreement Selection
- [ ] Correct agreement selected based on fulfillment modes
- [ ] Priority order works (Shipping > Both Provider > Both Customer > DropOff > Pickup)
- [ ] No fulfillment returns no_fulfillment agreement

### Fulfillment Tracking
- [ ] Events can be recorded
- [ ] Completion check works for each mode
- [ ] Multiple events tracked correctly
- [ ] Return shipment handling works

### Damage Deposits
- [ ] Assessment can be created
- [ ] 48-hour window calculated correctly
- [ ] Status updates work
- [ ] Assessment retrieval works

---

## Future Enhancements

### Phase 1: Checkout Integration
- Display applicable agreement at checkout
- Require explicit customer acceptance
- Record acceptance timestamp

### Phase 2: Damage Deposit Payment
- Integrate with Stripe for separate deposit authorization
- Implement partial capture for damage claims
- Auto-release on window expiration

### Phase 3: Fulfillment UI
- Provider fulfillment dashboard
- Customer confirmation flows
- Tracking integration
- Photo upload for condition documentation

### Phase 4: Damage Assessment UI
- Provider damage reporting form
- Photo upload for damage evidence
- Customer dispute flow
- Admin review interface

---

## Summary

**Implemented:**
✅ Database schema (tables, columns, constraints)
✅ Agreement templates (all 6 types populated)
✅ Helper functions (get_applicable_agreement, check_fulfillment_completion)
✅ fulfillment_tracking table and RLS
✅ UI toggles for agreement and deposit (Standard Services only)
✅ Service library (lib/service-agreements.ts)
✅ Validation and submission logic
✅ Backward compatibility maintained

**Not Implemented (By Design):**
⏸️ Checkout agreement acceptance flow (future phase)
⏸️ Stripe deposit payment integration (future phase)
⏸️ Fulfillment confirmation UI (future phase)
⏸️ Damage assessment UI (future phase)
⏸️ Automatic escrow hold for deposit assessments (future phase)

**Guarantees Met:**
✅ Fully backward-compatible
✅ No breaking changes
✅ Stripe-safe (no changes to existing flows)
✅ Escrow-safe (no changes to existing flows)
✅ Marketplace-stable
✅ Standard Services only (Custom Services unaffected)

---

## Implementation Status: COMPLETE

The foundation for service agreements and damage deposits is now in place. The database schema, helper functions, and UI controls are ready. Future phases will add the customer-facing checkout flow, Stripe payment integration, and fulfillment/assessment UI components.
