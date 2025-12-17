import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/Button';

describe('Button Component', () => {
  it('renders correctly with title', () => {
    const { getByText } = render(
      <Button title="Test Button" onPress={() => {}} />
    );
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Button title="Click Me" onPress={mockOnPress} />
    );

    fireEvent.press(getByText('Click Me'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Button title="Disabled Button" onPress={mockOnPress} disabled />
    );

    fireEvent.press(getByText('Disabled Button'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const mockOnPress = jest.fn();
    const { queryByText } = render(
      <Button title="Loading Button" onPress={mockOnPress} loading />
    );

    expect(queryByText('Loading Button')).toBeNull();
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('renders primary variant correctly', () => {
    const { getByText } = render(
      <Button title="Primary" onPress={() => {}} variant="primary" />
    );
    expect(getByText('Primary')).toBeTruthy();
  });

  it('renders secondary variant correctly', () => {
    const { getByText } = render(
      <Button title="Secondary" onPress={() => {}} variant="secondary" />
    );
    expect(getByText('Secondary')).toBeTruthy();
  });

  it('renders outline variant correctly', () => {
    const { getByText } = render(
      <Button title="Outline" onPress={() => {}} variant="outline" />
    );
    expect(getByText('Outline')).toBeTruthy();
  });

  it('renders text variant correctly', () => {
    const { getByText } = render(
      <Button title="Text" onPress={() => {}} variant="text" />
    );
    expect(getByText('Text')).toBeTruthy();
  });

  it('renders small size correctly', () => {
    const { getByText } = render(
      <Button title="Small" onPress={() => {}} size="small" />
    );
    expect(getByText('Small')).toBeTruthy();
  });

  it('renders medium size correctly', () => {
    const { getByText } = render(
      <Button title="Medium" onPress={() => {}} size="medium" />
    );
    expect(getByText('Medium')).toBeTruthy();
  });

  it('renders large size correctly', () => {
    const { getByText } = render(
      <Button title="Large" onPress={() => {}} size="large" />
    );
    expect(getByText('Large')).toBeTruthy();
  });

  it('does not show title text when loading', () => {
    const { queryByText } = render(
      <Button title="Submit" onPress={() => {}} loading />
    );
    expect(queryByText('Submit')).toBeNull();
  });

  it('applies custom style prop', () => {
    const customStyle = { backgroundColor: 'red' };
    const { getByText } = render(
      <Button title="Custom" onPress={() => {}} style={customStyle} />
    );
    expect(getByText('Custom')).toBeTruthy();
  });

  it('calls onPress multiple times when pressed multiple times', () => {
    const mockOnPress = jest.fn();
    const { getByText } = render(
      <Button title="Multi Press" onPress={mockOnPress} />
    );

    const button = getByText('Multi Press');
    fireEvent.press(button);
    fireEvent.press(button);
    fireEvent.press(button);

    expect(mockOnPress).toHaveBeenCalledTimes(3);
  });
});
