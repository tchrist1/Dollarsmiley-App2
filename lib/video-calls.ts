import { supabase } from './supabase';

interface VideoCall {
  id: string;
  room_id: string;
  call_type: 'consultation' | 'meeting' | 'interview' | 'support' | 'demo';
  host_id: string;
  participant_ids: string[];
  scheduled_start?: string;
  actual_start?: string;
  actual_end?: string;
  duration_seconds?: number;
  status: 'scheduled' | 'waiting' | 'active' | 'ended' | 'cancelled' | 'failed';
  booking_id?: string;
  consultation_id?: string;
  max_participants: number;
  recording_enabled: boolean;
  screen_sharing_enabled: boolean;
  metadata?: Record<string, any>;
}

interface CallParticipant {
  id: string;
  call_id: string;
  user_id: string;
  role: 'host' | 'participant' | 'observer';
  joined_at?: string;
  left_at?: string;
  connection_quality: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
  audio_enabled: boolean;
  video_enabled: boolean;
  is_screensharing: boolean;
}

interface CreateCallParams {
  hostId: string;
  callType: 'consultation' | 'meeting' | 'interview' | 'support' | 'demo';
  scheduledStart?: Date;
  bookingId?: string;
  consultationId?: string;
  maxParticipants?: number;
  recordingEnabled?: boolean;
}

export class VideoCallService {
  static async createCall(params: CreateCallParams): Promise<{ callId: string; roomId: string }> {
    const { data, error } = await supabase.rpc('create_video_call', {
      host_id_param: params.hostId,
      call_type_param: params.callType,
      scheduled_start_param: params.scheduledStart?.toISOString(),
      booking_id_param: params.bookingId,
      consultation_id_param: params.consultationId,
      max_participants_param: params.maxParticipants || 2,
      recording_enabled_param: params.recordingEnabled || false,
    });

    if (error) throw error;

    const result = data[0];
    return {
      callId: result.call_id,
      roomId: result.room_id,
    };
  }

  static async getCall(callId: string): Promise<VideoCall> {
    const { data, error } = await supabase
      .from('video_calls')
      .select('*')
      .eq('id', callId)
      .single();

    if (error) throw error;
    return data;
  }

  static async getCallByRoom(roomId: string): Promise<VideoCall> {
    const { data, error } = await supabase
      .from('video_calls')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (error) throw error;
    return data;
  }

  static async joinCall(callId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('join_video_call', {
      call_id_param: callId,
      user_id_param: userId,
    });

    if (error) throw error;
    return data;
  }

  static async leaveCall(callId: string, userId: string): Promise<void> {
    const { error } = await supabase.rpc('leave_video_call', {
      call_id_param: callId,
      user_id_param: userId,
    });

    if (error) throw error;
  }

  static async getCallParticipants(callId: string): Promise<CallParticipant[]> {
    const { data, error } = await supabase
      .from('call_participants')
      .select('*')
      .eq('call_id', callId)
      .order('joined_at');

    if (error) throw error;
    return data || [];
  }

  static async updateCallQuality(
    participantId: string,
    quality: 'excellent' | 'good' | 'fair' | 'poor',
    audioEnabled: boolean,
    videoEnabled: boolean
  ): Promise<void> {
    const { error } = await supabase.rpc('update_call_quality', {
      participant_id_param: participantId,
      quality_param: quality,
      audio_enabled_param: audioEnabled,
      video_enabled_param: videoEnabled,
    });

    if (error) throw error;
  }

  static async toggleAudio(participantId: string, enabled: boolean): Promise<void> {
    const { error } = await supabase
      .from('call_participants')
      .update({ audio_enabled: enabled })
      .eq('id', participantId);

    if (error) throw error;
  }

  static async toggleVideo(participantId: string, enabled: boolean): Promise<void> {
    const { error } = await supabase
      .from('call_participants')
      .update({ video_enabled: enabled })
      .eq('id', participantId);

    if (error) throw error;
  }

  static async toggleScreenSharing(participantId: string, enabled: boolean): Promise<void> {
    const { error } = await supabase
      .from('call_participants')
      .update({ is_screensharing: enabled })
      .eq('id', participantId);

    if (error) throw error;
  }

  static async getActiveCalls(userId: string) {
    const { data, error } = await supabase.rpc('get_active_calls', {
      user_id_param: userId,
    });

    if (error) throw error;
    return data || [];
  }

  static async getCallStatistics(userId: string, days: number = 30) {
    const { data, error } = await supabase.rpc('get_call_statistics', {
      user_id_param: userId,
      days_param: days,
    });

    if (error) throw error;
    return data?.[0] || null;
  }

  static async getUserCallHistory(userId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('video_calls')
      .select('*')
      .or(`host_id.eq.${userId},participant_ids.cs.{${userId}}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async cancelCall(callId: string): Promise<void> {
    const { error } = await supabase
      .from('video_calls')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', callId);

    if (error) throw error;
  }

  static async recordAnalytics(
    callId: string,
    participantId: string,
    metrics: {
      avgBitrate: number;
      avgPacketLoss: number;
      avgLatency: number;
      avgJitter: number;
      totalDataTransferred: number;
      connectionIssues?: number;
      audioIssues?: number;
      videoIssues?: number;
    }
  ): Promise<void> {
    const { error } = await supabase.from('call_analytics').insert({
      call_id: callId,
      participant_id: participantId,
      avg_bitrate: metrics.avgBitrate,
      avg_packet_loss: metrics.avgPacketLoss,
      avg_latency: metrics.avgLatency,
      avg_jitter: metrics.avgJitter,
      total_data_transferred: metrics.totalDataTransferred,
      connection_issues: metrics.connectionIssues || 0,
      audio_issues: metrics.audioIssues || 0,
      video_issues: metrics.videoIssues || 0,
    });

    if (error) throw error;
  }

  static async getCallAnalytics(callId: string) {
    const { data, error } = await supabase
      .from('call_analytics')
      .select('*')
      .eq('call_id', callId);

    if (error) throw error;
    return data || [];
  }

  static async createRecording(
    callId: string,
    storageUrl: string,
    durationSeconds: number,
    fileSizeBytes: number
  ): Promise<string> {
    const { data, error } = await supabase
      .from('call_recordings')
      .insert({
        call_id: callId,
        storage_url: storageUrl,
        duration_seconds: durationSeconds,
        file_size_bytes: fileSizeBytes,
        status: 'available',
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  static async getCallRecordings(callId: string) {
    const { data, error } = await supabase
      .from('call_recordings')
      .select('*')
      .eq('call_id', callId)
      .eq('status', 'available');

    if (error) throw error;
    return data || [];
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

  static getCallStatusColor(status: string): string {
    const colors: Record<string, string> = {
      scheduled: '#3B82F6',
      waiting: '#F59E0B',
      active: '#10B981',
      ended: '#6B7280',
      cancelled: '#DC2626',
      failed: '#DC2626',
    };
    return colors[status] || '#6B7280';
  }

  static getQualityColor(quality: string): string {
    const colors: Record<string, string> = {
      excellent: '#10B981',
      good: '#3B82F6',
      fair: '#F59E0B',
      poor: '#DC2626',
      unknown: '#6B7280',
    };
    return colors[quality] || '#6B7280';
  }

  static async scheduleCallReminder(
    callId: string,
    userId: string,
    scheduledTime: Date
  ): Promise<void> {
    const reminderTime = new Date(scheduledTime.getTime() - 15 * 60 * 1000);

    const { data: call } = await supabase
      .from('video_calls')
      .select('call_type')
      .eq('id', callId)
      .single();

    if (call) {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'video_call_reminder',
        title: 'Upcoming Video Call',
        message: `Your ${call.call_type} is starting in 15 minutes`,
        data: { call_id: callId },
        scheduled_for: reminderTime.toISOString(),
      });
    }
  }

  static getCallTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      consultation: 'Consultation',
      meeting: 'Meeting',
      interview: 'Interview',
      support: 'Support Call',
      demo: 'Demo',
    };
    return labels[type] || type;
  }

  static canRecord(call: VideoCall): boolean {
    return call.recording_enabled && call.status === 'active';
  }

  static canScreenShare(call: VideoCall): boolean {
    return call.screen_sharing_enabled && call.status === 'active';
  }

  static async inviteParticipant(
    callId: string,
    userId: string,
    invitedBy: string
  ): Promise<void> {
    const { data: call } = await supabase
      .from('video_calls')
      .select('room_id, call_type')
      .eq('id', callId)
      .single();

    if (call) {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'video_call_invitation',
        title: 'Video Call Invitation',
        message: `You've been invited to a ${call.call_type}`,
        data: {
          call_id: callId,
          room_id: call.room_id,
          invited_by: invitedBy,
        },
      });
    }
  }
}

export default VideoCallService;
