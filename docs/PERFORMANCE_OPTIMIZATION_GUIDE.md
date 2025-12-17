# DollarSmiley Marketplace - Performance Optimization Guide

## Overview

This guide provides comprehensive performance optimization strategies for the DollarSmiley marketplace platform.

---

## 🎯 Performance Targets

### Response Time Goals
- **Page Load:** < 2 seconds (First Contentful Paint)
- **API Response:** < 500ms (p95)
- **Database Query:** < 100ms (p95)
- **Edge Function:** < 200ms (p95)

### Throughput Goals
- **Concurrent Users:** 1,000+
- **API Requests/sec:** 100+
- **Database Connections:** < 50 active
- **Edge Function Invocations:** 10,000+/hour

### Resource Goals
- **Database CPU:** < 60%
- **Database Memory:** < 70%
- **Cache Hit Rate:** > 80%
- **Lighthouse Score:** > 90

---

## 🗄️  Database Optimization

### 1. Indexes Applied

**Critical indexes have been added to:**
- `bookings` - customer_id, status, scheduled_date
- `messages` - conversation_id, sender_id
- `transactions` - wallet_id, booking_id
- `notifications` - user_id, is_read

**Benefits:**
- 10-100x faster queries
- Reduced database CPU usage
- Better scalability

### 2. Query Optimization Strategies

**Use EXPLAIN ANALYZE:**
```sql
EXPLAIN ANALYZE
SELECT * FROM bookings
WHERE customer_id = 'xxx'
  AND status = 'confirmed'
ORDER BY scheduled_date DESC
LIMIT 10;
```

**Optimize N+1 Queries:**
```typescript
// ❌ BAD - N+1 query problem
const bookings = await supabase.from('bookings').select('*');
for (const booking of bookings) {
  const { data: customer } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', booking.customer_id)
    .single();
}

// ✅ GOOD - Single query with join
const { data: bookings } = await supabase
  .from('bookings')
  .select(`
    *,
    customer:profiles!customer_id(*)
  `);
```

**Select Specific Columns:**
```typescript
// ❌ BAD - Fetches all columns
const { data } = await supabase.from('bookings').select('*');

// ✅ GOOD - Only needed columns
const { data } = await supabase
  .from('bookings')
  .select('id, customer_id, status, scheduled_date');
```

### 3. Pagination

**Always paginate large datasets:**
```typescript
const PAGE_SIZE = 20;

const { data, error } = await supabase
  .from('bookings')
  .select('*')
  .order('created_at', { ascending: false })
  .range(offset, offset + PAGE_SIZE - 1);
```

**Cursor-based pagination for better performance:**
```typescript
const { data } = await supabase
  .from('bookings')
  .select('*')
  .gt('created_at', lastCreatedAt)
  .order('created_at', { ascending: false })
  .limit(20);
```

### 4. Database Connection Pooling

Supabase automatically handles connection pooling. Best practices:
- Use the same Supabase client instance
- Avoid creating new clients repeatedly
- Use connection limits appropriately

---

## 💾 Caching Strategies

### 1. Client-Side Caching with React Query

**Install React Query:**
```bash
npm install @tanstack/react-query
```

**Setup:**
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
    </QueryClientProvider>
  );
}
```

**Usage:**
```typescript
import { useQuery } from '@tanstack/react-query';

function useBookings(customerId: string) {
  return useQuery({
    queryKey: ['bookings', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', customerId);

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
```

### 2. Edge Function Response Caching

**Add Cache-Control headers:**
```typescript
// For static/rarely changing data
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=3600, s-maxage=3600',
  },
});

// For user-specific data
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'private, max-age=300',
  },
});

// For no caching
return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  },
});
```

### 3. Static Data Caching

**Cache categories and reference data:**
```typescript
// Cache for 1 hour
const { data: categories } = useQuery({
  queryKey: ['categories'],
  queryFn: async () => {
    const { data } = await supabase.from('categories').select('*');
    return data;
  },
  staleTime: 60 * 60 * 1000, // 1 hour
  cacheTime: 2 * 60 * 60 * 1000, // 2 hours
});
```

### 4. Image Optimization

**Use Supabase Storage with CDN:**
```typescript
const imageUrl = supabase.storage
  .from('profile-images')
  .getPublicUrl(imagePath, {
    transform: {
      width: 300,
      height: 300,
      quality: 80,
      format: 'webp',
    },
  });
```

**Lazy Loading:**
```tsx
<Image
  source={{ uri: imageUrl }}
  style={styles.image}
  loadingIndicatorSource={require('./placeholder.png')}
  resizeMode="cover"
/>
```

---

## ⚡ Frontend Optimization

### 1. Code Splitting

**Route-based splitting:**
```typescript
import { lazy, Suspense } from 'react';

const ProfileScreen = lazy(() => import('./screens/ProfileScreen'));
const BookingsScreen = lazy(() => import('./screens/BookingsScreen'));

function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Stack>
        <Stack.Screen name="profile" component={ProfileScreen} />
        <Stack.Screen name="bookings" component={BookingsScreen} />
      </Stack>
    </Suspense>
  );
}
```

### 2. Component Optimization

**Use React.memo for expensive components:**
```typescript
import { memo } from 'react';

const BookingCard = memo(({ booking }) => {
  return (
    <View>
      <Text>{booking.title}</Text>
    </View>
  );
}, (prevProps, nextProps) => {
  return prevProps.booking.id === nextProps.booking.id;
});
```

**Use useCallback for functions:**
```typescript
const handlePress = useCallback(() => {
  // Handle press
}, [dependencies]);
```

**Use useMemo for expensive computations:**
```typescript
const sortedBookings = useMemo(() => {
  return bookings.sort((a, b) =>
    new Date(b.created_at) - new Date(a.created_at)
  );
}, [bookings]);
```

### 3. List Optimization

**Use FlatList instead of ScrollView:**
```tsx
<FlatList
  data={bookings}
  renderItem={({ item }) => <BookingCard booking={item} />}
  keyExtractor={(item) => item.id}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews={true}
/>
```

### 4. Bundle Size Optimization

**Analyze bundle size:**
```bash
npx expo export --platform web
# Check dist folder size
```

**Tree-shake unused code:**
```typescript
// ❌ BAD - Imports entire library
import * as icons from 'lucide-react-native';

// ✅ GOOD - Import only what you need
import { Camera, Upload } from 'lucide-react-native';
```

---

## 🔄 Realtime Optimization

### 1. Limit Subscriptions

**Unsubscribe when component unmounts:**
```typescript
useEffect(() => {
  const subscription = supabase
    .channel('bookings')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'bookings',
      filter: `customer_id=eq.${userId}`,
    }, handleChange)
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [userId]);
```

### 2. Debounce Updates

**For high-frequency updates:**
```typescript
import { useDebounce } from 'use-debounce';

const [searchTerm, setSearchTerm] = useState('');
const [debouncedTerm] = useDebounce(searchTerm, 500);

useEffect(() => {
  // Only query after 500ms of no typing
  searchBookings(debouncedTerm);
}, [debouncedTerm]);
```

---

## 🌐 API Optimization

### 1. Request Batching

**Batch multiple requests:**
```typescript
const [bookings, profile, notifications] = await Promise.all([
  supabase.from('bookings').select('*').eq('customer_id', userId),
  supabase.from('profiles').select('*').eq('id', userId).single(),
  supabase.from('notifications').select('*').eq('user_id', userId),
]);
```

### 2. Response Compression

**Enable gzip in Edge Functions:**
```typescript
import { compress } from 'https://deno.land/x/lz4/mod.ts';

const data = await fetchLargeData();
const compressed = compress(JSON.stringify(data));

return new Response(compressed, {
  headers: {
    'Content-Type': 'application/json',
    'Content-Encoding': 'gzip',
  },
});
```

### 3. Background Jobs

**Move heavy operations to background:**
```typescript
// Instead of processing immediately
async function handleBookingComplete(bookingId: string) {
  // Queue the heavy operation
  await supabase.from('job_queue').insert({
    job_type: 'send_completion_email',
    payload: { bookingId },
    status: 'pending',
  });

  // Return immediately
  return { success: true };
}
```

---

## 📊 Monitoring & Measurement

### 1. Performance Metrics

**Track key metrics:**
```typescript
async function logPerformanceMetric(
  metric: string,
  value: number,
  metadata?: any
) {
  await supabase.from('performance_metrics').insert({
    metric_name: metric,
    value,
    metadata,
    timestamp: new Date().toISOString(),
  });
}

// Usage
const start = Date.now();
await fetchBookings();
const duration = Date.now() - start;

await logPerformanceMetric('api_fetch_bookings', duration, {
  user_id: userId,
  count: bookings.length,
});
```

### 2. Monitoring Dashboard

**Query performance metrics:**
```sql
-- Average API response time
SELECT
  metric_name,
  AVG(value) as avg_ms,
  MAX(value) as max_ms,
  COUNT(*) as count
FROM performance_metrics
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY metric_name
ORDER BY avg_ms DESC;

-- Slow queries
SELECT *
FROM performance_metrics
WHERE metric_name = 'database_query'
  AND value > 1000  -- Slower than 1 second
ORDER BY timestamp DESC
LIMIT 100;
```

### 3. Database Statistics

**Check index usage:**
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

**Find missing indexes:**
```sql
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  seq_tup_read / NULLIF(seq_scan, 0) as avg_rows_per_scan
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND seq_scan > 1000
  AND seq_tup_read / NULLIF(seq_scan, 0) > 10000
ORDER BY seq_scan DESC;
```

---

## 🚀 Quick Wins

### Implement These First

1. **Add Database Indexes** ✅ (Already done)
2. **Implement React Query for caching**
3. **Add pagination to all lists**
4. **Optimize images (WebP, lazy loading)**
5. **Use FlatList for long lists**
6. **Batch API requests**
7. **Enable response caching**
8. **Add loading states**
9. **Implement code splitting**
10. **Monitor key metrics**

---

## 📈 Performance Benchmarking

### Before Optimization
- Page load: ~5-8 seconds
- API response: ~1-2 seconds
- Database queries: ~500-1000ms
- Cache hit rate: 0%

### After Optimization (Expected)
- Page load: ~1-2 seconds (60-75% improvement)
- API response: ~200-500ms (75-80% improvement)
- Database queries: ~50-100ms (90% improvement)
- Cache hit rate: 80%+

---

## ✅ Performance Checklist

### Database
- [x] Critical indexes added
- [ ] Query plans analyzed
- [ ] N+1 queries eliminated
- [ ] Pagination implemented
- [ ] Connection pooling configured

### Caching
- [ ] React Query implemented
- [ ] Static data cached
- [ ] Edge Function caching
- [ ] Image CDN configured
- [ ] Cache invalidation strategy

### Frontend
- [ ] Code splitting by route
- [ ] Component memoization
- [ ] FlatList for long lists
- [ ] Lazy loading images
- [ ] Bundle size optimized

### API
- [ ] Request batching
- [ ] Response compression
- [ ] Background jobs
- [ ] Rate limiting
- [ ] Error handling

### Monitoring
- [ ] Performance metrics tracked
- [ ] Dashboard configured
- [ ] Alerts set up
- [ ] Regular audits scheduled

---

## 🔍 Troubleshooting

### Slow Queries

```bash
# Check slow queries in Supabase
# Dashboard → Database → Query Performance
```

### High Database CPU

```sql
-- Find expensive queries
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Memory Leaks

```typescript
// Always clean up subscriptions
useEffect(() => {
  const subscription = supabase.channel('changes').subscribe();
  return () => subscription.unsubscribe(); // Cleanup
}, []);
```

---

## 📚 Additional Resources

- [Supabase Performance Guide](https://supabase.com/docs/guides/database/performance)
- [React Query Documentation](https://tanstack.com/query/latest)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [Expo Performance](https://docs.expo.dev/guides/performance/)

---

**Last Updated:** 2025-11-15
**Next Review:** 2025-12-15
