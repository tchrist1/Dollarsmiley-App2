# Custom Services Provider Listing Flow

## Overview

This document details the complete workflow for providers creating and configuring Custom Service listings in the Dollarsmiley marketplace. Custom Services are more complex than standard services, offering customization options, personalization, and flexible fulfillment methods.

## Complete Flow Diagram

```
1. Navigate to Create Listing
   ↓
2. Select "Custom Service" Type
   ↓
3. Fill Basic Listing Information
   ↓
4. Configure Fulfillment Options
   ↓
5. Create Listing (Database Entry)
   ↓
6. Redirected to Custom Options Editor
   ↓
7. Add Custom Service Options (required)
   ↓
8. [Optional] Configure Advanced Personalization
   ↓
9. [Optional] Configure Proofing Requirement
   ↓
10. Listing Published & Active
```

---

## Step-by-Step Provider Journey

### Step 1: Navigate to Create Listing

**Entry Point:** Provider taps "Create Listing" from the app navigation

**Screen:** `app/(tabs)/create-listing.tsx`

**Initial State:**
- AI Assist toggle: Enabled by default
- Listing Type: "Standard Service" (default)
- All fields empty

---

### Step 2: Select Listing Type

**UI Location:** Top of create listing form

**Options:**
- **Standard Service** - Traditional hourly or fixed-price services
- **Custom Service** - Customizable products with options and personalization

**Action:** Provider taps "Custom Service" button

**Effect:**
- `listingType` state set to `'CustomService'`
- Additional fields appear:
  - Fulfillment Options section
  - Shipping Specifications (conditional)
  - Fulfillment Timeline

---

### Step 3: Fill Basic Listing Information

#### 3.1 Service Title
- **Field:** Text input
- **Validation:** Required, non-empty
- **AI Assist:** Available if title has 2+ words or 12+ characters
- **Example:** "Custom T-Shirt Design and Printing"

#### 3.2 Service Description
- **Field:** Multi-line text area
- **Validation:** Required, non-empty
- **Features:**
  - Word count display (max 120 words)
  - Word count indicator
- **AI Assist:** Can generate improved description based on title
- **Example:** "Professional custom t-shirt design and printing service. Upload your design or work with me to create something unique. High-quality printing on premium cotton shirts. Fast turnaround."

#### 3.3 Category Selection
- **Field:** Category picker modal
- **Validation:** Required
- **AI Assist:** Suggests category based on title + description
- **Features:**
  - Main category selection
  - Automatic subcategory if applicable
  - Visual category browser
- **Example:** Category: "Custom & Personalized Items" → Subcategory: "Custom Apparel"

#### 3.4 Pricing
**Pricing Type Options:**
- **Hourly Rate:** Price per hour + typical duration
- **Fixed Price:** Total price for the service (typical for Custom Services)

**For Fixed Price (most common for Custom Services):**
- **Base Price:** Starting price before customization
- **Estimated Duration:** How long the work takes (informational)

**Validation:**
- Price must be > 0
- Duration must be > 0 (if provided)

**Example:**
- Fixed Price: $25.00
- Estimated Duration: 3-5 business days

#### 3.5 Service Photos
- **Field:** Photo picker with camera/gallery access
- **Max Photos:** 5
- **Requirements:**
  - At least 1 photo recommended
  - Shows example work, materials, or results
- **Storage:** Photos uploaded to Supabase storage
- **Format:** Array of photo URLs stored in `photos` field

#### 3.6 Availability
- **Field:** Day-of-week calendar selector
- **Validation:** At least 1 day required
- **Purpose:** When provider can accept orders
- **Example:** Monday, Tuesday, Wednesday, Friday, Saturday

#### 3.7 Tags (Optional)
- **Field:** Comma-separated text input
- **Purpose:** Improve searchability
- **Example:** "custom, personalized, gifts, t-shirts, printing"

---

### Step 4: Configure Fulfillment Options

**Only for Custom Services**

#### 4.1 Fulfillment Methods

Provider selects one or more methods:

**Pickup**
- Customer picks up completed item from provider
- No shipping cost
- Location-based service

**Drop-Off**
- Customer drops off materials/items
- Provider completes work
- Customer returns to pick up

**Shipping**
- Provider ships completed item to customer
- Requires shipping specifications
- Platform calculates shipping costs

**UI:** Three toggleable buttons with icons

#### 4.2 Shipping Specifications

**Shown only if "Shipping" is selected**

**Item Weight (ounces)**
- Required for shipping cost calculation
- Numeric input
- Example: 16 oz (1 pound)
- Helper text: "Total weight of packaged item in ounces (oz). Example: 1 pound = 16 oz"

**Package Dimensions (inches)**
- Three fields: Length × Width × Height
- All required if shipping enabled
- Numeric inputs
- Example: 10″ × 8″ × 6″
- Helper text: "Measure the box or package in inches (in). Length × Width × Height"

**Purpose:** These values are used by shipping rate calculation API to determine real-time shipping costs for customers.

#### 4.3 Fulfillment Timeline

- **Field:** Numeric input (business days)
- **Default:** 7 days
- **Purpose:** How long from order confirmation to item ready
- **Note:** Excludes shipping transit time
- **Validation:** Required for Custom Services
- **Example:** 5 business days
- **Helper Text:** "Number of business days from order confirmation to when the completed item is ready for delivery (excludes shipping time)"

---

### Step 5: Create Listing (Database Entry)

**Action:** Provider taps "Create Listing" button

#### 5.1 Validation

System validates all required fields:
```javascript
✓ Title not empty
✓ Description not empty
✓ Category selected
✓ Price > 0
✓ At least 1 availability day
✓ If Shipping: weight and dimensions provided
✓ Fulfillment window provided
```

#### 5.2 Database Insert

**Table:** `service_listings`

**Data Inserted:**
```javascript
{
  provider_id: profile.id,
  category_id: categoryId,
  title: title.trim(),
  description: description.trim(),
  pricing_type: 'Fixed',
  base_price: Number(price),
  price: Number(price),
  estimated_duration: duration ? Number(duration) : null,
  photos: JSON.stringify(photos),
  availability: JSON.stringify(availableDays),
  tags: tagsList,
  is_active: true,
  listing_type: 'CustomService',
  item_weight_oz: itemWeight ? Number(itemWeight) : null,
  item_dimensions: {
    length: Number(itemLength),
    width: Number(itemWidth),
    height: Number(itemHeight)
  },
  fulfillment_window_days: Number(fulfillmentWindow),
  proofing_required: true, // DEFAULT VALUE
  created_at: now(),
  updated_at: now()
}
```

**Returns:** Newly created listing with ID

#### 5.3 Fulfillment Options Insert

If fulfillment methods selected, create entries in `fulfillment_options` table:

```javascript
// For each selected fulfillment type
{
  listing_id: data.id,
  fulfillment_type: 'Pickup' | 'DropOff' | 'Shipping',
  is_active: true
}
```

#### 5.4 Success Alert

**For Custom Services:**
```
Title: "Almost Done!"
Message: "Now add custom options for your customers to choose from."
Action: Navigate to /listing/[id]/edit-options
```

---

### Step 6: Redirected to Custom Options Editor

**Automatic Navigation:** System redirects to `/listing/[id]/edit-options`

**Screen:** `app/listing/[id]/edit-options.tsx`

**Purpose:** Configure what options customers can customize

**Why Required:** Custom Services need at least one customizable aspect to differentiate from Standard Services

---

### Step 7: Add Custom Service Options

#### 7.1 Service Options

**Purpose:** Choices customers make that affect the product

**Table:** `custom_service_options`

**Option Structure:**
```typescript
{
  listing_id: string,
  option_type: string,        // Category (e.g., "Size", "Color", "Material")
  option_name: string,        // Label shown to customer (e.g., "Select Size")
  option_values: [            // Array of choices
    {
      value: string,          // Choice name (e.g., "Small")
      price_modifier: number  // Price adjustment (e.g., +5.00)
    }
  ],
  is_required: boolean,       // Must customer select this?
  sort_order: number          // Display order
}
```

**Example Option:**
```javascript
{
  option_type: "Size",
  option_name: "T-Shirt Size",
  option_values: [
    { value: "Small", price_modifier: 0 },
    { value: "Medium", price_modifier: 0 },
    { value: "Large", price_modifier: 0 },
    { value: "XL", price_modifier: 5 },
    { value: "2XL", price_modifier: 10 }
  ],
  is_required: true,
  sort_order: 0
}
```

#### 7.2 Add Option Flow

1. Provider clicks "Add Option"
2. New option card appears (collapsed by default)
3. Provider fills:
   - **Option Type:** Category name
   - **Customer-Facing Label:** What customer sees
   - **Required:** Toggle switch
   - **Option Values:** List of choices
4. For each value:
   - Choice name
   - Price adjustment ($)
   - Remove button
5. "Add Value" button to add more choices
6. "Remove Option" button (destructive action with confirmation)

#### 7.3 Value-Added Services (Add-Ons)

**Purpose:** Optional extras customers can purchase

**Table:** `value_added_services`

**Structure:**
```typescript
{
  listing_id: string,
  service_name: string,      // e.g., "Gift Wrapping"
  description: string,       // Details about the add-on
  price: number,             // Additional cost
  estimated_duration: number, // Extra time in minutes
  is_active: boolean,
  sort_order: number
}
```

**Example VAS:**
```javascript
{
  service_name: "Rush Processing",
  description: "Your order moved to front of queue - completed in 2 business days",
  price: 15.00,
  estimated_duration: 0,
  is_active: true
}
```

#### 7.4 Save Options

**Action:** Provider clicks "Save Options"

**Process:**
1. Validate: At least 1 option or VAS exists
2. Delete existing options/VAS for this listing (clean slate)
3. Insert new options to `custom_service_options`
4. Insert new VAS to `value_added_services`
5. Success alert
6. Navigate back to listings

**Database Transaction:**
```sql
-- Clean up
DELETE FROM custom_service_options WHERE listing_id = ?;
DELETE FROM value_added_services WHERE listing_id = ?;

-- Insert new
INSERT INTO custom_service_options (...) VALUES (...);
INSERT INTO value_added_services (...) VALUES (...);
```

---

### Step 8: Configure Advanced Personalization (Optional)

**Component:** `PersonalizationConfigManager.tsx`

**Access:** Provider can access this later from listing management

**Purpose:** Enable Etsy-style advanced personalization with live preview

#### 8.1 Personalization Types

**Available Types:**
- **Custom Text:** Customer enters text to be printed/engraved
- **Image Upload:** Customer uploads their own image/logo
- **Image Selection:** Customer picks from provider's preset images
- **Font Selection:** Customer chooses text font
- **Color Selection:** Customer picks colors
- **Placement Selection:** Customer chooses where design goes
- **Template Selection:** Customer picks from predefined templates
- **Combined:** Multiple personalization types together

#### 8.2 Configuration Per Type

**Text Personalization:**
```javascript
{
  enabled: true,
  max_length: 50,
  min_length: 0,
  allowed_characters: 'alphanumeric',
  multiline: false,
  max_lines: 1,
  placeholder: 'Enter your text'
}
```

**Image Upload:**
```javascript
{
  enabled: true,
  max_file_size_mb: 10,
  allowed_formats: ['jpg', 'jpeg', 'png'],
  min_resolution: { width: 300, height: 300 },
  max_uploads: 1,
  require_high_res: false
}
```

**Font Configuration:**
```javascript
{
  enabled: true,
  allowed_font_ids: [],
  allow_all_system_fonts: true,
  min_size: 12,
  max_size: 72,
  default_size: 24,
  allow_size_selection: true
}
```

**Color Configuration:**
```javascript
{
  enabled: true,
  allow_custom_colors: false,
  default_color: '#000000',
  palette_id: 'uuid-of-color-palette' // Optional
}
```

#### 8.3 Live Preview Settings

**Options:**
- **Full Preview:** Customers see complete live preview
- **Constrained:** Preview within provider-defined limits
- **Simplified:** Basic preview without advanced features
- **Disabled:** No live preview shown

**Purpose:** Control how much preview customers see before ordering

#### 8.4 Lock Stage

**When personalization data becomes immutable:**

- **Add to Cart:** Locked when added to cart (default for non-proofing)
- **Checkout:** Locked at checkout
- **Order Received:** Locked when provider confirms receipt
- **Proof Approved:** Locked after proof approval (default for proofing)

**Note:** If proofing is disabled, personalization typically locks at "add_to_cart"

#### 8.5 Price Impact

**Personalization can affect pricing:**
- **None:** No additional charge
- **Fixed Amount:** Add fixed price
- **Percentage:** Percentage of base price
- **Per Character:** Price × character count
- **Per Image:** Price × number of images

**Example:**
```javascript
price_impact: {
  type: 'per_character',
  per_character: 0.50  // $0.50 per character
}
```

#### 8.6 Database Storage

**Table:** `personalization_configs`

**One config per personalization feature per listing**

Multiple configs can exist for one listing (e.g., text + color + image upload)

---

### Step 9: Configure Proofing Requirement (Optional)

**NEW FEATURE:** Providers can now enable/disable proofing per listing

**Access:** Listing settings or management screen

**Function:** `CustomServicePayments.setListingProofingRequirement()`

#### 9.1 Proofing Enabled (Default)

**When:** `proofing_required = true`

**Workflow:**
1. Customer orders
2. Provider receives order
3. Provider creates design proof
4. Customer reviews proof
5. Customer approves/rejects/requests revisions
6. Production begins after approval
7. Item completed and delivered

**Use Cases:**
- Complex designs requiring customer approval
- High-value items
- Custom artwork or branding
- Risk of customer dissatisfaction without preview

#### 9.2 Proofing Disabled

**When:** `proofing_required = false`

**Workflow:**
1. Customer customizes service
2. Personalization snapshot captured at add-to-cart
3. Customer orders
4. Provider receives order with snapshot
5. Provider proceeds directly to production
6. Item completed and delivered

**Use Cases:**
- Simple personalization (text only)
- Standard products with limited options
- Fast turnaround priority
- Live preview is highly accurate

#### 9.3 Configuration UI

**Provider sees:**
```
┌─────────────────────────────────────┐
│ Require Proof Approval              │
│                                     │
│ When enabled, customers must        │
│ approve your design proof before    │
│ production. When disabled, you can  │
│ proceed directly using customer's   │
│ personalization choices.            │
│                                     │
│ [ Toggle Switch: ON/OFF ]          │
│                                     │
│ Status: Proofing Required           │
└─────────────────────────────────────┘
```

**Database Update:**
```javascript
UPDATE service_listings
SET
  proofing_required = false,
  proofing_updated_at = now(),
  proofing_updated_by = provider_id
WHERE id = listing_id
```

**Audit Trail:**
```javascript
INSERT INTO production_timeline_events (
  event_type: 'listing_proofing_changed',
  description: 'Proofing disabled for listing: Custom T-Shirts',
  metadata: {
    listing_id,
    previous_value: true,
    new_value: false,
    reason: 'Fast turnaround for simple text customization'
  }
)
```

---

### Step 10: Listing Published & Active

**Final State:**

**Database:**
- `service_listings` entry with `is_active = true`
- `custom_service_options` entries configured
- `value_added_services` entries (if any)
- `fulfillment_options` entries
- `personalization_configs` entries (if configured)
- `proofing_required` set (default true)

**Visible To:**
- ✓ Customers in search results
- ✓ Customers in category browse
- ✓ Customers in provider profile
- ✓ Recommendation engine
- ✓ AI search

**Provider Can:**
- View listing performance
- Edit listing details
- Add/remove custom options
- Configure personalization
- Toggle proofing requirement
- Deactivate listing
- View orders
- Manage production pipeline

---

## Technical Implementation Details

### Database Schema

#### service_listings
```sql
id                      uuid PRIMARY KEY
provider_id             uuid REFERENCES profiles(id)
category_id             uuid REFERENCES categories(id)
title                   text NOT NULL
description             text NOT NULL
pricing_type            text ('Hourly' | 'Fixed')
base_price              numeric NOT NULL
price                   numeric NOT NULL
estimated_duration      numeric
photos                  text (JSON array)
availability            text (JSON array)
tags                    text[]
is_active               boolean DEFAULT true
listing_type            text ('Service' | 'CustomService')
item_weight_oz          numeric
item_dimensions         jsonb
fulfillment_window_days integer
proofing_required       boolean DEFAULT true
proofing_updated_at     timestamptz
proofing_updated_by     uuid REFERENCES profiles(id)
created_at              timestamptz DEFAULT now()
updated_at              timestamptz DEFAULT now()
```

#### custom_service_options
```sql
id              uuid PRIMARY KEY
listing_id      uuid REFERENCES service_listings(id) ON DELETE CASCADE
option_type     text NOT NULL
option_name     text NOT NULL
option_values   jsonb NOT NULL (array of {value, price_modifier})
is_required     boolean DEFAULT false
sort_order      integer DEFAULT 0
created_at      timestamptz DEFAULT now()
```

#### value_added_services
```sql
id                  uuid PRIMARY KEY
listing_id          uuid REFERENCES service_listings(id) ON DELETE CASCADE
service_name        text NOT NULL
description         text
price               numeric NOT NULL
estimated_duration  integer (minutes)
is_active           boolean DEFAULT true
sort_order          integer DEFAULT 0
created_at          timestamptz DEFAULT now()
```

#### fulfillment_options
```sql
id                  uuid PRIMARY KEY
listing_id          uuid REFERENCES service_listings(id) ON DELETE CASCADE
fulfillment_type    text ('Pickup' | 'DropOff' | 'Shipping')
shipping_mode       text ('Platform' | 'External')
base_cost           numeric
cost_per_mile       numeric
cost_per_pound      numeric
estimated_days_min  integer
estimated_days_max  integer
carrier_preference  text[]
is_active           boolean DEFAULT true
```

#### personalization_configs
```sql
id                      uuid PRIMARY KEY
listing_id              uuid REFERENCES service_listings(id) ON DELETE CASCADE
custom_option_id        uuid REFERENCES custom_service_options(id)
is_enabled              boolean DEFAULT true
is_required             boolean DEFAULT false
personalization_type    text
live_preview_mode       text
lock_after_stage        text
display_order           integer
config_settings         jsonb
text_config             jsonb
image_upload_config     jsonb
font_config             jsonb
color_config            jsonb
price_impact            jsonb
created_at              timestamptz
updated_at              timestamptz
```

### API/Library Functions

```typescript
// Create basic listing
const { data, error } = await supabase
  .from('service_listings')
  .insert(listingData)
  .select()
  .single();

// Create fulfillment options
const { error } = await supabase
  .from('fulfillment_options')
  .insert(fulfillmentOptions);

// Save custom options
await ValueAddedServicesManager.createCustomOption(optionData);
await ValueAddedServicesManager.updateCustomOption(id, optionData);

// Configure personalization
await PersonalizationService.createPersonalizationConfig(configData);
await PersonalizationService.updatePersonalizationConfig(id, configData);

// Set proofing requirement
await CustomServicePayments.setListingProofingRequirement(
  listingId,
  providerId,
  proofingRequired,
  reason
);

// Batch update proofing for multiple listings
await CustomServicePayments.batchUpdateListingProofing(
  listingIds,
  providerId,
  proofingRequired,
  reason
);
```

---

## Edge Cases & Error Handling

### Incomplete Listing Creation

**Scenario:** Provider creates listing but doesn't configure options

**Handling:**
- Alert prompts provider to add options
- Listing created in database but marked incomplete
- Provider redirected to options editor
- Cannot be skipped for Custom Services

### Invalid Shipping Specifications

**Scenario:** Shipping selected but weight/dimensions invalid

**Handling:**
- Form validation prevents submission
- Error messages highlight specific fields
- Helper text explains requirements

### Personalization Without Custom Options

**Scenario:** Provider enables personalization but no custom options

**Handling:**
- Personalization can exist independently
- Customer sees personalization fields
- No option selection required

### Proofing Disabled for Complex Service

**Scenario:** Provider disables proofing for a complex custom service

**Handling:**
- System allows it (provider choice)
- Warning shown about customer expectations
- Provider can re-enable anytime
- Customers informed "No proof approval included"

---

## Provider Best Practices

### Listing Quality

1. **Clear Title:** Describe exactly what's customizable
2. **Detailed Description:** Explain process, materials, timeline
3. **Quality Photos:** Show examples of completed work
4. **Reasonable Timeline:** Account for production + buffer time

### Custom Options

1. **Start Simple:** Don't overwhelm with too many options
2. **Clear Pricing:** Price modifiers should be obvious
3. **Required vs Optional:** Mark appropriately
4. **Logical Order:** Sort options in natural selection order

### Personalization

1. **Enable Preview:** Helps customer visualize result
2. **Set Constraints:** Prevent impossible requests
3. **Clear Instructions:** Placeholder text guides customers
4. **Test First:** Order your own service to test workflow

### Proofing Decision

**Enable Proofing When:**
- Design complexity requires approval
- High-value or custom artwork
- Risk of customer dissatisfaction
- Professional specifications needed

**Disable Proofing When:**
- Simple text-only personalization
- Standard products with preset options
- Fast turnaround is competitive advantage
- Live preview is highly accurate

---

## Customer Experience Impact

### With Proofing Enabled

**Customer Sees:**
1. "Includes Proof Approval" badge on listing
2. Customization form
3. Add to cart
4. Checkout
5. "Waiting for Proof" status
6. Proof review interface
7. Approve/reject/revise options
8. "In Production" after approval
9. Delivery

**Timeline:** Longer (proof review adds time)

**Confidence:** Higher (sees exactly what they'll get)

### With Proofing Disabled

**Customer Sees:**
1. "Express Production" badge on listing
2. Customization form with live preview
3. Add to cart (snapshot captured)
4. Checkout
5. "In Production" status immediately
6. Delivery

**Timeline:** Shorter (no proof approval wait)

**Confidence:** Depends on preview accuracy

---

## Analytics & Optimization

### Metrics to Track

**Listing Performance:**
- View count
- Add to cart rate
- Purchase conversion rate
- Average order value
- Time to first order

**Custom Options:**
- Most selected options
- Price modifier impact on conversions
- Option abandonment rate

**Personalization:**
- Personalization usage rate
- Average personalization complexity
- Preview engagement time

**Proofing:**
- Average proof approval time
- Revision request rate
- Customer satisfaction (proofed vs non-proofed)
- Refund rate comparison

### Optimization Strategies

1. **A/B Test Proofing:** Try both approaches, measure outcomes
2. **Simplify Options:** Remove unused or rarely selected options
3. **Price Testing:** Adjust modifiers based on conversion data
4. **Preview Quality:** Improve preview if abandonment high
5. **Timeline Accuracy:** Adjust fulfillment window based on actual performance

---

## Related Documentation

- `OPTIONAL_PROVIDER_CONTROLLED_PROOFING.md` - Proofing configuration guide
- `CUSTOM_SERVICE_PAYMENT_FLOW_IMPLEMENTATION.md` - Payment and escrow flow
- `CONSULTATION_TIMEOUT_CUSTOMER_CONTROL.md` - Consultation handling
- `ADVANCED_PERSONALIZATION_SYSTEM.md` - Full personalization features

---

## Summary

The Custom Services provider listing flow is designed to balance **ease of setup** with **powerful customization**. Providers can create simple listings quickly, or dive deep into advanced personalization and workflow controls. The optional proofing system gives providers flexibility to optimize for either quality assurance or speed, depending on their service type and customer expectations.

**Key Differentiators from Standard Services:**
- ✓ Customization options (size, color, material, etc.)
- ✓ Advanced personalization (text, images, fonts, colors)
- ✓ Multiple fulfillment methods (pickup, drop-off, shipping)
- ✓ Flexible proofing (required or optional)
- ✓ Production pipeline tracking
- ✓ Escrow payment protection
- ✓ Live preview capabilities

This comprehensive system enables providers to offer anything from simple custom t-shirts to complex commissioned artwork, all within a single unified platform.
