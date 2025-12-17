import { supabase } from './supabase';
import { OrderCommunication, CommunicationType } from '../types/database';

export class OrderCommunicationService {
  static async startCommunication(
    bookingId: string,
    initiatedBy: string,
    type: CommunicationType,
    sessionId?: string
  ): Promise<OrderCommunication | null> {
    try {
      const { data: booking } = await supabase
        .from('bookings')
        .select('customer_id, provider_id')
        .eq('id', bookingId)
        .single();

      if (!booking) {
        throw new Error('Booking not found');
      }

      const isParticipant =
        booking.customer_id === initiatedBy ||
        booking.provider_id === initiatedBy;

      if (!isParticipant) {
        throw new Error('User is not a participant in this booking');
      }

      const { data, error } = await supabase
        .from('order_communications')
        .insert({
          booking_id: bookingId,
          initiated_by: initiatedBy,
          communication_type: type,
          session_id: sessionId,
          status: 'Active',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error starting communication:', error);
      return null;
    }
  }

  static async endCommunication(
    communicationId: string,
    durationSeconds?: number,
    recordingUrl?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('order_communications')
        .update({
          status: 'Ended',
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds || 0,
          recording_url: recordingUrl,
        })
        .eq('id', communicationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error ending communication:', error);
      return false;
    }
  }

  static async getActiveCommunication(
    bookingId: string
  ): Promise<OrderCommunication | null> {
    try {
      const { data, error } = await supabase
        .from('order_communications')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('status', 'Active')
        .order('started_at', { ascending: false })
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting active communication:', error);
      return null;
    }
  }

  static async getCommunicationHistory(
    bookingId: string
  ): Promise<OrderCommunication[]> {
    try {
      const { data, error } = await supabase
        .from('order_communications')
        .select('*')
        .eq('booking_id', bookingId)
        .order('started_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting communication history:', error);
      return [];
    }
  }

  static async initiateVoiceCall(
    bookingId: string,
    userId: string
  ): Promise<{ communicationId: string; sessionId: string } | null> {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/initiate-voice-call`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ bookingId, userId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to initiate voice call');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error initiating voice call:', error);
      return null;
    }
  }

  static async initiateVideoCall(
    bookingId: string,
    userId: string
  ): Promise<{ communicationId: string; sessionId: string; token: string } | null> {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/initiate-video-call`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ bookingId, userId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to initiate video call');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error initiating video call:', error);
      return null;
    }
  }

  static async joinCall(
    communicationId: string,
    userId: string
  ): Promise<{ token: string } | null> {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/join-call`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ communicationId, userId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to join call');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error joining call:', error);
      return null;
    }
  }

  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  static getCommunicationSummary(
    communications: OrderCommunication[]
  ): {
    totalCalls: number;
    totalDuration: number;
    textSessions: number;
    voiceCalls: number;
    videoCalls: number;
  } {
    return communications.reduce(
      (summary, comm) => {
        summary.totalCalls++;
        summary.totalDuration += comm.duration_seconds || 0;

        if (comm.communication_type === 'Text') {
          summary.textSessions++;
        } else if (comm.communication_type === 'Voice') {
          summary.voiceCalls++;
        } else if (comm.communication_type === 'Video') {
          summary.videoCalls++;
        }

        return summary;
      },
      {
        totalCalls: 0,
        totalDuration: 0,
        textSessions: 0,
        voiceCalls: 0,
        videoCalls: 0,
      }
    );
  }

  static async markCommunicationFailed(communicationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('order_communications')
        .update({
          status: 'Failed',
          ended_at: new Date().toISOString(),
        })
        .eq('id', communicationId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking communication as failed:', error);
      return false;
    }
  }

  static canInitiateCommunication(bookingStatus: string): boolean {
    return ['Accepted', 'InProgress', 'Completed'].includes(bookingStatus);
  }
}

export default OrderCommunicationService;
