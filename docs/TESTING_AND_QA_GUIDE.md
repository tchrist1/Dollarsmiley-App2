# DollarSmiley Marketplace - Testing & QA Guide

## Overview

Comprehensive guide for testing and quality assurance of the DollarSmiley marketplace platform.

---

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Test Infrastructure](#test-infrastructure)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [E2E Testing](#e2e-testing)
6. [Manual Testing](#manual-testing)
7. [Performance Testing](#performance-testing)
8. [Security Testing](#security-testing)
9. [Test Coverage](#test-coverage)
10. [CI/CD Integration](#cicd-integration)
11. [Bug Reporting](#bug-reporting)
12. [QA Checklists](#qa-checklists)

---

## Testing Strategy

### Testing Pyramid

```
          /\
         /  \    E2E Tests (10%)
        /    \   - Critical user flows
       /------\  - Complete scenarios
      /        \ Integration Tests (20%)
     /          \ - API integration
    /            \ - Database operations
   /--------------\ Unit Tests (70%)
  /                \ - Functions
 /                  \ - Components
/____________________\ - Utilities
```

### Test Types

**Unit Tests (70%)**
- Individual functions
- React components
- Utility functions
- Business logic
- Fast execution
- High coverage

**Integration Tests (20%)**
- API endpoints
- Database operations
- Service interactions
- External integrations
- Module interactions

**E2E Tests (10%)**
- Critical user flows
- Complete scenarios
- Real user interactions
- Full stack testing

---

## Test Infrastructure

### Setup

**Install Dependencies:**
```bash
npm install --save-dev \
  @testing-library/react-native \
  @testing-library/jest-native \
  jest-expo \
  @types/jest
```

**Configuration Files:**
- `jest.config.js` - Jest configuration
- `jest.setup.js` - Test setup and mocks
- `__tests__/` - Test files directory

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run specific test file
npm test -- analytics.test.ts
```

### Test File Structure

```
__tests__/
├── lib/                    # Unit tests for lib functions
│   ├── analytics.test.ts
│   ├── stripe-payments.test.ts
│   ├── notifications.test.ts
│   └── supabase-client.test.ts
├── components/             # Component tests
│   ├── Button.test.tsx
│   ├── BookingCard.test.tsx
│   └── ErrorStates.test.tsx
├── integration/            # Integration tests
│   ├── booking-flow.test.ts
│   ├── payment-flow.test.ts
│   └── auth-flow.test.ts
└── e2e/                    # End-to-end tests
    ├── user-registration.test.ts
    ├── booking-flow.test.ts
    └── payment-flow.test.ts
```

---

## Unit Testing

### Testing Functions

**Example: Analytics Function**
```typescript
import { getUserGrowthData } from '@/lib/analytics';

describe('getUserGrowthData', () => {
  it('should return chart data for user growth', async () => {
    const result = await getUserGrowthData(7);

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle different time ranges', async () => {
    const result7 = await getUserGrowthData(7);
    const result30 = await getUserGrowthData(30);

    expect(result7.length).toBeLessThanOrEqual(result30.length);
  });

  it('should handle errors gracefully', async () => {
    // Mock error scenario
    jest.spyOn(supabase, 'from').mockRejectedValueOnce(new Error('DB Error'));

    await expect(getUserGrowthData(7)).rejects.toThrow('DB Error');
  });
});
```

### Testing React Components

**Example: Button Component**
```typescript
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/Button';

describe('Button Component', () => {
  it('should render with title', () => {
    const { getByText } = render(<Button title="Click Me" />);

    expect(getByText('Click Me')).toBeDefined();
  });

  it('should call onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button title="Click Me" onPress={onPress} />
    );

    fireEvent.press(getByText('Click Me'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button title="Click Me" onPress={onPress} disabled />
    );

    fireEvent.press(getByText('Click Me'));

    expect(onPress).not.toHaveBeenCalled();
  });

  it('should show loading state', () => {
    const { getByTestId } = render(
      <Button title="Click Me" loading testID="button" />
    );

    expect(getByTestId('button-loading')).toBeDefined();
  });
});
```

### Testing Async Operations

```typescript
describe('Async Operations', () => {
  it('should handle async data fetching', async () => {
    const data = await fetchUserData('user-id');

    expect(data).toBeDefined();
    expect(data.id).toBe('user-id');
  });

  it('should handle async errors', async () => {
    await expect(fetchUserData('invalid-id')).rejects.toThrow('User not found');
  });

  it('should timeout on slow operations', async () => {
    jest.setTimeout(5000);

    const result = await fetchWithTimeout('https://api.example.com', 3000);

    expect(result).toBeDefined();
  }, 5000);
});
```

### Mocking

**Mock Supabase:**
```typescript
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({
          data: [{ id: '1', name: 'Test' }],
          error: null,
        })),
      })),
    })),
  },
}));
```

**Mock External APIs:**
```typescript
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ success: true }),
  })
) as jest.Mock;
```

---

## Integration Testing

### API Integration Tests

```typescript
describe('Booking API Integration', () => {
  it('should create booking with payment', async () => {
    // Create booking
    const { data: booking } = await supabase
      .from('bookings')
      .insert({
        customer_id: 'test-customer',
        provider_id: 'test-provider',
        price: 100,
      })
      .select()
      .single();

    expect(booking).toBeDefined();

    // Create payment
    const payment = await createPaymentIntent({
      amount: booking.price,
      booking_id: booking.id,
    });

    expect(payment).toBeDefined();
    expect(payment.amount).toBe(booking.price);
  });
});
```

### Database Integration Tests

```typescript
describe('Database Operations', () => {
  it('should enforce RLS policies', async () => {
    // Try to access another user's data
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('customer_id', 'other-user-id');

    expect(error).toBeDefined();
    expect(data).toBeNull();
  });

  it('should maintain referential integrity', async () => {
    // Try to create booking with invalid listing
    const { error } = await supabase
      .from('bookings')
      .insert({
        listing_id: 'non-existent-id',
        customer_id: 'test-customer',
      });

    expect(error).toBeDefined();
    expect(error.message).toContain('foreign key');
  });
});
```

---

## E2E Testing

### User Registration Flow

```typescript
describe('User Registration E2E', () => {
  it('should complete full registration', async () => {
    // 1. Navigate to signup
    // 2. Fill registration form
    // 3. Submit form
    // 4. Verify email (skip in test)
    // 5. Complete profile
    // 6. Verify dashboard access

    const user = await registerNewUser({
      email: 'test@example.com',
      password: 'Test123!',
      full_name: 'Test User',
    });

    expect(user).toBeDefined();
    expect(user.email).toBe('test@example.com');
  });
});
```

### Booking Flow

```typescript
describe('Complete Booking Flow E2E', () => {
  it('should complete booking from search to payment', async () => {
    // 1. Search for service
    const results = await searchServices({ query: 'plumber' });

    // 2. Select service
    const service = results[0];

    // 3. Create booking
    const booking = await createBooking({
      service_id: service.id,
      date: '2025-12-01',
      time: '10:00 AM',
    });

    // 4. Process payment
    const payment = await processPayment({
      booking_id: booking.id,
      amount: booking.price,
    });

    // 5. Verify confirmation
    expect(payment.status).toBe('succeeded');
    expect(booking.status).toBe('confirmed');
  });
});
```

---

## Manual Testing

### Test Cases

**User Authentication**
- [ ] Register new user
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Password reset flow
- [ ] Logout functionality
- [ ] Session persistence

**Booking Management**
- [ ] Search for services
- [ ] Filter search results
- [ ] View service details
- [ ] Create booking
- [ ] Accept/reject booking (provider)
- [ ] Cancel booking
- [ ] Complete booking
- [ ] Rate and review

**Payment Processing**
- [ ] Add payment method
- [ ] Process payment
- [ ] Handle payment failure
- [ ] Process refund
- [ ] View payment history

**Profile Management**
- [ ] Update profile information
- [ ] Upload profile photo
- [ ] Verify identity
- [ ] View transaction history
- [ ] Manage settings

### Browser Testing

**Desktop Browsers:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Mobile Browsers:**
- [ ] iOS Safari
- [ ] Chrome Mobile
- [ ] Firefox Mobile

### Device Testing

**iOS Devices:**
- [ ] iPhone SE (small screen)
- [ ] iPhone 14 Pro (standard)
- [ ] iPhone 14 Pro Max (large)
- [ ] iPad (tablet)

**Android Devices:**
- [ ] Small phone (< 5.5")
- [ ] Standard phone (5.5" - 6.5")
- [ ] Large phone (> 6.5")
- [ ] Tablet

---

## Performance Testing

### Load Testing

**Tools:**
- K6 for API load testing
- Lighthouse for web performance
- React Native Performance Monitor

**Test Scenarios:**
```javascript
// k6 load test example
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
};

export default function () {
  const res = http.get('https://api.dollarsmiley.com/bookings');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

### Performance Metrics

**Target Metrics:**
- Page load time: < 2 seconds
- API response time: < 500ms (p95)
- Database query time: < 100ms (p95)
- Time to Interactive: < 3 seconds
- First Contentful Paint: < 1 second

### Monitoring

```typescript
// Performance tracking
const start = performance.now();

await fetchBookings();

const duration = performance.now() - start;

// Log to analytics
await supabase.from('performance_metrics').insert({
  metric_name: 'fetch_bookings_duration',
  value: duration,
  timestamp: new Date().toISOString(),
});
```

---

## Security Testing

### Security Checklist

**Authentication & Authorization:**
- [ ] Password strength requirements
- [ ] Session management
- [ ] Token expiration
- [ ] Role-based access control
- [ ] Two-factor authentication (if applicable)

**Data Security:**
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Sensitive data encryption
- [ ] Secure data transmission (HTTPS)

**API Security:**
- [ ] Rate limiting
- [ ] Input validation
- [ ] Error message sanitization
- [ ] CORS configuration
- [ ] API authentication

**Database Security:**
- [ ] RLS policies enforced
- [ ] Access control verified
- [ ] Backup and recovery tested
- [ ] Audit logging enabled

### Penetration Testing

**Test Scenarios:**
1. SQL Injection attempts
2. XSS injection attempts
3. Authentication bypass
4. Authorization bypass
5. API rate limit bypass
6. Sensitive data exposure

---

## Test Coverage

### Coverage Goals

```
Statements: 70%
Branches: 70%
Functions: 70%
Lines: 70%
```

### Running Coverage

```bash
npm run test:coverage
```

### Coverage Report

```bash
# Generate HTML coverage report
npm run test:coverage -- --coverageReporters=html

# Open report
open coverage/index.html
```

### Critical Paths Coverage

**Must have 90%+ coverage:**
- Authentication functions
- Payment processing
- Booking creation/cancellation
- Data validation
- Security functions

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run unit tests
        run: npm test

      - name: Run integration tests
        run: npm run test:integration

      - name: Generate coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### Pre-commit Hooks

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run lint && npm test",
      "pre-push": "npm run test:coverage"
    }
  }
}
```

---

## Bug Reporting

### Bug Report Template

```markdown
## Bug Description
Clear and concise description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
What you expected to happen

## Actual Behavior
What actually happened

## Screenshots
If applicable, add screenshots

## Environment
- OS: [e.g. iOS 16, Android 13]
- Browser: [e.g. Safari, Chrome]
- App Version: [e.g. 1.2.3]
- Device: [e.g. iPhone 14 Pro]

## Additional Context
Any other relevant information
```

### Severity Levels

**Critical (P0):**
- App crashes
- Data loss
- Security vulnerabilities
- Payment failures

**High (P1):**
- Major features broken
- Performance degradation
- Data inconsistencies

**Medium (P2):**
- Minor features broken
- UI inconsistencies
- Non-critical errors

**Low (P3):**
- Cosmetic issues
- Enhancement requests
- Documentation errors

---

## QA Checklists

### Pre-Release Checklist

**Functionality:**
- [ ] All critical features working
- [ ] No P0/P1 bugs
- [ ] User flows tested end-to-end
- [ ] Edge cases handled
- [ ] Error states tested

**Performance:**
- [ ] Load times acceptable
- [ ] No memory leaks
- [ ] Smooth animations
- [ ] Efficient data loading

**Security:**
- [ ] Authentication working
- [ ] Authorization enforced
- [ ] Data encrypted
- [ ] No exposed secrets

**Compatibility:**
- [ ] iOS tested
- [ ] Android tested
- [ ] Different screen sizes
- [ ] Different OS versions

**Documentation:**
- [ ] README updated
- [ ] Changelog updated
- [ ] API docs current
- [ ] User guide current

### Regression Testing Checklist

**Core Features:**
- [ ] User registration/login
- [ ] Service search
- [ ] Booking creation
- [ ] Payment processing
- [ ] Profile management

**Edge Cases:**
- [ ] Network failures
- [ ] Timeout scenarios
- [ ] Concurrent operations
- [ ] Data validation
- [ ] Error recovery

---

## Best Practices

### Writing Good Tests

**DO:**
- Write clear, descriptive test names
- Test one thing at a time
- Use meaningful assertions
- Clean up after tests
- Mock external dependencies
- Test edge cases

**DON'T:**
- Test implementation details
- Make tests dependent on each other
- Use hard-coded values
- Skip error scenarios
- Ignore test failures
- Over-mock

### Test Organization

```
describe('Feature', () => {
  describe('Scenario', () => {
    it('should behave correctly', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = processInput(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

---

## Resources

### Testing Libraries
- Jest - Testing framework
- React Native Testing Library
- Testing Library Jest Native
- K6 - Load testing

### Documentation
- [Jest Docs](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Expo Testing](https://docs.expo.dev/guides/testing/)

---

**Last Updated:** 2025-11-15
**Version:** 1.0
**Next Review:** 2025-12-15
