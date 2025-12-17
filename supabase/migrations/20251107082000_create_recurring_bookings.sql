/*
  # Create Recurring Bookings System

  1. New Tables
    - `recurring_bookings`
      - Store recurring booking templates
      - Track recurrence patterns
      - Manage active/inactive status
      - Link to created bookings

  2. Changes
    - Add `recurring_booking_id` to bookings table
    - Track bookings created from recurring templates

  3. Security
    - Enable RLS on recurring_bookings
    - Users can manage their own recurring bookings
    - Providers can view recurring bookings for their listings

  4. Functions
    - Process recurring bookings (cron job)
    - Calculate next booking date
    - Check for conflicts
    - Auto-create bookings
*/

-- Create recurring_bookings table
CREATE TABLE IF NOT EXISTS recurring_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  provider_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  listing_id uuid REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  service_title text NOT NULL,
  service_price numeric NOT NULL,
  start_date date NOT NULL,
  start_time time NOT NULL,
  duration_minutes integer NOT NULL,
  recurrence_pattern jsonb NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_bookings integer DEFAULT 0 NOT NULL,
  total_occurrences integer,
  next_booking_date date,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add recurring_booking_id to bookings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'recurring_booking_id'
  ) THEN
    ALTER TABLE bookings ADD COLUMN recurring_booking_id uuid REFERENCES recurring_bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE recurring_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recurring_bookings

-- Customers can view their own recurring bookings
CREATE POLICY "Customers can view own recurring bookings"
  ON recurring_bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

-- Providers can view recurring bookings for their listings
CREATE POLICY "Providers can view recurring bookings for their listings"
  ON recurring_bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = provider_id);

-- Customers can create recurring bookings
CREATE POLICY "Customers can create recurring bookings"
  ON recurring_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

-- Customers can update their own recurring bookings
CREATE POLICY "Customers can update own recurring bookings"
  ON recurring_bookings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- Customers can delete their own recurring bookings
CREATE POLICY "Customers can delete own recurring bookings"
  ON recurring_bookings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = customer_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_customer
  ON recurring_bookings(customer_id);

CREATE INDEX IF NOT EXISTS idx_recurring_bookings_provider
  ON recurring_bookings(provider_id);

CREATE INDEX IF NOT EXISTS idx_recurring_bookings_listing
  ON recurring_bookings(listing_id);

CREATE INDEX IF NOT EXISTS idx_recurring_bookings_active
  ON recurring_bookings(is_active, next_booking_date)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_bookings_recurring
  ON bookings(recurring_booking_id)
  WHERE recurring_booking_id IS NOT NULL;

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_recurring_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_recurring_bookings_updated_at_trigger
  ON recurring_bookings;
CREATE TRIGGER update_recurring_bookings_updated_at_trigger
  BEFORE UPDATE ON recurring_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_bookings_updated_at();

-- Create function to process recurring bookings
CREATE OR REPLACE FUNCTION process_recurring_bookings()
RETURNS void AS $$
DECLARE
  v_recurring recurring_bookings%ROWTYPE;
  v_next_date date;
  v_pattern jsonb;
  v_end_type text;
  v_end_date date;
  v_occurrences integer;
BEGIN
  -- Process active recurring bookings that are due
  FOR v_recurring IN
    SELECT * FROM recurring_bookings
    WHERE is_active = true
      AND next_booking_date IS NOT NULL
      AND next_booking_date <= CURRENT_DATE + INTERVAL '7 days'
  LOOP
    BEGIN
      -- Check if booking already exists
      IF NOT EXISTS (
        SELECT 1 FROM bookings
        WHERE recurring_booking_id = v_recurring.id
          AND booking_date = v_recurring.next_booking_date
      ) THEN
        -- Create the booking
        INSERT INTO bookings (
          customer_id,
          provider_id,
          listing_id,
          service_title,
          booking_date,
          booking_time,
          duration_minutes,
          total_price,
          status,
          recurring_booking_id
        ) VALUES (
          v_recurring.customer_id,
          v_recurring.provider_id,
          v_recurring.listing_id,
          v_recurring.service_title,
          v_recurring.next_booking_date,
          v_recurring.start_time,
          v_recurring.duration_minutes,
          v_recurring.service_price,
          'pending',
          v_recurring.id
        );

        -- Update created bookings count
        UPDATE recurring_bookings
        SET created_bookings = created_bookings + 1
        WHERE id = v_recurring.id;
      END IF;

      -- Calculate next booking date
      v_pattern := v_recurring.recurrence_pattern;
      v_end_type := v_pattern->>'end_type';

      -- Check if we should continue creating bookings
      IF v_end_type = 'date' THEN
        v_end_date := (v_pattern->>'end_date')::date;
        IF v_recurring.next_booking_date >= v_end_date THEN
          -- End date reached, deactivate
          UPDATE recurring_bookings
          SET is_active = false, next_booking_date = NULL
          WHERE id = v_recurring.id;
          CONTINUE;
        END IF;
      ELSIF v_end_type = 'occurrences' THEN
        v_occurrences := (v_pattern->>'occurrences')::integer;
        IF v_recurring.created_bookings >= v_occurrences THEN
          -- All occurrences created, deactivate
          UPDATE recurring_bookings
          SET is_active = false, next_booking_date = NULL
          WHERE id = v_recurring.id;
          CONTINUE;
        END IF;
      END IF;

      -- Calculate next date based on frequency
      v_next_date := calculate_next_recurrence_date(
        v_recurring.next_booking_date,
        v_pattern
      );

      -- Update next booking date
      UPDATE recurring_bookings
      SET next_booking_date = v_next_date
      WHERE id = v_recurring.id;

    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but continue processing other bookings
        RAISE NOTICE 'Error processing recurring booking %: %', v_recurring.id, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to calculate next recurrence date
CREATE OR REPLACE FUNCTION calculate_next_recurrence_date(
  p_current_date date,
  p_pattern jsonb
)
RETURNS date AS $$
DECLARE
  v_frequency text;
  v_interval integer;
  v_next_date date;
BEGIN
  v_frequency := p_pattern->>'frequency';
  v_interval := COALESCE((p_pattern->>'interval')::integer, 1);

  CASE v_frequency
    WHEN 'daily' THEN
      v_next_date := p_current_date + (v_interval || ' days')::interval;

    WHEN 'weekly' THEN
      v_next_date := p_current_date + (v_interval * 7 || ' days')::interval;

    WHEN 'biweekly' THEN
      v_next_date := p_current_date + (v_interval * 14 || ' days')::interval;

    WHEN 'monthly' THEN
      v_next_date := p_current_date + (v_interval || ' months')::interval;

      -- Handle day of month if specified
      IF p_pattern->>'day_of_month' IS NOT NULL THEN
        v_next_date := DATE_TRUNC('month', v_next_date) +
          ((p_pattern->>'day_of_month')::integer - 1 || ' days')::interval;
      END IF;

    ELSE
      v_next_date := p_current_date + INTERVAL '1 day';
  END CASE;

  RETURN v_next_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to check recurring booking conflicts
CREATE OR REPLACE FUNCTION check_recurring_conflicts(
  p_provider_id uuid,
  p_start_date date,
  p_pattern jsonb,
  p_start_time time,
  p_duration_minutes integer
)
RETURNS TABLE (
  conflict_date date,
  conflict_reason text
) AS $$
DECLARE
  v_date date;
  v_day_of_week integer;
  v_occurrences integer;
  v_count integer := 0;
BEGIN
  -- Generate dates and check for conflicts
  v_date := p_start_date;
  v_occurrences := COALESCE((p_pattern->>'occurrences')::integer, 10);

  WHILE v_count < v_occurrences AND v_count < 100 LOOP
    v_day_of_week := EXTRACT(DOW FROM v_date);

    -- Check provider availability
    IF NOT EXISTS (
      SELECT 1 FROM provider_availability
      WHERE provider_id = p_provider_id
        AND day_of_week = v_day_of_week
        AND is_available = true
        AND start_time <= p_start_time
        AND end_time >= (p_start_time + (p_duration_minutes || ' minutes')::interval)::time
    ) THEN
      conflict_date := v_date;
      conflict_reason := 'Provider not available';
      RETURN NEXT;
    END IF;

    -- Check blocked dates
    IF EXISTS (
      SELECT 1 FROM blocked_dates
      WHERE provider_id = p_provider_id
        AND v_date >= start_date
        AND v_date <= end_date
    ) THEN
      conflict_date := v_date;
      conflict_reason := 'Date is blocked';
      RETURN NEXT;
    END IF;

    -- Check existing bookings
    IF EXISTS (
      SELECT 1 FROM bookings
      WHERE provider_id = p_provider_id
        AND booking_date = v_date
        AND status IN ('pending', 'confirmed', 'in_progress')
        AND (
          (booking_time <= p_start_time AND
           (booking_time + (duration_minutes || ' minutes')::interval)::time > p_start_time)
          OR
          (booking_time < (p_start_time + (p_duration_minutes || ' minutes')::interval)::time AND
           booking_time >= p_start_time)
        )
    ) THEN
      conflict_date := v_date;
      conflict_reason := 'Time slot already booked';
      RETURN NEXT;
    END IF;

    -- Move to next occurrence
    v_date := calculate_next_recurrence_date(v_date, p_pattern);
    v_count := v_count + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for recurring booking summary
CREATE OR REPLACE VIEW recurring_bookings_summary AS
SELECT
  rb.id,
  rb.customer_id,
  rb.provider_id,
  rb.service_title,
  rb.service_price,
  rb.start_date,
  rb.is_active,
  rb.created_bookings,
  rb.next_booking_date,
  rb.recurrence_pattern,
  rb.created_at,
  -- Provider info
  p.full_name AS provider_name,
  p.avatar_url AS provider_avatar,
  -- Booking stats
  COUNT(b.id) AS total_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'completed') AS completed_bookings,
  COUNT(b.id) FILTER (WHERE b.status IN ('pending', 'confirmed')) AS upcoming_bookings,
  COALESCE(SUM(b.total_price) FILTER (WHERE b.status = 'completed'), 0) AS total_spent
FROM recurring_bookings rb
LEFT JOIN profiles p ON p.id = rb.provider_id
LEFT JOIN bookings b ON b.recurring_booking_id = rb.id
GROUP BY rb.id, p.id;

-- Grant access to view
GRANT SELECT ON recurring_bookings_summary TO authenticated;

-- Create notification function for upcoming recurring bookings
CREATE OR REPLACE FUNCTION notify_upcoming_recurring_bookings()
RETURNS void AS $$
BEGIN
  -- Notify customers about upcoming bookings from recurring schedules
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    reference_id
  )
  SELECT
    rb.customer_id,
    'Upcoming Recurring Booking',
    'Your recurring booking "' || rb.service_title || '" is scheduled for ' ||
      TO_CHAR(rb.next_booking_date, 'Mon DD, YYYY'),
    'booking_reminder',
    rb.id::text
  FROM recurring_bookings rb
  WHERE rb.is_active = true
    AND rb.next_booking_date = CURRENT_DATE + INTERVAL '3 days'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = rb.customer_id
        AND n.reference_id = rb.id::text
        AND n.created_at > CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
