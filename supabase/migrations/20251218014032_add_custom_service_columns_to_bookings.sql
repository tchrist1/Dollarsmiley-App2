/*
  # Add Custom Service Columns to Bookings Table
  
  ## Summary
  Adds columns to the bookings table to support custom service orders with various fulfillment methods.
  These columns enable tracking of order types, fulfillment methods, shipping costs, and value-added services.
  
  ## Changes Made
  
  1. **Added Columns to bookings**:
     - `order_type` (text) - Type of order: Job, Service, or CustomService
     - `fulfillment_type` (text) - How order is fulfilled: Pickup, DropOff, or Shipping
     - `shipping_cost` (numeric) - Cost of shipping/delivery
     - `vas_total` (numeric) - Total cost of value-added services
     - `tax_amount` (numeric) - Calculated tax
     - `subtotal` (numeric) - Base amount before shipping and tax
     - `total_amount` (numeric) - Final total including all charges
     - `delivery_confirmed_at` (timestamptz) - When delivery was confirmed
  
  ## Business Logic
  - **order_type**: Distinguishes between job requests, standard services, and custom products
  - **fulfillment_type**: Defines delivery method
    - Pickup: Customer picks up from provider
    - DropOff: Provider delivers to customer
    - Shipping: Third-party carrier delivery
  - Price breakdown: subtotal + shipping_cost + vas_total + tax_amount = total_amount
  
  ## Data Safety
  - Uses ADD COLUMN IF NOT EXISTS to prevent errors
  - Sets sensible defaults for all new columns
  - Does not modify existing booking records
*/

-- Add order_type column
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'Service' CHECK (order_type IN ('Job', 'Service', 'CustomService'));

-- Add fulfillment_type column
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS fulfillment_type text CHECK (fulfillment_type IN ('Pickup', 'DropOff', 'Shipping'));

-- Add cost breakdown columns
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS shipping_cost numeric DEFAULT 0 CHECK (shipping_cost >= 0);

ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS vas_total numeric DEFAULT 0 CHECK (vas_total >= 0);

ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS tax_amount numeric DEFAULT 0 CHECK (tax_amount >= 0);

ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0 CHECK (subtotal >= 0);

ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0 CHECK (total_amount >= 0);

-- Add delivery confirmation timestamp
ALTER TABLE bookings 
  ADD COLUMN IF NOT EXISTS delivery_confirmed_at timestamptz;

-- Add comments for documentation
COMMENT ON COLUMN bookings.order_type IS 'Type of order: Job (customer request), Service (standard listing), CustomService (custom product)';
COMMENT ON COLUMN bookings.fulfillment_type IS 'Fulfillment method: Pickup (customer collects), DropOff (provider delivers), Shipping (carrier delivers)';
COMMENT ON COLUMN bookings.shipping_cost IS 'Cost of shipping or delivery';
COMMENT ON COLUMN bookings.vas_total IS 'Total cost of value-added services (gift wrap, installation, etc.)';
COMMENT ON COLUMN bookings.tax_amount IS 'Calculated sales tax';
COMMENT ON COLUMN bookings.subtotal IS 'Base amount before shipping and tax';
COMMENT ON COLUMN bookings.total_amount IS 'Final total: subtotal + shipping_cost + vas_total + tax_amount';
COMMENT ON COLUMN bookings.delivery_confirmed_at IS 'Timestamp when delivery was confirmed';

-- Create index for better query performance on order types
CREATE INDEX IF NOT EXISTS idx_bookings_order_type 
  ON bookings(order_type) WHERE order_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_fulfillment_type 
  ON bookings(fulfillment_type) WHERE fulfillment_type IS NOT NULL;

-- Create index for delivery tracking
CREATE INDEX IF NOT EXISTS idx_bookings_delivery_confirmed 
  ON bookings(delivery_confirmed_at) WHERE delivery_confirmed_at IS NOT NULL;
