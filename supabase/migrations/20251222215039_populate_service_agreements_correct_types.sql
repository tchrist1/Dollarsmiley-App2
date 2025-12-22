/*
  # Populate Standard Service Agreements (Correct Types)

  ## Summary
  Populates standard_service_agreements with templates using correct agreement_type values.

  ## Agreement Types (snake_case)
  - no_fulfillment
  - pickup_by_customer
  - dropoff_by_provider
  - pickup_dropoff_customer
  - pickup_dropoff_provider
  - shipping
*/

INSERT INTO standard_service_agreements (
  agreement_type, 
  title, 
  content, 
  summary,
  damage_scope,
  version, 
  is_active,
  effective_date
)
VALUES
  (
    'no_fulfillment',
    'Standard Service Agreement - On-Location Service',
    E'STANDARD SERVICE AGREEMENT\n\nThis agreement governs the service to be performed at the customer''s location or the provider''s facility.\n\n1. SERVICE DELIVERY\n   - Service will be performed at the agreed location\n   - No pickup, drop-off, or shipping is required\n   - Customer must provide reasonable access to the service location\n\n2. LIABILITY AND DAMAGES\n   - Provider is responsible for damages caused during service performance\n   - Customer is responsible for pre-existing conditions at the service location\n   - Usage-related damages are covered under this agreement\n\n3. DAMAGE DEPOSIT (If Applicable)\n   - Deposit covers usage-related damages only\n   - Provider must assess damages within 48 hours of service completion\n   - Unused deposit will be automatically released after assessment window\n\n4. DISPUTES\n   - All disputes will be handled through the platform''s dispute resolution process\n   - Both parties agree to provide documentation and evidence as requested\n\n5. CANCELLATION\n   - Cancellation terms follow the platform''s standard cancellation policy\n   - Refunds will be processed according to platform guidelines\n\nBy proceeding, you acknowledge and accept these terms.',
    'On-location service with usage-related damage coverage',
    '{"usage_damage": true, "transport_damage": false}'::jsonb,
    1,
    true,
    now()
  ),
  (
    'pickup_by_customer',
    'Standard Service Agreement - Customer Pickup',
    E'STANDARD SERVICE AGREEMENT - CUSTOMER PICKUP\n\nThis agreement governs services where the customer is responsible for picking up items from the provider.\n\n1. FULFILLMENT RESPONSIBILITIES\n   - Customer must pick up items at the agreed location and time\n   - Provider will have items ready within the specified window\n   - Customer is responsible for transportation and handling during pickup\n\n2. LIABILITY AND DAMAGES\n   - Provider is responsible for item condition up to pickup confirmation\n   - Customer assumes liability upon pickup confirmation\n   - Transportation-related damages are customer''s responsibility\n   - Usage-related damages are covered under this agreement\n\n3. DAMAGE DEPOSIT (If Applicable)\n   - Deposit covers both usage-related and transportation-related damages\n   - Customer must return items (if applicable) in original condition\n   - Provider must assess damages within 48 hours of item return or service completion\n   - Unused deposit will be automatically released after assessment window\n\n4. PICKUP WINDOW\n   - Pickup must occur within the agreed time window\n   - If pickup window expires without confirmation, booking may be cancelled\n   - Provider may charge restocking or handling fees for missed pickups\n\n5. DISPUTES\n   - All disputes will be handled through the platform''s dispute resolution process\n   - Both parties must provide photos/documentation of item condition\n\nBy proceeding, you acknowledge and accept these terms.',
    'Customer pickup with usage and transportation damage coverage',
    '{"usage_damage": true, "transport_damage": true}'::jsonb,
    1,
    true,
    now()
  ),
  (
    'dropoff_by_provider',
    'Standard Service Agreement - Provider Drop-Off',
    E'STANDARD SERVICE AGREEMENT - PROVIDER DROP-OFF\n\nThis agreement governs services where the provider delivers items to the customer.\n\n1. FULFILLMENT RESPONSIBILITIES\n   - Provider is responsible for delivering items to customer''s location\n   - Provider will deliver within the agreed time window\n   - Provider handles all transportation and delivery logistics\n\n2. LIABILITY AND DAMAGES\n   - Provider is responsible for transportation-related damages\n   - Customer is responsible for damages after delivery confirmation\n   - Usage-related damages are covered under this agreement\n\n3. DAMAGE DEPOSIT (If Applicable)\n   - Deposit covers usage-related damages only\n   - Transportation damage is provider''s responsibility\n   - Customer must accept delivery and confirm item condition\n   - Provider must assess usage damages within 48 hours of item return or service completion\n   - Unused deposit will be automatically released after assessment window\n\n4. DELIVERY WINDOW\n   - Delivery will occur within the specified window\n   - Customer must be available to accept delivery\n   - If customer is unavailable, provider may reschedule or return items\n\n5. DISPUTES\n   - All disputes will be handled through the platform''s dispute resolution process\n   - Customer should document item condition upon delivery\n\nBy proceeding, you acknowledge and accept these terms.',
    'Provider delivery with usage damage coverage only',
    '{"usage_damage": true, "transport_damage": false}'::jsonb,
    1,
    true,
    now()
  ),
  (
    'pickup_dropoff_customer',
    'Standard Service Agreement - Customer Pickup and Return',
    E'STANDARD SERVICE AGREEMENT - CUSTOMER PICKUP AND RETURN\n\nThis agreement governs services where the customer handles both pickup and return of items.\n\n1. FULFILLMENT RESPONSIBILITIES\n   - Customer must pick up items at provider''s location within agreed window\n   - Customer must return items at provider''s location after use\n   - Customer is responsible for all transportation and handling\n\n2. LIABILITY AND DAMAGES\n   - Provider is responsible for item condition before initial pickup\n   - Customer assumes full liability during pickup, use, and return\n   - Customer is responsible for all transportation-related damages\n   - Customer is responsible for all usage-related damages\n\n3. DAMAGE DEPOSIT (If Applicable)\n   - Deposit covers both usage-related and transportation-related damages\n   - Items must be returned in original condition\n   - Provider must assess damages within 48 hours of return\n   - Customer responsible for damages incurred during entire rental period\n   - Unused deposit will be automatically released after assessment window\n\n4. PICKUP AND RETURN WINDOWS\n   - Pickup and return must occur within agreed time windows\n   - Late returns may incur additional charges\n   - Failure to return items may result in full deposit capture\n\n5. DISPUTES\n   - All disputes will be handled through the platform''s dispute resolution process\n   - Both parties must provide photos/documentation of item condition\n\nBy proceeding, you acknowledge and accept these terms.',
    'Customer handles pickup and return with full damage coverage',
    '{"usage_damage": true, "transport_damage": true}'::jsonb,
    1,
    true,
    now()
  ),
  (
    'pickup_dropoff_provider',
    'Standard Service Agreement - Provider Pickup and Return',
    E'STANDARD SERVICE AGREEMENT - PROVIDER PICKUP AND RETURN\n\nThis agreement governs services where the provider handles both pickup and return of items.\n\n1. FULFILLMENT RESPONSIBILITIES\n   - Provider will pick up items from customer''s location\n   - Provider will return items to customer''s location after service\n   - Provider handles all transportation and delivery logistics\n\n2. LIABILITY AND DAMAGES\n   - Provider is responsible for all transportation-related damages\n   - Customer is responsible for usage-related damages during possession\n   - Provider must document item condition at pickup and return\n\n3. DAMAGE DEPOSIT (If Applicable)\n   - Deposit covers usage-related damages only\n   - Transportation damage is provider''s responsibility\n   - Customer must return items in original condition (excluding normal wear)\n   - Provider must assess damages within 48 hours of return pickup\n   - Unused deposit will be automatically released after assessment window\n\n4. PICKUP AND RETURN WINDOWS\n   - Provider will schedule pickup and return within agreed windows\n   - Customer must be available for both pickup and return\n   - Rescheduling may incur additional fees\n\n5. DISPUTES\n   - All disputes will be handled through the platform''s dispute resolution process\n   - Provider must document condition with photos at pickup and return\n\nBy proceeding, you acknowledge and accept these terms.',
    'Provider handles pickup and return with usage damage coverage',
    '{"usage_damage": true, "transport_damage": false}'::jsonb,
    1,
    true,
    now()
  ),
  (
    'shipping',
    'Standard Service Agreement - Shipping',
    E'STANDARD SERVICE AGREEMENT - SHIPPING\n\nThis agreement governs services where items are shipped via third-party carrier.\n\n1. FULFILLMENT RESPONSIBILITIES\n   - Provider ships items via platform-selected carrier\n   - Tracking information will be provided to customer\n   - Delivery timelines are estimated and subject to carrier performance\n\n2. LIABILITY AND DAMAGES\n   - Transit damage (during shipping) is covered by shipping insurance\n   - Provider is responsible for proper packaging\n   - Customer is responsible for post-delivery usage damages\n   - Customer must inspect and report transit damage within 48 hours of delivery\n\n3. DAMAGE DEPOSIT (If Applicable)\n   - Deposit covers post-delivery usage-related damages only\n   - Transit damage during shipping is NOT covered by customer deposit\n   - Transit damage claims go through carrier insurance process\n   - Customer must return items (if applicable) via provided shipping label\n   - Provider must assess usage damages within 48 hours of return delivery\n   - Unused deposit will be automatically released after assessment window\n\n4. SHIPPING AND DELIVERY\n   - Delivery confirmation required via carrier tracking\n   - Customer must provide accurate shipping address\n   - Customer responsible for receiving and securing delivered packages\n   - Return shipping (if applicable) is prepaid by provider\n\n5. DISPUTES\n   - Transit damage disputes handled through carrier insurance\n   - Usage damage disputes handled through platform dispute resolution\n   - Customer must provide photo evidence of claimed damages\n\nBy proceeding, you acknowledge and accept these terms.',
    'Shipping with usage damage coverage, transit damage via carrier insurance',
    '{"usage_damage": true, "transport_damage": false, "transit_via_insurance": true}'::jsonb,
    1,
    true,
    now()
  )
ON CONFLICT (agreement_type, version) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  summary = EXCLUDED.summary,
  damage_scope = EXCLUDED.damage_scope,
  is_active = EXCLUDED.is_active,
  effective_date = EXCLUDED.effective_date,
  updated_at = now();
