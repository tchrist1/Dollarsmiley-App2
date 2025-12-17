# Admin Features & Workflows Guide

Complete guide for platform administrators managing the DollarSmiley marketplace.

---

## Table of Contents

1. [Admin Dashboard Overview](#admin-dashboard-overview)
2. [User Management](#user-management)
3. [Content Moderation](#content-moderation)
4. [Verification Management](#verification-management)
5. [Payment & Payout Administration](#payment--payout-administration)
6. [Dispute Resolution](#dispute-resolution)
7. [Refund Management](#refund-management)
8. [Subscription Management](#subscription-management)
9. [Analytics & Reporting](#analytics--reporting)
10. [System Configuration](#system-configuration)
11. [Email Template Management](#email-template-management)
12. [Announcement System](#announcement-system)
13. [Support Ticket Management](#support-ticket-management)

---

## Admin Dashboard Overview

### Accessing Admin Panel

**Navigate to:** `/admin/index`

**Access Requirements:**
- Admin role in database
- Proper permissions configured
- Active admin session

### Dashboard Metrics

**Key Performance Indicators (KPIs):**
```
Real-Time Overview:

Users:
- Total Users: 15,427
- Active (30d): 8,932
- New (7d): 284
- Providers: 3,847
- Customers: 11,580

Bookings:
- Total: 45,678
- Active: 234
- Completed (30d): 2,145
- Revenue (30d): $214,500

Listings:
- Active: 4,523
- Pending Review: 45
- Flagged: 12

Platform:
- Uptime: 99.97%
- Avg Response Time: 124ms
- Error Rate: 0.23%
```

### Quick Actions

**Common Tasks:**
- Review pending verifications
- Moderate flagged content
- Process payout requests
- Resolve disputes
- Review refund requests
- Send announcements
- View support tickets

---

## User Management

### User Overview

**Navigate to:** `/admin/user-actions`

**View All Users:**
```
Search: By name, email, ID
Filter: Role, Status, Verified
Sort: Join date, Activity, Revenue
```

### User Actions

**1. View User Profile:**
```
Navigate to: Users → Select User

Profile Information:
- Full name, email, phone
- Join date, last active
- Account status
- Verification status
- Total bookings/earnings
- Review rating
- Warning/strike history
```

**2. Suspend User:**
```
Navigate to: User Profile → Actions → Suspend

Suspension Options:
Duration:
- 7 days (Warning)
- 14 days (Violation)
- 30 days (Serious violation)
- Permanent (Ban)

Reason (Required):
- Violated terms of service
- Fraudulent activity
- Poor conduct
- Policy violation
- Other (specify)

Notify User: Yes/No

Effects:
- Cannot create bookings
- Cannot message users
- Cannot post content
- Existing bookings honored
- Profile marked suspended
```

**3. Ban User:**
```
Navigate to: User Profile → Actions → Ban

Ban Type:
- Account ban
- IP ban
- Device ban

Reason (Required)

Effects:
- Account deactivated
- All bookings cancelled
- Refunds processed
- Cannot create new account
- Profile hidden
```

**4. Strike System:**
```
Navigate to: User Profile → Actions → Issue Strike

Strike Levels:
1st Strike: Warning notification
2nd Strike: 7-day suspension
3rd Strike: 30-day suspension
4th Strike: Permanent ban

Strike Reasons:
- Policy violation
- Quality issues
- Communication issues
- Booking cancellations
- Other

Auto-Escalation: Enabled
Strike Expiry: 90 days
```

**5. User Verification:**
```
Navigate to: Admin → Verification

Verification Types:
- Phone: Auto or manual
- Email: Auto-verified
- ID: Manual review
- Background: Third-party
- Business: Document review

Manual Verification:
1. Review submitted documents
2. Verify authenticity
3. Approve or reject
4. Add notes
5. Notify user
```

---

## Content Moderation

### Moderation Queue

**Navigate to:** `/admin/moderation`

**Queue Overview:**
```
Pending Review: 45 items

Categories:
- Listings: 23
- Posts: 15
- Reviews: 7
- Profile content: 0

Priority:
- High: 5 (automated flagging)
- Medium: 28 (user reports)
- Low: 12 (routine review)

Avg Review Time: 3.2 minutes
```

### Reviewing Content

**1. Review Listing:**
```
Navigate to: Moderation → Pending Listings

Review Checklist:
☐ Title appropriate
☐ Description clear and accurate
☐ Photos appropriate
☐ Pricing reasonable
☐ Category correct
☐ No prohibited items/services
☐ Contact info not in description
☐ No spam or ads

Actions:
- Approve: Publish listing
- Reject: Send to provider with reason
- Flag: Mark for investigation
- Edit: Make corrections
```

**2. Handle Reports:**
```
Navigate to: Moderation → Reported Content

Report Details:
Reporter: User123
Content: Post #4567
Reason: Inappropriate content
Date: Nov 9, 2024
Additional notes: "Contains spam links"

Review Content:
[Content displayed here]

Your Actions:
☐ Remove content
☐ Warn creator
☐ Issue strike
☐ Suspend user
☐ Dismiss report
☐ Add to watchlist

Resolution Notes:
[Required for records]
```

**3. Automated Flags:**
```
Navigate to: Moderation → Auto-Flagged

AI Flagging Reasons:
- Profanity detected
- Prohibited keywords
- Suspicious links
- Price anomalies
- Image content concerns

Human Review Required:
- Review context
- Verify violation
- Take appropriate action
- Adjust filters if false positive
```

### Moderation Policies

**Content Guidelines:**

**✅ Allowed:**
- All legal services
- Handmade products
- Digital products
- Professional services
- Local services

**❌ Prohibited:**
- Illegal goods/services
- Weapons, drugs, alcohol
- Adult content
- Counterfeit items
- Multi-level marketing
- Financial services (unlicensed)
- Medical services (unlicensed)
- Hate speech
- Harassment

**Actions by Severity:**

**Minor Violation:**
- First offense: Warning
- Content removed
- Education provided

**Moderate Violation:**
- Strike issued
- Temporary suspension
- Content removed
- Profile noted

**Severe Violation:**
- Immediate suspension
- All content removed
- Law enforcement notified (if applicable)
- Permanent ban consideration

---

## Verification Management

### Navigate to: `/admin/verification`

### ID Verification Review

**Pending Verifications:**
```
Queue: 12 pending

User: John Doe
Submitted: 2 hours ago
Document: Driver's License (CA)
Selfie: Provided

Review Steps:
1. Check document authenticity
   ☐ Document not expired
   ☐ Clear, readable image
   ☐ No signs of tampering
   ☐ Security features visible

2. Verify selfie match
   ☐ Face matches ID photo
   ☐ Clear, recent photo
   ☐ No filters applied

3. Verify information
   ☐ Name matches account
   ☐ Age requirement met (18+)
   ☐ Address reasonable

Actions:
- Approve: Grant verified badge
- Reject: Request resubmission
- Flag: Escalate to security team

Rejection Reasons:
- Document expired
- Poor image quality
- Face doesn't match
- Information mismatch
- Under 18
- Suspected fraud
```

### Background Check Review

**Navigate to:** Verification → Background Checks

**Review Process:**
```
Provider: Jane Smith
Service Type: Childcare
Check Status: Completed by Checkr

Results:
- Criminal: Clear
- Sex Offender Registry: Clear
- Motor Vehicle: 1 violation (speeding)
- Employment: Verified
- Education: Verified

Decision:
☐ Approve for all services
☐ Approve with restrictions
☐ Deny

Notes:
[Document decision reasoning]
```

### Business Verification

**Document Review:**
```
Business: ABC Cleaning Co.
Documents Submitted:
- Business License
- EIN Letter
- Proof of Insurance
- Operating Agreement

Verification Steps:
1. Validate business license
   ☐ License number valid
   ☐ Not expired
   ☐ Business type matches
   ☐ Location matches

2. Verify EIN
   ☐ Format correct
   ☐ Business name matches
   ☐ Cross-check IRS database

3. Insurance verification
   ☐ Policy active
   ☐ Coverage adequate
   ☐ Business listed as insured

4. Additional checks
   ☐ Better Business Bureau
   ☐ State business registry
   ☐ Professional licenses

Actions:
- Approve: Grant business badge
- Request more info
- Reject: Provide reason
```

---

## Payment & Payout Administration

### Navigate to: `/admin/payouts`

### Payout Requests

**Pending Payouts:**
```
Queue: 15 requests

Request #P1234:
Provider: John's Services
Amount: $1,450
Method: Bank Transfer
Requested: Nov 8, 2024
Type: Early Payout

Review:
- Account standing: Good
- Completed bookings: 23
- Pending disputes: 0
- Fraud score: Low

Actions:
- Approve: Process immediately
- Deny: Provide reason
- Hold: Request more info
```

### Payout Review Criteria

**Auto-Approve If:**
- Amount < $500
- Account age > 90 days
- No recent disputes
- Fraud score < 20
- Bank verified

**Manual Review If:**
- Amount > $500
- New provider (< 90 days)
- Recent disputes
- Fraud score 20-50
- First payout

**Auto-Deny If:**
- Active disputes
- Suspended account
- Fraud score > 50
- Negative balance
- Incomplete verification

### Transaction Monitoring

**Navigate to:** Admin → Transactions

**Fraud Indicators:**
```
Monitor for:
- Unusual transaction patterns
- High-value unusual bookings
- Rapid succession bookings
- Price manipulation
- Account takeover signs
- Card testing

Automated Alerts:
- Transactions > $1000
- 5+ bookings same day
- Chargeback received
- Multiple payment failures
- Location anomalies
```

---

## Dispute Resolution

### Navigate to: `/admin/disputes`

### Dispute Queue

**Active Disputes:**
```
Dispute #D5678:
Filed by: Customer Jane
Against: Provider John
Booking: B1234
Amount: $150
Filed: Nov 5, 2024
Status: Under Review

Issue:
"Service not completed as agreed. Only half
of the cleaning was done before provider left."

Provider Response:
"Customer requested additional services not in
original booking. Completed agreed-upon scope."

Evidence:
- Customer: 3 photos
- Provider: Original booking details
- Messages: 12 exchanges
- Contract: Standard agreement
```

### Resolution Process

**Investigation Steps:**

**1. Review Documentation:**
```
☐ Original booking details
☐ Service description
☐ Price breakdown
☐ Special requests
☐ Terms agreed
☐ Photos (before/after)
☐ Message history
☐ Provider history
☐ Customer history
```

**2. Assess Validity:**
```
Questions to Answer:
- Was service completed as described?
- Were expectations clearly set?
- Did both parties communicate?
- Is evidence sufficient?
- Who is at fault?
- Was policy followed?
```

**3. Make Decision:**
```
Resolution Options:

Full Refund to Customer:
- Service not rendered
- Major quality issues
- Provider at fault

Partial Refund:
- Service partially completed
- Minor issues
- Shared responsibility

No Refund:
- Service completed as agreed
- Customer expectations unreasonable
- Customer at fault

Split Difference:
- Unclear situation
- Good faith effort by both
- Compromise appropriate
```

**4. Document Decision:**
```
Resolution: Partial refund - $75

Reasoning:
"Service was partially completed as evidenced
by photos. Provider completed cleaning of 2 rooms
as agreed, but did not complete 3rd room due to
time constraints. Provider should have communicated
delay. Customer should have been clearer about
full scope needed."

Actions Taken:
- $75 refund issued
- Warning to provider
- Customer satisfaction follow-up
- Updated provider guidelines

Precedent: Set for similar cases
```

---

## Refund Management

### Navigate to: `/admin/refunds`

### Refund Request Review

**Pending Refunds:**
```
Request #R9012:
Customer: Sarah Johnson
Booking: B5678
Amount: $200
Reason: Product damaged
Requested: Nov 8, 2024
Provider Response: Pending

Evidence:
- 4 photos of damage
- Shipping box condition
- Product condition

Assessment:
Damage Type: Shipping damage
Fault: Carrier
Insurance: $200 coverage
```

### Refund Types

**1. Instant Refund (Auto-Approved):**
```
Criteria:
- Service not started
- Cancellation within policy
- Amount < $100
- No dispute history
- Clear provider fault

Processing: Immediate
```

**2. Standard Refund (Review):**
```
Criteria:
- Service quality issues
- Product issues
- Amount $100-500
- Requires evidence
- Provider input needed

Processing: 24-48 hours
```

**3. Complex Refund (Investigation):**
```
Criteria:
- Amount > $500
- Conflicting accounts
- Insufficient evidence
- Legal implications
- Multiple parties

Processing: 3-5 business days
```

### Refund Policies

**Full Refund Warranted:**
- Service not provided
- Product not received
- Major defects
- Misrepresentation
- Provider cancel last minute

**Partial Refund Appropriate:**
- Minor quality issues
- Partial completion
- Salvageable product
- Shared responsibility

**No Refund Justified:**
- Completed as described
- Customer changed mind (outside window)
- Customer fault
- Unreasonable expectations
- Policy violations by customer

---

## Subscription Management

### Navigate to: `/admin/subscriptions`

### Subscription Overview

**Plan Statistics:**
```
Free Plan:
- Active: 12,847 users
- Conversion: 8.3%

Professional ($19.99/month):
- Active: 1,284 users
- Churn: 5.2%/month
- LTV: $187

Business ($49.99/month):
- Active: 247 users
- Churn: 2.1%/month
- LTV: $578

Revenue:
- MRR: $37,634
- ARR: $451,608
- Growth: +12% MoM
```

### Managing Subscriptions

**User Subscription Actions:**
```
User: John Doe
Plan: Professional
Status: Active
Billing: $19.99/month
Next Billing: Dec 1, 2024
Payment Method: •••• 4242

Actions:
- View billing history
- Change plan
- Cancel subscription
- Issue refund
- Extend trial
- Apply discount
```

### Plan Configuration

**Navigate to:** Admin → Subscriptions → Plans

**Edit Plan:**
```
Professional Plan:

Pricing:
Monthly: $19.99
Yearly: $199 (save $40)

Features:
☑ Unlimited listings
☑ Featured listings (2/month)
☑ Priority support
☑ Advanced analytics
☑ Lower platform fees (8%)

Limits:
- Team members: 3
- API calls: 10,000/month
- Storage: 10GB

Trial: 14 days free
```

**Promotional Codes:**
```
Navigate to: Subscriptions → Promo Codes

Create Code:
Code: WELCOME2024
Type: Percentage off
Value: 20%
Duration: 3 months
Valid: Nov 1 - Dec 31, 2024
Max Uses: 1000
Per User: 1

Restrictions:
- New users only
- Professional plan only
- First subscription
```

---

## Analytics & Reporting

### Navigate to: `/admin/marketplace-analytics`

### Platform Analytics

**Dashboard Metrics:**
```
Overview (Last 30 Days):

Users:
- New signups: 1,847
- Active users: 8,932
- Retention (30d): 68%
- Churn rate: 4.2%

Bookings:
- Total: 2,145
- Completed: 1,987 (92.6%)
- Cancelled: 158 (7.4%)
- Avg value: $127

Revenue:
- Gross revenue: $272,415
- Platform fees: $27,242
- Net revenue: $245,173
- Growth: +18% MoM

Engagement:
- Avg session: 8.3 min
- Pages per session: 12.4
- Bounce rate: 32%
```

### Category Performance

```
Top Categories (Revenue):

1. Home Services: $87,430 (+15%)
2. Professional: $62,180 (+22%)
3. Events: $41,230 (+8%)
4. Creative: $35,190 (+31%)
5. Automotive: $21,440 (+5%)

Bottom Categories:
- Need improvement
- Consider promotion
- Review fee structure
```

### Provider Analytics

```
Top Providers (30d):

1. John's Cleaning: $12,450 (89 bookings)
2. Smith Legal: $10,230 (23 bookings)
3. Creative Designs: $8,940 (41 bookings)

Metrics:
- Avg provider earnings: $1,847
- Top 10% earn: $5,000+
- Median: $780
```

### Export Reports

**Available Exports:**
- User activity report
- Revenue report
- Booking report
- Provider performance
- Category analysis
- Subscription report
- Refund report
- Custom reports

**Format:** CSV, PDF, Excel
**Schedule:** Daily, Weekly, Monthly

---

## System Configuration

### Navigate to: `/admin/index`

### Fee Configuration

**Platform Fees:**
```
Navigate to: Admin → Fee Configuration

Standard Fees:
- Free users: 10%
- Professional: 8%
- Business: 5%

Payment Processing:
- Credit card: 2.9% + $0.30
- ACH: 0.8% (max $5)
- Digital wallet: 2.5%

Refund Fees:
- Standard: $0 (absorbed)
- Instant: $0.50
- International: $5

Shipping:
- Markup: 5%
- Minimum: $0
```

### Email Configuration

**Email Settings:**
```
Navigate to: Admin → Email Templates

SMTP Settings:
- Provider: SendGrid
- API Key: Configured
- From Name: DollarSmiley
- From Email: noreply@dollarsmiley.com
- Reply-To: support@dollarsmiley.com

Test Email:
Send test to verify configuration
```

---

## Email Template Management

### Navigate to: `/admin/email-templates`

### Template Editor

**Available Templates:**
- Welcome email
- Booking confirmation
- Payment receipt
- Shipment tracking
- Review request
- Payout notification
- Subscription renewal
- And more...

**Edit Template:**
```
Template: Booking Confirmation

Subject: Your booking is confirmed!

Variables Available:
{{customer_name}}
{{provider_name}}
{{service_name}}
{{booking_date}}
{{booking_time}}
{{total_price}}
{{booking_id}}

Editor:
[Visual email editor with drag-drop]
- Add sections
- Style elements
- Preview desktop/mobile
- Test send
```

---

## Announcement System

### Navigate to: `/admin/index`

### Create Announcement

**Announcement Types:**
- Info: General updates
- Warning: Important notices
- Success: Positive news
- Error: Critical issues

**Create:**
```
Title: "New Shipping Features Available"

Message:
"We've added real carrier integration! Providers
can now generate actual shipping labels and
customers get real-time tracking."

Target:
☑ All users
☐ Providers only
☐ Customers only
☐ Specific users

Display:
☑ Banner (top of app)
☑ Modal (on login)
☑ Push notification
☑ Email notification

Duration:
Start: Nov 9, 2024
End: Nov 16, 2024

Priority: High
```

---

## Support Ticket Management

### Navigate to: `/support/index`

### Ticket Queue

**Open Tickets: 43**
```
Priority:
- Critical: 2
- High: 8
- Medium: 23
- Low: 10

Categories:
- Payment issues: 12
- Account problems: 8
- Booking issues: 15
- Technical: 5
- Other: 3

Avg Response: 2.3 hours
Avg Resolution: 18 hours
```

### Handling Tickets

**Ticket #T5678:**
```
From: john@example.com
Subject: Cannot complete booking
Priority: High
Created: 2 hours ago
Status: Open

Message:
"I'm trying to book a service but keep getting
an error when I click confirm. Screenshot attached."

Actions:
- Assign to: Tech support
- Add internal note
- Reply to customer
- Escalate
- Close ticket
- Merge with existing
```

---

## Best Practices

### Daily Admin Tasks

**Morning Routine:**
- [ ] Review pending verifications
- [ ] Check moderation queue
- [ ] Review dispute updates
- [ ] Check critical tickets
- [ ] Review system health

**Afternoon:**
- [ ] Process payout requests
- [ ] Review refund requests
- [ ] Respond to escalations
- [ ] Update documentation
- [ ] Team sync

**End of Day:**
- [ ] Review metrics
- [ ] Close resolved items
- [ ] Plan tomorrow
- [ ] Update status reports

### Security Best Practices

**Account Security:**
- Use 2FA always
- Rotate admin passwords monthly
- Log admin actions
- Review access logs
- Monitor failed logins

**Data Protection:**
- Never share login credentials
- Log out when away
- Don't access from public networks
- Report suspicious activity
- Follow data privacy policies

---

## Emergency Procedures

### System Outage

**Steps:**
1. Verify issue
2. Notify team
3. Update status page
4. Investigate cause
5. Implement fix
6. Monitor recovery
7. Post-mortem

### Security Incident

**Steps:**
1. Identify threat
2. Contain breach
3. Notify security team
4. Preserve evidence
5. Investigate fully
6. Notify affected users
7. Implement safeguards

### Data Breach

**Steps:**
1. Immediate containment
2. Assess scope
3. Notify legal team
4. Preserve forensics
5. Notify authorities (if required)
6. Notify users
7. Remediation plan

---

**Admin access is powerful - use responsibly and always follow proper procedures.**

**Last Updated:** 2024-11-09
**Version:** 1.0.0
