import { supabase } from './supabase';
import * as Crypto from 'expo-crypto';

interface ConsultationCreate {
  productionOrderId?: string;
  customerId: string;
  providerId: string;
  scheduledAt: string;
  durationMinutes?: number;
}

interface ConsultationUpdate {
  scheduledAt?: string;
  durationMinutes?: number;
  consultationNotes?: string;
  actionItems?: any[];
}

interface ParticipantJoin {
  consultationId: string;
  userId: string;
  role: 'host' | 'participant';
}

export class VideoConsultationsService {
  static async createConsultation(consultation: ConsultationCreate) {
    const isAvailable = await this.checkAvailability(
      consultation.providerId,
      consultation.scheduledAt,
      consultation.durationMinutes || 30
    );

    if (!isAvailable) {
      throw new Error('Provider is not available at the requested time');
    }

    const roomId = await this.generateRoomId();

    const { data, error } = await supabase
      .from('video_consultations')
      .insert({
        production_order_id: consultation.productionOrderId,
        customer_id: consultation.customerId,
        provider_id: consultation.providerId,
        scheduled_at: consultation.scheduledAt,
        duration_minutes: consultation.durationMinutes || 30,
        room_id: roomId,
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getConsultation(consultationId: string) {
    const { data, error } = await supabase
      .from('video_consultations')
      .select('*')
      .eq('id', consultationId)
      .single();

    if (error) throw error;
    return data;
  }

  static async getUserConsultations(userId: string) {
    const { data, error } = await supabase
      .from('video_consultations')
      .select('*')
      .or(`customer_id.eq.${userId},provider_id.eq.${userId}`)
      .order('scheduled_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async getUpcomingConsultations(userId: string) {
    const { data, error } = await supabase.rpc('get_upcoming_consultations', {
      user_id_param: userId,
    });

    if (error) throw error;
    return data || [];
  }

  static async getPastConsultations(userId: string, limit: number = 10) {
    const { data, error } = await supabase
      .from('video_consultations')
      .select('*')
      .or(`customer_id.eq.${userId},provider_id.eq.${userId}`)
      .in('status', ['completed', 'no_show'])
      .order('scheduled_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async updateConsultation(consultationId: string, updates: ConsultationUpdate) {
    const updateData: any = { updated_at: new Date().toISOString() };

    if (updates.scheduledAt) updateData.scheduled_at = updates.scheduledAt;
    if (updates.durationMinutes) updateData.duration_minutes = updates.durationMinutes;
    if (updates.consultationNotes) updateData.consultation_notes = updates.consultationNotes;
    if (updates.actionItems) updateData.action_items = updates.actionItems;

    const { data, error } = await supabase
      .from('video_consultations')
      .update(updateData)
      .eq('id', consultationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async rescheduleConsultation(
    consultationId: string,
    newScheduledAt: string,
    newDuration?: number
  ) {
    const consultation = await this.getConsultation(consultationId);

    const isAvailable = await this.checkAvailability(
      consultation.provider_id,
      newScheduledAt,
      newDuration || consultation.duration_minutes
    );

    if (!isAvailable) {
      throw new Error('Provider is not available at the new time');
    }

    return await this.updateConsultation(consultationId, {
      scheduledAt: newScheduledAt,
      durationMinutes: newDuration,
    });
  }

  static async cancelConsultation(consultationId: string) {
    const { data, error } = await supabase
      .from('video_consultations')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', consultationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async startConsultation(consultationId: string) {
    const { error } = await supabase.rpc('start_consultation', {
      consultation_id_param: consultationId,
    });

    if (error) throw error;

    return await this.getConsultation(consultationId);
  }

  static async endConsultation(
    consultationId: string,
    notes?: string,
    actionItems?: any[]
  ) {
    const { error } = await supabase.rpc('end_consultation', {
      consultation_id_param: consultationId,
      notes_param: notes || null,
      action_items_param: actionItems || [],
    });

    if (error) throw error;

    return await this.getConsultation(consultationId);
  }

  static async joinConsultation(participant: ParticipantJoin) {
    const { data, error } = await supabase
      .from('consultation_participants')
      .insert({
        consultation_id: participant.consultationId,
        user_id: participant.userId,
        role: participant.role,
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async leaveConsultation(consultationId: string, userId: string) {
    const { data, error } = await supabase
      .from('consultation_participants')
      .update({
        left_at: new Date().toISOString(),
      })
      .eq('consultation_id', consultationId)
      .eq('user_id', userId)
      .is('left_at', null)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getParticipants(consultationId: string) {
    const { data, error } = await supabase
      .from('consultation_participants')
      .select('*, profiles:user_id(*)')
      .eq('consultation_id', consultationId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async saveRecording(
    consultationId: string,
    recordingUrl: string,
    durationSeconds?: number,
    fileSizeBytes?: number
  ) {
    const { data, error } = await supabase
      .from('consultation_recordings')
      .insert({
        consultation_id: consultationId,
        recording_url: recordingUrl,
        duration_seconds: durationSeconds,
        file_size_bytes: fileSizeBytes,
        transcription_status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from('video_consultations')
      .update({
        recording_url: recordingUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', consultationId);

    return data;
  }

  static async getRecordings(consultationId: string) {
    const { data, error } = await supabase
      .from('consultation_recordings')
      .select('*')
      .eq('consultation_id', consultationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async updateRecordingTranscription(
    recordingId: string,
    transcriptionText: string,
    status: 'completed' | 'failed'
  ) {
    const { data, error } = await supabase
      .from('consultation_recordings')
      .update({
        transcription_text: transcriptionText,
        transcription_status: status,
      })
      .eq('id', recordingId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async checkAvailability(
    providerId: string,
    proposedStart: string,
    durationMinutes: number
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc('check_consultation_availability', {
      provider_id_param: providerId,
      proposed_start: proposedStart,
      duration_min: durationMinutes,
    });

    if (error) throw error;
    return data || false;
  }

  static async getProviderAvailableSlots(
    providerId: string,
    date: string,
    durationMinutes: number = 30
  ) {
    const startOfDay = new Date(date);
    startOfDay.setHours(9, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(17, 0, 0, 0);

    const slots: { start: Date; end: Date; available: boolean }[] = [];
    let currentTime = new Date(startOfDay);

    while (currentTime < endOfDay) {
      const slotEnd = new Date(currentTime.getTime() + durationMinutes * 60000);

      const available = await this.checkAvailability(
        providerId,
        currentTime.toISOString(),
        durationMinutes
      );

      slots.push({
        start: new Date(currentTime),
        end: slotEnd,
        available,
      });

      currentTime = slotEnd;
    }

    return slots;
  }

  static async markNoShow(consultationId: string) {
    const { data, error } = await supabase
      .from('video_consultations')
      .update({
        status: 'no_show',
        updated_at: new Date().toISOString(),
      })
      .eq('id', consultationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getConsultationStats(userId: string, role: 'customer' | 'provider') {
    const consultations = await this.getUserConsultations(userId);

    const stats = {
      total: consultations.length,
      scheduled: consultations.filter((c) => c.status === 'scheduled').length,
      completed: consultations.filter((c) => c.status === 'completed').length,
      cancelled: consultations.filter((c) => c.status === 'cancelled').length,
      no_show: consultations.filter((c) => c.status === 'no_show').length,
      total_duration_minutes: consultations
        .filter((c) => c.status === 'completed')
        .reduce((sum, c) => sum + c.duration_minutes, 0),
    };

    return stats;
  }

  private static async generateRoomId(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(16);
    return Array.from(randomBytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  static formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  static getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      scheduled: 'Scheduled',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
      no_show: 'No Show',
    };

    return labels[status] || status;
  }

  static getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      scheduled: '#3B82F6',
      in_progress: '#10B981',
      completed: '#059669',
      cancelled: '#DC2626',
      no_show: '#F59E0B',
    };

    return colors[status] || '#6B7280';
  }
}

export default VideoConsultationsService;
