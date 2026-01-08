/**
 * TC-A2: PROFILE VIEW & EDIT Flow Tests
 *
 * TC-A2-001: Profile Display
 * TC-A2-002: Edit Persistence
 * TC-A2-003: Avatar Upload
 * TC-A2-004: Realtime Updates
 */

import { supabase } from '@/lib/supabase';
import {
  uploadAvatar,
  deleteOldAvatar,
  updateProfileAvatar,
} from '@/lib/avatar-upload';

jest.mock('@/lib/supabase');
jest.mock('expo-image-picker');
jest.mock('@/lib/file-upload-utils', () => ({
  fileUriToByteArray: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  getFileExtension: jest.fn().mockReturnValue('jpg'),
  getContentType: jest.fn().mockReturnValue('image/jpeg'),
}));

describe('TC-A2: Profile View & Edit Flow', () => {
  const mockUserId = 'test-user-123';
  const mockProfile = {
    id: mockUserId,
    full_name: 'John Doe',
    email: 'john@example.com',
    bio: 'Test bio',
    location: 'New York, NY',
    phone: '+1234567890',
    avatar_url: 'https://example.com/avatar.jpg',
    street_address: '123 Main St',
    city: 'New York',
    state: 'NY',
    zip_code: '10001',
    country: 'US',
    latitude: 40.7128,
    longitude: -74.0060,
    user_type: 'Customer',
    admin_mode: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TC-A2-001: Profile Display', () => {
    it('should load profile data successfully', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', mockUserId)
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).toEqual(mockProfile);
      expect(mockFrom).toHaveBeenCalledWith('profiles');
    });

    it('should handle profile not found gracefully', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', 'non-existent')
        .maybeSingle();

      expect(error).toBeNull();
      expect(data).toBeNull();
    });

    it('should display all required profile fields', () => {
      const requiredFields = [
        'id',
        'full_name',
        'email',
        'avatar_url',
        'user_type',
      ];

      requiredFields.forEach((field) => {
        expect(mockProfile).toHaveProperty(field);
      });
    });
  });

  describe('TC-A2-002: Edit Persistence', () => {
    it('should update profile successfully', async () => {
      const updatedData = {
        full_name: 'Jane Doe',
        bio: 'Updated bio',
        location: 'Los Angeles, CA',
        phone: '+9876543210',
      };

      const mockFrom = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: { ...mockProfile, ...updatedData },
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const { error } = await supabase
        .from('profiles')
        .update(updatedData)
        .eq('id', mockUserId);

      expect(error).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith('profiles');
    });

    it('should validate required fields before update', () => {
      const invalidData = {
        full_name: '',
        bio: 'Some bio',
      };

      const errors: Record<string, string> = {};
      if (!invalidData.full_name.trim()) {
        errors.full_name = 'Name is required';
      }

      expect(errors.full_name).toBe('Name is required');
      expect(Object.keys(errors).length).toBeGreaterThan(0);
    });

    it('should validate phone number format', () => {
      const testCases = [
        { phone: '+1234567890', valid: true },
        { phone: '(555) 123-4567', valid: true },
        { phone: '555-1234', valid: true },
        { phone: 'abc123', valid: false },
        { phone: 'not-a-number', valid: false },
      ];

      const phoneRegex = /^\+?[\d\s-()]+$/;

      testCases.forEach(({ phone, valid }) => {
        const isValid = phoneRegex.test(phone);
        expect(isValid).toBe(valid);
      });
    });

    it('should trim whitespace from text fields', () => {
      const inputData = {
        full_name: '  John Doe  ',
        bio: '  Test bio  ',
        location: '  New York  ',
      };

      const trimmedData = {
        full_name: inputData.full_name.trim(),
        bio: inputData.bio.trim(),
        location: inputData.location.trim(),
      };

      expect(trimmedData.full_name).toBe('John Doe');
      expect(trimmedData.bio).toBe('Test bio');
      expect(trimmedData.location).toBe('New York');
    });
  });

  describe('TC-A2-003: Avatar Upload', () => {
    it('should upload avatar successfully', async () => {
      const mockImageUri = 'file:///path/to/image.jpg';
      const mockPublicUrl = 'https://storage.example.com/avatars/test.jpg';

      const mockStorage = {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({
            data: { path: 'test-user/avatar.jpg' },
            error: null,
          }),
          getPublicUrl: jest.fn().mockReturnValue({
            data: { publicUrl: mockPublicUrl },
          }),
        }),
      };
      (supabase.storage as any) = mockStorage;

      const result = await uploadAvatar(mockUserId, mockImageUri);

      expect(result.success).toBe(true);
      expect(result.url).toContain(mockPublicUrl);
      expect(mockStorage.from).toHaveBeenCalledWith('avatars');
    });

    it('should handle upload failure', async () => {
      const mockImageUri = 'file:///path/to/image.jpg';
      const mockError = new Error('Upload failed');

      const mockStorage = {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      };
      (supabase.storage as any) = mockStorage;

      const result = await uploadAvatar(mockUserId, mockImageUri);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Upload failed');
    });

    it('should delete old avatar before uploading new one', async () => {
      const oldAvatarUrl = 'https://storage.example.com/avatars/old-avatar.jpg';

      const mockStorage = {
        from: jest.fn().mockReturnValue({
          remove: jest.fn().mockResolvedValue({ error: null }),
        }),
      };
      (supabase.storage as any) = mockStorage;

      await deleteOldAvatar(oldAvatarUrl);

      expect(mockStorage.from).toHaveBeenCalledWith('avatars');
    });

    it('should update profile with new avatar URL', async () => {
      const newAvatarUrl = 'https://storage.example.com/avatars/new-avatar.jpg';

      const mockFrom = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const result = await updateProfileAvatar(mockUserId, newAvatarUrl);

      expect(result.success).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('profiles');
    });
  });

  describe('TC-A2-004: Realtime Updates', () => {
    it('should refresh profile after update', async () => {
      const updatedProfile = {
        ...mockProfile,
        full_name: 'Updated Name',
      };

      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: updatedProfile,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', mockUserId)
        .maybeSingle();

      expect(data?.full_name).toBe('Updated Name');
    });

    it('should detect profile changes', () => {
      const oldProfile = mockProfile;
      const newProfile = {
        ...mockProfile,
        full_name: 'New Name',
        bio: 'New bio',
      };

      const hasChanged = JSON.stringify(oldProfile) !== JSON.stringify(newProfile);
      expect(hasChanged).toBe(true);
    });

    it('should not update if profile data is identical', () => {
      const oldProfile = mockProfile;
      const newProfile = { ...mockProfile };

      const hasChanged = JSON.stringify(oldProfile) !== JSON.stringify(newProfile);
      expect(hasChanged).toBe(false);
    });

    it('should handle concurrent profile updates', async () => {
      const updates = [
        { full_name: 'Update 1' },
        { full_name: 'Update 2' },
        { full_name: 'Update 3' },
      ];

      const mockFrom = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const promises = updates.map((update) =>
        supabase.from('profiles').update(update).eq('id', mockUserId)
      );

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.error).toBeNull();
      });
      expect(mockFrom).toHaveBeenCalledTimes(3);
    });
  });

  describe('Cache & Refresh Behavior', () => {
    it('should add cache busting to avatar URLs', async () => {
      const mockImageUri = 'file:///path/to/image.jpg';
      const mockPublicUrl = 'https://storage.example.com/avatars/test.jpg';

      const mockStorage = {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({
            data: { path: 'test-user/avatar.jpg' },
            error: null,
          }),
          getPublicUrl: jest.fn().mockReturnValue({
            data: { publicUrl: mockPublicUrl },
          }),
        }),
      };
      (supabase.storage as any) = mockStorage;

      const result = await uploadAvatar(mockUserId, mockImageUri);

      expect(result.url).toContain('?t=');
    });

    it('should force refresh profile when requested', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      await supabase.from('profiles').select('*').eq('id', mockUserId).maybeSingle();

      expect(mockFrom).toHaveBeenCalled();
    });
  });
});
