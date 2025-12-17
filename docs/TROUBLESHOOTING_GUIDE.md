# Troubleshooting Guide

Complete troubleshooting guide for common issues on the DollarSmiley marketplace.

---

## Table of Contents

1. [Account & Login Issues](#account--login-issues)
2. [Booking Problems](#booking-problems)
3. [Payment Issues](#payment-issues)
4. [Shipping & Tracking](#shipping--tracking)
5. [Notification Problems](#notification-problems)
6. [Performance Issues](#performance-issues)
7. [Mobile App Issues](#mobile-app-issues)
8. [Provider-Specific Issues](#provider-specific-issues)
9. [API & Integration Issues](#api--integration-issues)

---

## Account & Login Issues

### Cannot Log In

**Symptoms:**
- "Invalid credentials" error
- Login button doesn't respond
- App crashes on login

**Solutions:**

**1. Check Credentials:**
```
✓ Email address correct (check typos)
✓ Password correct (case-sensitive)
✓ Caps Lock not on
✓ Using correct account (work vs personal)
```

**2. Reset Password:**
```
Steps:
1. Tap "Forgot Password"
2. Enter your email
3. Check inbox (and spam)
4. Click reset link
5. Create new password
6. Try logging in
```

**3. Clear App Cache:**
```
iOS:
Settings → DollarSmiley → Clear Data → Confirm

Android:
Settings → Apps → DollarSmiley → Storage → Clear Cache
```

**4. Check Internet Connection:**
```
✓ WiFi/cellular connected
✓ Try opening browser
✓ Speed test if slow
✓ Try different network
```

**5. Update App:**
```
✓ Check App Store/Play Store
✓ Install latest version
✓ Restart app
```

### Email Not Received

**Verification/Password Reset Email:**

**Check Spam Folder:**
- Look in Spam/Junk
- Mark as "Not Spam"
- Add noreply@dollarsmiley.com to contacts

**Wrong Email Address:**
- Verify email in profile
- Update if incorrect
- Request new email

**Email Provider Blocking:**
- Gmail: Check "All Mail"
- Outlook: Check "Junk"
- Corporate: Contact IT (may block)

**Resend Email:**
```
Navigate to:
Settings → Account → Resend Verification

Wait 5 minutes between attempts
```

### Account Suspended

**If Your Account is Suspended:**

**1. Check Email:**
- Look for suspension notification
- Read reason carefully
- Note suspension duration

**2. Review Suspension:**
```
Suspension Info Shows:
- Reason for suspension
- Duration (7, 14, 30 days, or permanent)
- Appeal process
- Contact information
```

**3. Appeal Process:**
```
Navigate to: Settings → Account Status → Appeal

Provide:
- Explanation
- Evidence (if applicable)
- Corrective actions taken
- Commitment to follow rules

Response Time: 2-3 business days
```

**4. Wait Out Suspension:**
- Cannot be shortened without appeal approval
- Use time to review policies
- Prepare to follow guidelines

---

## Booking Problems

### Cannot Create Booking

**Symptoms:**
- "Create Booking" button grayed out
- Error when submitting
- App crashes on booking

**Common Causes & Solutions:**

**1. Service Unavailable:**
```
Check:
☐ Provider still active
☐ Service still listed
☐ Selected date available
☐ Your location in service area

Solution:
- Choose different date/time
- Contact provider directly
- Find alternative service
```

**2. Payment Method Issue:**
```
Check:
☐ Payment method added
☐ Card not expired
☐ Sufficient funds
☐ Billing address correct

Solution:
- Add/update payment method
- Try different card
- Contact bank if declined
```

**3. Account Not Verified:**
```
Some services require:
☐ Email verified
☐ Phone verified
☐ Payment method on file

Solution:
- Complete verification
- Add payment method
- Retry booking
```

**4. Schedule Conflict:**
```
Error: "Time slot no longer available"

Solution:
- Refresh page
- Choose different time
- Enable notifications for next availability
```

### Booking Not Confirmed

**Provider Hasn't Responded:**

**Timeline:**
- Providers have 24-48 hours to respond
- You'll receive notification when confirmed/rejected

**If 48+ Hours:**
```
Options:
1. Send reminder message to provider
2. Cancel and book someone else
3. Contact support for help

Navigate to:
Booking → Send Message to Provider
```

**Auto-Cancellation:**
- Booking auto-cancels after 72 hours if not confirmed
- Full refund issued automatically
- Can book again immediately

### Cannot Cancel Booking

**Within Cancellation Window:**
```
Navigate to:
Orders → Booking → Cancel Booking

If button disabled:
- Check cancellation policy
- Verify timing (24hr+ before)
- Ensure booking not started
```

**Outside Cancellation Window:**
```
Less than 24 hours:
- May not get full refund
- Contact provider directly
- Explain situation
- Request exception

Provider may:
- Accept cancellation
- Offer reschedule
- Charge cancellation fee
```

**Cannot Find Cancel Button:**
```
Possible reasons:
- Booking already started
- Booking completed
- Booking already cancelled
- System issue

Solution: Contact support
```

---

## Payment Issues

### Payment Declined

**Common Reasons:**

**1. Insufficient Funds:**
```
Solution:
- Check account balance
- Add funds to account
- Try different payment method
```

**2. Card Expired:**
```
Solution:
- Update card expiration
- Add new card if needed
- Remove old card
```

**3. Incorrect Information:**
```
Check:
☐ Card number correct
☐ CVV correct
☐ Billing ZIP matches card
☐ Name matches card

Solution: Update payment method
```

**4. Bank Security:**
```
Banks may decline for:
- Unusual purchase
- Out-of-state purchase
- Large amount
- New merchant

Solution:
- Contact bank
- Approve transaction
- Retry payment
```

**5. Daily Limit Reached:**
```
Some cards have:
- Daily spending limit
- Transaction count limit
- Online purchase limit

Solution:
- Wait until tomorrow
- Use different card
- Contact bank to increase limit
```

### Payment Not Processing

**Stuck on "Processing":**

**Wait First:**
- Some payments take 30-60 seconds
- Don't click "Pay" multiple times
- This may charge multiple times

**If Stuck > 2 Minutes:**
```
Steps:
1. Don't refresh page
2. Check email for confirmation
3. Check bank/card statement
4. Wait 10 minutes
5. Contact support if not resolved
```

**Multiple Charges:**
```
If charged multiple times:
1. Take screenshots
2. Note transaction IDs
3. Contact support immediately
4. Duplicate charges refunded within 3-5 days
```

### Refund Not Received

**Refund Timeline:**
```
Credit/Debit Card: 3-5 business days
Bank Account: 5-7 business days
Digital Wallet: 1-3 business days

Note: Weekends/holidays add time
```

**Check Refund Status:**
```
Navigate to:
Orders → Cancelled Booking → Refund Status

Shows:
- Refund amount
- Refund method
- Processing status
- Estimated date
```

**If Past Estimated Date:**
```
Steps:
1. Check correct payment method
2. Verify with bank/card
3. Check spam for refund email
4. Contact support with:
   - Booking ID
   - Expected refund amount
   - Payment method used
   - Screenshots
```

---

## Shipping & Tracking

### Tracking Not Updating

**Symptoms:**
- Tracking shows "Pre-Transit" for days
- No updates after initial scan
- Shows wrong location

**Common Causes:**

**1. Carrier Hasn't Scanned:**
```
Provider created label but:
- Haven't shipped yet
- Package hasn't been scanned
- In carrier's possession but not scanned

Solution:
- Wait 24 hours
- Contact provider
- Request proof of shipment
```

**2. Tracking Delay:**
```
Carriers update at different rates:
- USPS: Every scan
- FedEx: 2-4 hours
- UPS: 2-4 hours

Solution: Check again in 4-6 hours
```

**3. Weekend/Holiday:**
```
Limited tracking updates on:
- Sundays (USPS only)
- Federal holidays
- Severe weather days

Solution: Wait for next business day
```

**4. Lost Package:**
```
If no updates for 7+ days:
1. Contact provider
2. File lost package claim
3. Request refund/replacement
4. Insurance covers value
```

### Package Delayed

**Expected Delivery Passed:**

**Check Tracking:**
```
Look for:
- Delivery exceptions
- Weather delays
- Address issues
- "Attempted delivery"
```

**Common Delays:**
- Weather (snow, hurricanes)
- High volume (holidays)
- Address problems
- Customs (international)

**What To Do:**
```
Day 1-2 Late:
- Monitor tracking
- Be patient
- Carrier will deliver

Day 3-5 Late:
- Contact provider
- Request update
- Consider refund

Day 6+ Late:
- File lost package claim
- Request full refund
- Provider can file insurance
```

### Package Delivered But Not Received

**"Delivered" But You Don't Have It:**

**Immediate Steps:**
```
1. Check all entrances
2. Ask neighbors
3. Check mailbox/parcel locker
4. Look for delivery photo
5. Verify delivery address
```

**Package Location:**
```
Carriers may deliver to:
- Front door
- Back door
- Side entrance
- Mailbox
- Parcel locker
- Neighbor (with note)
- Office (apartments)
```

**Still Can't Find:**
```
Within 24 hours:
1. Contact carrier
2. Report missing package
3. Contact provider
4. File claim if needed

Provide:
- Tracking number
- Delivery photo
- Address confirmation
- Time checked
```

**Provider Responsibility:**
```
Provider must:
- Provide proof of delivery
- Help locate package
- Refund if can't find
- File insurance claim

Timeline: 48-72 hours
```

---

## Notification Problems

### Not Receiving Notifications

**Push Notifications:**

**Check Phone Settings:**
```
iOS:
Settings → Notifications → DollarSmiley
☑ Allow Notifications
☑ Sounds
☑ Badges
☑ Banners

Android:
Settings → Apps → DollarSmiley → Notifications
☑ Show notifications
☑ Sound
☑ Vibration
```

**Check App Settings:**
```
Navigate to:
Settings → Notifications

Enable:
☑ Booking updates
☑ Messages
☑ Payment notifications
☑ Shipping updates
☑ Promotions (optional)
```

**Email Notifications:**

**Check Email Settings:**
```
Navigate to:
Settings → Email Preferences

Verify:
☑ Email address correct
☑ Email verified
☑ Notifications enabled
```

**Check Spam:**
- Add to safe senders
- Mark as "Not Spam"
- Check filter rules

### Too Many Notifications

**Reduce Notification Frequency:**
```
Navigate to:
Settings → Notifications → Customize

Disable unwanted:
☐ Marketing emails
☐ Social notifications
☐ Recommendations
☐ Daily digests

Keep enabled:
☑ Booking updates (important!)
☑ Messages
☑ Payment confirmations
```

**Digest Mode:**
```
Instead of instant:
- Daily digest: Once per day
- Weekly digest: Once per week
- Only critical: Emergency only
```

---

## Performance Issues

### App Running Slow

**Symptoms:**
- Slow loading
- Laggy scrolling
- Delayed responses
- Freezing

**Solutions:**

**1. Close Background Apps:**
```
iOS: Swipe up, swipe away apps
Android: Recent apps button, swipe away
```

**2. Clear App Cache:**
```
Settings → App → Clear Cache
(Not Clear Data - that logs you out)
```

**3. Free Up Storage:**
```
Check device storage:
- Delete unused apps
- Clear photos/videos
- Offload to cloud

Need 1GB+ free for smooth operation
```

**4. Update App:**
```
Check for updates:
- App Store/Play Store
- Install latest version
- Restart app
```

**5. Restart Device:**
```
Power off completely
Wait 30 seconds
Power back on
Open app
```

**6. Reinstall App:**
```
Last resort:
1. Note your login details
2. Uninstall app
3. Restart device
4. Reinstall app
5. Log back in
```

### Images Not Loading

**Profile Pictures/Service Photos:**

**Check Internet:**
```
- Switch WiFi/cellular
- Test speed
- Restart router
```

**Clear Image Cache:**
```
Settings → App → Advanced → Clear Image Cache
```

**Reduce Quality (Temporary):**
```
Settings → Data Usage → Reduce Image Quality
(Uses less data, faster loading)
```

---

## Mobile App Issues

### App Crashing

**Immediate Fix:**
```
1. Force close app
2. Clear from recent apps
3. Restart device
4. Open app again
```

**If Continues:**
```
1. Update app (most important!)
2. Check device OS updates
3. Clear app cache
4. Free up storage
5. Reinstall app
```

**Report Crash:**
```
If persists after reinstall:
1. Note what you were doing
2. Take screenshot if possible
3. Settings → Help → Report Bug
4. Include device model & OS version
```

### Cannot Take Photos

**Camera Permission Issue:**

**iOS:**
```
Settings → DollarSmiley → Photos
Select: All Photos

Settings → Privacy → Camera
Toggle DollarSmiley ON
```

**Android:**
```
Settings → Apps → DollarSmiley → Permissions
☑ Camera
☑ Storage
```

**If Still Not Working:**
```
- Restart app
- Check camera works in other apps
- Update app
- Clear app cache
```

---

## Provider-Specific Issues

### Cannot Create Listing

**Requirements:**
```
Must have:
☑ Provider account type
☑ Email verified
☑ Phone verified (for some categories)
☑ Stripe Connect setup (for payments)
☑ Complete profile
```

**If Requirements Met:**
```
Check:
- Fill all required fields
- Add minimum 1 photo
- Set valid price
- Select category
- Add description (50+ chars)
```

### Payouts Not Processing

**Common Issues:**

**1. Bank Not Connected:**
```
Navigate to:
Settings → Payment Settings → Stripe Connect

Complete:
☐ Bank account added
☐ Account verified
☐ Tax information submitted
☐ Identity verified
```

**2. Below Minimum:**
```
Minimum payout: $25
Current balance must exceed minimum
```

**3. Pending Period:**
```
New providers:
- First payout: 7-10 days after first sale
- Subsequent: Weekly schedule

Funds held 48 hours after job completion
```

**4. Account Issues:**
```
Check:
- No active disputes
- Account in good standing
- No strikes/warnings
- All verifications complete
```

---

## API & Integration Issues

### API Returns 401 Unauthorized

**Causes:**
```
1. Token expired
2. Invalid token
3. Missing Authorization header
4. Wrong API key
```

**Solutions:**
```
// Refresh token
const { data } = await supabase.auth.refreshSession()
const newToken = data.session.access_token

// Verify header format
Authorization: Bearer {token}
NOT: Bearer: {token}
NOT: {token}
```

### API Rate Limit Exceeded

**Error:** `429 Too Many Requests`

**Check Rate Limits:**
```
Response headers:
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1699564800

Wait until reset time
Or upgrade plan for higher limits
```

**Implement Backoff:**
```typescript
async function apiCallWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        const waitTime = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
}
```

### Webhook Not Receiving Events

**Check Webhook Setup:**
```
1. URL correct and accessible
2. HTTPS enabled (required)
3. Endpoint returns 200 OK
4. Signature verification implemented
5. Events selected in dashboard
```

**Test Webhook:**
```
Developer Portal → Webhooks → Test
- Sends sample payload
- Shows response
- Identifies issues
```

**Common Issues:**
```
- Firewall blocking
- SSL certificate invalid
- Endpoint timeout
- Not returning 200 status
- Taking > 30 seconds to respond
```

---

## Still Need Help?

### Contact Support

**Email:**
- Support: support@dollarsmiley.com
- Technical: technical@dollarsmiley.com
- Billing: billing@dollarsmiley.com

**In-App:**
```
Navigate to: Settings → Help & Support → Contact Us

Include:
- Detailed description
- Screenshots
- Error messages
- Device/browser info
- Steps to reproduce
```

**Live Chat:**
- Available: 9am-9pm EST
- Response time: < 5 minutes
- Available in app and website

**Phone:**
- 1-800-SMILEY-2
- Hours: 9am-6pm EST Mon-Fri
- Emergency line: 24/7

### Before Contacting Support

**Gather Information:**
```
✓ Account email
✓ Booking/Order ID (if applicable)
✓ Screenshots of issue
✓ Error messages
✓ Device type and OS version
✓ App version
✓ Steps that led to issue
✓ What you've tried already
```

**Check Status Page:**
```
Visit: https://status.dollarsmiley.com
- Current incidents
- Scheduled maintenance
- System status
- Subscribe to updates
```

---

**Most issues can be resolved quickly by following these steps. Don't hesitate to reach out if you need additional help!**

**Last Updated:** 2024-11-09
**Version:** 1.0.0
