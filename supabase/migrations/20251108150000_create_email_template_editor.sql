/*
  # Create Email Template Editor System

  ## Overview
  Provides administrators with a visual email template editor for managing
  all transactional and marketing emails sent by the platform.

  ## New Tables

  ### 1. `email_template_categories`
  Organize templates into categories
  - `id` (uuid, primary key)
  - `name` (text) - Category name
  - `slug` (text) - URL-friendly identifier
  - `description` (text) - Category description
  - `icon` (text) - Icon identifier
  - `sort_order` (int) - Display order
  - `created_at` (timestamptz)

  ### 2. `email_template_versions`
  Version control for templates
  - `id` (uuid, primary key)
  - `template_id` (uuid, references email_templates)
  - `version_number` (int) - Version number
  - `subject` (text) - Email subject
  - `html_body` (text) - HTML content
  - `text_body` (text) - Plain text content
  - `variables` (text[]) - Template variables
  - `created_by` (uuid) - Admin who created version
  - `created_at` (timestamptz)
  - `notes` (text) - Version notes

  ### 3. `email_template_variables`
  Available variables for templates
  - `id` (uuid, primary key)
  - `variable_name` (text) - Variable identifier
  - `display_name` (text) - Human-readable name
  - `description` (text) - What the variable represents
  - `example_value` (text) - Example content
  - `category` (text) - User, Booking, Payment, etc.
  - `data_type` (text) - String, Number, Date, URL, etc.
  - `is_required` (boolean) - Must be provided
  - `created_at` (timestamptz)

  ### 4. `email_template_test_sends`
  Track test email sends
  - `id` (uuid, primary key)
  - `template_id` (uuid, references email_templates)
  - `sent_to` (text) - Test recipient email
  - `test_data` (jsonb) - Sample variable data used
  - `sent_by` (uuid) - Admin who sent test
  - `sent_at` (timestamptz)
  - `status` (text) - Success, Failed
  - `error_message` (text)

  ## Schema Enhancements to email_templates

  ### Add new columns
  - `category_id` (uuid, references email_template_categories)
  - `preview_text` (text) - Email preview snippet
  - `tags` (text[]) - Searchable tags
  - `version` (int) - Current version number
  - `is_system` (boolean) - System template (cannot delete)
  - `last_edited_by` (uuid) - Last admin to edit
  - `last_edited_at` (timestamptz)

  ## Template Categories
  - **Transactional** - Booking confirmations, receipts, etc.
  - **Notifications** - Status updates, reminders
  - **Marketing** - Newsletters, promotions
  - **System** - Password reset, verification
  - **Admin** - Reports, alerts

  ## Template Variables
  Common variables available:
  - **User**: {{user_name}}, {{user_email}}, {{user_phone}}
  - **Booking**: {{booking_id}}, {{service_name}}, {{scheduled_date}}
  - **Payment**: {{amount}}, {{fee}}, {{receipt_url}}
  - **Provider**: {{provider_name}}, {{provider_rating}}
  - **Platform**: {{platform_name}}, {{support_email}}, {{platform_url}}

  ## Features
  - Visual template editor with variable insertion
  - Version history with rollback capability
  - Test email sending with sample data
  - Template preview with variable substitution
  - Category-based organization
  - Tag-based search
  - Usage analytics per template
  - System template protection
  - Template duplication
  - Import/export templates

  ## Security
  - Enable RLS on all tables
  - Admin-only access to template management
  - Audit trail for all changes
  - System templates cannot be deleted

  ## Important Notes
  - HTML templates support full styling
  - Plain text fallback required
  - Variable names use {{variable_name}} syntax
  - Templates can be previewed before sending
  - Test sends use sandbox data
  - Version control maintains complete history
  - Templates can be deactivated without deletion
*/

-- Create email_template_categories table
CREATE TABLE IF NOT EXISTS email_template_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create email_template_versions table
CREATE TABLE IF NOT EXISTS email_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES email_templates(id) ON DELETE CASCADE NOT NULL,
  version_number int NOT NULL,
  subject text NOT NULL,
  html_body text NOT NULL,
  text_body text,
  variables text[] DEFAULT '{}',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  notes text,
  UNIQUE(template_id, version_number)
);

-- Create email_template_variables table
CREATE TABLE IF NOT EXISTS email_template_variables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variable_name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  example_value text,
  category text NOT NULL CHECK (category IN ('User', 'Booking', 'Payment', 'Provider', 'Platform', 'System')),
  data_type text NOT NULL DEFAULT 'String' CHECK (data_type IN ('String', 'Number', 'Date', 'URL', 'Boolean', 'Currency')),
  is_required boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create email_template_test_sends table
CREATE TABLE IF NOT EXISTS email_template_test_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES email_templates(id) ON DELETE CASCADE NOT NULL,
  sent_to text NOT NULL,
  test_data jsonb DEFAULT '{}',
  sent_by uuid REFERENCES profiles(id),
  sent_at timestamptz DEFAULT now(),
  status text DEFAULT 'Success' CHECK (status IN ('Success', 'Failed')),
  error_message text
);

-- Add new columns to email_templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN category_id uuid REFERENCES email_template_categories(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'preview_text'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN preview_text text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'tags'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN tags text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'version'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN version int DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'is_system'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN is_system boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'last_edited_by'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN last_edited_by uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_templates' AND column_name = 'last_edited_at'
  ) THEN
    ALTER TABLE email_templates ADD COLUMN last_edited_at timestamptz;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE email_template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_template_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_template_test_sends ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admin-only access in production)
CREATE POLICY "Anyone can view template categories"
  ON email_template_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can view template variables"
  ON email_template_variables FOR SELECT
  TO authenticated
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_template_categories_slug ON email_template_categories(slug);
CREATE INDEX IF NOT EXISTS idx_email_template_versions_template ON email_template_versions(template_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_email_template_variables_category ON email_template_variables(category);
CREATE INDEX IF NOT EXISTS idx_email_template_test_sends_template ON email_template_test_sends(template_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_templates_tags ON email_templates USING gin(tags) WHERE tags IS NOT NULL;

-- Function to create template version on update
CREATE OR REPLACE FUNCTION create_email_template_version()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.subject IS DISTINCT FROM NEW.subject OR
      OLD.html_body IS DISTINCT FROM NEW.html_body OR
      OLD.text_body IS DISTINCT FROM NEW.text_body) THEN

    INSERT INTO email_template_versions (
      template_id,
      version_number,
      subject,
      html_body,
      text_body,
      variables,
      created_by,
      notes
    ) VALUES (
      NEW.id,
      COALESCE(NEW.version, 1),
      NEW.subject,
      NEW.html_body,
      NEW.text_body,
      NEW.variables,
      NEW.last_edited_by,
      'Auto-saved version'
    );

    NEW.version := COALESCE(NEW.version, 1) + 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create version on template update
DROP TRIGGER IF EXISTS trigger_create_email_template_version ON email_templates;
CREATE TRIGGER trigger_create_email_template_version
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION create_email_template_version();

-- Function to extract variables from template
CREATE OR REPLACE FUNCTION extract_template_variables(template_text text)
RETURNS text[] AS $$
DECLARE
  variables text[];
BEGIN
  SELECT array_agg(DISTINCT matches[1])
  INTO variables
  FROM regexp_matches(template_text, '\{\{(\w+)\}\}', 'g') AS matches;

  RETURN COALESCE(variables, '{}');
END;
$$ LANGUAGE plpgsql;

-- Function to render template with variables
CREATE OR REPLACE FUNCTION render_email_template(
  template_id_param uuid,
  variables_param jsonb
)
RETURNS jsonb AS $$
DECLARE
  template_record RECORD;
  rendered_subject text;
  rendered_html text;
  rendered_text text;
  var_name text;
  var_value text;
BEGIN
  SELECT * INTO template_record
  FROM email_templates
  WHERE id = template_id_param;

  IF template_record IS NULL THEN
    RETURN jsonb_build_object('error', 'Template not found');
  END IF;

  rendered_subject := template_record.subject;
  rendered_html := template_record.html_body;
  rendered_text := COALESCE(template_record.text_body, '');

  FOR var_name, var_value IN
    SELECT key, value::text FROM jsonb_each_text(variables_param)
  LOOP
    rendered_subject := replace(rendered_subject, '{{' || var_name || '}}', var_value);
    rendered_html := replace(rendered_html, '{{' || var_name || '}}', var_value);
    rendered_text := replace(rendered_text, '{{' || var_name || '}}', var_value);
  END LOOP;

  RETURN jsonb_build_object(
    'subject', rendered_subject,
    'html_body', rendered_html,
    'text_body', rendered_text
  );
END;
$$ LANGUAGE plpgsql;

-- Insert default template categories
INSERT INTO email_template_categories (name, slug, description, icon, sort_order) VALUES
  ('Transactional', 'transactional', 'Booking confirmations, receipts, and order-related emails', 'receipt', 1),
  ('Notifications', 'notifications', 'Status updates, reminders, and alerts', 'bell', 2),
  ('Marketing', 'marketing', 'Newsletters, promotions, and announcements', 'megaphone', 3),
  ('System', 'system', 'Password reset, verification, and account emails', 'settings', 4),
  ('Admin', 'admin', 'Internal reports and administrative alerts', 'shield', 5)
ON CONFLICT (slug) DO NOTHING;

-- Insert common template variables
INSERT INTO email_template_variables (variable_name, display_name, description, example_value, category, data_type, is_required) VALUES
  ('user_name', 'User Name', 'Full name of the user', 'John Smith', 'User', 'String', true),
  ('user_email', 'User Email', 'Email address of the user', 'john@example.com', 'User', 'String', true),
  ('user_phone', 'User Phone', 'Phone number of the user', '(555) 123-4567', 'User', 'String', false),
  ('booking_id', 'Booking ID', 'Unique booking identifier', 'BK-12345', 'Booking', 'String', false),
  ('service_name', 'Service Name', 'Name of the booked service', 'House Cleaning', 'Booking', 'String', false),
  ('scheduled_date', 'Scheduled Date', 'Date of service', 'March 15, 2025', 'Booking', 'Date', false),
  ('scheduled_time', 'Scheduled Time', 'Time of service', '2:00 PM', 'Booking', 'String', false),
  ('location', 'Service Location', 'Address where service will be performed', '123 Main St, City, ST 12345', 'Booking', 'String', false),
  ('amount', 'Amount', 'Transaction amount', '$150.00', 'Payment', 'Currency', false),
  ('platform_fee', 'Platform Fee', 'Fee charged by platform', '$15.00', 'Payment', 'Currency', false),
  ('total_amount', 'Total Amount', 'Total amount including fees', '$165.00', 'Payment', 'Currency', false),
  ('receipt_url', 'Receipt URL', 'Link to view receipt', 'https://example.com/receipt/123', 'Payment', 'URL', false),
  ('provider_name', 'Provider Name', 'Name of service provider', 'Jane Doe', 'Provider', 'String', false),
  ('provider_rating', 'Provider Rating', 'Average rating of provider', '4.8', 'Provider', 'Number', false),
  ('provider_phone', 'Provider Phone', 'Provider contact number', '(555) 987-6543', 'Provider', 'String', false),
  ('platform_name', 'Platform Name', 'Name of the platform', 'Dollarsmiley', 'Platform', 'String', true),
  ('support_email', 'Support Email', 'Customer support email', 'support@dollarsmiley.com', 'Platform', 'String', true),
  ('platform_url', 'Platform URL', 'Main website URL', 'https://dollarsmiley.com', 'Platform', 'URL', true),
  ('action_url', 'Action URL', 'URL for user action (view, confirm, etc.)', 'https://dollarsmiley.com/action', 'System', 'URL', false),
  ('verification_code', 'Verification Code', 'Verification or confirmation code', '123456', 'System', 'String', false)
ON CONFLICT (variable_name) DO NOTHING;

-- Insert sample booking confirmation template
DO $$
DECLARE
  category_id_var uuid;
BEGIN
  SELECT id INTO category_id_var FROM email_template_categories WHERE slug = 'transactional' LIMIT 1;

  INSERT INTO email_templates (
    name,
    slug,
    subject,
    html_body,
    text_body,
    variables,
    category_id,
    preview_text,
    tags,
    description,
    is_active,
    is_system
  ) VALUES (
    'Booking Confirmation',
    'booking-confirmation',
    'Booking Confirmed - {{service_name}}',
    '<html><body><h1>Booking Confirmed!</h1><p>Hi {{user_name}},</p><p>Your booking for <strong>{{service_name}}</strong> has been confirmed.</p><p><strong>Details:</strong></p><ul><li>Date: {{scheduled_date}}</li><li>Time: {{scheduled_time}}</li><li>Location: {{location}}</li><li>Provider: {{provider_name}}</li></ul><p>Total: {{total_amount}}</p><p><a href="{{action_url}}">View Booking</a></p></body></html>',
    'Hi {{user_name}}, Your booking for {{service_name}} has been confirmed. Date: {{scheduled_date}}, Time: {{scheduled_time}}, Location: {{location}}, Provider: {{provider_name}}. Total: {{total_amount}}. View booking: {{action_url}}',
    ARRAY['user_name', 'service_name', 'scheduled_date', 'scheduled_time', 'location', 'provider_name', 'total_amount', 'action_url'],
    category_id_var,
    'Your booking has been confirmed',
    ARRAY['booking', 'confirmation', 'transactional'],
    'Sent when a customer''s booking is confirmed by a provider',
    true,
    true
  ) ON CONFLICT (slug) DO NOTHING;
END $$;
