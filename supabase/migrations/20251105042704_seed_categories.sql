/*
  # Seed Categories for Dollarsmiley

  ## Overview
  Populate the categories table with common service types for events, parties, and home services.

  ## Categories Added
  - Home Services (Handyman, Cleaning, Moving, etc.)
  - Events & Parties (Catering, DJ, Photography, etc.)
  - Personal Services (Beauty, Fitness, etc.)
  - Professional Services (Legal, Accounting, etc.)
*/

-- Insert main categories and sub-categories
INSERT INTO categories (name, slug, description, icon, parent_id, sort_order, is_active) VALUES
  ('Home Services', 'home-services', 'Handyman, cleaning, repairs, and home improvement', 'home', NULL, 1, true),
  ('Events & Parties', 'events-parties', 'Catering, entertainment, and event planning', 'party-popper', NULL, 2, true),
  ('Personal Services', 'personal-services', 'Beauty, fitness, and wellness services', 'user', NULL, 3, true),
  ('Professional Services', 'professional-services', 'Legal, accounting, and consulting', 'briefcase', NULL, 4, true)
ON CONFLICT (slug) DO NOTHING;

-- Get parent IDs for sub-categories
DO $$
DECLARE
  home_services_id uuid;
  events_parties_id uuid;
  personal_services_id uuid;
  professional_services_id uuid;
BEGIN
  SELECT id INTO home_services_id FROM categories WHERE slug = 'home-services';
  SELECT id INTO events_parties_id FROM categories WHERE slug = 'events-parties';
  SELECT id INTO personal_services_id FROM categories WHERE slug = 'personal-services';
  SELECT id INTO professional_services_id FROM categories WHERE slug = 'professional-services';

  -- Home Services sub-categories
  INSERT INTO categories (name, slug, description, parent_id, sort_order, is_active) VALUES
    ('Handyman', 'handyman', 'General repairs and maintenance', home_services_id, 1, true),
    ('Cleaning', 'cleaning', 'House and office cleaning', home_services_id, 2, true),
    ('Moving & Delivery', 'moving-delivery', 'Moving, hauling, and delivery services', home_services_id, 3, true),
    ('Plumbing', 'plumbing', 'Plumbing repairs and installations', home_services_id, 4, true),
    ('Electrical', 'electrical', 'Electrical repairs and installations', home_services_id, 5, true),
    ('Painting', 'painting', 'Interior and exterior painting', home_services_id, 6, true),
    ('Landscaping', 'landscaping', 'Lawn care and landscaping', home_services_id, 7, true),
    ('Furniture Assembly', 'furniture-assembly', 'Furniture assembly and installation', home_services_id, 8, true)
  ON CONFLICT (slug) DO NOTHING;

  -- Events & Parties sub-categories
  INSERT INTO categories (name, slug, description, parent_id, sort_order, is_active) VALUES
    ('Catering', 'catering', 'Food and beverage catering', events_parties_id, 1, true),
    ('DJ Services', 'dj-services', 'Music and entertainment', events_parties_id, 2, true),
    ('Photography', 'photography', 'Event photography and videography', events_parties_id, 3, true),
    ('Event Planning', 'event-planning', 'Full event planning and coordination', events_parties_id, 4, true),
    ('Decor & Rentals', 'decor-rentals', 'Party decor and equipment rentals', events_parties_id, 5, true),
    ('Bartending', 'bartending', 'Professional bartending services', events_parties_id, 6, true),
    ('Entertainment', 'entertainment', 'Performers and entertainers', events_parties_id, 7, true)
  ON CONFLICT (slug) DO NOTHING;

  -- Personal Services sub-categories
  INSERT INTO categories (name, slug, description, parent_id, sort_order, is_active) VALUES
    ('Hair Styling', 'hair-styling', 'Hair cuts, styling, and color', personal_services_id, 1, true),
    ('Braiding', 'braiding', 'Hair braiding services', personal_services_id, 2, true),
    ('Makeup', 'makeup', 'Makeup services for events', personal_services_id, 3, true),
    ('Personal Training', 'personal-training', 'Fitness and training', personal_services_id, 4, true),
    ('Massage', 'massage', 'Massage therapy', personal_services_id, 5, true)
  ON CONFLICT (slug) DO NOTHING;

  -- Professional Services sub-categories
  INSERT INTO categories (name, slug, description, parent_id, sort_order, is_active) VALUES
    ('Legal Services', 'legal-services', 'Legal consultation and services', professional_services_id, 1, true),
    ('Accounting', 'accounting', 'Accounting and bookkeeping', professional_services_id, 2, true),
    ('Consulting', 'consulting', 'Business and professional consulting', professional_services_id, 3, true),
    ('Tutoring', 'tutoring', 'Academic tutoring and lessons', professional_services_id, 4, true)
  ON CONFLICT (slug) DO NOTHING;
END $$;
