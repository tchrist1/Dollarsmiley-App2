import { supabase } from './supabase';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';
export type RecurrenceEndType = 'date' | 'occurrences' | 'never';

export interface RecurrencePattern {
  frequency: RecurrenceFrequency;
  interval: number; // Every N days/weeks/months
  days_of_week?: number[]; // 0=Sunday, 6=Saturday (for weekly/biweekly)
  day_of_month?: number; // For monthly (1-31)
  end_type: RecurrenceEndType;
  end_date?: string;
  occurrences?: number;
}

export interface RecurringBooking {
  id: string;
  customer_id: string;
  provider_id: string;
  listing_id: string;
  service_title: string;
  service_price: number;
  start_date: string;
  start_time: string;
  duration_minutes: number;
  recurrence_pattern: RecurrencePattern;
  is_active: boolean;
  created_bookings: number;
  total_occurrences?: number;
  next_booking_date?: string;
  created_at: string;
  updated_at: string;
}

export interface RecurringBookingOccurrence {
  date: string;
  time: string;
  hasConflict: boolean;
  conflictReason?: string;
}

export interface RecurringBookingPreview {
  occurrences: RecurringBookingOccurrence[];
  totalOccurrences: number;
  estimatedCost: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export async function createRecurringBooking(
  customerId: string,
  data: {
    provider_id: string;
    listing_id: string;
    service_title: string;
    service_price: number;
    start_date: string;
    start_time: string;
    duration_minutes: number;
    recurrence_pattern: RecurrencePattern;
  }
): Promise<RecurringBooking | null> {
  try {
    // Validate pattern
    validateRecurrencePattern(data.recurrence_pattern);

    // Calculate next booking date
    const nextBooking = calculateNextBookingDate(
      data.start_date,
      data.start_time,
      data.recurrence_pattern
    );

    const { data: recurring, error } = await supabase
      .from('recurring_bookings')
      .insert({
        customer_id: customerId,
        provider_id: data.provider_id,
        listing_id: data.listing_id,
        service_title: data.service_title,
        service_price: data.service_price,
        start_date: data.start_date,
        start_time: data.start_time,
        duration_minutes: data.duration_minutes,
        recurrence_pattern: data.recurrence_pattern,
        is_active: true,
        created_bookings: 0,
        next_booking_date: nextBooking,
      })
      .select()
      .single();

    if (error) {
      // Table doesn't exist - migration not applied yet
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('Recurring bookings table not found. Feature may not be enabled yet.');
        return null;
      }
      throw error;
    }

    // Create first booking
    await createBookingFromRecurring(recurring.id);

    return recurring;
  } catch (error) {
    console.error('Error creating recurring booking:', error);
    return null;
  }
}

export async function generateRecurringBookingPreview(
  startDate: string,
  startTime: string,
  pattern: RecurrencePattern,
  providerId: string,
  durationMinutes: number,
  pricePerBooking: number
): Promise<RecurringBookingPreview> {
  try {
    const occurrences = generateOccurrenceDates(startDate, pattern);

    // Check for conflicts
    const occurrencesWithConflicts = await Promise.all(
      occurrences.map(async date => {
        const conflict = await checkBookingConflict(
          providerId,
          date,
          startTime,
          durationMinutes
        );

        return {
          date,
          time: startTime,
          hasConflict: conflict.hasConflict,
          conflictReason: conflict.reason,
        };
      })
    );

    const totalOccurrences = occurrences.length;
    const estimatedCost = totalOccurrences * pricePerBooking;

    return {
      occurrences: occurrencesWithConflicts,
      totalOccurrences,
      estimatedCost,
      dateRange: {
        start: occurrences[0],
        end: occurrences[occurrences.length - 1],
      },
    };
  } catch (error) {
    console.error('Error generating preview:', error);
    throw error;
  }
}

export function generateOccurrenceDates(
  startDate: string,
  pattern: RecurrencePattern,
  maxOccurrences: number = 100
): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  let currentDate = new Date(start);
  let count = 0;

  // Set end condition
  const endDate = pattern.end_type === 'date' && pattern.end_date
    ? new Date(pattern.end_date)
    : null;
  const maxCount = pattern.end_type === 'occurrences' && pattern.occurrences
    ? pattern.occurrences
    : maxOccurrences;

  while (count < maxCount) {
    // Check if we've passed end date
    if (endDate && currentDate > endDate) {
      break;
    }

    // Check if date matches pattern
    if (isDateMatchingPattern(currentDate, pattern, start)) {
      dates.push(currentDate.toISOString().split('T')[0]);
      count++;
    }

    // Move to next potential date
    currentDate = getNextPotentialDate(currentDate, pattern);

    // Safety check to prevent infinite loops
    if (dates.length > 1000) {
      console.warn('Stopping at 1000 occurrences to prevent infinite loop');
      break;
    }
  }

  return dates;
}

function isDateMatchingPattern(
  date: Date,
  pattern: RecurrencePattern,
  startDate: Date
): boolean {
  const daysDiff = Math.floor(
    (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  switch (pattern.frequency) {
    case 'daily':
      return daysDiff % pattern.interval === 0;

    case 'weekly':
      if (daysDiff % (7 * pattern.interval) !== 0) return false;
      if (pattern.days_of_week && pattern.days_of_week.length > 0) {
        return pattern.days_of_week.includes(date.getDay());
      }
      return date.getDay() === startDate.getDay();

    case 'biweekly':
      if (daysDiff % (14 * pattern.interval) !== 0) return false;
      if (pattern.days_of_week && pattern.days_of_week.length > 0) {
        return pattern.days_of_week.includes(date.getDay());
      }
      return date.getDay() === startDate.getDay();

    case 'monthly':
      const monthsDiff =
        (date.getFullYear() - startDate.getFullYear()) * 12 +
        (date.getMonth() - startDate.getMonth());
      if (monthsDiff % pattern.interval !== 0) return false;

      const targetDay = pattern.day_of_month || startDate.getDate();
      return date.getDate() === targetDay;

    default:
      return false;
  }
}

function getNextPotentialDate(date: Date, pattern: RecurrencePattern): Date {
  const next = new Date(date);

  switch (pattern.frequency) {
    case 'daily':
      next.setDate(next.getDate() + pattern.interval);
      break;

    case 'weekly':
      next.setDate(next.getDate() + 1);
      break;

    case 'biweekly':
      next.setDate(next.getDate() + 1);
      break;

    case 'monthly':
      next.setMonth(next.getMonth() + pattern.interval);
      break;
  }

  return next;
}

function calculateNextBookingDate(
  startDate: string,
  startTime: string,
  pattern: RecurrencePattern
): string | null {
  const dates = generateOccurrenceDates(startDate, pattern, 2);
  return dates.length > 1 ? dates[1] : null;
}

function validateRecurrencePattern(pattern: RecurrencePattern): void {
  if (pattern.interval < 1) {
    throw new Error('Interval must be at least 1');
  }

  if (pattern.frequency === 'monthly' && pattern.day_of_month) {
    if (pattern.day_of_month < 1 || pattern.day_of_month > 31) {
      throw new Error('Day of month must be between 1 and 31');
    }
  }

  if (pattern.end_type === 'date' && !pattern.end_date) {
    throw new Error('End date is required when end type is "date"');
  }

  if (pattern.end_type === 'occurrences' && !pattern.occurrences) {
    throw new Error('Number of occurrences is required when end type is "occurrences"');
  }

  if (pattern.end_type === 'occurrences' && pattern.occurrences! < 1) {
    throw new Error('Number of occurrences must be at least 1');
  }
}

async function checkBookingConflict(
  providerId: string,
  date: string,
  time: string,
  durationMinutes: number
): Promise<{ hasConflict: boolean; reason?: string }> {
  try {
    // Check provider availability
    const dayOfWeek = new Date(date).getDay();
    const { data: availability } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('provider_id', providerId)
      .eq('day_of_week', dayOfWeek)
      .single();

    if (!availability || !availability.is_available) {
      return {
        hasConflict: true,
        reason: 'Provider not available on this day',
      };
    }

    // Check if time is within available hours
    const [hours, minutes] = time.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    const [startHours, startMinutes] = availability.start_time.split(':').map(Number);
    const [endHours, endMinutes] = availability.end_time.split(':').map(Number);
    const availableStart = startHours * 60 + startMinutes;
    const availableEnd = endHours * 60 + endMinutes;

    if (timeInMinutes < availableStart || timeInMinutes + durationMinutes > availableEnd) {
      return {
        hasConflict: true,
        reason: 'Time outside available hours',
      };
    }

    // Check blocked dates
    const { data: blockedDates } = await supabase
      .from('blocked_dates')
      .select('*')
      .eq('provider_id', providerId)
      .lte('start_date', date)
      .gte('end_date', date);

    if (blockedDates && blockedDates.length > 0) {
      return {
        hasConflict: true,
        reason: 'Date is blocked',
      };
    }

    // Check existing bookings
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('provider_id', providerId)
      .eq('booking_date', date)
      .in('status', ['pending', 'confirmed', 'in_progress']);

    if (existingBookings && existingBookings.length > 0) {
      for (const booking of existingBookings) {
        const [existingHours, existingMinutes] = booking.booking_time.split(':').map(Number);
        const existingStart = existingHours * 60 + existingMinutes;
        const existingEnd = existingStart + booking.duration_minutes;

        if (
          (timeInMinutes >= existingStart && timeInMinutes < existingEnd) ||
          (timeInMinutes + durationMinutes > existingStart &&
            timeInMinutes + durationMinutes <= existingEnd) ||
          (timeInMinutes <= existingStart && timeInMinutes + durationMinutes >= existingEnd)
        ) {
          return {
            hasConflict: true,
            reason: 'Time slot already booked',
          };
        }
      }
    }

    return { hasConflict: false };
  } catch (error) {
    console.error('Error checking conflict:', error);
    return { hasConflict: false };
  }
}

async function createBookingFromRecurring(recurringId: string): Promise<void> {
  try {
    const { data: recurring, error } = await supabase
      .from('recurring_bookings')
      .select('*')
      .eq('id', recurringId)
      .single();

    if (error) {
      // Table doesn't exist - migration not applied yet
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('Recurring bookings table not found. Feature may not be enabled yet.');
        return;
      }
      throw error;
    }

    if (!recurring || !recurring.next_booking_date) return;

    // Check if booking already exists
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id')
      .eq('recurring_booking_id', recurringId)
      .eq('booking_date', recurring.next_booking_date)
      .single();

    if (existingBooking) return;

    // Create booking
    const { error: bookingError } = await supabase.from('bookings').insert({
      customer_id: recurring.customer_id,
      provider_id: recurring.provider_id,
      listing_id: recurring.listing_id,
      service_title: recurring.service_title,
      booking_date: recurring.next_booking_date,
      booking_time: recurring.start_time,
      duration_minutes: recurring.duration_minutes,
      total_price: recurring.service_price,
      status: 'pending',
      recurring_booking_id: recurringId,
    });

    if (bookingError) throw bookingError;

    // Update recurring booking
    const nextDate = calculateNextBookingDate(
      recurring.next_booking_date,
      recurring.start_time,
      recurring.recurrence_pattern
    );

    await supabase
      .from('recurring_bookings')
      .update({
        created_bookings: recurring.created_bookings + 1,
        next_booking_date: nextDate,
      })
      .eq('id', recurringId);
  } catch (error) {
    console.error('Error creating booking from recurring:', error);
  }
}

export async function cancelRecurringBooking(recurringId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('recurring_bookings')
      .update({ is_active: false })
      .eq('id', recurringId);

    if (error) {
      // Table doesn't exist - migration not applied yet
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('Recurring bookings table not found. Feature may not be enabled yet.');
        return false;
      }
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error canceling recurring booking:', error);
    return false;
  }
}

export async function getRecurringBookings(userId: string): Promise<RecurringBooking[]> {
  try {
    const { data, error } = await supabase
      .from('recurring_bookings')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      // Table doesn't exist - migration not applied yet
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        console.warn('Recurring bookings table not found. Feature may not be enabled yet.');
        return [];
      }
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error getting recurring bookings:', error);
    return [];
  }
}

export function getFrequencyLabel(frequency: RecurrenceFrequency): string {
  switch (frequency) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'biweekly':
      return 'Bi-weekly';
    case 'monthly':
      return 'Monthly';
  }
}

export function formatRecurrencePattern(pattern: RecurrencePattern): string {
  let description = '';

  // Frequency
  if (pattern.interval === 1) {
    description = getFrequencyLabel(pattern.frequency);
  } else {
    description = `Every ${pattern.interval} ${pattern.frequency === 'daily' ? 'days' : pattern.frequency === 'weekly' ? 'weeks' : pattern.frequency === 'biweekly' ? '2 weeks' : 'months'}`;
  }

  // Days of week for weekly/biweekly
  if ((pattern.frequency === 'weekly' || pattern.frequency === 'biweekly') && pattern.days_of_week) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = pattern.days_of_week.map(d => dayNames[d]).join(', ');
    description += ` on ${days}`;
  }

  // Day of month for monthly
  if (pattern.frequency === 'monthly' && pattern.day_of_month) {
    description += ` on day ${pattern.day_of_month}`;
  }

  // End condition
  if (pattern.end_type === 'date' && pattern.end_date) {
    description += ` until ${new Date(pattern.end_date).toLocaleDateString()}`;
  } else if (pattern.end_type === 'occurrences' && pattern.occurrences) {
    description += ` for ${pattern.occurrences} occurrence${pattern.occurrences > 1 ? 's' : ''}`;
  }

  return description;
}

export function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek];
}

export function getShortDayName(dayOfWeek: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayOfWeek];
}
