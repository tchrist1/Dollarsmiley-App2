# Currency Formatting Examples

## Usage

```typescript
import { formatCurrency } from '@/lib/currency-utils';

// Basic usage
const price1 = formatCurrency(50);           // "$50"
const price2 = formatCurrency(2500);         // "$2.5k"
const price3 = formatCurrency(15000);        // "$15k"

// With labels
import { formatCurrencyWithLabel } from '@/lib/currency-utils';

const hourlyRate = formatCurrencyWithLabel(75, '/hr');     // "$75/hr"
const dailyRate = formatCurrencyWithLabel(2500, '/day');   // "$2.5k/day"

// Get raw numeric value for calculations
import { getPriceValue } from '@/lib/currency-utils';

const value = getPriceValue("2500");  // 2500 (as number)
```

## Visual Examples

### Service Listings

**Before:**
```
House Cleaning Service
$2,500

Professional Photography
$12,500

Web Design Package
$37,500
```

**After:**
```
House Cleaning Service
$2.5k

Professional Photography
$13k

Web Design Package
$38k
```

### Price Range Filter

**Before:**
```
Min: $1,000    Max: $10,000
Range: $0 — $50,000
```

**After:**
```
Min: $1k    Max: $10k
Range: $0 — $50k
```

### Job Postings

**Before:**
```
Budget: $5,000 - $8,000
Fixed Price: $12,340
```

**After:**
```
Budget: $5k - $8k
Fixed Price: $12k
```

### Booking Summary

**Before:**
```
Service: Wedding Photography
Duration: 8 hours
Total: $2,500.00
```

**After:**
```
Service: Wedding Photography
Duration: 8 hours
Total: $2.5k
```

## Complete Range Examples

| Input Amount | Formatted Output | Rule Applied |
|--------------|------------------|--------------|
| 0 | $0 | Zero handling |
| 25 | $25 | Under $1k |
| 50 | $50 | Under $1k |
| 150 | $150 | Under $1k |
| 500 | $500 | Under $1k |
| 999 | $999 | Under $1k |
| 1000 | $1k | $1k-$9.9k (no trailing .0) |
| 1500 | $1.5k | $1k-$9.9k |
| 2250 | $2.3k | $1k-$9.9k (rounded) |
| 3750 | $3.8k | $1k-$9.9k (rounded) |
| 5000 | $5k | $1k-$9.9k (no trailing .0) |
| 7640 | $7.6k | $1k-$9.9k |
| 9200 | $9.2k | $1k-$9.9k |
| 9999 | $10k | $10k+ (rounded up) |
| 10000 | $10k | $10k+ |
| 12430 | $12k | $10k+ (rounded) |
| 15000 | $15k | $10k+ |
| 25500 | $26k | $10k+ (rounded) |
| 37500 | $38k | $10k+ (rounded) |
| 50000 | $50k | $10k+ |
| 99999 | $100k | $10k+ (rounded) |

## Negative Numbers

| Input Amount | Formatted Output |
|--------------|------------------|
| -50 | -$50 |
| -2500 | -$2.5k |
| -15000 | -$15k |

## Edge Cases

| Input | Output | Notes |
|-------|--------|-------|
| null | $0 | Null safety |
| undefined | $0 | Undefined safety |
| "2500" | $2.5k | String conversion |
| "invalid" | $0 | NaN handling |
| 0.5 | $1 | Rounds to nearest dollar |
| 999.9 | $1k | Rounds to nearest dollar |

## Component Usage Examples

### In a Listing Card Component

```typescript
import { formatCurrency } from '@/lib/currency-utils';

function ListingCard({ listing }) {
  return (
    <View>
      <Text style={styles.title}>{listing.title}</Text>
      <Text style={styles.price}>{formatCurrency(listing.base_price)}</Text>
    </View>
  );
}
```

### In a Price Filter

```typescript
import { formatCurrency } from '@/lib/currency-utils';

function PriceFilter({ minPrice, maxPrice }) {
  return (
    <View>
      <Text>Price Range:</Text>
      <Text>{formatCurrency(minPrice)} - {formatCurrency(maxPrice)}</Text>
    </View>
  );
}
```

### In a Booking Summary

```typescript
import { formatCurrency, formatCurrencyWithLabel } from '@/lib/currency-utils';

function BookingSummary({ booking }) {
  return (
    <View>
      <Text>Subtotal: {formatCurrency(booking.subtotal)}</Text>
      <Text>Service Fee: {formatCurrency(booking.fee)}</Text>
      <Text>Total: {formatCurrency(booking.total)}</Text>

      {booking.hourlyRate && (
        <Text>Rate: {formatCurrencyWithLabel(booking.hourlyRate, '/hr')}</Text>
      )}
    </View>
  );
}
```

## Comparison with Old Format

| Amount | Old Format | New Format | Improvement |
|--------|------------|------------|-------------|
| 2500 | $2,500 | $2.5k | Shorter, more scannable |
| 15000 | $15,000 | $15k | 43% fewer characters |
| 37500 | $37,500 | $38k | Easier to compare at a glance |
| 999 | $999 | $999 | Same (no change needed) |
| 50 | $50 | $50 | Same (no change needed) |

## Benefits

1. **Improved Readability**: Easier to scan prices at a glance
2. **Consistent UI**: All prices follow the same rules
3. **Space Efficient**: Shorter strings save screen real estate
4. **Professional**: Industry-standard k-notation
5. **User-Friendly**: Familiar format used by major platforms
