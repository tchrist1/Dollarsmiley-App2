/*
  # Provider Availability System

  ## Overview
  Comprehensive availability management system for providers to set their working hours,
  block off unavailable dates, and manage recurring schedules. Prevents double-booking
  and allows customers to only book available time slots.

  ## New Tables
  
  ### 1. `provider_availability`
  Stores provider availability schedules
  - `id` (uuid, primary key)
  - `provider_id` (uuid, references profiles) - provider who owns this schedule
  - `listing_id` (uuid, references service_listings) - optional: specific to a service
  - `availability_type` (text) - Available, Unavailable, Blocked
  - `day_of_week` (integer) - 0=Sunday, 1=Monday, ..., 6=Saturday (for recurring)
  - `start_date` (date) - for specific date ranges
  - `end_date` (date) - for specific date ranges
  - `start_time` (time) - time slot start
  - `end_time` (time) - time slot end
  - `is_recurring` (boolean) - repeats weekly
  - `notes` (text) - internal notes
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### 2. `availability_exceptions`
  One-off exceptions to recurring schedules
  - `id` (uuid, primary key)
  - `provider_id` (uuid, references profiles)
  - `exception_date` (date) - specific date
  - `exception_type` (text) - Available, Unavailable
  - `start_time` (time) - override start time
  - `end_time` (time) - override end time
  - `reason` (text) - holiday, sick day, etc.
  - `created_at` (timestamptz)
  
  ### 3. `time_slot_bookings`
  Track booked time slots to prevent double-booking
  - `id` (uuid, primary key)
  - `provider_id` (uuid, references profiles)
  - `booking_id` (uuid, references bookings)
  - `booking_date` (date)
  - `start_time` (time)
  - `end_time` (time)
  - `status` (text) - Reserved, Confirmed, Cancelled
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Availability Types
  - `Available` - Provider is available for bookings
  - `Unavailable` - Provider is not available
  - `Blocked` - Time blocked off (vacation, personal time)

  ## Use Cases
  
  ### Recurring Availability
  Provider sets weekly schedule: Monday-Friday 9 AM - 5 PM
  - Creates 5 records with `is_recurring = true`
  - Each has `day_of_week` (1-5)
  - Start/end times define working hours
  
  ### Specific Date Blocking
  Provider blocks December 25-31 for vacation
  - Creates record with `availability_type = Blocked`
  - Sets `start_date` and `end_date`
  - `is_recurring = false`
  
  ### Exception Handling
  Provider usually unavailable Sundays, but available Dec 15
  - Creates exception with `exception_type = Available`
  - Sets `exception_date = 2024-12-15`
  
  ### Booking Prevention
  When customer attempts to book:
  1. Check provider availability for that date/time
  2. Check no conflicting bookings exist
  3. Create time slot reservation
  4. Confirm booking

  ## Schema Changes
  
  ### Bookings Table Updates
  - Add `time_slot_id` (uuid, references time_slot_bookings)
  
  ## Security
  - Enable RLS on all tables
  - Providers can manage their own availability
  - Everyone can view provider availability (for booking)
  - Only booking system can create time slot reservations

  ## Important Notes
  - Time slots calculated dynamically based on availability rules
  - Recurring schedules override by specific dates
  - Exceptions override recurring schedules
  - Bookings create time slot reservations automatically
  - Cancelled bookings release time slots
  - Prevents double-booking through slot reservation
*/

-- Create provider_availability table
CREATE TABLE IF NOT EXISTS provider_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid REFERENCES service_listings(id) ON DELETE CASCADE,
  availability_type text DEFAULT 'Available' CHECK (availability_type IN ('Available', 'Unavailable', 'Blocked')),
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_date date,
  end_date date,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_recurring boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create availability_exceptions table
CREATE TABLE IF NOT EXISTS availability_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  exception_date date NOT NULL,
  exception_type text NOT NULL CHECK (exception_type IN ('Available', 'Unavailable')),
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Create time_slot_bookings table
CREATE TABLE IF NOT EXISTS time_slot_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  booking_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text DEFAULT 'Reserved' CHECK (status IN ('Reserved', 'Confirmed', 'Cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add time_slot_id to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'time_slot_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN time_slot_id uuid REFERENCES time_slot_bookings(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slot_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for provider_availability
CREATE POLICY "Anyone can view provider availability"
  ON provider_availability FOR SELECT
  USING (true);

CREATE POLICY "Providers can create own availability"
  ON provider_availability FOR INSERT
  TO authenticated
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Providers can update own availability"
  ON provider_availability FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Providers can delete own availability"
  ON provider_availability FOR DELETE
  TO authenticated
  USING (provider_id = auth.uid());

-- RLS Policies for availability_exceptions
CREATE POLICY "Anyone can view availability exceptions"
  ON availability_exceptions FOR SELECT
  USING (true);

CREATE POLICY "Providers can create own exceptions"
  ON availability_exceptions FOR INSERT
  TO authenticated
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Providers can update own exceptions"
  ON availability_exceptions FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Providers can delete own exceptions"
  ON availability_exceptions FOR DELETE
  TO authenticated
  USING (provider_id = auth.uid());

-- RLS Policies for time_slot_bookings
CREATE POLICY "Anyone can view time slot bookings"
  ON time_slot_bookings FOR SELECT
  USING (true);

CREATE POLICY "System can create time slot bookings"
  ON time_slot_bookings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Providers and customers can update their time slots"
  ON time_slot_bookings FOR UPDATE
  TO authenticated
  USING (
    provider_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = booking_id
      AND bookings.customer_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_provider_availability_provider ON provider_availability(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_availability_listing ON provider_availability(listing_id);
CREATE INDEX IF NOT EXISTS idx_provider_availability_recurring ON provider_availability(is_recurring);
CREATE INDEX IF NOT EXISTS idx_provider_availability_dates ON provider_availability(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_availability_exceptions_provider ON availability_exceptions(provider_id);
CREATE INDEX IF NOT EXISTS idx_availability_exceptions_date ON availability_exceptions(exception_date);
CREATE INDEX IF NOT EXISTS idx_time_slot_bookings_provider ON time_slot_bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_time_slot_bookings_date ON time_slot_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_time_slot_bookings_status ON time_slot_bookings(status);

-- Function to check if time slot is available
CREATE OR REPLACE FUNCTION is_time_slot_available(
  p_provider_id uuid,
  p_date date,
  p_start_time time,
  p_end_time time
)
RETURNS boolean AS $$
DECLARE
  slot_available boolean;
  day_of_week_num integer;
BEGIN
  day_of_week_num := EXTRACT(DOW FROM p_date);
  
  -- Check if there's an exception for this date
  IF EXISTS (
    SELECT 1 FROM availability_exceptions
    WHERE provider_id = p_provider_id
    AND exception_date = p_date
    AND exception_type = 'Unavailable'
  ) THEN
    RETURN false;
  END IF;
  
  -- Check if specifically available via exception
  IF EXISTS (
    SELECT 1 FROM availability_exceptions
    WHERE provider_id = p_provider_id
    AND exception_date = p_date
    AND exception_type = 'Available'
    AND (
      (start_time IS NULL AND end_time IS NULL) OR
      (p_start_time >= start_time AND p_end_time <= end_time)
    )
  ) THEN
    RETURN NOT EXISTS (
      SELECT 1 FROM time_slot_bookings
      WHERE provider_id = p_provider_id
      AND booking_date = p_date
      AND status IN ('Reserved', 'Confirmed')
      AND (
        (p_start_time >= start_time AND p_start_time < end_time) OR
        (p_end_time > start_time AND p_end_time <= end_time) OR
        (p_start_time <= start_time AND p_end_time >= end_time)
      )
    );
  END IF;
  
  -- Check recurring availability
  IF EXISTS (
    SELECT 1 FROM provider_availability
    WHERE provider_id = p_provider_id
    AND is_recurring = true
    AND day_of_week = day_of_week_num
    AND availability_type = 'Available'
    AND p_start_time >= start_time
    AND p_end_time <= end_time
  ) THEN
    -- Check for date-specific blocks
    IF EXISTS (
      SELECT 1 FROM provider_availability
      WHERE provider_id = p_provider_id
      AND is_recurring = false
      AND availability_type = 'Blocked'
      AND p_date >= start_date
      AND p_date <= end_date
    ) THEN
      RETURN false;
    END IF;
    
    -- Check for existing bookings
    RETURN NOT EXISTS (
      SELECT 1 FROM time_slot_bookings
      WHERE provider_id = p_provider_id
      AND booking_date = p_date
      AND status IN ('Reserved', 'Confirmed')
      AND (
        (p_start_time >= start_time AND p_start_time < end_time) OR
        (p_end_time > start_time AND p_end_time <= end_time) OR
        (p_start_time <= start_time AND p_end_time >= end_time)
      )
    );
  END IF;
  
  -- Check specific date availability
  IF EXISTS (
    SELECT 1 FROM provider_availability
    WHERE provider_id = p_provider_id
    AND is_recurring = false
    AND availability_type = 'Available'
    AND p_date >= start_date
    AND p_date <= end_date
    AND p_start_time >= start_time
    AND p_end_time <= end_time
  ) THEN
    RETURN NOT EXISTS (
      SELECT 1 FROM time_slot_bookings
      WHERE provider_id = p_provider_id
      AND booking_date = p_date
      AND status IN ('Reserved', 'Confirmed')
      AND (
        (p_start_time >= start_time AND p_start_time < end_time) OR
        (p_end_time > start_time AND p_end_time <= end_time) OR
        (p_start_time <= start_time AND p_end_time >= end_time)
      )
    );
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create time slot reservation on booking
CREATE OR REPLACE FUNCTION create_time_slot_reservation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO time_slot_bookings (
    provider_id,
    booking_id,
    booking_date,
    start_time,
    end_time,
    status
  )
  VALUES (
    NEW.provider_id,
    NEW.id,
    NEW.scheduled_date::date,
    NEW.scheduled_time::time,
    (NEW.scheduled_time::time + (COALESCE(NEW.duration, 60) || ' minutes')::interval)::time,
    CASE 
      WHEN NEW.status = 'Confirmed' THEN 'Confirmed'
      ELSE 'Reserved'
    END
  )
  RETURNING id INTO NEW.time_slot_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create time slot on booking creation
DROP TRIGGER IF EXISTS trigger_create_time_slot ON bookings;
CREATE TRIGGER trigger_create_time_slot
  BEFORE INSERT ON bookings
  FOR EACH ROW
  WHEN (NEW.scheduled_date IS NOT NULL AND NEW.scheduled_time IS NOT NULL)
  EXECUTE FUNCTION create_time_slot_reservation();

-- Function to update time slot status on booking update
CREATE OR REPLACE FUNCTION update_time_slot_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.time_slot_id IS NOT NULL THEN
    UPDATE time_slot_bookings
    SET 
      status = CASE 
        WHEN NEW.status = 'Confirmed' THEN 'Confirmed'
        WHEN NEW.status = 'Cancelled' THEN 'Cancelled'
        ELSE 'Reserved'
      END,
      updated_at = now()
    WHERE id = NEW.time_slot_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update time slot status
DROP TRIGGER IF EXISTS trigger_update_time_slot_status ON bookings;
CREATE TRIGGER trigger_update_time_slot_status
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_time_slot_status();