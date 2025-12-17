import { VideoCallService } from '@/lib/video-calls';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase');

describe('VideoCallService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCall', () => {
    it('should create a video call successfully', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        data: [{ call_id: 'call-123', room_id: 'room-456' }],
        error: null,
      });
      (supabase.rpc as jest.Mock) = mockRpc;

      const params = {
        hostId: 'user-123',
        callType: 'consultation' as const,
        maxParticipants: 5,
      };

      const result = await VideoCallService.createCall(params);

      expect(mockRpc).toHaveBeenCalledWith('create_video_call', {
        host_id_param: params.hostId,
        call_type_param: params.callType,
        scheduled_start_param: undefined,
        booking_id_param: undefined,
        consultation_id_param: undefined,
        max_participants_param: 5,
        recording_enabled_param: false,
      });
      expect(result.callId).toBe('call-123');
      expect(result.roomId).toBe('room-456');
    });

    it('should throw error when creation fails', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Creation failed'),
      });
      (supabase.rpc as jest.Mock) = mockRpc;

      await expect(
        VideoCallService.createCall({
          hostId: 'user-123',
          callType: 'meeting',
        })
      ).rejects.toThrow('Creation failed');
    });
  });

  describe('joinCall', () => {
    it('should join call successfully', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        data: true,
        error: null,
      });
      (supabase.rpc as jest.Mock) = mockRpc;

      const result = await VideoCallService.joinCall('call-123', 'user-456');

      expect(mockRpc).toHaveBeenCalledWith('join_video_call', {
        call_id_param: 'call-123',
        user_id_param: 'user-456',
      });
      expect(result).toBe(true);
    });

    it('should throw error when at capacity', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Call is at maximum capacity'),
      });
      (supabase.rpc as jest.Mock) = mockRpc;

      await expect(
        VideoCallService.joinCall('call-123', 'user-456')
      ).rejects.toThrow('Call is at maximum capacity');
    });
  });

  describe('formatDuration', () => {
    it('should format seconds correctly', () => {
      expect(VideoCallService.formatDuration(45)).toBe('45s');
    });

    it('should format minutes and seconds correctly', () => {
      expect(VideoCallService.formatDuration(125)).toBe('2m 5s');
    });

    it('should format hours, minutes, and seconds correctly', () => {
      expect(VideoCallService.formatDuration(3665)).toBe('1h 1m 5s');
    });
  });

  describe('getCallStatusColor', () => {
    it('should return correct colors for each status', () => {
      expect(VideoCallService.getCallStatusColor('scheduled')).toBe('#3B82F6');
      expect(VideoCallService.getCallStatusColor('waiting')).toBe('#F59E0B');
      expect(VideoCallService.getCallStatusColor('active')).toBe('#10B981');
      expect(VideoCallService.getCallStatusColor('ended')).toBe('#6B7280');
      expect(VideoCallService.getCallStatusColor('cancelled')).toBe('#DC2626');
      expect(VideoCallService.getCallStatusColor('failed')).toBe('#DC2626');
    });
  });

  describe('getQualityColor', () => {
    it('should return correct colors for each quality level', () => {
      expect(VideoCallService.getQualityColor('excellent')).toBe('#10B981');
      expect(VideoCallService.getQualityColor('good')).toBe('#3B82F6');
      expect(VideoCallService.getQualityColor('fair')).toBe('#F59E0B');
      expect(VideoCallService.getQualityColor('poor')).toBe('#DC2626');
      expect(VideoCallService.getQualityColor('unknown')).toBe('#6B7280');
    });
  });

  describe('canRecord', () => {
    it('should return true for active call with recording enabled', () => {
      const call = {
        recording_enabled: true,
        status: 'active',
      } as any;

      expect(VideoCallService.canRecord(call)).toBe(true);
    });

    it('should return false if recording not enabled', () => {
      const call = {
        recording_enabled: false,
        status: 'active',
      } as any;

      expect(VideoCallService.canRecord(call)).toBe(false);
    });

    it('should return false if call not active', () => {
      const call = {
        recording_enabled: true,
        status: 'waiting',
      } as any;

      expect(VideoCallService.canRecord(call)).toBe(false);
    });
  });
});
