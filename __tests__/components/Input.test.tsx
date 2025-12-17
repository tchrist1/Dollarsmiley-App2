import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '@/components/Input';

describe('Input Component', () => {
  it('renders correctly with placeholder', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Enter text" />
    );
    expect(getByPlaceholderText('Enter text')).toBeTruthy();
  });

  it('renders label when provided', () => {
    const { getByText } = render(
      <Input label="Username" placeholder="Enter username" />
    );
    expect(getByText('Username')).toBeTruthy();
  });

  it('renders error message when error prop is provided', () => {
    const { getByText } = render(
      <Input placeholder="Email" error="Invalid email" />
    );
    expect(getByText('Invalid email')).toBeTruthy();
  });

  it('renders helper text when provided', () => {
    const { getByText } = render(
      <Input placeholder="Password" helperText="Must be 8+ characters" />
    );
    expect(getByText('Must be 8+ characters')).toBeTruthy();
  });

  it('calls onChangeText when text is entered', () => {
    const mockOnChange = jest.fn();
    const { getByPlaceholderText } = render(
      <Input placeholder="Type here" onChangeText={mockOnChange} />
    );

    fireEvent.changeText(getByPlaceholderText('Type here'), 'Hello');
    expect(mockOnChange).toHaveBeenCalledWith('Hello');
  });

  it('toggles password visibility when eye icon is pressed', () => {
    const { getByPlaceholderText, getByRole } = render(
      <Input placeholder="Password" secureTextEntry />
    );

    const input = getByPlaceholderText('Password');
    expect(input.props.secureTextEntry).toBe(true);
  });

  it('shows password initially as secure when secureTextEntry is true', () => {
    const { getByPlaceholderText } = render(
      <Input placeholder="Password" secureTextEntry value="secret123" />
    );

    const input = getByPlaceholderText('Password');
    expect(input.props.secureTextEntry).toBe(true);
  });

  it('does not show helper text when error is present', () => {
    const { queryByText, getByText } = render(
      <Input
        placeholder="Email"
        error="Invalid email"
        helperText="Format: user@example.com"
      />
    );

    expect(getByText('Invalid email')).toBeTruthy();
    expect(queryByText('Format: user@example.com')).toBeNull();
  });

  it('renders left icon when provided', () => {
    const LeftIcon = () => <></>;
    const { getByPlaceholderText } = render(
      <Input placeholder="Search" leftIcon={<LeftIcon />} />
    );

    expect(getByPlaceholderText('Search')).toBeTruthy();
  });

  it('renders right icon when provided and not password field', () => {
    const RightIcon = () => <></>;
    const { getByPlaceholderText } = render(
      <Input placeholder="Search" rightIcon={<RightIcon />} />
    );

    expect(getByPlaceholderText('Search')).toBeTruthy();
  });

  it('accepts all standard TextInput props', () => {
    const { getByPlaceholderText } = render(
      <Input
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
    );

    const input = getByPlaceholderText('Email');
    expect(input.props.keyboardType).toBe('email-address');
    expect(input.props.autoCapitalize).toBe('none');
    expect(input.props.autoCorrect).toBe(false);
  });
});
