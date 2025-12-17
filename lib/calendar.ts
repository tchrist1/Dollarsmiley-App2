import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';

export interface CalendarEventDetails {
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  notes?: string;
  alarms?: number[];
}

export async function checkCalendarPermissions(): Promise<'granted' | 'denied' | 'undetermined'> {
  try {
    const { status } = await Calendar.getCalendarPermissionsAsync();

    if (status === 'granted') {
      return 'granted';
    } else if (status === 'denied') {
      return 'denied';
    } else {
      return 'undetermined';
    }
  } catch (error) {
    console.error('Error checking calendar permissions:', error);
    return 'undetermined';
  }
}

export async function requestCalendarPermissions(): Promise<boolean> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();

    if (status === 'granted') {
      return true;
    } else {
      Alert.alert(
        'Calendar Permission Required',
        'Please enable calendar access in your device settings to add bookings to your calendar.',
        [{ text: 'OK' }]
      );
      return false;
    }
  } catch (error) {
    console.error('Error requesting calendar permissions:', error);
    return false;
  }
}

export async function getDefaultCalendar(): Promise<string | null> {
  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

    if (Platform.OS === 'ios') {
      const defaultCalendar = calendars.find(cal => cal.allowsModifications);
      return defaultCalendar?.id || null;
    } else {
      const localCalendar = calendars.find(
        cal => cal.source.name === 'Local' && cal.allowsModifications
      );

      if (localCalendar) {
        return localCalendar.id;
      }

      const defaultCalendar = calendars.find(cal => cal.allowsModifications);
      return defaultCalendar?.id || null;
    }
  } catch (error) {
    console.error('Error getting default calendar:', error);
    return null;
  }
}

export async function addBookingToCalendar(
  eventDetails: CalendarEventDetails
): Promise<{ success: boolean; eventId?: string }> {
  try {
    const hasPermission = await requestCalendarPermissions();

    if (!hasPermission) {
      return { success: false };
    }

    const calendarId = await getDefaultCalendar();

    if (!calendarId) {
      Alert.alert(
        'Calendar Not Available',
        'No suitable calendar found on your device.',
        [{ text: 'OK' }]
      );
      return { success: false };
    }

    const alarmOffsets = eventDetails.alarms || [-60, -1440];
    const alarms = alarmOffsets.map(offset => ({
      relativeOffset: offset,
    }));

    const eventId = await Calendar.createEventAsync(calendarId, {
      title: eventDetails.title,
      startDate: eventDetails.startDate,
      endDate: eventDetails.endDate,
      location: eventDetails.location || '',
      notes: eventDetails.notes || '',
      alarms: alarms,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    return { success: true, eventId };
  } catch (error) {
    console.error('Error adding event to calendar:', error);
    Alert.alert(
      'Calendar Error',
      'Failed to add event to calendar. Please try again.',
      [{ text: 'OK' }]
    );
    return { success: false };
  }
}

export async function updateCalendarEvent(
  eventId: string,
  eventDetails: CalendarEventDetails
): Promise<boolean> {
  try {
    const hasPermission = await requestCalendarPermissions();

    if (!hasPermission) {
      return false;
    }

    const alarmOffsets = eventDetails.alarms || [-60, -1440];
    const alarms = alarmOffsets.map(offset => ({
      relativeOffset: offset,
    }));

    await Calendar.updateEventAsync(eventId, {
      title: eventDetails.title,
      startDate: eventDetails.startDate,
      endDate: eventDetails.endDate,
      location: eventDetails.location || '',
      notes: eventDetails.notes || '',
      alarms: alarms,
    });

    return true;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    Alert.alert(
      'Calendar Error',
      'Failed to update calendar event. Please try again.',
      [{ text: 'OK' }]
    );
    return false;
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  try {
    const hasPermission = await requestCalendarPermissions();

    if (!hasPermission) {
      return false;
    }

    await Calendar.deleteEventAsync(eventId);
    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    Alert.alert(
      'Calendar Error',
      'Failed to delete calendar event. Please try again.',
      [{ text: 'OK' }]
    );
    return false;
  }
}

export function formatBookingTitle(serviceName: string, providerName: string): string {
  return `${serviceName} - ${providerName}`;
}

export function formatBookingNotes(
  serviceName: string,
  providerName: string,
  price: number,
  location?: string
): string {
  const notes = [
    `Service: ${serviceName}`,
    `Provider: ${providerName}`,
    `Price: $${price}`,
  ];

  if (location) {
    notes.push(`Location: ${location}`);
  }

  return notes.join('\n');
}

export function getDefaultAlarms(): number[] {
  return [-60, -1440];
}

export async function syncBookingToCalendar(
  booking: {
    id: string;
    title: string;
    scheduled_date: string;
    scheduled_time: string;
    location: string;
    price: number;
    calendar_event_id?: string;
    status: string;
  },
  providerName: string
): Promise<{ success: boolean; eventId?: string; action: 'created' | 'updated' | 'deleted' | 'none' }> {
  try {
    if (booking.status === 'Cancelled' && booking.calendar_event_id) {
      const deleted = await deleteCalendarEvent(booking.calendar_event_id);
      return {
        success: deleted,
        action: deleted ? 'deleted' : 'none'
      };
    }

    if (booking.status === 'Accepted' || booking.status === 'InProgress') {
      const startDate = parseBookingDateTime(booking.scheduled_date, booking.scheduled_time);
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

      const eventDetails: CalendarEventDetails = {
        title: formatBookingTitle(booking.title, providerName),
        startDate,
        endDate,
        location: booking.location,
        notes: formatBookingNotes(booking.title, providerName, booking.price, booking.location),
        alarms: getDefaultAlarms(),
      };

      if (booking.calendar_event_id) {
        const updated = await updateCalendarEvent(booking.calendar_event_id, eventDetails);
        return {
          success: updated,
          eventId: booking.calendar_event_id,
          action: updated ? 'updated' : 'none'
        };
      } else {
        const result = await addBookingToCalendar(eventDetails);
        return {
          success: result.success,
          eventId: result.eventId,
          action: result.success ? 'created' : 'none'
        };
      }
    }

    return { success: true, action: 'none' };
  } catch (error) {
    console.error('Error syncing booking to calendar:', error);
    return { success: false, action: 'none' };
  }
}

function parseBookingDateTime(dateStr: string, timeStr: string): Date {
  const date = new Date(dateStr);
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);

  let hour24 = hours;
  if (period === 'PM' && hours !== 12) {
    hour24 = hours + 12;
  } else if (period === 'AM' && hours === 12) {
    hour24 = 0;
  }

  date.setHours(hour24, minutes, 0, 0);
  return date;
}
