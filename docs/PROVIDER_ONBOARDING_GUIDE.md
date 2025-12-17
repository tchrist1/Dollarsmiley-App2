# Provider Onboarding Guide

Welcome to DollarSmiley! This comprehensive guide will help you start offering services and shipping products on our marketplace.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your First Service](#creating-your-first-service)
3. [Creating Custom Services (Marketplace)](#creating-custom-services-marketplace)
4. [Setting Up Shipping](#setting-up-shipping)
5. [Managing Availability](#managing-availability)
6. [Pricing Strategies](#pricing-strategies)
7. [Value-Added Services](#value-added-services)
8. [Accepting Bookings](#accepting-bookings)
9. [Payment & Payouts](#payment--payouts)
10. [Building Your Reputation](#building-your-reputation)
11. [Advanced Features](#advanced-features)

---

## Getting Started

### Step 1: Complete Your Profile

1. **Navigate to Profile**
   - Tap your profile picture in the top right
   - Select "Edit Profile"

2. **Add Essential Information:**
   - Full name (displayed to customers)
   - Professional bio (highlight your expertise)
   - Location (helps customers find local services)
   - Profile photo (professional headshot recommended)
   - Cover photo (showcase your work)

3. **Set Your User Type:**
   - Select "Provider" as your account type
   - This unlocks provider features

**Pro Tip:** A complete profile gets 3x more bookings!

### Step 2: Complete Verification

**Why Verify?**
- Build customer trust
- Get the verified badge
- Access premium features
- Higher search ranking

**Verification Options:**

**1. Phone Verification (Required)**
- Navigate to Settings → Phone Verification
- Enter your phone number
- Enter the 6-digit code sent via SMS
- ✅ Instant verification

**2. Identity Verification (Recommended)**
- Uses Stripe Identity
- Take a photo of government-issued ID
- Take a selfie for facial verification
- Results in 1-5 minutes

**3. Background Check (Optional)**
- For services involving vulnerable populations
- Navigate to Settings → Background Check
- Complete Checkr application
- Results in 3-7 business days

**4. Business Verification (For Businesses)**
- Upload business license
- Provide EIN/Tax ID
- Add business address
- Results in 1-2 business days

---

## Creating Your First Service

### Service Listing Types

**1. Standard Service:**
- One-time service
- Fixed price
- Example: House cleaning, plumbing repair

**2. Hourly Service:**
- Billed by the hour
- Set your hourly rate
- Example: Consulting, tutoring

**3. Custom Service (Marketplace):**
- Customer provides requirements
- You provide custom quote
- Example: Web development, catering

**4. Product (Shippable):**
- Physical goods
- Shipping options
- Example: Handmade crafts, products

### Creating a Standard Service

1. **Navigate to Create Listing**
   - Tap the "+" button in navigation
   - Select "Create Service Listing"

2. **Basic Information:**
   ```
   Title: "Professional House Cleaning"
   Category: Home Services → Cleaning
   Description: Detailed description of your service
   ```

3. **Pricing:**
   ```
   Base Price: $100
   Pricing Type: Fixed / Hourly / Custom
   ```

4. **Service Details:**
   ```
   Duration: 2 hours
   Service Area: 10 miles radius
   Location: Your city, state
   ```

5. **Photos:**
   - Add 3-5 high-quality photos
   - Show your work or products
   - First photo becomes thumbnail

6. **Availability:**
   - Set weekly schedule
   - Block out unavailable dates
   - Set advance notice period

7. **Publish:**
   - Review your listing
   - Tap "Publish"
   - Your service is now live!

### Listing Best Practices

**Title:**
- ✅ "Professional House Cleaning - 2BR/2BA"
- ❌ "cleaning service"

**Description:**
- Include what's included
- List requirements
- Mention experience
- Add availability notes
- 200+ words recommended

**Photos:**
- Use natural lighting
- Show before/after
- Include multiple angles
- Professional quality
- No watermarks

**Pricing:**
- Research competitors
- Be transparent
- Include what's included
- Mention extra costs upfront

---

## Creating Custom Services (Marketplace)

Custom services allow customers to request quotes for unique needs.

### Step 1: Enable Custom Services

1. **Create Listing**
   - Select "Custom/Marketplace Service"
   - Set pricing type to "Custom Quote"

2. **Add Custom Options:**
   ```
   Example for Web Development:

   Option 1: "Number of Pages"
   - Type: Number
   - Required: Yes
   - Min: 1, Max: 50

   Option 2: "E-commerce Integration"
   - Type: Checkbox
   - Required: No
   - Price Impact: +$500

   Option 3: "Timeline"
   - Type: Select
   - Options: 1 week, 2 weeks, 1 month
   - Required: Yes
   ```

3. **Set Base Price Range:**
   ```
   Minimum: $500
   Maximum: $5000
   Typical Price: $1500
   ```

### Step 2: Configure Fulfillment (If Applicable)

**For Custom Services with Shipping:**

1. **Add Package Details:**
   ```
   Weight: 2.5 lbs
   Dimensions: 12" × 8" × 4"
   ```

2. **Choose Fulfillment Options:**
   - Pickup: Customer picks up from you
   - Drop Off: You deliver to customer
   - Shipping: Mail or courier delivery

3. **Set Fulfillment Window:**
   - Number of days to complete and deliver the service

### Step 3: Responding to Quote Requests

1. **Review Request:**
   - Customer provides requirements
   - Review custom options selected
   - Check customer profile/history

2. **Calculate Quote:**
   ```
   Base Price: $1000
   Custom Options: +$500
   Complexity Adjustment: +$200
   Discount: -$50
   Total Quote: $1650
   ```

3. **Submit Quote:**
   - Include detailed breakdown
   - Specify delivery timeline
   - List what's included
   - Add terms and conditions

4. **Quote Validity:**
   - Quotes valid for 7 days
   - Customer can accept/reject
   - Can negotiate via messages

**Pro Tip:** Respond within 24 hours for best results!

---

## Setting Up Shipping

### Connect Carrier Account

**Using ShipEngine Integration:**

1. **Navigate to Settings → Shipping**
   - Your ShipEngine account is auto-configured
   - Carriers already connected

2. **Available Carriers:**
   - ✅ USPS (pre-connected)
   - ✅ FedEx (optional)
   - ✅ UPS (optional)
   - ✅ DHL (optional)

### Shipping Workflow

**1. Customer Places Order:**
- They see real-time shipping rates
- Select preferred carrier/speed
- Complete payment

**2. You Receive Notification:**
- Order details in dashboard
- Customer shipping address
- Selected shipping method

**3. Create Shipping Label:**
```typescript
Navigate to: Orders → Order Details
1. Review shipping address
2. Confirm package weight/dimensions
3. Click "Generate Shipping Label"
4. Label generated automatically
5. Download & print label
```

**4. Ship the Package:**
- Attach label to package
- Drop off at carrier location
- Tracking starts automatically

**5. Customer Tracking:**
- Automatic tracking updates
- Email notifications
- In-app tracking page

### Shipping Best Practices

**Packaging:**
- Use sturdy boxes
- Adequate padding
- Seal all openings
- Clean exterior

**Labeling:**
- Print on 4×6 label paper
- Or tape to package
- Ensure barcode is scannable
- Include return address

**Insurance:**
- Recommended for items > $100
- Available during label creation
- Covers loss or damage

**Tracking:**
- Always use tracking
- Monitor delivery status
- Address issues promptly

---

## Managing Availability

### Setting Your Schedule

**1. Weekly Schedule:**
```
Navigate to: Provider Dashboard → Availability

Monday:     9:00 AM - 5:00 PM
Tuesday:    9:00 AM - 5:00 PM
Wednesday:  9:00 AM - 5:00 PM
Thursday:   9:00 AM - 5:00 PM
Friday:     9:00 AM - 5:00 PM
Saturday:   10:00 AM - 2:00 PM
Sunday:     Closed
```

**2. Block Specific Dates:**
```
Navigate to: Provider Dashboard → Blocked Dates

Examples:
- Vacation: June 15-22
- Holidays: December 24-25
- Personal time: Any date
```

**3. Set Buffer Times:**
```
Between appointments: 30 minutes
Advance notice: 24 hours
Maximum advance booking: 90 days
```

### Availability Best Practices

- Update availability weekly
- Block vacation time early
- Allow buffer between jobs
- Set realistic time estimates
- Account for travel time

---

## Pricing Strategies

### Pricing Models

**1. Fixed Price:**
- Best for: Defined services
- Example: House cleaning for 2BR
- Customer knows exact cost upfront

**2. Hourly Rate:**
- Best for: Variable duration
- Example: Consulting, tutoring
- Set minimum hours if needed

**3. Custom Quote:**
- Best for: Complex projects
- Example: Renovations, web development
- Allows for negotiation

**4. Tiered Pricing:**
- Basic: $50 - Essential features
- Standard: $100 - More features
- Premium: $200 - Full service

### Competitive Pricing

**Research Competitors:**
1. Search your service category
2. Note competitor prices
3. Consider your experience
4. Factor in your costs

**Price Positioning:**
- Budget: 20% below average
- Competitive: Match market rate
- Premium: 20%+ above (justify with quality)

### Dynamic Pricing

**Seasonal Adjustments:**
- High demand: Increase 10-20%
- Low demand: Decrease 10-15%
- Holidays: Premium pricing

**Volume Discounts:**
- 3+ bookings: 5% off
- 5+ bookings: 10% off
- Recurring: 15% off

---

## Value-Added Services

Increase revenue with optional add-ons!

### Creating Add-Ons

**1. Navigate to Listing:**
- Edit existing listing
- Scroll to "Value-Added Services"

**2. Add Options:**
```
Example for House Cleaning:

Add-on 1: "Deep Clean Kitchen"
Price: +$25
Description: "Includes oven, fridge, cabinets"

Add-on 2: "Laundry Service"
Price: +$30
Description: "Wash, dry, and fold up to 2 loads"

Add-on 3: "Window Cleaning"
Price: +$40
Description: "Interior and exterior windows"
```

**3. Make Available:**
- Customer sees during booking
- Can add to order
- Automatic price calculation

### Popular Add-Ons by Category

**Home Services:**
- Deep cleaning
- Extra rooms
- Eco-friendly products

**Professional Services:**
- Rush delivery
- Revisions included
- Priority support

**Custom Services:**
- Gift wrapping
- Express delivery
- Personalization options

---

## Accepting Bookings

### Booking Workflow

**1. Receive Booking Request:**
- Push notification
- Email notification
- In-app notification badge

**2. Review Request:**
```
Navigate to: Dashboard → Pending Bookings

Review:
- Customer profile and reviews
- Service details
- Date and time
- Special requests
- Total price
```

**3. Decision:**

**Accept:**
- Tap "Accept Booking"
- Confirm availability
- Booking confirmed automatically
- Payment held in escrow

**Reject:**
- Tap "Reject"
- Select reason (optional)
- Customer notified
- No penalty for legitimate rejections

**Counter-Offer:**
- Suggest different date/time
- Adjust price if needed
- Customer can accept/reject

### Managing Active Bookings

**Before Service:**
- Confirm details 24 hours before
- Send reminder
- Prepare materials
- Review special requests

**During Service:**
- Arrive on time
- Be professional
- Communicate clearly
- Take photos (if applicable)

**After Service:**
- Mark as complete
- Request payment release
- Ask for review
- Follow up if needed

### Handling Changes

**Reschedule Requests:**
1. Customer requests new date
2. Review your availability
3. Accept or propose alternative
4. Booking updated automatically

**Cancellations:**
- Review cancellation policy
- Decide to accept/decline
- Automatic refund processing
- Update calendar

---

## Payment & Payouts

### Payment Flow

**1. Customer Books Service:**
- Pays full amount upfront
- Funds held in escrow
- Not released until completion

**2. Complete Service:**
- Mark booking as complete
- Request payment release
- Funds held for 48 hours

**3. Automatic Release:**
- After 48 hours
- Or customer approval
- Transferred to your balance

**4. Your Balance:**
```
Navigate to: Wallet → Earnings

Available Balance: $1,450
Pending Release: $300
In Escrow: $150
```

### Payout Options

**1. Connect Bank Account:**
```
Navigate to: Settings → Payment Settings → Stripe Connect

1. Click "Connect Stripe"
2. Complete Stripe onboarding
3. Add bank account
4. Verify account (micro-deposits)
```

**2. Payout Schedule:**
- **Weekly:** Every Monday (default)
- **Bi-weekly:** Every other Monday
- **Monthly:** 1st of month
- **Instant:** $0.50 fee per payout

**3. Early Payout:**
- Request instant payout
- Available after 48-hour hold
- Small fee applies
- Arrives in 1-2 business days

### Payment Settings

**Minimum Payout:**
- Default: $25
- Adjustable: $10 - $500

**Payout Notifications:**
- Email when initiated
- Email when received
- Push notifications

### Fee Structure

**Platform Fee:** 10% of total
```
Example:
Booking Total: $100
Platform Fee: -$10
Your Earnings: $90
```

**Payment Processing:** Included
**Payout Transfers:** Free (standard)
**Instant Payouts:** $0.50 per transaction

---

## Building Your Reputation

### Getting Your First Reviews

**1. Quality Service:**
- Exceed expectations
- Be professional
- Communicate clearly
- Deliver on time

**2. Request Reviews:**
- After successful completion
- Send polite message
- Automated review prompts
- Offer small discount for review

**3. Respond to Reviews:**
- Thank positive reviews
- Address concerns professionally
- Show you care about feedback
- Never argue publicly

### Review System

**Star Ratings:**
- 5 stars: Excellent
- 4 stars: Good
- 3 stars: Average
- 2 stars: Poor
- 1 star: Very poor

**Review Categories:**
- Quality of service
- Communication
- Professionalism
- Value for money
- Timeliness

**Your Rating Impact:**
- < 3.0: Need improvement
- 3.0-3.9: Average
- 4.0-4.5: Good
- 4.5-4.8: Excellent
- 4.8+: Outstanding

### Handling Negative Reviews

**1. Don't Panic:**
- One bad review won't ruin you
- Everyone gets them
- Focus on overall trend

**2. Respond Professionally:**
```
Example Response:

"Thank you for your feedback. I apologize that your
experience didn't meet expectations. I'd like to make
this right. Please contact me directly so we can
discuss a resolution. I'm committed to ensuring all
customers are satisfied."
```

**3. Learn and Improve:**
- Identify valid concerns
- Make necessary changes
- Prevent future issues

---

## Advanced Features

### Recurring Bookings

Perfect for ongoing services!

**Setup:**
1. Enable recurring bookings on listing
2. Customer selects frequency
3. Automatic scheduling
4. Automatic billing

**Frequencies:**
- Weekly
- Bi-weekly
- Monthly
- Custom interval

### Featured Listings

**Boost Visibility:**
- Appear at top of search
- Homepage feature
- Category feature

**Pricing:**
- 7 days: $10
- 14 days: $18
- 30 days: $30

**Navigate:** Listing → Feature This Listing

### Teams & Delegation

**For Growing Businesses:**
1. Create team account
2. Invite team members
3. Assign roles and permissions
4. Manage team availability

**Roles:**
- Owner: Full access
- Admin: Manage bookings
- Member: View only

### Analytics Dashboard

**Track Performance:**
```
Navigate to: Analytics → Advanced

Metrics:
- Total earnings (daily/weekly/monthly)
- Booking count
- Conversion rate
- Average booking value
- Popular services
- Peak booking times
- Customer demographics
```

### Subscription Plans

**Upgrade for More Features:**

**Free:**
- 10 active listings
- Standard support
- Basic analytics

**Professional ($19.99/month):**
- Unlimited listings
- Featured listings included
- Priority support
- Advanced analytics
- Lower platform fees (8%)

**Business ($49.99/month):**
- All Professional features
- Team accounts
- API access
- Dedicated support
- Custom branding
- Lowest fees (5%)

---

## Quick Reference

### Daily Checklist

- [ ] Check new booking requests
- [ ] Respond to messages
- [ ] Review upcoming appointments
- [ ] Update availability if needed
- [ ] Ship pending orders
- [ ] Follow up on completed jobs

### Weekly Tasks

- [ ] Review earnings
- [ ] Analyze performance
- [ ] Update listings
- [ ] Request payout
- [ ] Respond to reviews
- [ ] Plan upcoming week

### Monthly Tasks

- [ ] Review analytics
- [ ] Adjust pricing
- [ ] Update photos
- [ ] Refresh descriptions
- [ ] Tax documentation
- [ ] Reconcile earnings

---

## Support & Resources

**Help Center:**
- Navigate to: Settings → Help & Support
- Search knowledge base
- Watch video tutorials

**Contact Support:**
- Email: providers@dollarsmiley.com
- Live Chat: In-app (9am-6pm EST)
- Phone: 1-800-SMILEY-1

**Community:**
- Provider Forum
- Facebook Group
- Monthly webinars
- Success stories blog

---

**Welcome to the DollarSmiley provider community! We're excited to help you grow your business.**

**Last Updated:** 2024-11-09
**Version:** 1.0.0
