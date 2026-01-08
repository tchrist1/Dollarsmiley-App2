# Time Extension System - Integration Guide

## Quick Start Integration

This guide shows how to integrate the Time Extension system into existing job detail screens.

---

## For Providers (Job Detail Screen)

### Step 1: Add State and Handlers

```typescript
import { useState, useEffect } from 'react';
import { getPendingTimeExtensionRequest, canRequestTimeExtension } from '@/lib/time-extensions';
import RequestTimeExtensionModal from '@/components/RequestTimeExtensionModal';

// Inside your component
const [showExtensionModal, setShowExtensionModal] = useState(false);
const [hasPendingExtension, setHasPendingExtension] = useState(false);

useEffect(() => {
  // Check for pending extension requests
  const checkPendingExtension = async () => {
    if (job.id && profile?.id) {
      const { data } = await getPendingTimeExtensionRequest(job.id, profile.id);
      setHasPendingExtension(!!data);
    }
  };

  checkPendingExtension();
}, [job.id, profile?.id]);
```

### Step 2: Add Request Button

```typescript
// Check if provider can request extension
const { canRequest, reason } = canRequestTimeExtension(
  job.status,
  hasPendingExtension
);

// Add button to your UI
<Button
  title="Request Time Extension"
  onPress={() => setShowExtensionModal(true)}
  disabled={!canRequest}
  icon={<Clock size={20} color={canRequest ? colors.white : colors.textLight} />}
/>

{!canRequest && reason && (
  <Text style={styles.disabledReasonText}>{reason}</Text>
)}
```

### Step 3: Add Modal Component

```typescript
<RequestTimeExtensionModal
  visible={showExtensionModal}
  onClose={() => setShowExtensionModal(false)}
  jobId={job.id}
  jobTitle={job.title}
  currentEstimatedHours={job.estimated_duration_hours}
  providerId={profile.id}
  pricingType={job.pricing_type}
  onRequestSubmitted={() => {
    setShowExtensionModal(false);
    setHasPendingExtension(true);
    // Optionally refresh job details
  }}
/>
```

---

## For Customers (Job Detail Screen)

### Step 1: Fetch Extension Requests

```typescript
import { getTimeExtensionRequestsForJob } from '@/lib/time-extensions';
import TimeExtensionRequestCard from '@/components/TimeExtensionRequestCard';

const [extensionRequests, setExtensionRequests] = useState([]);

useEffect(() => {
  const fetchExtensionRequests = async () => {
    if (job.id) {
      const { data } = await getTimeExtensionRequestsForJob(job.id);
      setExtensionRequests(data || []);
    }
  };

  fetchExtensionRequests();
}, [job.id]);
```

### Step 2: Display Pending Requests

```typescript
// Show alert banner for pending requests
const pendingRequests = extensionRequests.filter(r => r.status === 'pending');

{pendingRequests.length > 0 && (
  <View style={styles.alertBanner}>
    <AlertCircle size={20} color={colors.warning} />
    <Text style={styles.alertText}>
      {pendingRequests.length} time extension request{pendingRequests.length > 1 ? 's' : ''} pending your review
    </Text>
  </View>
)}
```

### Step 3: Display Request Cards

```typescript
// Show all extension requests
{extensionRequests.map(request => (
  <TimeExtensionRequestCard
    key={request.id}
    request={request}
    jobTitle={job.title}
    providerName={providerProfile?.full_name}
    onResponseSubmitted={() => {
      // Refresh extension requests
      fetchExtensionRequests();
    }}
    isCustomer={true}
  />
))}
```

---

## Display Effective Duration

### Show Original + Extensions

```typescript
import { getTotalApprovedExtensions } from '@/lib/time-extensions';

const [totalExtensions, setTotalExtensions] = useState(0);

useEffect(() => {
  const fetchExtensions = async () => {
    if (job.id) {
      const { hours } = await getTotalApprovedExtensions(job.id);
      setTotalExtensions(hours);
    }
  };

  fetchExtensions();
}, [job.id]);

// Display in UI
<View style={styles.durationInfo}>
  <View style={styles.durationRow}>
    <Text style={styles.durationLabel}>Original Estimate:</Text>
    <Text style={styles.durationValue}>{job.estimated_duration_hours}h</Text>
  </View>

  {totalExtensions > 0 && (
    <>
      <View style={styles.durationRow}>
        <Text style={styles.durationLabel}>Approved Extensions:</Text>
        <Text style={[styles.durationValue, { color: colors.success }]}>
          +{totalExtensions}h
        </Text>
      </View>

      <View style={[styles.durationRow, styles.totalRow]}>
        <Text style={styles.durationLabelBold}>Effective Duration:</Text>
        <Text style={styles.durationValueBold}>
          {job.estimated_duration_hours + totalExtensions}h
        </Text>
      </View>
    </>
  )}
</View>
```

---

## Navigation Integration

### Add to Main Navigation

```typescript
// In your tab navigator or drawer
import { Clock } from 'lucide-react-native';

<Tab.Screen
  name="time-extensions"
  options={{
    title: 'Time Extensions',
    tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
    tabBarBadge: pendingExtensionsCount > 0 ? pendingExtensionsCount : undefined,
  }}
/>
```

### Link from Job Detail

```typescript
<TouchableOpacity
  style={styles.viewAllButton}
  onPress={() => router.push('/time-extensions')}
>
  <Text style={styles.viewAllText}>View All Extension Requests</Text>
  <ChevronRight size={16} color={colors.primary} />
</TouchableOpacity>
```

---

## Notification Handling

### Handle Time Extension Notifications

```typescript
// In your notification handler
useEffect(() => {
  const handleNotification = (notification: any) => {
    if (notification.type === 'time_extension_request') {
      // Customer: Show alert and navigate to job detail
      Alert.alert(
        'Time Extension Request',
        notification.message,
        [
          { text: 'View', onPress: () => router.push(`/jobs/${notification.related_id}`) },
          { text: 'Later', style: 'cancel' },
        ]
      );
    }

    if (notification.type === 'time_extension_response') {
      // Provider: Show alert with response
      Alert.alert(
        notification.title,
        notification.message,
        [{ text: 'OK' }]
      );
    }
  };

  // Subscribe to notifications
  const subscription = supabase
    .channel('notifications')
    .on('INSERT', handleNotification)
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

---

## Example: Complete Provider Job Detail Integration

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  getPendingTimeExtensionRequest,
  canRequestTimeExtension,
  getTotalApprovedExtensions,
} from '@/lib/time-extensions';
import RequestTimeExtensionModal from '@/components/RequestTimeExtensionModal';
import { Button } from '@/components/Button';
import { Clock, AlertCircle } from 'lucide-react-native';

export default function ProviderJobDetailScreen() {
  const { id } = useLocalSearchParams();
  const { profile } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [hasPendingExtension, setHasPendingExtension] = useState(false);
  const [totalExtensions, setTotalExtensions] = useState(0);

  useEffect(() => {
    fetchJobAndExtensions();
  }, [id]);

  const fetchJobAndExtensions = async () => {
    setLoading(true);

    // Fetch job details
    const { data: jobData } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    setJob(jobData);

    // Check for pending extension
    if (profile?.id) {
      const { data: pendingExt } = await getPendingTimeExtensionRequest(
        id,
        profile.id
      );
      setHasPendingExtension(!!pendingExt);
    }

    // Get total approved extensions
    const { hours } = await getTotalApprovedExtensions(id);
    setTotalExtensions(hours);

    setLoading(false);
  };

  const { canRequest, reason } = canRequestTimeExtension(
    job?.status,
    hasPendingExtension
  );

  const effectiveDuration = job?.estimated_duration_hours
    ? job.estimated_duration_hours + totalExtensions
    : null;

  if (loading) return <LoadingScreen />;

  return (
    <ScrollView>
      {/* Job header */}
      <View style={styles.header}>
        <Text style={styles.title}>{job.title}</Text>
        <Text style={styles.description}>{job.description}</Text>
      </View>

      {/* Duration Info */}
      <View style={styles.durationCard}>
        <View style={styles.durationRow}>
          <Text style={styles.label}>Original Estimate:</Text>
          <Text style={styles.value}>{job.estimated_duration_hours}h</Text>
        </View>

        {totalExtensions > 0 && (
          <>
            <View style={styles.durationRow}>
              <Text style={styles.label}>Approved Extensions:</Text>
              <Text style={styles.extensionValue}>+{totalExtensions}h</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.durationRow}>
              <Text style={styles.labelBold}>Effective Duration:</Text>
              <Text style={styles.valueBold}>{effectiveDuration}h</Text>
            </View>
          </>
        )}
      </View>

      {/* Pending Extension Alert */}
      {hasPendingExtension && (
        <View style={styles.alertBanner}>
          <AlertCircle size={20} color={colors.info} />
          <Text style={styles.alertText}>
            You have a pending time extension request for this job.
            Awaiting customer response.
          </Text>
        </View>
      )}

      {/* Request Extension Button */}
      <View style={styles.actionSection}>
        <Button
          title="Request Time Extension"
          onPress={() => setShowExtensionModal(true)}
          disabled={!canRequest}
          icon={<Clock size={20} color={canRequest ? colors.white : colors.textLight} />}
        />
        {!canRequest && reason && (
          <Text style={styles.disabledText}>{reason}</Text>
        )}
      </View>

      {/* Extension Request Modal */}
      <RequestTimeExtensionModal
        visible={showExtensionModal}
        onClose={() => setShowExtensionModal(false)}
        jobId={job.id}
        jobTitle={job.title}
        currentEstimatedHours={job.estimated_duration_hours}
        providerId={profile.id}
        pricingType={job.pricing_type}
        onRequestSubmitted={fetchJobAndExtensions}
      />
    </ScrollView>
  );
}
```

---

## Example: Complete Customer Job Detail Integration

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import {
  getTimeExtensionRequestsForJob,
  getTotalApprovedExtensions,
} from '@/lib/time-extensions';
import TimeExtensionRequestCard from '@/components/TimeExtensionRequestCard';
import { AlertCircle } from 'lucide-react-native';

export default function CustomerJobDetailScreen() {
  const { id } = useLocalSearchParams();
  const [job, setJob] = useState(null);
  const [extensionRequests, setExtensionRequests] = useState([]);
  const [totalExtensions, setTotalExtensions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobAndExtensions();
  }, [id]);

  const fetchJobAndExtensions = async () => {
    setLoading(true);

    // Fetch job
    const { data: jobData } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    setJob(jobData);

    // Fetch extension requests
    const { data: requests } = await getTimeExtensionRequestsForJob(id);
    setExtensionRequests(requests || []);

    // Get total extensions
    const { hours } = await getTotalApprovedExtensions(id);
    setTotalExtensions(hours);

    setLoading(false);
  };

  const pendingRequests = extensionRequests.filter(r => r.status === 'pending');

  if (loading) return <LoadingScreen />;

  return (
    <ScrollView>
      {/* Job header */}
      <View style={styles.header}>
        <Text style={styles.title}>{job.title}</Text>
      </View>

      {/* Pending Request Alert */}
      {pendingRequests.length > 0 && (
        <View style={styles.alertBanner}>
          <AlertCircle size={20} color={colors.warning} />
          <Text style={styles.alertText}>
            {pendingRequests.length} time extension request
            {pendingRequests.length > 1 ? 's' : ''} need{pendingRequests.length === 1 ? 's' : ''} your review
          </Text>
        </View>
      )}

      {/* Duration Summary */}
      {totalExtensions > 0 && (
        <View style={styles.durationSummary}>
          <Text style={styles.summaryLabel}>Duration Summary</Text>
          <View style={styles.durationBreakdown}>
            <View style={styles.row}>
              <Text>Original:</Text>
              <Text>{job.estimated_duration_hours}h</Text>
            </View>
            <View style={styles.row}>
              <Text>Extensions:</Text>
              <Text>+{totalExtensions}h</Text>
            </View>
            <View style={styles.separator} />
            <View style={styles.row}>
              <Text style={styles.bold}>Total:</Text>
              <Text style={styles.bold}>
                {job.estimated_duration_hours + totalExtensions}h
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Extension Requests */}
      {extensionRequests.length > 0 && (
        <View style={styles.extensionsSection}>
          <Text style={styles.sectionTitle}>Time Extension Requests</Text>
          {extensionRequests.map(request => (
            <TimeExtensionRequestCard
              key={request.id}
              request={request}
              jobTitle={job.title}
              onResponseSubmitted={fetchJobAndExtensions}
              isCustomer={true}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
```

---

## Testing Your Integration

### Checklist

- [ ] Provider can see "Request Time Extension" button on active jobs
- [ ] Button is disabled for completed/cancelled jobs
- [ ] Button is disabled when pending request exists
- [ ] Modal opens with pre-filled job information
- [ ] Provider can submit request successfully
- [ ] Customer receives notification
- [ ] Customer can see pending request in job detail
- [ ] Customer can approve/decline request
- [ ] Provider receives notification of response
- [ ] Duration display shows original + extensions
- [ ] Navigation to /time-extensions works
- [ ] Filters work on time extensions screen

---

## Troubleshooting

**Q: Extension button not showing**
A: Check that job status is "In Progress" or "Started" and profile.id is set

**Q: Modal not opening**
A: Verify showExtensionModal state is being set to true

**Q: Customer can't see requests**
A: Check RLS policies and that getTimeExtensionRequestsForJob is being called with correct job ID

**Q: Notifications not received**
A: Verify notification triggers are working and user has notification permissions

**Q: Duration not updating**
A: Make sure getTotalApprovedExtensions is called after approval and state is updated

---

## Next Steps

1. Add extension request button to your job detail screens
2. Test the complete flow from request to approval
3. Verify notifications are working
4. Add analytics tracking for extension patterns
5. Monitor dispute rates (should decrease with proper audit trail)
