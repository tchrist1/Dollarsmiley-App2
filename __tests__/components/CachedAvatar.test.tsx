/**
 * TC-A2-004: CachedAvatar Cache Busting Fix Validation
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import CachedAvatar from '@/components/CachedAvatar';

describe('CachedAvatar Cache Busting', () => {
  it('should memoize cache-busted URI and not change on re-render', () => {
    const testUri = 'https://example.com/avatar.jpg';

    const { rerender, getByTestId } = render(
      <CachedAvatar uri={testUri} testID="avatar" />
    );

    const firstImage = getByTestId('avatar');
    const firstSource = firstImage.props.source.uri;

    expect(firstSource).toContain(testUri);
    expect(firstSource).toContain('?t=');

    rerender(<CachedAvatar uri={testUri} testID="avatar" />);

    const secondImage = getByTestId('avatar');
    const secondSource = secondImage.props.source.uri;

    expect(secondSource).toBe(firstSource);
  });

  it('should create new cache-busted URI when uri prop changes', () => {
    const firstUri = 'https://example.com/avatar1.jpg';
    const secondUri = 'https://example.com/avatar2.jpg';

    const { rerender, getByTestId } = render(
      <CachedAvatar uri={firstUri} testID="avatar" />
    );

    const firstImage = getByTestId('avatar');
    const firstSource = firstImage.props.source.uri;

    expect(firstSource).toContain(firstUri);

    jest.advanceTimersByTime(100);

    rerender(<CachedAvatar uri={secondUri} testID="avatar" />);

    const secondImage = getByTestId('avatar');
    const secondSource = secondImage.props.source.uri;

    expect(secondSource).toContain(secondUri);
    expect(secondSource).not.toBe(firstSource);
  });

  it('should handle null uri without error', () => {
    const { root } = render(
      <CachedAvatar uri={null} />
    );

    expect(root).toBeTruthy();
  });

  it('should handle undefined uri without error', () => {
    const { root } = render(
      <CachedAvatar uri={undefined} />
    );

    expect(root).toBeTruthy();
  });

  it('should preserve existing query parameters', () => {
    const uriWithParams = 'https://example.com/avatar.jpg?size=large';

    const { getByTestId } = render(
      <CachedAvatar uri={uriWithParams} testID="avatar" />
    );

    const image = getByTestId('avatar');
    const source = image.props.source.uri;

    expect(source).toBe(uriWithParams);
    expect(source).not.toContain('?t=');
  });
});
