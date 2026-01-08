export type UserType = 'Customer' | 'Provider' | 'Hybrid' | 'Admin';
export type SubscriptionPlan = 'Free' | 'Pro' | 'Premium' | 'Elite';
export type ListingStatus = 'Draft' | 'Active' | 'Paused' | 'Archived';
export type ListingType = 'Service' | 'CustomService';
export type JobStatus = 'Open' | 'Booked' | 'Completed' | 'Expired' | 'Cancelled';
export type BookingStatus = 'Requested' | 'Accepted' | 'InProgress' | 'Completed' | 'Cancelled' | 'Disputed';
export type PaymentStatus = 'Pending' | 'Held' | 'Released' | 'Refunded';
export type PricingType = 'Fixed' | 'Hourly' | 'Custom';
export type PreferredTime = 'Morning' | 'Afternoon' | 'Evening' | 'Flexible';
export type FulfillmentType = 'Pickup' | 'DropOff' | 'Shipping';
export type ShippingMode = 'Platform' | 'External';
export type ShipmentStatus = 'Pending' | 'InTransit' | 'OutForDelivery' | 'Delivered' | 'Exception' | 'Cancelled';
export type OrderType = 'Job' | 'Service' | 'CustomService';
export type PayoutStatus = 'Pending' | 'Scheduled' | 'Processing' | 'Completed' | 'Failed';
export type CommunicationType = 'Text' | 'Voice' | 'Video';
export type TimeExtensionStatus = 'pending' | 'approved' | 'declined' | 'cancelled';

export interface Profile {
  id: string;
  user_type: UserType;
  email: string;
  full_name: string;
  phone?: string;
  phone_verified: boolean;
  avatar_url?: string;
  bio?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  service_radius: number;
  subscription_plan: SubscriptionPlan;
  subscription_expires_at?: string;
  id_verified: boolean;
  business_verified: boolean;
  payout_connected: boolean;
  rating_average: number;
  rating_count: number;
  total_bookings: number;
  total_reviews: number;
  average_rating: number;
  role?: 'user' | 'provider' | 'admin';
  is_verified?: boolean;
  verification_status?: 'Unverified' | 'Pending' | 'Verified' | 'Rejected';
  verified_at?: string;
  admin_mode?: boolean;
  ai_assist_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image_url?: string;
  parent_id?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ServiceListing {
  id: string;
  provider_id: string;
  category_id: string;
  title: string;
  description: string;
  price: number;
  price_type: 'hourly' | 'fixed';
  duration_minutes?: number;
  photos: string;
  tags: string[];
  availability: string;
  is_active: boolean;
  location?: string;
  latitude?: number;
  longitude?: number;
  base_price: number;
  listing_type?: ListingType;
  item_weight_oz?: number;
  item_dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  fulfillment_window_days?: number;
  created_at: string;
  provider?: Profile;
  category?: Category;
}

export interface Listing {
  id: string;
  provider_id: string;
  category_id: string;
  title: string;
  description: string;
  base_price: number;
  pricing_type: PricingType;
  photos: string;
  tags: string[];
  location?: string;
  latitude?: number;
  longitude?: number;
  estimated_duration?: number;
  status: ListingStatus;
  view_count: number;
  save_count: number;
  booking_count: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  provider?: Profile;
  category?: Category;
}

export interface Job {
  id: string;
  customer_id: string;
  category_id: string;
  title: string;
  description: string;
  pricing_type: 'fixed_price' | 'quote_based';
  fixed_price?: number;
  budget_min?: number;
  budget_max?: number;
  location: string;
  latitude?: number;
  longitude?: number;
  execution_date_start: string;
  execution_date_end?: string;
  preferred_time?: PreferredTime;
  photos: string[];
  status: JobStatus;
  expires_at?: string;
  provider_id?: string;
  created_at: string;
  updated_at: string;
  customer?: Profile;
  category?: Category;
}

export interface TimeExtensionRequest {
  id: string;
  job_id: string;
  provider_id: string;
  requested_additional_hours: number;
  reason: string;
  status: TimeExtensionStatus;
  requested_at: string;
  responded_at?: string;
  responded_by?: string;
  customer_response_notes?: string;
  proposed_price_adjustment?: number;
  approved_additional_hours?: number;
  original_estimated_duration?: number;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  customer_id: string;
  provider_id: string;
  listing_id?: string;
  job_id?: string;
  title: string;
  description?: string;
  scheduled_date: string;
  scheduled_time?: string;
  location: string;
  price: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_intent_id?: string;
  platform_fee: number;
  provider_payout: number;
  order_type?: OrderType;
  fulfillment_type?: FulfillmentType;
  shipping_cost?: number;
  vas_total?: number;
  tax_amount?: number;
  subtotal?: number;
  total_amount?: number;
  delivery_confirmed_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  customer?: Profile;
  provider?: Profile;
  listing?: ServiceListing;
}

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment?: string;
  is_provider_review: boolean;
  created_at: string;
  reviewer?: Profile;
}

export interface Message {
  id: string;
  booking_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  attachments: any[];
  is_read: boolean;
  message_type?: 'text' | 'voice' | 'image' | 'file';
  voice_url?: string;
  voice_duration?: number;
  voice_waveform?: any;
  created_at: string;
  sender?: Profile;
}

export interface CustomServiceOption {
  id: string;
  listing_id: string;
  option_type: string;
  option_name: string;
  option_values: Array<{
    value: string;
    price_modifier: number;
  }>;
  is_required: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ValueAddedService {
  id: string;
  listing_id: string;
  service_name: string;
  description?: string;
  price: number;
  estimated_duration: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FulfillmentOption {
  id: string;
  listing_id: string;
  fulfillment_type: FulfillmentType;
  shipping_mode?: ShippingMode;
  base_cost: number;
  cost_per_mile: number;
  cost_per_pound: number;
  estimated_days_min: number;
  estimated_days_max: number;
  carrier_preference: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShippingAddress {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Shipment {
  id: string;
  booking_id: string;
  carrier: string;
  tracking_number?: string;
  shipping_label_url?: string;
  origin_address: any;
  destination_address: any;
  weight_oz: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  shipping_cost: number;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  status: ShipmentStatus;
  tracking_events: Array<{
    timestamp: string;
    status: string;
    location?: string;
    description: string;
  }>;
  proof_of_delivery_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  user_id: string;
  listing_id: string;
  listing_type: ListingType;
  quantity: number;
  custom_options: any;
  selected_vas: any[];
  fulfillment_option_id?: string;
  shipping_address_id?: string;
  price_snapshot: {
    base_price: number;
    options_total: number;
    vas_total: number;
    estimated_shipping: number;
  };
  created_at: string;
}

export interface OrderItem {
  id: string;
  booking_id: string;
  listing_id: string;
  listing_type: ListingType;
  quantity: number;
  unit_price: number;
  custom_options: any;
  selected_vas: any[];
  fulfillment_type?: FulfillmentType;
  shipping_cost: number;
  subtotal: number;
  total: number;
  created_at: string;
}

export interface PayoutSchedule {
  id: string;
  booking_id: string;
  provider_id: string;
  transaction_type: OrderType;
  completed_at: string;
  eligible_for_payout_at: string;
  scheduled_payout_date: string;
  early_payout_eligible_at: string;
  early_payout_requested: boolean;
  early_payout_requested_at?: string;
  payout_status: PayoutStatus;
  payout_amount: number;
  processed_at?: string;
  escrow_hold_id?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderCommunication {
  id: string;
  booking_id: string;
  initiated_by: string;
  communication_type: CommunicationType;
  session_id?: string;
  duration_seconds: number;
  recording_url?: string;
  status: 'Active' | 'Ended' | 'Failed';
  started_at: string;
  ended_at?: string;
  created_at: string;
}

export interface ShippingRateQuote {
  carrier: string;
  service_type: string;
  rate: number;
  delivery_days: number;
  delivery_date: string;
  is_fastest: boolean;
  is_cheapest: boolean;
  is_best_value: boolean;
}

export interface MarketplaceListing {
  id: string;
  marketplace_type: OrderType;
  title: string;
  description: string;
  category_id: string;
  location: string;
  latitude?: number;
  longitude?: number;
  photos: string | string[];
  featured_image_url?: string;
  created_at: string;
  base_price?: number;
  budget_min?: number;
  budget_max?: number;
  fixed_price?: number;
  pricing_type?: string;
  provider_id?: string;
  customer_id?: string;
  status?: string;
  listing_type?: ListingType;
  execution_date_start?: string;
  execution_date_end?: string;
  preferred_time?: PreferredTime;
  provider?: Profile;
  customer?: Profile;
  category?: Category;
  distance_miles?: number;
  view_count?: number;
}

export type ProductionOrderStatus =
  | 'inquiry'
  | 'procurement_started'
  | 'price_proposed'
  | 'price_approved'
  | 'order_received'
  | 'consultation'
  | 'proofing'
  | 'approved'
  | 'in_production'
  | 'quality_check'
  | 'completed'
  | 'cancelled';

export type RefundPolicy = 'fully_refundable' | 'partially_refundable' | 'non_refundable';

export interface ProductionOrder {
  id: string;
  booking_id?: string;
  customer_id: string;
  provider_id: string;
  product_type: string;
  requirements: Record<string, any>;
  materials?: Record<string, any>;
  status: ProductionOrderStatus;
  payment_intent_id?: string;
  authorization_amount?: number;
  proposed_price?: number;
  final_price?: number;
  price_change_reason?: string;
  customer_price_approved_at?: string;
  order_received_at?: string;
  payment_captured_at?: string;
  authorization_expires_at?: string;
  price_changes: Array<{
    timestamp: string;
    old_proposed_price?: number;
    new_proposed_price?: number;
    old_final_price?: number;
    new_final_price?: number;
    reason?: string;
    status: string;
  }>;
  refund_policy?: RefundPolicy;
  cancellation_reason?: string;
  estimated_completion_date?: string;
  actual_completion_date?: string;
  completion_source?: 'manual' | 'automatic';
  production_notes?: string;
  cost_breakdown?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Proof {
  id: string;
  production_order_id: string;
  version_number: number;
  proof_images: string[];
  design_files: string[];
  provider_notes?: string;
  customer_feedback?: string;
  change_requests: any[];
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  approved_at?: string;
  created_at: string;
}

export interface ProductionTimelineEvent {
  id: string;
  production_order_id: string;
  event_type: string;
  description?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export type PersonalizationType =
  | 'text'
  | 'image_upload'
  | 'image_selection'
  | 'font_selection'
  | 'color_selection'
  | 'placement_selection'
  | 'template_selection'
  | 'combined';

export type LivePreviewMode = 'enabled' | 'constrained' | 'downgraded' | 'disabled';

export type PersonalizationLockStage = 'add_to_cart' | 'checkout' | 'order_received' | 'proof_approved';

export type PersonalizationValidationStatus = 'pending' | 'valid' | 'invalid' | 'needs_review';

export interface PersonalizationFont {
  id: string;
  name: string;
  family: string;
  category: 'serif' | 'sans-serif' | 'display' | 'handwriting' | 'monospace';
  preview_url?: string;
  font_file_url?: string;
  is_system_font: boolean;
  provider_id?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface PersonalizationColorPalette {
  id: string;
  provider_id: string;
  name: string;
  colors: Array<{
    hex: string;
    name: string;
    category?: string;
  }>;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PersonalizationTextConfig {
  enabled: boolean;
  max_length: number;
  min_length: number;
  allowed_characters: string;
  multiline: boolean;
  max_lines: number;
  placeholder: string;
  validation_regex?: string;
}

export interface PersonalizationImageUploadConfig {
  enabled: boolean;
  max_file_size_mb: number;
  allowed_formats: string[];
  min_resolution: { width: number; height: number };
  max_uploads: number;
  require_high_res: boolean;
}

export interface PersonalizationFontConfig {
  enabled: boolean;
  allowed_font_ids: string[];
  allow_all_system_fonts: boolean;
  default_font_id?: string;
  allow_size_selection: boolean;
  min_size: number;
  max_size: number;
  default_size: number;
}

export interface PersonalizationColorConfig {
  enabled: boolean;
  palette_id?: string;
  allow_custom_colors: boolean;
  default_color: string;
}

export interface PersonalizationPriceImpact {
  type: 'none' | 'fixed' | 'percentage' | 'per_character' | 'per_image';
  fixed_amount: number;
  percentage: number;
  per_character: number;
  per_image: number;
}

export interface PersonalizationConfig {
  id: string;
  listing_id: string;
  custom_option_id?: string;
  is_enabled: boolean;
  is_required: boolean;
  personalization_type: PersonalizationType;
  config_settings: Record<string, any>;
  text_config: PersonalizationTextConfig;
  image_upload_config: PersonalizationImageUploadConfig;
  font_config: PersonalizationFontConfig;
  color_config: PersonalizationColorConfig;
  live_preview_mode: LivePreviewMode;
  price_impact: PersonalizationPriceImpact;
  lock_after_stage: PersonalizationLockStage;
  display_order: number;
  help_text?: string;
  created_at: string;
  updated_at: string;
}

export interface PersonalizationTemplate {
  id: string;
  listing_id: string;
  provider_id: string;
  name: string;
  description?: string;
  thumbnail_url?: string;
  preview_image_url?: string;
  canvas_config: {
    width: number;
    height: number;
    background_color: string;
    background_image_url?: string;
  };
  placement_zones: Array<{
    id: string;
    type: 'text' | 'image';
    x: number;
    y: number;
    width: number;
    height: number;
    constraints?: Record<string, any>;
  }>;
  constraints: {
    allow_zone_resize: boolean;
    allow_zone_move: boolean;
    enforce_safe_area: boolean;
    safe_area_margin: number;
  };
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PersonalizationImagePreset {
  id: string;
  listing_id: string;
  provider_id: string;
  config_id?: string;
  name: string;
  description?: string;
  image_url: string;
  thumbnail_url?: string;
  category?: string;
  tags: string[];
  price_modifier: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface PersonalizationSubmission {
  id: string;
  customer_id: string;
  listing_id: string;
  config_id?: string;
  cart_item_id?: string;
  booking_id?: string;
  production_order_id?: string;
  submission_type: PersonalizationType;
  text_value?: string;
  image_data?: {
    uploaded_url?: string;
    preset_id?: string;
    original_filename?: string;
    file_size?: number;
    dimensions?: { width: number; height: number };
  };
  font_data?: {
    font_id: string;
    font_family: string;
    font_size: number;
    font_weight?: string;
    font_style?: string;
  };
  color_data?: {
    hex: string;
    rgba?: string;
    palette_color_id?: string;
  };
  placement_data?: {
    zone_id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
    scale?: number;
  };
  template_data?: {
    template_id: string;
    customizations?: Record<string, any>;
  };
  preview_render_url?: string;
  calculated_price_impact: number;
  validation_status: PersonalizationValidationStatus;
  validation_errors: string[];
  is_locked: boolean;
  locked_at?: string;
  locked_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface PersonalizationSnapshot {
  id: string;
  cart_item_id?: string;
  booking_id?: string;
  production_order_id?: string;
  customer_id: string;
  listing_id: string;
  provider_id: string;
  snapshot_data: PersonalizationSubmission[];
  config_snapshot: PersonalizationConfig[];
  uploaded_images: Array<{
    url: string;
    permanent_url?: string;
    hash?: string;
  }>;
  preview_renders: Array<{
    render_url: string;
    created_at: string;
  }>;
  total_price_impact: number;
  snapshot_version: number;
  created_at: string;
  finalized_at?: string;
}

export interface PersonalizationReusableSetup {
  id: string;
  customer_id: string;
  listing_id?: string;
  name: string;
  description?: string;
  setup_data: PersonalizationSubmission[];
  source_snapshot_id?: string;
  source_booking_id?: string;
  use_count: number;
  last_used_at?: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}
