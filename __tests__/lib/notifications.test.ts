import {
  sendNotification,
  markAsRead,
  getUserNotifications,
  getUnreadCount,
} from '@/lib/notifications';

jest.mock('@/lib/supabase');

describe('Notification Functions', () => {
  describe('sendNotification', () => {
    it('should send notification with valid data', async () => {
      const result = await sendNotification({
        user_id: 'test-user-id',
        title: 'Test Notification',
        body: 'Test notification body',
        type: 'booking_confirmed',
      });

      expect(result).toBeDefined();
    });

    it('should require user_id', async () => {
      await expect(
        sendNotification({
          user_id: '',
          title: 'Test',
          body: 'Test',
          type: 'booking_confirmed',
        })
      ).rejects.toThrow();
    });

    it('should require title', async () => {
      await expect(
        sendNotification({
          user_id: 'test-user-id',
          title: '',
          body: 'Test',
          type: 'booking_confirmed',
        })
      ).rejects.toThrow();
    });

    it('should validate notification type', async () => {
      await expect(
        sendNotification({
          user_id: 'test-user-id',
          title: 'Test',
          body: 'Test',
          type: 'invalid_type' as any,
        })
      ).rejects.toThrow();
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const result = await markAsRead('test-notification-id');
      expect(result).toBeDefined();
    });

    it('should handle invalid notification id', async () => {
      await expect(markAsRead('')).rejects.toThrow();
    });
  });

  describe('getUserNotifications', () => {
    it('should fetch user notifications', async () => {
      const result = await getUserNotifications('test-user-id');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should support pagination', async () => {
      const result = await getUserNotifications('test-user-id', 10, 0);
      expect(result).toBeDefined();
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      const result = await getUnreadCount('test-user-id');

      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});
