import { PushNotificationService } from '@/lib/push-notifications';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase');
jest.mock('expo-notifications');
jest.mock('expo-device');
jest.mock('expo-constants');

describe('PushNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('queueNotification', () => {
    it('should queue a notification successfully', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        data: 'queue-id-123',
        error: null,
      });
      (supabase.rpc as jest.Mock) = mockRpc;

      const userId = 'user-123';
      const title = 'Test Notification';
      const body = 'Test body';

      const result = await PushNotificationService.queueNotification(
        userId,
        title,
        body
      );

      expect(mockRpc).toHaveBeenCalledWith('queue_push_notification', {
        user_id_param: userId,
        title_param: title,
        body_param: body,
        data_param: {},
        scheduled_for_param: expect.any(String),
      });
      expect(result).toBe('queue-id-123');
    });

    it('should throw error when queueing fails', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        data: null,
        error: new Error('Queue failed'),
      });
      (supabase.rpc as jest.Mock) = mockRpc;

      await expect(
        PushNotificationService.queueNotification('user-123', 'Title', 'Body')
      ).rejects.toThrow('Queue failed');
    });
  });

  describe('scheduleBookingReminder', () => {
    it('should schedule booking reminder correctly', async () => {
      const mockRpc = jest.fn().mockResolvedValue({
        data: 'reminder-id',
        error: null,
      });
      (supabase.rpc as jest.Mock) = mockRpc;

      const userId = 'user-123';
      const bookingId = 'booking-456';
      const scheduledTime = new Date('2025-12-01T10:00:00Z');

      await PushNotificationService.scheduleBookingReminder(
        userId,
        bookingId,
        'Reminder',
        'Your appointment is soon',
        scheduledTime
      );

      expect(mockRpc).toHaveBeenCalledWith('queue_push_notification', {
        user_id_param: userId,
        title_param: 'Reminder',
        body_param: 'Your appointment is soon',
        data_param: {
          type: 'booking_reminder',
          bookingId: bookingId,
        },
        scheduled_for_param: scheduledTime.toISOString(),
      });
    });
  });

  describe('getNotificationStats', () => {
    it('should return correct statistics', async () => {
      const mockTokens = [
        { is_active: true },
        { is_active: true },
        { is_active: false },
      ];
      const mockQueued = [{ status: 'pending' }, { status: 'pending' }];
      const mockSent = [{ status: 'sent' }];

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'push_tokens') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: mockTokens, error: null }),
          };
        }
        if (table === 'notification_queue') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockImplementation(() => {
              const isSent = table === 'notification_queue' && mockSent;
              return Promise.resolve({
                data: isSent ? mockSent : mockQueued,
                error: null,
              });
            }),
          };
        }
      });

      const stats = await PushNotificationService.getNotificationStats('user-123');

      expect(stats.activeDevices).toBe(2);
      expect(stats.totalDevices).toBe(3);
    });
  });

  describe('getNotificationCategories', () => {
    it('should return all notification categories', () => {
      const categories = PushNotificationService.getNotificationCategories();

      expect(categories).toHaveProperty('BOOKING');
      expect(categories).toHaveProperty('MESSAGE');
      expect(categories).toHaveProperty('PAYMENT');
      expect(categories).toHaveProperty('REVIEW');
      expect(categories).toHaveProperty('DELIVERY');
      expect(categories).toHaveProperty('REMINDER');
      expect(categories).toHaveProperty('MARKETING');
      expect(categories).toHaveProperty('SYSTEM');
    });
  });
});
