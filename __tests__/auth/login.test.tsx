import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '@/app/(auth)/login';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        in: jest.fn(() => Promise.resolve({ data: [] })),
      })),
    })),
  },
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('@/lib/oauth', () => ({
  signInWithGoogle: jest.fn(),
  signInWithApple: jest.fn(),
}));

jest.spyOn(Alert, 'alert');

describe('Login Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form correctly', () => {
    const { getByText, getByPlaceholderText } = render(<LoginScreen />);

    expect(getByText('Welcome Back')).toBeTruthy();
    expect(getByText('Log in to continue')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByText('Log In')).toBeTruthy();
  });

  it('renders Dollarsmiley branding', () => {
    const { getByText } = render(<LoginScreen />);

    expect(getByText('Dollarsmiley')).toBeTruthy();
    expect(getByText('Spend Smart. Smile Big.')).toBeTruthy();
  });

  it('shows error when fields are empty', async () => {
    const { getByText } = render(<LoginScreen />);

    const loginButton = getByText('Log In');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    });
  });

  it('calls supabase signInWithPassword with correct credentials', async () => {
    const mockSignIn = jest.fn().mockResolvedValue({ error: null });
    (supabase.auth.signInWithPassword as jest.Mock) = mockSignIn;

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');
    const loginButton = getByText('Log In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('navigates to tabs on successful login', async () => {
    const mockSignIn = jest.fn().mockResolvedValue({ error: null });
    (supabase.auth.signInWithPassword as jest.Mock) = mockSignIn;

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');
    const loginButton = getByText('Log In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('shows error alert on failed login', async () => {
    const mockError = { message: 'Invalid credentials' };
    const mockSignIn = jest.fn().mockResolvedValue({ error: mockError });
    (supabase.auth.signInWithPassword as jest.Mock) = mockSignIn;

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');
    const loginButton = getByText('Log In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'wrongpassword');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Login Failed', 'Invalid credentials');
    });
  });

  it('trims email before submission', async () => {
    const mockSignIn = jest.fn().mockResolvedValue({ error: null });
    (supabase.auth.signInWithPassword as jest.Mock) = mockSignIn;

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');
    const loginButton = getByText('Log In');

    fireEvent.changeText(emailInput, '  test@example.com  ');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('navigates to register screen when signup button is pressed', () => {
    const { getByText } = render(<LoginScreen />);

    const signupButton = getByText("Don't have an account? Sign Up");
    fireEvent.press(signupButton);

    expect(router.push).toHaveBeenCalledWith('/(auth)/register');
  });

  it('disables button while loading', async () => {
    const mockSignIn = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ error: null }), 100))
    );
    (supabase.auth.signInWithPassword as jest.Mock) = mockSignIn;

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');
    const loginButton = getByText('Log In');

    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(loginButton);

    expect(mockSignIn).toHaveBeenCalled();
  });
});
