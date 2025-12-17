/*
  # Fix Missing Provider Availability Table

  Creates the provider_availability, availability_exceptions, and time_slot_bookings tables
  that are required for the availability management system.

  1. New Tables
    - `provider_availability` - Provider availability schedules
    - `availability_exceptions` - One-off exceptions to recurring schedules  
    - `time_slot_bookings` - Track booked time slots

  2. Security
    - Enable RLS on all tables
    - Providers can manage their own availability
    - Everyone can view provider availability for booking
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

-- Add time_slot_id to bookings table if it doesn't exist
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
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'provider_availability' 
    AND policyname = 'Anyone can view provider availability'
  ) THEN
    CREATE POLICY "Anyone can view provider availability"
      ON provider_availability FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'provider_availability' 
    AND policyname = 'Providers can create own availability'
  ) THEN
    CREATE POLICY "Providers can create own availability"
      ON provider_availability FOR INSERT
      TO authenticated
      WITH CHECK (provider_id = auth.uid());
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'provider_availability' 
    AND policyname = 'Providers can update own availability'
  ) THEN
    CREATE POLICY "Providers can update own availability"
      ON provider_availability FOR UPDATE
      TO authenticated
      USING (provider_id = auth.uid());
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'provider_availability' 
    AND policyname = 'Providers can delete own availability'
  ) THEN
    CREATE POLICY "Providers can delete own availability"
      ON provider_availability FOR DELETE
      TO authenticated
      USING (provider_id = auth.uid());
  END IF;
END $$;

-- RLS Policies for availability_exceptions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'availability_exceptions' 
    AND policyname = 'Anyone can view availability exceptions'
  ) THEN
    CREATE POLICY "Anyone can view availability exceptions"
      ON availability_exceptions FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'availability_exceptions' 
    AND policyname = 'Providers can create own exceptions'
  ) THEN
    CREATE POLICY "Providers can create own exceptions"
      ON availability_exceptions FOR INSERT
      TO authenticated
      WITH CHECK (provider_id = auth.uid());
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'availability_exceptions' 
    AND policyname = 'Providers can update own exceptions'
  ) THEN
    CREATE POLICY "Providers can update own exceptions"
      ON availability_exceptions FOR UPDATE
      TO authenticated
      USING (provider_id = auth.uid());
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'availability_exceptions' 
    AND policyname = 'Providers can delete own exceptions'
  ) THEN
    CREATE POLICY "Providers can delete own exceptions"
      ON availability_exceptions FOR DELETE
      TO authenticated
      USING (provider_id = auth.uid());
  END IF;
END $$;

-- RLS Policies for time_slot_bookings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'time_slot_bookings' 
    AND policyname = 'Anyone can view time slot bookings'
  ) THEN
    CREATE POLICY "Anyone can view time slot bookings"
      ON time_slot_bookings FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'time_slot_bookings' 
    AND policyname = 'System can create time slot bookings'
  ) THEN
    CREATE POLICY "System can create time slot bookings"
      ON time_slot_bookings FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'time_slot_bookings' 
    AND policyname = 'Providers and customers can update their time slots'
  ) THEN
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
  END IF;
END $$;

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