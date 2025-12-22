/**
 * Service Agreements Library
 *
 * Handles platform-managed service agreements, damage deposits, and fulfillment
 * completion tracking for Standard Services.
 */

import { supabase } from './supabase';

/**
 * Maps UI fulfillment types (PascalCase) to database agreement types (snake_case)
 */
const FULFILLMENT_TO_AGREEMENT_TYPE_MAP: Record<string, string> = {
  'PickupByCustomer': 'pickup_by_customer',
  'DropOffByProvider': 'dropoff_by_provider',
  'PickupAndDropOffByCustomer': 'pickup_dropoff_customer',
  'PickupAndDropOffByProvider': 'pickup_dropoff_provider',
  'Shipping': 'shipping',
};

/**
 * Get applicable service agreement for a listing
 *
 * @param listingId - The service listing ID
 * @returns Agreement object or null
 */
export async function getApplicableAgreement(listingId: string) {
  try {
    const { data, error } = await supabase
      .rpc('get_applicable_agreement', { p_listing_id: listingId });

    if (error) throw error;

    if (!data) return null;

    // Fetch full agreement details
    const { data: agreement, error: agreementError } = await supabase
      .from('standard_service_agreements')
      .select('*')
      .eq('id', data)
      .single();

    if (agreementError) throw agreementError;

    return agreement;
  } catch (error) {
    console.error('Error fetching applicable agreement:', error);
    return null;
  }
}

/**
 * Get agreement by type
 *
 * @param agreementType - Type of agreement (snake_case)
 * @returns Agreement object or null
 */
export async function getAgreementByType(agreementType: string) {
  try {
    const { data, error } = await supabase
      .from('standard_service_agreements')
      .select('*')
      .eq('agreement_type', agreementType)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching agreement:', error);
    return null;
  }
}

/**
 * Record customer agreement acceptance
 *
 * @param bookingId - The booking ID
 * @param agreementId - The agreement ID that was accepted
 * @returns Success boolean
 */
export async function recordAgreementAcceptance(
  bookingId: string,
  agreementId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('bookings')
      .update({
        agreement_id: agreementId,
        agreement_accepted_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error recording agreement acceptance:', error);
    return false;
  }
}

/**
 * Record fulfillment event
 *
 * @param params - Fulfillment tracking parameters
 * @returns Success boolean
 */
export async function recordFulfillmentEvent(params: {
  bookingId: string;
  fulfillmentType: string;
  eventType: string;
  confirmedBy?: string;
  confirmationMethod: 'CustomerConfirm' | 'ProviderConfirm' | 'AutoExpired' | 'CarrierConfirm';
  notes?: string;
  metadata?: Record<string, any>;
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('fulfillment_tracking')
      .insert({
        booking_id: params.bookingId,
        fulfillment_type: params.fulfillmentType,
        event_type: params.eventType,
        confirmed_by: params.confirmedBy,
        confirmation_method: params.confirmationMethod,
        notes: params.notes,
        metadata: params.metadata || {},
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error recording fulfillment event:', error);
    return false;
  }
}

/**
 * Check if fulfillment is complete for a booking
 *
 * @param bookingId - The booking ID
 * @returns Boolean indicating completion status
 */
export async function checkFulfillmentCompletion(bookingId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .rpc('check_fulfillment_completion', { p_booking_id: bookingId });

    if (error) throw error;
    return data === true;
  } catch (error) {
    console.error('Error checking fulfillment completion:', error);
    return false;
  }
}

/**
 * Get fulfillment tracking events for a booking
 *
 * @param bookingId - The booking ID
 * @returns Array of fulfillment events
 */
export async function getFulfillmentEvents(bookingId: string) {
  try {
    const { data, error } = await supabase
      .from('fulfillment_tracking')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching fulfillment events:', error);
    return [];
  }
}

/**
 * Create damage assessment
 *
 * @param params - Damage assessment parameters
 * @returns Assessment ID or null
 */
export async function createDamageAssessment(params: {
  bookingId: string;
  assessedBy: string;
  damageReported: boolean;
  damageDescription?: string;
  damagePhotos?: string[];
  assessedAmount?: number;
  notes?: string;
}): Promise<string | null> {
  try {
    // Get booking to calculate assessment window
    const { data: booking } = await supabase
      .from('bookings')
      .select('fulfillment_completed_at')
      .eq('id', params.bookingId)
      .single();

    const completedAt = booking?.fulfillment_completed_at
      ? new Date(booking.fulfillment_completed_at)
      : new Date();

    // Assessment window: 48 hours from fulfillment completion
    const assessmentWindowEnd = new Date(completedAt.getTime() + 48 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('damage_assessments')
      .insert({
        booking_id: params.bookingId,
        assessed_by: params.assessedBy,
        damage_reported: params.damageReported,
        damage_description: params.damageDescription,
        damage_photos: params.damagePhotos || [],
        assessed_amount: params.assessedAmount || 0,
        assessment_status: params.damageReported ? 'DamageReported' : 'NoDamage',
        assessment_window_start: completedAt.toISOString(),
        assessment_window_end: assessmentWindowEnd.toISOString(),
        notes: params.notes,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  } catch (error) {
    console.error('Error creating damage assessment:', error);
    return null;
  }
}

/**
 * Get damage assessment for a booking
 *
 * @param bookingId - The booking ID
 * @returns Assessment object or null
 */
export async function getDamageAssessment(bookingId: string) {
  try {
    const { data, error } = await supabase
      .from('damage_assessments')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching damage assessment:', error);
    return null;
  }
}

/**
 * Update damage assessment status
 *
 * @param assessmentId - The assessment ID
 * @param status - New status
 * @returns Success boolean
 */
export async function updateDamageAssessmentStatus(
  assessmentId: string,
  status: string
): Promise<boolean> {
  try {
    const updates: any = {
      assessment_status: status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'Resolved') {
      updates.resolved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('damage_assessments')
      .update(updates)
      .eq('id', assessmentId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating damage assessment status:', error);
    return false;
  }
}

/**
 * Get booking's damage deposit info
 *
 * @param bookingId - The booking ID
 * @returns Deposit info or null
 */
export async function getBookingDamageDeposit(bookingId: string) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('damage_deposit_amount, damage_deposit_status, damage_deposit_payment_intent_id')
      .eq('id', bookingId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching damage deposit info:', error);
    return null;
  }
}

/**
 * Map fulfillment type from UI to database format
 *
 * @param uiFulfillmentType - UI fulfillment type (PascalCase)
 * @returns Database agreement type (snake_case)
 */
export function mapFulfillmentTypeToAgreementType(uiFulfillmentType: string): string {
  return FULFILLMENT_TO_AGREEMENT_TYPE_MAP[uiFulfillmentType] || 'no_fulfillment';
}
