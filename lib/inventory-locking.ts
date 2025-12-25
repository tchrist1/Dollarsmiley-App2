import { supabase } from './supabase';

export type InventoryMode = 'none' | 'quantity' | 'rental';
export type LockType = 'soft' | 'hard';
export type LockStatus = 'active' | 'released' | 'expired';
export type RentalPricingModel = 'flat' | 'per_day' | 'per_hour' | 'tiered';

export interface ProviderInventoryItem {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  total_quantity: number;
  buffer_quantity: number;
  is_rentable: boolean;
  turnaround_buffer_hours: number;
  turnaround_hours: number;
  default_rental_price: number | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  low_stock_threshold: number;
  image_url: string | null;
  metadata: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryLock {
  id: string;
  inventory_item_id: string;
  service_listing_id: string | null;
  booking_id: string | null;
  production_order_id: string | null;
  quantity: number;
  pickup_at: string | null;
  dropoff_at: string | null;
  dropoff_at_effective: string | null;
  lock_type: LockType;
  status: LockStatus;
  soft_lock_expires_at: string | null;
  locked_by: string | null;
  released_at: string | null;
  released_reason: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface InventoryAlert {
  id: string;
  provider_id: string;
  inventory_item_id: string;
  alert_type: 'low_stock' | 'out_of_stock' | 'upcoming_shortage';
  current_available: number;
  threshold: number;
  message: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  triggered_at: string;
  read_at: string | null;
  dismissed_at: string | null;
}

export interface InventoryAvailability {
  available: boolean;
  available_quantity: number;
  requested_quantity: number;
  conflicts: Array<{
    lock_id: string;
    pickup_at: string;
    dropoff_at: string;
    quantity: number;
  }>;
  reason?: string;
}

export interface CreateLockResult {
  success: boolean;
  lock_id?: string;
  error?: string;
  dropoff_at_effective?: string;
  soft_lock_expires_at?: string;
  availability?: InventoryAvailability;
}

export interface CreateInventoryItemInput {
  name: string;
  description?: string;
  sku?: string;
  total_quantity: number;
  buffer_quantity?: number;
  is_rentable?: boolean;
  turnaround_buffer_hours?: number;
  turnaround_hours?: number;
  default_rental_price?: number;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  low_stock_threshold?: number;
  image_url?: string;
  metadata?: Record<string, any>;
}

export interface UpdateInventoryItemInput {
  name?: string;
  description?: string;
  sku?: string;
  total_quantity?: number;
  buffer_quantity?: number;
  is_rentable?: boolean;
  turnaround_buffer_hours?: number;
  turnaround_hours?: number;
  default_rental_price?: number;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  low_stock_threshold?: number;
  image_url?: string;
  metadata?: Record<string, any>;
  is_active?: boolean;
}

export async function getProviderInventoryItems(
  providerId: string
): Promise<ProviderInventoryItem[]> {
  try {
    const { data, error } = await supabase
      .from('provider_inventory_items')
      .select('*')
      .eq('provider_id', providerId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    return [];
  }
}

export async function getInventoryItemById(
  itemId: string
): Promise<ProviderInventoryItem | null> {
  try {
    const { data, error } = await supabase
      .from('provider_inventory_items')
      .select('*')
      .eq('id', itemId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return null;
  }
}

export async function createInventoryItem(
  providerId: string,
  input: CreateInventoryItemInput
): Promise<ProviderInventoryItem | null> {
  try {
    const turnaroundHours = input.turnaround_hours ?? input.turnaround_buffer_hours ?? 0;
    const { data, error } = await supabase
      .from('provider_inventory_items')
      .insert({
        provider_id: providerId,
        name: input.name,
        description: input.description || null,
        sku: input.sku || null,
        total_quantity: input.total_quantity,
        buffer_quantity: input.buffer_quantity || 0,
        is_rentable: input.is_rentable || false,
        turnaround_buffer_hours: turnaroundHours,
        turnaround_hours: turnaroundHours,
        default_rental_price: input.default_rental_price || null,
        location_address: input.location_address || null,
        location_lat: input.location_lat || null,
        location_lng: input.location_lng || null,
        low_stock_threshold: input.low_stock_threshold || 0,
        image_url: input.image_url || null,
        metadata: input.metadata || {},
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating inventory item:', error);
    return null;
  }
}

export async function updateInventoryItem(
  itemId: string,
  input: UpdateInventoryItemInput
): Promise<ProviderInventoryItem | null> {
  try {
    const updateData: Record<string, any> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.sku !== undefined) updateData.sku = input.sku;
    if (input.total_quantity !== undefined) updateData.total_quantity = input.total_quantity;
    if (input.buffer_quantity !== undefined) updateData.buffer_quantity = input.buffer_quantity;
    if (input.is_rentable !== undefined) updateData.is_rentable = input.is_rentable;
    if (input.turnaround_buffer_hours !== undefined) updateData.turnaround_buffer_hours = input.turnaround_buffer_hours;
    if (input.turnaround_hours !== undefined) {
      updateData.turnaround_hours = input.turnaround_hours;
      updateData.turnaround_buffer_hours = input.turnaround_hours;
    }
    if (input.default_rental_price !== undefined) updateData.default_rental_price = input.default_rental_price;
    if (input.location_address !== undefined) updateData.location_address = input.location_address;
    if (input.location_lat !== undefined) updateData.location_lat = input.location_lat;
    if (input.location_lng !== undefined) updateData.location_lng = input.location_lng;
    if (input.low_stock_threshold !== undefined) updateData.low_stock_threshold = input.low_stock_threshold;
    if (input.image_url !== undefined) updateData.image_url = input.image_url;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;

    const { data, error } = await supabase
      .from('provider_inventory_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return null;
  }
}

export async function deleteInventoryItem(itemId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('provider_inventory_items')
      .update({ is_active: false })
      .eq('id', itemId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return false;
  }
}

export async function getAvailableInventoryCount(
  itemId: string,
  startTime?: string,
  endTime?: string
): Promise<number> {
  try {
    const { data, error } = await supabase.rpc('get_available_inventory', {
      p_inventory_item_id: itemId,
      p_start_time: startTime || null,
      p_end_time: endTime || null,
    });

    if (error) throw error;
    return data || 0;
  } catch (error) {
    console.error('Error getting available inventory:', error);
    return 0;
  }
}

export async function checkInventoryAvailability(
  itemId: string,
  quantity: number,
  startTime?: string,
  endTime?: string,
  excludeLockId?: string
): Promise<InventoryAvailability> {
  try {
    const { data, error } = await supabase.rpc('check_inventory_availability', {
      p_inventory_item_id: itemId,
      p_quantity: quantity,
      p_start_time: startTime || null,
      p_end_time: endTime || null,
      p_exclude_lock_id: excludeLockId || null,
    });

    if (error) throw error;
    return data as InventoryAvailability;
  } catch (error) {
    console.error('Error checking inventory availability:', error);
    return {
      available: false,
      available_quantity: 0,
      requested_quantity: quantity,
      conflicts: [],
      reason: 'Error checking availability',
    };
  }
}

export async function createInventoryLock(
  inventoryItemId: string,
  quantity: number,
  lockType: LockType,
  lockedBy: string,
  options?: {
    bookingId?: string;
    productionOrderId?: string;
    serviceListingId?: string;
    pickupAt?: string;
    dropoffAt?: string;
    softLockMinutes?: number;
  }
): Promise<CreateLockResult> {
  try {
    const { data, error } = await supabase.rpc('create_inventory_lock', {
      p_inventory_item_id: inventoryItemId,
      p_quantity: quantity,
      p_lock_type: lockType,
      p_locked_by: lockedBy,
      p_booking_id: options?.bookingId || null,
      p_production_order_id: options?.productionOrderId || null,
      p_service_listing_id: options?.serviceListingId || null,
      p_pickup_at: options?.pickupAt || null,
      p_dropoff_at: options?.dropoffAt || null,
      p_soft_lock_minutes: options?.softLockMinutes || 30,
    });

    if (error) throw error;
    return data as CreateLockResult;
  } catch (error) {
    console.error('Error creating inventory lock:', error);
    return {
      success: false,
      error: 'Failed to create inventory lock',
    };
  }
}

export async function upgradeLockToHard(
  lockId: string,
  bookingId?: string,
  productionOrderId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('upgrade_inventory_lock', {
      p_lock_id: lockId,
      p_booking_id: bookingId || null,
      p_production_order_id: productionOrderId || null,
    });

    if (error) throw error;
    return data as { success: boolean; error?: string };
  } catch (error) {
    console.error('Error upgrading inventory lock:', error);
    return {
      success: false,
      error: 'Failed to upgrade inventory lock',
    };
  }
}

export async function releaseInventoryLock(
  lockId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('release_inventory_lock', {
      p_lock_id: lockId,
      p_reason: reason || 'manual_release',
    });

    if (error) throw error;
    return data as { success: boolean; error?: string };
  } catch (error) {
    console.error('Error releasing inventory lock:', error);
    return {
      success: false,
      error: 'Failed to release inventory lock',
    };
  }
}

export async function getLockById(lockId: string): Promise<InventoryLock | null> {
  try {
    const { data, error } = await supabase
      .from('inventory_locks')
      .select('*')
      .eq('id', lockId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching inventory lock:', error);
    return null;
  }
}

export async function getActiveLocksByItem(itemId: string): Promise<InventoryLock[]> {
  try {
    const { data, error } = await supabase
      .from('inventory_locks')
      .select('*')
      .eq('inventory_item_id', itemId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching active locks:', error);
    return [];
  }
}

export async function getLockByBookingId(bookingId: string): Promise<InventoryLock | null> {
  try {
    const { data, error } = await supabase
      .from('inventory_locks')
      .select('*')
      .eq('booking_id', bookingId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching lock by booking:', error);
    return null;
  }
}

export async function getLockByProductionOrderId(orderId: string): Promise<InventoryLock | null> {
  try {
    const { data, error } = await supabase
      .from('inventory_locks')
      .select('*')
      .eq('production_order_id', orderId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching lock by production order:', error);
    return null;
  }
}

export async function getInventoryAlerts(
  providerId: string,
  options?: {
    includeRead?: boolean;
    includeDismissed?: boolean;
  }
): Promise<InventoryAlert[]> {
  try {
    let query = supabase
      .from('inventory_alerts')
      .select(`
        *,
        inventory_item:provider_inventory_items(name)
      `)
      .eq('provider_id', providerId);

    if (!options?.includeRead) {
      query = query.eq('is_read', false);
    }

    if (!options?.includeDismissed) {
      query = query.eq('is_dismissed', false);
    }

    query = query.order('triggered_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching inventory alerts:', error);
    return [];
  }
}

export async function markAlertAsRead(alertId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('inventory_alerts')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking alert as read:', error);
    return false;
  }
}

export async function dismissAlert(alertId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('inventory_alerts')
      .update({
        is_dismissed: true,
        dismissed_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error dismissing alert:', error);
    return false;
  }
}

export async function getInventoryCalendar(
  providerId: string,
  startDate: string,
  endDate: string,
  itemId?: string
): Promise<{
  locks: Array<{
    id: string;
    inventory_item_id: string;
    inventory_item_name: string;
    booking_id: string | null;
    production_order_id: string | null;
    quantity: number;
    pickup_at: string | null;
    dropoff_at: string | null;
    dropoff_at_effective: string | null;
    lock_type: string;
    status: string;
  }>;
  items: Array<{
    id: string;
    name: string;
    total_quantity: number;
    buffer_quantity: number;
    is_rentable: boolean;
    turnaround_buffer_hours: number;
    available_now: number;
  }>;
  date_range: { start: string; end: string };
}> {
  try {
    const { data, error } = await supabase.rpc('get_inventory_calendar', {
      p_provider_id: providerId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_inventory_item_id: itemId || null,
    });

    if (error) throw error;
    return data || { locks: [], items: [], date_range: { start: startDate, end: endDate } };
  } catch (error) {
    console.error('Error fetching inventory calendar:', error);
    return { locks: [], items: [], date_range: { start: startDate, end: endDate } };
  }
}

export async function getInventoryStats(providerId: string): Promise<{
  totalItems: number;
  totalQuantity: number;
  totalAvailable: number;
  activeRentals: number;
  activeLocks: number;
  lowStockItems: number;
  outOfStockItems: number;
}> {
  try {
    const items = await getProviderInventoryItems(providerId);

    let totalQuantity = 0;
    let totalAvailable = 0;
    let lowStockItems = 0;
    let outOfStockItems = 0;

    for (const item of items) {
      totalQuantity += item.total_quantity;
      const available = await getAvailableInventoryCount(item.id);
      totalAvailable += available;

      if (available === 0) {
        outOfStockItems++;
      } else if (item.low_stock_threshold > 0 && available <= item.low_stock_threshold) {
        lowStockItems++;
      }
    }

    const { data: locks } = await supabase
      .from('inventory_locks')
      .select('id, pickup_at')
      .in('inventory_item_id', items.map(i => i.id))
      .eq('status', 'active');

    const activeLocks = locks?.length || 0;
    const activeRentals = locks?.filter(l => l.pickup_at !== null).length || 0;

    return {
      totalItems: items.length,
      totalQuantity,
      totalAvailable,
      activeRentals,
      activeLocks,
      lowStockItems,
      outOfStockItems,
    };
  } catch (error) {
    console.error('Error getting inventory stats:', error);
    return {
      totalItems: 0,
      totalQuantity: 0,
      totalAvailable: 0,
      activeRentals: 0,
      activeLocks: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
    };
  }
}

export async function getUpcomingPickupsAndReturns(
  providerId: string,
  days = 7
): Promise<{
  pickups: Array<{ lock: InventoryLock; itemName: string }>;
  returns: Array<{ lock: InventoryLock; itemName: string }>;
}> {
  try {
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('inventory_locks')
      .select(`
        *,
        inventory_item:provider_inventory_items!inner(
          provider_id,
          name
        )
      `)
      .eq('inventory_item.provider_id', providerId)
      .eq('status', 'active')
      .not('pickup_at', 'is', null);

    if (error) throw error;

    const pickups: Array<{ lock: InventoryLock; itemName: string }> = [];
    const returns: Array<{ lock: InventoryLock; itemName: string }> = [];

    for (const lock of data || []) {
      const pickupDate = lock.pickup_at ? new Date(lock.pickup_at) : null;
      const dropoffDate = lock.dropoff_at ? new Date(lock.dropoff_at) : null;
      const itemName = (lock as any).inventory_item?.name || 'Unknown';

      if (pickupDate && pickupDate >= now && pickupDate <= futureDate) {
        pickups.push({ lock, itemName });
      }

      if (dropoffDate && dropoffDate >= now && dropoffDate <= futureDate) {
        returns.push({ lock, itemName });
      }
    }

    pickups.sort((a, b) =>
      new Date(a.lock.pickup_at!).getTime() - new Date(b.lock.pickup_at!).getTime()
    );
    returns.sort((a, b) =>
      new Date(a.lock.dropoff_at!).getTime() - new Date(b.lock.dropoff_at!).getTime()
    );

    return { pickups, returns };
  } catch (error) {
    console.error('Error fetching upcoming pickups and returns:', error);
    return { pickups: [], returns: [] };
  }
}

export function formatInventoryStatus(
  available: number,
  total: number,
  threshold: number
): { status: 'available' | 'low_stock' | 'out_of_stock'; label: string; color: string } {
  if (available === 0) {
    return { status: 'out_of_stock', label: 'Out of Stock', color: '#EF4444' };
  }
  if (threshold > 0 && available <= threshold) {
    return { status: 'low_stock', label: 'Low Stock', color: '#F59E0B' };
  }
  return { status: 'available', label: 'Available', color: '#10B981' };
}

export function calculateRentalDuration(
  pickupAt: Date | string,
  dropoffAt: Date | string
): { hours: number; days: number; displayText: string } {
  const pickup = typeof pickupAt === 'string' ? new Date(pickupAt) : pickupAt;
  const dropoff = typeof dropoffAt === 'string' ? new Date(dropoffAt) : dropoffAt;

  const hours = Math.ceil((dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60));
  const days = Math.ceil(hours / 24);

  let displayText: string;
  if (hours < 24) {
    displayText = `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else if (days === 1) {
    displayText = '1 day';
  } else {
    displayText = `${days} days`;
  }

  return { hours, days, displayText };
}

export function calculateEffectiveDropoff(
  dropoffAt: Date | string,
  turnaroundBufferHours: number
): Date {
  const dropoff = typeof dropoffAt === 'string' ? new Date(dropoffAt) : dropoffAt;
  return new Date(dropoff.getTime() + turnaroundBufferHours * 60 * 60 * 1000);
}
