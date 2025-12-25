/*
  # Inventory-Backed Services System
  
  ## Overview
  This migration implements a unified inventory system for Standard and Custom Services.
  Inventory is OPTIONAL and disabled by default for backward compatibility.
  
  ## New Tables
  
  ### 1. provider_inventory_items
  Provider-owned reusable inventory catalog
  - name, description, quantities
  - rental settings (turnaround buffer)
  - location for pickup/drop-off
  - low stock threshold for alerts
  
  ### 2. inventory_locks
  Prevents overbooking with soft/hard locks
  - Links to bookings or production orders
  - Tracks pickup/drop-off windows for rentals
  - Auto-expires soft locks
  
  ### 3. rental_pricing_tiers
  Duration-based pricing for rental inventory
  - Flat, per-day, per-hour, or tiered pricing
  
  ### 4. inventory_alerts
  Low-stock and availability alerts for providers
  
  ## Changes to Existing Tables
  
  ### service_listings
  - inventory_mode: none | quantity | rental
  - inventory_item_id: links to provider inventory
  - rental_pricing_model: flat | per_day | per_hour | tiered
  
  ### bookings
  - inventory_lock_id: reference to active lock
  - rental_pickup_at, rental_dropoff_at: rental window
  
  ### production_orders
  - inventory_lock_id: reference to active lock
  
  ## Security
  - RLS enabled on all new tables
  - Providers manage their own inventory
  - Customers can view availability only
  
  ## Notes
  - Fully backward compatible
  - No changes to escrow or Stripe flows
  - Inventory disabled by default
*/

-- ============================================
-- PROVIDER INVENTORY ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS provider_inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sku text,
  total_quantity integer NOT NULL DEFAULT 1 CHECK (total_quantity >= 0),
  buffer_quantity integer NOT NULL DEFAULT 0 CHECK (buffer_quantity >= 0),
  is_rentable boolean NOT NULL DEFAULT false,
  turnaround_buffer_hours integer DEFAULT 0 CHECK (turnaround_buffer_hours >= 0),
  location_address text,
  location_lat numeric(10, 7),
  location_lng numeric(10, 7),
  low_stock_threshold integer DEFAULT 0 CHECK (low_stock_threshold >= 0),
  image_url text,
  metadata jsonb DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_inventory_items_provider 
  ON provider_inventory_items(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_inventory_items_active 
  ON provider_inventory_items(provider_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_provider_inventory_items_rentable 
  ON provider_inventory_items(provider_id, is_rentable) WHERE is_rentable = true;

-- ============================================
-- INVENTORY LOCKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid NOT NULL REFERENCES provider_inventory_items(id) ON DELETE CASCADE,
  service_listing_id uuid REFERENCES service_listings(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  production_order_id uuid REFERENCES production_orders(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  pickup_at timestamptz,
  dropoff_at timestamptz,
  dropoff_at_effective timestamptz,
  lock_type text NOT NULL DEFAULT 'soft' CHECK (lock_type IN ('soft', 'hard')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released', 'expired')),
  soft_lock_expires_at timestamptz,
  locked_by uuid REFERENCES profiles(id),
  released_at timestamptz,
  released_reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_locks_item 
  ON inventory_locks(inventory_item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_locks_active 
  ON inventory_locks(inventory_item_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_inventory_locks_booking 
  ON inventory_locks(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_locks_production 
  ON inventory_locks(production_order_id) WHERE production_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_locks_rental_window 
  ON inventory_locks(inventory_item_id, pickup_at, dropoff_at_effective) 
  WHERE status = 'active' AND pickup_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_locks_soft_expiry 
  ON inventory_locks(soft_lock_expires_at) 
  WHERE lock_type = 'soft' AND status = 'active';

-- ============================================
-- RENTAL PRICING TIERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rental_pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_listing_id uuid NOT NULL REFERENCES service_listings(id) ON DELETE CASCADE,
  tier_order integer NOT NULL DEFAULT 1,
  min_duration_hours integer NOT NULL DEFAULT 0,
  max_duration_hours integer,
  price_per_unit numeric(10, 2) NOT NULL CHECK (price_per_unit >= 0),
  unit_type text NOT NULL DEFAULT 'hour' CHECK (unit_type IN ('hour', 'day', 'flat')),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT rental_tier_duration_check CHECK (
    max_duration_hours IS NULL OR max_duration_hours > min_duration_hours
  )
);

CREATE INDEX IF NOT EXISTS idx_rental_pricing_tiers_listing 
  ON rental_pricing_tiers(service_listing_id, tier_order);

-- ============================================
-- INVENTORY ALERTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  inventory_item_id uuid NOT NULL REFERENCES provider_inventory_items(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'upcoming_shortage')),
  current_available integer NOT NULL,
  threshold integer NOT NULL,
  message text,
  is_read boolean NOT NULL DEFAULT false,
  is_dismissed boolean NOT NULL DEFAULT false,
  triggered_at timestamptz DEFAULT now(),
  read_at timestamptz,
  dismissed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_inventory_alerts_provider 
  ON inventory_alerts(provider_id, is_read, is_dismissed);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_item 
  ON inventory_alerts(inventory_item_id);

-- ============================================
-- ADD COLUMNS TO SERVICE_LISTINGS
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_listings' AND column_name = 'inventory_mode'
  ) THEN
    ALTER TABLE service_listings 
      ADD COLUMN inventory_mode text DEFAULT 'none' 
        CHECK (inventory_mode IN ('none', 'quantity', 'rental'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_listings' AND column_name = 'inventory_item_id'
  ) THEN
    ALTER TABLE service_listings 
      ADD COLUMN inventory_item_id uuid REFERENCES provider_inventory_items(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_listings' AND column_name = 'rental_pricing_model'
  ) THEN
    ALTER TABLE service_listings 
      ADD COLUMN rental_pricing_model text DEFAULT 'flat' 
        CHECK (rental_pricing_model IN ('flat', 'per_day', 'per_hour', 'tiered'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_listings' AND column_name = 'rental_base_price'
  ) THEN
    ALTER TABLE service_listings 
      ADD COLUMN rental_base_price numeric(10, 2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_listings' AND column_name = 'rental_quantity_required'
  ) THEN
    ALTER TABLE service_listings 
      ADD COLUMN rental_quantity_required integer DEFAULT 1;
  END IF;
END $$;

-- ============================================
-- ADD COLUMNS TO BOOKINGS
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'inventory_lock_id'
  ) THEN
    ALTER TABLE bookings 
      ADD COLUMN inventory_lock_id uuid REFERENCES inventory_locks(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'rental_pickup_at'
  ) THEN
    ALTER TABLE bookings ADD COLUMN rental_pickup_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'rental_dropoff_at'
  ) THEN
    ALTER TABLE bookings ADD COLUMN rental_dropoff_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'rental_quantity'
  ) THEN
    ALTER TABLE bookings ADD COLUMN rental_quantity integer DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'rental_price_breakdown'
  ) THEN
    ALTER TABLE bookings ADD COLUMN rental_price_breakdown jsonb;
  END IF;
END $$;

-- ============================================
-- ADD COLUMNS TO PRODUCTION_ORDERS
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_orders' AND column_name = 'inventory_lock_id'
  ) THEN
    ALTER TABLE production_orders 
      ADD COLUMN inventory_lock_id uuid REFERENCES inventory_locks(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to calculate available inventory
CREATE OR REPLACE FUNCTION get_available_inventory(
  p_inventory_item_id uuid,
  p_start_time timestamptz DEFAULT NULL,
  p_end_time timestamptz DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_quantity integer;
  v_buffer_quantity integer;
  v_locked_quantity integer;
BEGIN
  SELECT total_quantity, buffer_quantity
  INTO v_total_quantity, v_buffer_quantity
  FROM provider_inventory_items
  WHERE id = p_inventory_item_id AND is_active = true;
  
  IF v_total_quantity IS NULL THEN
    RETURN 0;
  END IF;
  
  IF p_start_time IS NOT NULL AND p_end_time IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity), 0)
    INTO v_locked_quantity
    FROM inventory_locks
    WHERE inventory_item_id = p_inventory_item_id
      AND status = 'active'
      AND (
        (pickup_at IS NULL) OR
        (pickup_at < p_end_time AND dropoff_at_effective > p_start_time)
      );
  ELSE
    SELECT COALESCE(SUM(quantity), 0)
    INTO v_locked_quantity
    FROM inventory_locks
    WHERE inventory_item_id = p_inventory_item_id
      AND status = 'active'
      AND pickup_at IS NULL;
  END IF;
  
  RETURN GREATEST(0, v_total_quantity - v_buffer_quantity - v_locked_quantity);
END;
$$;

-- Function to check inventory availability
CREATE OR REPLACE FUNCTION check_inventory_availability(
  p_inventory_item_id uuid,
  p_quantity integer,
  p_start_time timestamptz DEFAULT NULL,
  p_end_time timestamptz DEFAULT NULL,
  p_exclude_lock_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_available integer;
  v_item record;
  v_conflicts jsonb;
BEGIN
  SELECT * INTO v_item
  FROM provider_inventory_items
  WHERE id = p_inventory_item_id AND is_active = true;
  
  IF v_item IS NULL THEN
    RETURN jsonb_build_object(
      'available', false,
      'reason', 'Inventory item not found or inactive',
      'available_quantity', 0
    );
  END IF;
  
  IF p_start_time IS NOT NULL AND p_end_time IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity), 0)
    INTO v_available
    FROM inventory_locks
    WHERE inventory_item_id = p_inventory_item_id
      AND status = 'active'
      AND id != COALESCE(p_exclude_lock_id, '00000000-0000-0000-0000-000000000000')
      AND pickup_at < p_end_time 
      AND dropoff_at_effective > p_start_time;
    
    v_available := v_item.total_quantity - v_item.buffer_quantity - v_available;
    
    IF v_available < p_quantity THEN
      SELECT jsonb_agg(jsonb_build_object(
        'lock_id', il.id,
        'pickup_at', il.pickup_at,
        'dropoff_at', il.dropoff_at_effective,
        'quantity', il.quantity
      ))
      INTO v_conflicts
      FROM inventory_locks il
      WHERE il.inventory_item_id = p_inventory_item_id
        AND il.status = 'active'
        AND il.id != COALESCE(p_exclude_lock_id, '00000000-0000-0000-0000-000000000000')
        AND il.pickup_at < p_end_time 
        AND il.dropoff_at_effective > p_start_time;
    END IF;
  ELSE
    SELECT v_item.total_quantity - v_item.buffer_quantity - COALESCE(SUM(quantity), 0)
    INTO v_available
    FROM inventory_locks
    WHERE inventory_item_id = p_inventory_item_id
      AND status = 'active'
      AND id != COALESCE(p_exclude_lock_id, '00000000-0000-0000-0000-000000000000')
      AND pickup_at IS NULL;
  END IF;
  
  RETURN jsonb_build_object(
    'available', v_available >= p_quantity,
    'available_quantity', GREATEST(0, v_available),
    'requested_quantity', p_quantity,
    'conflicts', COALESCE(v_conflicts, '[]'::jsonb)
  );
END;
$$;

-- Function to create inventory lock
CREATE OR REPLACE FUNCTION create_inventory_lock(
  p_inventory_item_id uuid,
  p_quantity integer,
  p_lock_type text,
  p_locked_by uuid,
  p_booking_id uuid DEFAULT NULL,
  p_production_order_id uuid DEFAULT NULL,
  p_service_listing_id uuid DEFAULT NULL,
  p_pickup_at timestamptz DEFAULT NULL,
  p_dropoff_at timestamptz DEFAULT NULL,
  p_soft_lock_minutes integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item record;
  v_availability jsonb;
  v_lock_id uuid;
  v_dropoff_effective timestamptz;
  v_soft_expires timestamptz;
BEGIN
  SELECT * INTO v_item
  FROM provider_inventory_items
  WHERE id = p_inventory_item_id AND is_active = true;
  
  IF v_item IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Inventory item not found or inactive'
    );
  END IF;
  
  v_availability := check_inventory_availability(
    p_inventory_item_id, 
    p_quantity, 
    p_pickup_at, 
    p_dropoff_at
  );
  
  IF NOT (v_availability->>'available')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient inventory available',
      'availability', v_availability
    );
  END IF;
  
  IF p_dropoff_at IS NOT NULL AND v_item.turnaround_buffer_hours > 0 THEN
    v_dropoff_effective := p_dropoff_at + (v_item.turnaround_buffer_hours || ' hours')::interval;
  ELSE
    v_dropoff_effective := p_dropoff_at;
  END IF;
  
  IF p_lock_type = 'soft' THEN
    v_soft_expires := now() + (p_soft_lock_minutes || ' minutes')::interval;
  END IF;
  
  INSERT INTO inventory_locks (
    inventory_item_id,
    service_listing_id,
    booking_id,
    production_order_id,
    quantity,
    pickup_at,
    dropoff_at,
    dropoff_at_effective,
    lock_type,
    status,
    soft_lock_expires_at,
    locked_by
  ) VALUES (
    p_inventory_item_id,
    p_service_listing_id,
    p_booking_id,
    p_production_order_id,
    p_quantity,
    p_pickup_at,
    p_dropoff_at,
    v_dropoff_effective,
    p_lock_type,
    'active',
    v_soft_expires,
    p_locked_by
  )
  RETURNING id INTO v_lock_id;
  
  PERFORM check_and_create_inventory_alert(p_inventory_item_id);
  
  RETURN jsonb_build_object(
    'success', true,
    'lock_id', v_lock_id,
    'dropoff_at_effective', v_dropoff_effective,
    'soft_lock_expires_at', v_soft_expires
  );
END;
$$;

-- Function to upgrade soft lock to hard lock
CREATE OR REPLACE FUNCTION upgrade_inventory_lock(
  p_lock_id uuid,
  p_booking_id uuid DEFAULT NULL,
  p_production_order_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lock record;
BEGIN
  SELECT * INTO v_lock
  FROM inventory_locks
  WHERE id = p_lock_id AND status = 'active';
  
  IF v_lock IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Lock not found or already released'
    );
  END IF;
  
  IF v_lock.lock_type = 'hard' THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Lock is already a hard lock'
    );
  END IF;
  
  UPDATE inventory_locks
  SET 
    lock_type = 'hard',
    soft_lock_expires_at = NULL,
    booking_id = COALESCE(p_booking_id, booking_id),
    production_order_id = COALESCE(p_production_order_id, production_order_id),
    updated_at = now()
  WHERE id = p_lock_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'lock_id', p_lock_id
  );
END;
$$;

-- Function to release inventory lock
CREATE OR REPLACE FUNCTION release_inventory_lock(
  p_lock_id uuid,
  p_reason text DEFAULT 'manual_release'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lock record;
BEGIN
  SELECT * INTO v_lock
  FROM inventory_locks
  WHERE id = p_lock_id;
  
  IF v_lock IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Lock not found'
    );
  END IF;
  
  IF v_lock.status != 'active' THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Lock already released or expired'
    );
  END IF;
  
  UPDATE inventory_locks
  SET 
    status = 'released',
    released_at = now(),
    released_reason = p_reason,
    updated_at = now()
  WHERE id = p_lock_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'lock_id', p_lock_id
  );
END;
$$;

-- Function to expire soft locks
CREATE OR REPLACE FUNCTION expire_soft_inventory_locks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE inventory_locks
  SET 
    status = 'expired',
    released_at = now(),
    released_reason = 'soft_lock_expired',
    updated_at = now()
  WHERE lock_type = 'soft'
    AND status = 'active'
    AND soft_lock_expires_at < now();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Function to calculate rental price
CREATE OR REPLACE FUNCTION calculate_rental_price(
  p_service_listing_id uuid,
  p_pickup_at timestamptz,
  p_dropoff_at timestamptz,
  p_quantity integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_listing record;
  v_duration_hours numeric;
  v_duration_days numeric;
  v_price numeric;
  v_tier record;
  v_breakdown jsonb;
BEGIN
  SELECT * INTO v_listing
  FROM service_listings
  WHERE id = p_service_listing_id;
  
  IF v_listing IS NULL THEN
    RETURN jsonb_build_object('error', 'Listing not found');
  END IF;
  
  v_duration_hours := EXTRACT(EPOCH FROM (p_dropoff_at - p_pickup_at)) / 3600;
  v_duration_days := CEIL(v_duration_hours / 24);
  
  CASE v_listing.rental_pricing_model
    WHEN 'flat' THEN
      v_price := COALESCE(v_listing.rental_base_price, v_listing.price);
      v_breakdown := jsonb_build_object(
        'model', 'flat',
        'base_price', v_price,
        'quantity', p_quantity,
        'subtotal', v_price * p_quantity
      );
      
    WHEN 'per_hour' THEN
      v_price := COALESCE(v_listing.rental_base_price, v_listing.price) * v_duration_hours;
      v_breakdown := jsonb_build_object(
        'model', 'per_hour',
        'rate', v_listing.rental_base_price,
        'hours', v_duration_hours,
        'quantity', p_quantity,
        'subtotal', v_price * p_quantity
      );
      
    WHEN 'per_day' THEN
      v_price := COALESCE(v_listing.rental_base_price, v_listing.price) * v_duration_days;
      v_breakdown := jsonb_build_object(
        'model', 'per_day',
        'rate', v_listing.rental_base_price,
        'days', v_duration_days,
        'quantity', p_quantity,
        'subtotal', v_price * p_quantity
      );
      
    WHEN 'tiered' THEN
      SELECT * INTO v_tier
      FROM rental_pricing_tiers
      WHERE service_listing_id = p_service_listing_id
        AND is_active = true
        AND min_duration_hours <= v_duration_hours
        AND (max_duration_hours IS NULL OR max_duration_hours >= v_duration_hours)
      ORDER BY tier_order
      LIMIT 1;
      
      IF v_tier IS NOT NULL THEN
        CASE v_tier.unit_type
          WHEN 'flat' THEN v_price := v_tier.price_per_unit;
          WHEN 'hour' THEN v_price := v_tier.price_per_unit * v_duration_hours;
          WHEN 'day' THEN v_price := v_tier.price_per_unit * v_duration_days;
        END CASE;
        
        v_breakdown := jsonb_build_object(
          'model', 'tiered',
          'tier', v_tier.description,
          'rate', v_tier.price_per_unit,
          'unit_type', v_tier.unit_type,
          'duration_hours', v_duration_hours,
          'duration_days', v_duration_days,
          'quantity', p_quantity,
          'subtotal', v_price * p_quantity
        );
      ELSE
        v_price := COALESCE(v_listing.rental_base_price, v_listing.price);
        v_breakdown := jsonb_build_object(
          'model', 'tiered_fallback',
          'base_price', v_price,
          'quantity', p_quantity,
          'subtotal', v_price * p_quantity
        );
      END IF;
      
    ELSE
      v_price := COALESCE(v_listing.price, 0);
      v_breakdown := jsonb_build_object(
        'model', 'default',
        'price', v_price,
        'quantity', p_quantity,
        'subtotal', v_price * p_quantity
      );
  END CASE;
  
  RETURN jsonb_build_object(
    'total_price', v_price * p_quantity,
    'unit_price', v_price,
    'quantity', p_quantity,
    'duration_hours', v_duration_hours,
    'duration_days', v_duration_days,
    'pickup_at', p_pickup_at,
    'dropoff_at', p_dropoff_at,
    'breakdown', v_breakdown
  );
END;
$$;

-- Function to check and create inventory alerts
CREATE OR REPLACE FUNCTION check_and_create_inventory_alert(
  p_inventory_item_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item record;
  v_available integer;
  v_alert_type text;
BEGIN
  SELECT * INTO v_item
  FROM provider_inventory_items
  WHERE id = p_inventory_item_id AND is_active = true;
  
  IF v_item IS NULL OR v_item.low_stock_threshold = 0 THEN
    RETURN;
  END IF;
  
  v_available := get_available_inventory(p_inventory_item_id);
  
  IF v_available = 0 THEN
    v_alert_type := 'out_of_stock';
  ELSIF v_available <= v_item.low_stock_threshold THEN
    v_alert_type := 'low_stock';
  ELSE
    RETURN;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM inventory_alerts
    WHERE inventory_item_id = p_inventory_item_id
      AND alert_type = v_alert_type
      AND is_dismissed = false
      AND triggered_at > now() - interval '24 hours'
  ) THEN
    INSERT INTO inventory_alerts (
      provider_id,
      inventory_item_id,
      alert_type,
      current_available,
      threshold,
      message
    ) VALUES (
      v_item.provider_id,
      p_inventory_item_id,
      v_alert_type,
      v_available,
      v_item.low_stock_threshold,
      CASE v_alert_type
        WHEN 'out_of_stock' THEN 'Inventory item "' || v_item.name || '" is out of stock'
        WHEN 'low_stock' THEN 'Inventory item "' || v_item.name || '" is low on stock (' || v_available || ' remaining)'
      END
    );
  END IF;
END;
$$;

-- Function to get inventory calendar data
CREATE OR REPLACE FUNCTION get_inventory_calendar(
  p_provider_id uuid,
  p_start_date date,
  p_end_date date,
  p_inventory_item_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_locks jsonb;
  v_items jsonb;
BEGIN
  SELECT jsonb_agg(jsonb_build_object(
    'id', il.id,
    'inventory_item_id', il.inventory_item_id,
    'inventory_item_name', pii.name,
    'booking_id', il.booking_id,
    'production_order_id', il.production_order_id,
    'quantity', il.quantity,
    'pickup_at', il.pickup_at,
    'dropoff_at', il.dropoff_at,
    'dropoff_at_effective', il.dropoff_at_effective,
    'lock_type', il.lock_type,
    'status', il.status
  ))
  INTO v_locks
  FROM inventory_locks il
  JOIN provider_inventory_items pii ON pii.id = il.inventory_item_id
  WHERE pii.provider_id = p_provider_id
    AND il.status = 'active'
    AND (p_inventory_item_id IS NULL OR il.inventory_item_id = p_inventory_item_id)
    AND (
      (il.pickup_at IS NULL) OR
      (il.pickup_at::date <= p_end_date AND il.dropoff_at_effective::date >= p_start_date)
    );
  
  SELECT jsonb_agg(jsonb_build_object(
    'id', pii.id,
    'name', pii.name,
    'total_quantity', pii.total_quantity,
    'buffer_quantity', pii.buffer_quantity,
    'is_rentable', pii.is_rentable,
    'turnaround_buffer_hours', pii.turnaround_buffer_hours,
    'available_now', get_available_inventory(pii.id)
  ))
  INTO v_items
  FROM provider_inventory_items pii
  WHERE pii.provider_id = p_provider_id
    AND pii.is_active = true
    AND (p_inventory_item_id IS NULL OR pii.id = p_inventory_item_id);
  
  RETURN jsonb_build_object(
    'locks', COALESCE(v_locks, '[]'::jsonb),
    'items', COALESCE(v_items, '[]'::jsonb),
    'date_range', jsonb_build_object(
      'start', p_start_date,
      'end', p_end_date
    )
  );
END;
$$;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE provider_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;

-- Provider inventory items policies
DROP POLICY IF EXISTS "Providers can manage their own inventory items" ON provider_inventory_items;
CREATE POLICY "Providers can manage their own inventory items"
  ON provider_inventory_items
  FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

DROP POLICY IF EXISTS "Public can view active inventory items" ON provider_inventory_items;
CREATE POLICY "Public can view active inventory items"
  ON provider_inventory_items
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Inventory locks policies
DROP POLICY IF EXISTS "Providers can view locks on their inventory" ON inventory_locks;
CREATE POLICY "Providers can view locks on their inventory"
  ON inventory_locks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM provider_inventory_items pii
      WHERE pii.id = inventory_locks.inventory_item_id
        AND pii.provider_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view their own booking locks" ON inventory_locks;
CREATE POLICY "Users can view their own booking locks"
  ON inventory_locks
  FOR SELECT
  TO authenticated
  USING (locked_by = auth.uid());

DROP POLICY IF EXISTS "Users can create soft locks" ON inventory_locks;
CREATE POLICY "Users can create soft locks"
  ON inventory_locks
  FOR INSERT
  TO authenticated
  WITH CHECK (locked_by = auth.uid() AND lock_type = 'soft');

-- Rental pricing tiers policies
DROP POLICY IF EXISTS "Providers can manage their rental pricing tiers" ON rental_pricing_tiers;
CREATE POLICY "Providers can manage their rental pricing tiers"
  ON rental_pricing_tiers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_listings sl
      WHERE sl.id = rental_pricing_tiers.service_listing_id
        AND sl.provider_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_listings sl
      WHERE sl.id = rental_pricing_tiers.service_listing_id
        AND sl.provider_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public can view active rental pricing tiers" ON rental_pricing_tiers;
CREATE POLICY "Public can view active rental pricing tiers"
  ON rental_pricing_tiers
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Inventory alerts policies
DROP POLICY IF EXISTS "Providers can manage their own alerts" ON inventory_alerts;
CREATE POLICY "Providers can manage their own alerts"
  ON inventory_alerts
  FOR ALL
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_provider_inventory_items_updated ON provider_inventory_items;
CREATE TRIGGER trigger_provider_inventory_items_updated
  BEFORE UPDATE ON provider_inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_updated_at();

DROP TRIGGER IF EXISTS trigger_inventory_locks_updated ON inventory_locks;
CREATE TRIGGER trigger_inventory_locks_updated
  BEFORE UPDATE ON inventory_locks
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_updated_at();

-- Trigger to check inventory alerts on lock changes
CREATE OR REPLACE FUNCTION trigger_inventory_alert_check()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM check_and_create_inventory_alert(NEW.inventory_item_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM check_and_create_inventory_alert(OLD.inventory_item_id);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_inventory_lock_alert ON inventory_locks;
CREATE TRIGGER trigger_inventory_lock_alert
  AFTER INSERT OR UPDATE OR DELETE ON inventory_locks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_inventory_alert_check();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_service_listings_inventory_mode 
  ON service_listings(inventory_mode) WHERE inventory_mode != 'none';
CREATE INDEX IF NOT EXISTS idx_service_listings_inventory_item 
  ON service_listings(inventory_item_id) WHERE inventory_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_inventory_lock 
  ON bookings(inventory_lock_id) WHERE inventory_lock_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_rental_window 
  ON bookings(rental_pickup_at, rental_dropoff_at) WHERE rental_pickup_at IS NOT NULL;
