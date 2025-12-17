import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '@/app/(auth)/login';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

jest.mock('@/lib/supabase');
jest.mock('expo-router');
jest.mock('@/lib/oauth');

describe('End-to-End App Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Authentication Flow', () => {
    it('completes full login flow from start to finish', async () => {
      const mockSignIn = jest.fn().mockResolvedValue({ error: null });
      (supabase.auth.signInWithPassword as jest.Mock) = mockSignIn;
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ data: [] }),
        }),
      });

      const { getByPlaceholderText, getByText } = render(<LoginScreen />);

      await waitFor(() => {
        expect(getByText('Welcome Back')).toBeTruthy();
      });

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Log In');

      fireEvent.changeText(emailInput, 'user@example.com');
      fireEvent.changeText(passwordInput, 'securePassword123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: 'securePassword123',
        });
        expect(router.replace).toHaveBeenCalledWith('/(tabs)');
      });
    });

    it('handles authentication errors gracefully', async () => {
      const mockError = { message: 'Invalid login credentials' };
      const mockSignIn = jest.fn().mockResolvedValue({ error: mockError });
      (supabase.auth.signInWithPassword as jest.Mock) = mockSignIn;
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ data: [] }),
        }),
      });

      jest.spyOn(Alert, 'alert');

      const { getByPlaceholderText, getByText } = render(<LoginScreen />);

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Log In');

      fireEvent.changeText(emailInput, 'wrong@example.com');
      fireEvent.changeText(passwordInput, 'wrongPassword');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Login Failed',
          'Invalid login credentials'
        );
      });
    });
  });

  describe('Input Validation', () => {
    it('validates required fields before submission', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ data: [] }),
        }),
      });

      jest.spyOn(Alert, 'alert');

      const { getByText } = render(<LoginScreen />);

      const loginButton = getByText('Log In');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Please fill in all fields'
        );
      });
    });

    it('trims whitespace from email input', async () => {
      const mockSignIn = jest.fn().mockResolvedValue({ error: null });
      (supabase.auth.signInWithPassword as jest.Mock) = mockSignIn;
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ data: [] }),
        }),
      });

      const { getByPlaceholderText, getByText } = render(<LoginScreen />);

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Log In');

      fireEvent.changeText(emailInput, '   user@example.com   ');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: 'password123',
        });
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to register screen', () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ data: [] }),
        }),
      });

      const { getByText } = render(<LoginScreen />);

      const signupButton = getByText("Don't have an account? Sign Up");
      fireEvent.press(signupButton);

      expect(router.push).toHaveBeenCalledWith('/(auth)/register');
    });
  });

  describe('Loading States', () => {
    it('shows loading state during authentication', async () => {
      const mockSignIn = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
      );
      (supabase.auth.signInWithPassword as jest.Mock) = mockSignIn;
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockResolvedValue({ data: [] }),
        }),
      });

      const { getByPlaceholderText, getByText, queryByText } = render(<LoginScreen />);

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Log In');

      fireEvent.changeText(emailInput, 'user@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(queryByText('Log In')).toBeNull();
      });

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
      });
    });
  });
});
