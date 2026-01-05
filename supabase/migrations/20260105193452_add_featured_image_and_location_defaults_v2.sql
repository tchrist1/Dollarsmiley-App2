/*
  # Add Featured Image and Location Defaults

  ## Summary
  Adds featured_image_url to service_listings and jobs tables, ensures proper
  geolocation defaults, and creates functions to auto-populate featured images
  from photo arrays.

  ## Changes
  1. Add featured_image_url column to service_listings
  2. Add featured_image_url column to jobs
  3. Create function to auto-extract featured image from photos array
  4. Add default placeholder image constant
  5. Create trigger to auto-set featured_image_url on insert/update
  6. Add location inheritance from provider profile

  ## Purpose
  - Guarantee all new listings/jobs have a featured image
  - Enable immediate visibility in Grid and Map views
  - Prevent blank cards and missing map markers
  - Support placeholder images when uploads are pending
*/

-- Add featured_image_url to service_listings
ALTER TABLE service_listings
ADD COLUMN IF NOT EXISTS featured_image_url text;

-- Add featured_image_url to jobs
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS featured_image_url text;

-- Create function to extract featured image from photos array
CREATE OR REPLACE FUNCTION extract_featured_image()
RETURNS TRIGGER AS $$
DECLARE
  first_photo text;
  placeholder_image text := 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg';
BEGIN
  -- Extract first photo from photos jsonb array if available
  IF NEW.photos IS NOT NULL AND jsonb_typeof(NEW.photos) = 'array' AND jsonb_array_length(NEW.photos) > 0 THEN
    first_photo := NEW.photos->>0;
    IF first_photo IS NOT NULL AND first_photo != '' THEN
      NEW.featured_image_url := first_photo;
      RETURN NEW;
    END IF;
  END IF;

  -- Use placeholder if no photos or first photo is invalid
  IF NEW.featured_image_url IS NULL OR NEW.featured_image_url = '' THEN
    NEW.featured_image_url := placeholder_image;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for service_listings
DROP TRIGGER IF EXISTS set_featured_image_listings ON service_listings;
CREATE TRIGGER set_featured_image_listings
  BEFORE INSERT OR UPDATE OF photos
  ON service_listings
  FOR EACH ROW
  EXECUTE FUNCTION extract_featured_image();

-- Create trigger for jobs
DROP TRIGGER IF EXISTS set_featured_image_jobs ON jobs;
CREATE TRIGGER set_featured_image_jobs
  BEFORE INSERT OR UPDATE OF photos
  ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION extract_featured_image();

-- Update existing records to have featured images
UPDATE service_listings
SET featured_image_url = CASE
  WHEN photos IS NOT NULL AND jsonb_typeof(photos) = 'array' AND jsonb_array_length(photos) > 0 THEN
    COALESCE(photos->>0, 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg')
  ELSE
    'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg'
  END
WHERE featured_image_url IS NULL;

UPDATE jobs
SET featured_image_url = CASE
  WHEN photos IS NOT NULL AND jsonb_typeof(photos) = 'array' AND jsonb_array_length(photos) > 0 THEN
    COALESCE(photos->>0, 'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg')
  ELSE
    'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg'
  END
WHERE featured_image_url IS NULL;

-- Create index for featured images
CREATE INDEX IF NOT EXISTS idx_listings_featured_image ON service_listings(featured_image_url);
CREATE INDEX IF NOT EXISTS idx_jobs_featured_image ON jobs(featured_image_url);

-- Add function to inherit provider location if not set
CREATE OR REPLACE FUNCTION inherit_provider_location()
RETURNS TRIGGER AS $$
DECLARE
  provider_lat numeric;
  provider_lon numeric;
  provider_loc text;
BEGIN
  -- Only set if listing doesn't have location
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
    SELECT latitude, longitude, location
    INTO provider_lat, provider_lon, provider_loc
    FROM profiles
    WHERE id = NEW.provider_id;

    IF provider_lat IS NOT NULL AND provider_lon IS NOT NULL THEN
      NEW.latitude := provider_lat;
      NEW.longitude := provider_lon;
      IF NEW.location IS NULL THEN
        NEW.location := provider_loc;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for service_listings location inheritance
DROP TRIGGER IF EXISTS inherit_location_listings ON service_listings;
CREATE TRIGGER inherit_location_listings
  BEFORE INSERT
  ON service_listings
  FOR EACH ROW
  EXECUTE FUNCTION inherit_provider_location();
