import { supabase } from './supabase';

export interface TimeSlot {
  start_time: string;
  end_time: string;
}

export interface BookingConflict {
  hasConflict: boolean;
  conflicts: Array<{
    type: 'booking' | 'blocked' | 'no_availability' | 'outside_hours';
    message: string;
    booking_id?: string;
    booking_title?: string;
    blocked_reason?: string;
  }>;
}

export interface AvailabilityCheck {
  isAvailable: boolean;
  reason?: string;
  availableSlots?: TimeSlot[];
}

export async function checkBookingConflicts(
  providerId: string,
  bookingDate: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<BookingConflict> {
  const conflicts: BookingConflict['conflicts'] = [];

  try {
    const dateObj = new Date(bookingDate);
    const dayOfWeek = dateObj.getDay();

    const recurringAvailable = await checkRecurringAvailability(
      providerId,
      dayOfWeek,
      startTime,
      endTime
    );

    if (!recurringAvailable.isAvailable) {
      conflicts.push({
        type: 'no_availability',
        message: recurringAvailable.reason || 'Provider not available on this day',
      });
      return { hasConflict: true, conflicts };
    }

    const blockedCheck = await checkBlockedDates(providerId, bookingDate, startTime, endTime);

    if (blockedCheck.hasConflict) {
      conflicts.push(...blockedCheck.conflicts);
    }

    const existingBookings = await checkExistingBookings(
      providerId,
      bookingDate,
      startTime,
      endTime,
      excludeBookingId
    );

    if (existingBookings.hasConflict) {
      conflicts.push(...existingBookings.conflicts);
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  } catch (error) {
    console.error('Error checking booking conflicts:', error);
    return {
      hasConflict: true,
      conflicts: [
        {
          type: 'no_availability',
          message: 'Unable to verify availability. Please try again.',
        },
      ],
    };
  }
}

async function checkRecurringAvailability(
  providerId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string
): Promise<AvailabilityCheck> {
  const { data: slots, error } = await supabase
    .from('provider_availability')
    .select('start_time, end_time')
    .eq('provider_id', providerId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_recurring', true)
    .eq('availability_type', 'Available');

  if (error) {
    console.error('Error checking recurring availability:', error);
    return { isAvailable: false, reason: 'Error checking availability' };
  }

  if (!slots || slots.length === 0) {
    return {
      isAvailable: false,
      reason: 'Provider is not available on this day of the week',
    };
  }

  const requestedStart = timeToMinutes(startTime);
  const requestedEnd = timeToMinutes(endTime);

  const matchingSlot = slots.find((slot) => {
    const slotStart = timeToMinutes(slot.start_time);
    const slotEnd = timeToMinutes(slot.end_time);

    return requestedStart >= slotStart && requestedEnd <= slotEnd;
  });

  if (!matchingSlot) {
    return {
      isAvailable: false,
      reason: 'Requested time is outside provider working hours',
      availableSlots: slots,
    };
  }

  return { isAvailable: true };
}

async function checkBlockedDates(
  providerId: string,
  bookingDate: string,
  startTime: string,
  endTime: string
): Promise<BookingConflict> {
  const { data: blocks, error } = await supabase
    .from('availability_exceptions')
    .select('*')
    .eq('provider_id', providerId)
    .eq('exception_date', bookingDate)
    .eq('exception_type', 'Unavailable');

  if (error) {
    console.error('Error checking blocked dates:', error);
    return { hasConflict: false, conflicts: [] };
  }

  if (!blocks || blocks.length === 0) {
    return { hasConflict: false, conflicts: [] };
  }

  const conflicts: BookingConflict['conflicts'] = [];
  const requestedStart = timeToMinutes(startTime);
  const requestedEnd = timeToMinutes(endTime);

  for (const block of blocks) {
    if (!block.start_time || !block.end_time) {
      conflicts.push({
        type: 'blocked',
        message: `Provider is unavailable on this day${block.reason ? `: ${block.reason}` : ''}`,
        blocked_reason: block.reason,
      });
      continue;
    }

    const blockStart = timeToMinutes(block.start_time);
    const blockEnd = timeToMinutes(block.end_time);

    if (timesOverlap(requestedStart, requestedEnd, blockStart, blockEnd)) {
      conflicts.push({
        type: 'blocked',
        message: `Time slot is blocked${block.reason ? `: ${block.reason}` : ''}`,
        blocked_reason: block.reason,
      });
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

async function checkExistingBookings(
  providerId: string,
  bookingDate: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<BookingConflict> {
  let query = supabase
    .from('time_slot_bookings')
    .select(
      `
      *,
      booking:bookings(id, title, status)
    `
    )
    .eq('provider_id', providerId)
    .eq('booking_date', bookingDate)
    .in('status', ['Reserved', 'Confirmed']);

  if (excludeBookingId) {
    query = query.neq('booking_id', excludeBookingId);
  }

  const { data: bookings, error } = await query;

  if (error) {
    console.error('Error checking existing bookings:', error);
    return { hasConflict: false, conflicts: [] };
  }

  if (!bookings || bookings.length === 0) {
    return { hasConflict: false, conflicts: [] };
  }

  const conflicts: BookingConflict['conflicts'] = [];
  const requestedStart = timeToMinutes(startTime);
  const requestedEnd = timeToMinutes(endTime);

  for (const booking of bookings) {
    const bookingStart = timeToMinutes(booking.start_time);
    const bookingEnd = timeToMinutes(booking.end_time);

    if (timesOverlap(requestedStart, requestedEnd, bookingStart, bookingEnd)) {
      conflicts.push({
        type: 'booking',
        message: `Time slot overlaps with existing booking${
          booking.booking?.title ? `: ${booking.booking.title}` : ''
        }`,
        booking_id: booking.booking_id,
        booking_title: booking.booking?.title,
      });
    }
  }

  return {
    hasConflict: conflicts.length > 0,
    conflicts,
  };
}

export async function getAvailableTimeSlots(
  providerId: string,
  bookingDate: string,
  durationMinutes: number = 60
): Promise<TimeSlot[]> {
  try {
    const dateObj = new Date(bookingDate);
    const dayOfWeek = dateObj.getDay();

    const { data: recurringSlots, error: recurringError } = await supabase
      .from('provider_availability')
      .select('start_time, end_time')
      .eq('provider_id', providerId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_recurring', true)
      .eq('availability_type', 'Available');

    if (recurringError || !recurringSlots || recurringSlots.length === 0) {
      return [];
    }

    const { data: blocks } = await supabase
      .from('availability_exceptions')
      .select('start_time, end_time')
      .eq('provider_id', providerId)
      .eq('exception_date', bookingDate)
      .eq('exception_type', 'Unavailable');

    const { data: bookings } = await supabase
      .from('time_slot_bookings')
      .select('start_time, end_time')
      .eq('provider_id', providerId)
      .eq('booking_date', bookingDate)
      .in('status', ['Reserved', 'Confirmed']);

    const availableSlots: TimeSlot[] = [];

    for (const slot of recurringSlots) {
      const slotStart = timeToMinutes(slot.start_time);
      const slotEnd = timeToMinutes(slot.end_time);

      for (let time = slotStart; time + durationMinutes <= slotEnd; time += 30) {
        const proposedStart = time;
        const proposedEnd = time + durationMinutes;

        const isBlocked = blocks?.some((block) => {
          if (!block.start_time || !block.end_time) return true;
          const blockStart = timeToMinutes(block.start_time);
          const blockEnd = timeToMinutes(block.end_time);
          return timesOverlap(proposedStart, proposedEnd, blockStart, blockEnd);
        });

        if (isBlocked) continue;

        const isBooked = bookings?.some((booking) => {
          const bookingStart = timeToMinutes(booking.start_time);
          const bookingEnd = timeToMinutes(booking.end_time);
          return timesOverlap(proposedStart, proposedEnd, bookingStart, bookingEnd);
        });

        if (isBooked) continue;

        availableSlots.push({
          start_time: minutesToTime(proposedStart),
          end_time: minutesToTime(proposedEnd),
        });
      }
    }

    return availableSlots;
  } catch (error) {
    console.error('Error getting available time slots:', error);
    return [];
  }
}

export async function reserveTimeSlot(
  providerId: string,
  bookingId: string,
  bookingDate: string,
  startTime: string,
  endTime: string
): Promise<{ success: boolean; error?: string; timeSlotId?: string }> {
  try {
    const conflictCheck = await checkBookingConflicts(
      providerId,
      bookingDate,
      startTime,
      endTime,
      bookingId
    );

    if (conflictCheck.hasConflict) {
      return {
        success: false,
        error: conflictCheck.conflicts[0]?.message || 'Time slot not available',
      };
    }

    const { data, error } = await supabase
      .from('time_slot_bookings')
      .insert({
        provider_id: providerId,
        booking_id: bookingId,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        status: 'Reserved',
      })
      .select()
      .single();

    if (error) {
      console.error('Error reserving time slot:', error);
      return { success: false, error: 'Failed to reserve time slot' };
    }

    return { success: true, timeSlotId: data.id };
  } catch (error) {
    console.error('Error reserving time slot:', error);
    return { success: false, error: 'Unexpected error occurred' };
  }
}

export async function confirmTimeSlot(timeSlotId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('time_slot_bookings')
      .update({ status: 'Confirmed' })
      .eq('id', timeSlotId);

    if (error) {
      console.error('Error confirming time slot:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error confirming time slot:', error);
    return false;
  }
}

export async function cancelTimeSlot(timeSlotId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('time_slot_bookings')
      .update({ status: 'Cancelled' })
      .eq('id', timeSlotId);

    if (error) {
      console.error('Error cancelling time slot:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error cancelling time slot:', error);
    return false;
  }
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
}

function timesOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  return start1 < end2 && start2 < end1;
}

export function formatTimeSlot(startTime: string, endTime: string): string {
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}
