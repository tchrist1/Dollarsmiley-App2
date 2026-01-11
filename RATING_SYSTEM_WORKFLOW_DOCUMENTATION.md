# DollarSmiley App - Rating & Review System Workflow

**Documentation Date**: January 11, 2026
**Version**: Current Production System
**Status**: Complete System Overview

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [Complete User Flow](#complete-user-flow)
4. [Automated Triggers & Notifications](#automated-triggers--notifications)
5. [Rating Calculation & Aggregation](#rating-calculation--aggregation)
6. [Review Moderation System](#review-moderation-system)
7. [Incentives & Rewards System](#incentives--rewards-system)
8. [Review Features](#review-features)
9. [Security & Access Control](#security--access-control)
10. [Integration Points](#integration-points)

---

## System Overview

The DollarSmiley rating system is a comprehensive, multi-layered review platform that includes:

- **Customer Reviews**: Customers review providers after completed bookings
- **Automated Prompts**: Auto-triggered review requests with reminders
- **Rich Media**: Photo and video uploads with reviews
- **Provider Responses**: Providers can respond to reviews
- **Helpful Votes**: Community voting on review helpfulness
- **Incentive System**: Rewards for quality reviews
- **Moderation**: Admin review approval workflow
- **Aggregated Ratings**: Auto-calculated provider ratings with breakdowns
- **Gamification**: XP rewards and badges for reviews
- **Contest System**: Review competitions with prizes

---

## Database Schema

### Core Tables

#### 1. `reviews`
**Primary review data storage**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| booking_id | uuid | Associated booking |
| reviewer_id | uuid | Customer who reviewed |
| reviewee_id | uuid | Provider being reviewed |
| listing_id | uuid | Service listing reviewed |
| rating | integer | 1-5 star rating |
| title | text | Review headline |
| comment | text | Review body text |
| would_recommend | boolean | Recommendation flag |
| response | text | Provider's response |
| response_date | timestamptz | Response timestamp |
| is_verified | boolean | Verified booking badge |
| is_flagged | boolean | Flagged for moderation |
| flag_reason | text | Flag reason |
| moderation_status | text | Pending/Approved/Rejected/Hidden |
| moderated_by | uuid | Admin who moderated |
| moderated_at | timestamptz | Moderation timestamp |
| helpful_count | integer | Helpful votes |
| unhelpful_count | integer | Unhelpful votes |
| created_at | timestamptz | Submission time |
| updated_at | timestamptz | Last update time |

**Moderation Status Values:**
- `Pending`: Awaiting admin review
- `Approved`: Published and visible
- `Rejected`: Not published
- `Hidden`: Temporarily hidden

#### 2. `review_votes`
**Community voting on review helpfulness**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| review_id | uuid | Review being voted on |
| user_id | uuid | User casting vote |
| vote_type | text | 'helpful' or 'unhelpful' |
| created_at | timestamptz | Vote timestamp |

**Constraint:** Unique(review_id, user_id) - One vote per user per review

#### 3. `review_images`
**Photo attachments for reviews**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| review_id | uuid | Associated review |
| image_url | text | Image URL |
| caption | text | Optional caption |
| order_index | integer | Display order |
| created_at | timestamptz | Upload timestamp |

#### 4. `provider_ratings`
**Aggregated provider statistics**

| Column | Type | Description |
|--------|------|-------------|
| provider_id | uuid | Primary key (provider) |
| total_reviews | integer | Total review count |
| average_rating | numeric | Average rating (0-5) |
| rating_5_count | integer | 5-star count |
| rating_4_count | integer | 4-star count |
| rating_3_count | integer | 3-star count |
| rating_2_count | integer | 2-star count |
| rating_1_count | integer | 1-star count |
| recommend_percentage | numeric | % who recommend |
| response_rate | numeric | % with responses |
| last_review_date | timestamptz | Most recent review |
| updated_at | timestamptz | Last calculation |

#### 5. `review_prompts`
**Automated review request tracking**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| booking_id | uuid | Booking to review |
| customer_id | uuid | Customer prompted |
| provider_id | uuid | Provider to review |
| prompt_sent_at | timestamptz | Initial prompt time |
| reminder_sent_at | timestamptz | Reminder time |
| review_submitted_at | timestamptz | Submission time |
| status | text | Pending/Reminded/Submitted/Expired |
| expires_at | timestamptz | Prompt expiration (7 days) |
| notification_id | uuid | Initial notification |
| reminder_notification_id | uuid | Reminder notification |
| created_at | timestamptz | Record creation |

**Status Flow:**
1. `Pending` → Initial prompt sent
2. `Reminded` → 24-hour reminder sent
3. `Submitted` → Customer submitted review
4. `Expired` → 7 days passed, no submission

#### 6. `review_incentive_campaigns`
**Reward campaign configurations**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Campaign name |
| description | text | Campaign details |
| incentive_type | enum | Credit/Discount/Badge/XP/ContestEntry/Cashback |
| reward_value | numeric | Reward amount |
| reward_description | text | User-facing description |
| eligibility_criteria | jsonb | Who qualifies |
| requirements | jsonb | Review requirements |
| start_date | timestamptz | Campaign start |
| end_date | timestamptz | Campaign end |
| max_rewards_per_user | integer | Per-user limit |
| max_total_rewards | integer | Campaign budget |
| rewards_claimed | integer | Current claims |
| is_active | boolean | Campaign active |
| priority | integer | Display order |
| created_by | uuid | Admin creator |
| created_at | timestamptz | Creation time |

**Incentive Types:**
- **Credit**: Platform credits for future bookings
- **Discount**: Percentage or fixed discount codes
- **Badge**: Achievement badges
- **XP**: Experience points (gamification)
- **ContestEntry**: Contest entry tickets
- **Cashback**: Direct money refund

#### 7. `review_rewards`
**Individual reward claims**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| campaign_id | uuid | Source campaign |
| review_id | uuid | Review that earned reward |
| user_id | uuid | Reward recipient |
| booking_id | uuid | Associated booking |
| incentive_type | enum | Reward type |
| reward_value | numeric | Reward amount |
| reward_description | text | Description |
| status | text | Pending/Approved/Claimed/Expired/Rejected |
| claimed_at | timestamptz | Claim timestamp |
| expires_at | timestamptz | Expiration date |
| rejection_reason | text | If rejected |
| metadata | jsonb | Additional data |
| created_at | timestamptz | Creation time |

#### 8. `review_contests`
**Review competitions**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Contest name |
| description | text | Contest details |
| contest_type | enum | MostReviews/BestReview/PhotoReview/Raffle |
| prize_pool | jsonb | Prizes and values |
| start_date | timestamptz | Contest start |
| end_date | timestamptz | Contest end |
| winner_count | integer | Number of winners |
| entry_requirements | jsonb | Entry criteria |
| is_active | boolean | Contest active |
| created_at | timestamptz | Creation time |

**Contest Types:**
- **MostReviews**: Most reviews submitted wins
- **BestReview**: Highest quality review wins
- **PhotoReview**: Best photo review wins
- **Raffle**: Random drawing from all entries

#### 9. `review_milestones`
**Achievement tracking**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Milestone name |
| description | text | Description |
| review_count_required | integer | Reviews needed |
| reward_type | text | Credit/Badge/XP |
| reward_value | numeric | Reward amount |
| badge_id | uuid | Badge awarded |
| icon | text | Display icon |
| is_active | boolean | Milestone active |
| created_at | timestamptz | Creation time |

---

## Complete User Flow

### Phase 1: Booking Completion

**Step 1: Service is Completed**
```
Customer receives service → Provider marks booking as "Completed"
```

**Step 2: Automatic Review Prompt Trigger**
```sql
-- Trigger: trigger_review_prompt_on_completion
-- Function: trigger_review_prompt()
-- Event: Booking status changes to 'Completed'

Actions:
1. Check if review prompt already exists (prevent duplicates)
2. Create notification for customer
3. Insert record into review_prompts table
4. Award provider +50 XP for completing booking
5. Set booking.can_review = true
```

**Step 3: Customer Receives Notification**
```
Notification Type: 'review_prompt'
Title: "How was your service?"
Message: "Please share your experience with [Provider Name]"
Action URL: /review/[booking_id]
Prompt Expires: 7 days from completion
```

---

### Phase 2: Review Submission

**Step 4: Customer Opens Review Form**

**Location:** `/app/review/[bookingId].tsx`

**Form Components:**
1. **Rating Selection** (required)
   - 1-5 star interactive selector
   - Visual feedback with text labels:
     - 1 star: "Poor"
     - 2 stars: "Fair"
     - 3 stars: "Good"
     - 4 stars: "Very Good"
     - 5 stars: "Excellent"

2. **Review Title** (required)
   - Text input, max 100 characters
   - Character counter displayed
   - Placeholder: "Summarize your experience"

3. **Review Comment** (required)
   - Multi-line text area, max 1000 characters
   - Character counter displayed
   - Minimum length validation
   - Placeholder: "Tell others about your experience..."

4. **Media Upload** (optional)
   - Photo/video uploads
   - Max 10 media items
   - Preview thumbnails
   - Captions supported

5. **Recommendation Toggle** (optional, default: Yes)
   - "Would you recommend this provider?"
   - Yes/No selection

**Step 5: Form Validation**
```typescript
Validation Rules:
- Rating must be selected (1-5)
- Title must be provided and not empty
- Comment must be provided and not empty
- Media is optional
- Recommendation defaults to 'true'
```

**Step 6: Review Submission**
```typescript
// Submission flow in /app/review/[bookingId].tsx

await supabase.from('reviews').insert({
  booking_id: bookingId,
  reviewer_id: profile.id,
  reviewee_id: provider_id,
  listing_id: listing_id,
  rating: rating,
  title: title,
  comment: comment,
  would_recommend: wouldRecommend,
  is_verified: true,
  moderation_status: 'Approved' // Auto-approved
});
```

**Step 7: Post-Submission Triggers**

**Trigger A: Mark Booking as Reviewed**
```sql
-- Trigger: trigger_mark_booking_reviewed
-- Function: mark_booking_reviewed()

UPDATE bookings
SET review_submitted = true
WHERE id = [booking_id];
```

**Trigger B: Update Review Prompt Status**
```sql
-- Trigger: mark_review_prompt_submitted_trigger
-- Function: mark_review_prompt_submitted()

UPDATE review_prompts
SET
  status = 'Submitted',
  review_submitted_at = NOW()
WHERE booking_id = [booking_id];
```

**Trigger C: Award XP to Reviewer**
```sql
-- In mark_review_prompt_submitted()

UPDATE user_gamification
SET
  current_xp = current_xp + 20,
  total_xp = total_xp + 20
WHERE user_id = [reviewer_id];
```

**Trigger D: Update Provider Ratings**
```sql
-- Trigger: trigger_update_provider_ratings
-- Function: update_provider_ratings()

-- Recalculates all provider rating statistics:
- Total review count
- Average rating
- Rating distribution (1-5 star counts)
- Recommendation percentage
- Response rate
- Last review date

-- Updates both provider_ratings and profiles tables
```

**Step 8: Notify Provider**
```typescript
// Edge Function: send-notification

await fetch('/functions/v1/send-notification', {
  body: {
    userId: provider_id,
    type: 'ReviewReceived',
    title: 'New Review Received',
    body: `You received a ${rating}-star review: "${title}"`,
    data: { bookingId, rating },
    actionUrl: '/profile',
    priority: 'normal'
  }
});
```

---

### Phase 3: Automated Reminders

**24-Hour Reminder System**

**Cron Job: Check for Pending Reviews**
```sql
-- Function: get_pending_review_prompts()

SELECT prompts
WHERE status = 'Pending'
AND reminder_sent_at IS NULL
AND prompt_sent_at < NOW() - INTERVAL '24 hours'
AND expires_at > NOW();
```

**Send Reminder Notification**
```sql
-- Function: send_review_reminder(prompt_id)

INSERT INTO notifications (
  user_id,
  type,
  title,
  message
) VALUES (
  customer_id,
  'review_reminder',
  'Don''t forget to review',
  'Share your experience with [Provider Name] for your [Service Name]'
);

UPDATE review_prompts
SET
  status = 'Reminded',
  reminder_sent_at = NOW(),
  reminder_notification_id = [notification_id]
WHERE id = prompt_id;
```

---

### Phase 4: Expiration

**7-Day Expiration System**

**Cron Job: Expire Old Prompts**
```sql
-- Function: expire_old_review_prompts()

UPDATE review_prompts
SET status = 'Expired'
WHERE status IN ('Pending', 'Reminded')
AND expires_at < NOW();
```

**Result:**
- Review prompt removed from active queue
- Customer can no longer submit review for this booking
- Statistics tracked for campaign optimization

---

## Rating Calculation & Aggregation

### Automatic Calculation Triggers

**Trigger Point:** Any INSERT, UPDATE, or DELETE on `reviews` table

**Calculation Function:** `update_provider_ratings()`

### Calculations Performed

#### 1. Total Reviews
```sql
SELECT COUNT(*)
FROM reviews
WHERE reviewee_id = [provider_id]
AND moderation_status = 'Approved';
```

#### 2. Average Rating
```sql
SELECT ROUND(AVG(rating)::numeric, 1)
FROM reviews
WHERE reviewee_id = [provider_id]
AND moderation_status = 'Approved';
```

#### 3. Rating Distribution
```sql
-- Counts for each rating level (1-5 stars)
rating_5_count = COUNT(*) WHERE rating = 5
rating_4_count = COUNT(*) WHERE rating = 4
rating_3_count = COUNT(*) WHERE rating = 3
rating_2_count = COUNT(*) WHERE rating = 2
rating_1_count = COUNT(*) WHERE rating = 1
```

#### 4. Recommendation Percentage
```sql
SELECT ROUND(
  (COUNT(*) FILTER (WHERE would_recommend = true)::numeric /
   NULLIF(COUNT(*), 0)) * 100,
  1
)
FROM reviews
WHERE reviewee_id = [provider_id]
AND moderation_status = 'Approved';
```

#### 5. Response Rate
```sql
SELECT ROUND(
  (COUNT(*) FILTER (WHERE response IS NOT NULL)::numeric /
   NULLIF(COUNT(*), 0)) * 100,
  1
)
FROM reviews
WHERE reviewee_id = [provider_id]
AND moderation_status = 'Approved';
```

#### 6. Last Review Date
```sql
SELECT MAX(created_at)
FROM reviews
WHERE reviewee_id = [provider_id]
AND moderation_status = 'Approved';
```

### Storage Locations

**Primary Storage:** `provider_ratings` table
```sql
UPDATE provider_ratings
SET [all calculated fields]
WHERE provider_id = [provider_id];
```

**Cached in Profile:** `profiles` table
```sql
UPDATE profiles
SET
  average_rating = [calculated_avg],
  total_reviews = [calculated_count],
  rating_updated_at = NOW()
WHERE id = [provider_id];
```

---

## Review Moderation System

### Moderation Workflow

#### Initial Review Status
```
Default: 'Approved' (auto-approved)
Alternative: Can be set to 'Pending' for manual review
```

#### Moderation Actions

**1. Approve Review**
```sql
UPDATE reviews
SET
  moderation_status = 'Approved',
  moderated_by = [admin_id],
  moderated_at = NOW()
WHERE id = [review_id];
```

**2. Reject Review**
```sql
UPDATE reviews
SET
  moderation_status = 'Rejected',
  moderated_by = [admin_id],
  moderated_at = NOW()
WHERE id = [review_id];
```

**3. Hide Review**
```sql
UPDATE reviews
SET
  moderation_status = 'Hidden',
  moderated_by = [admin_id],
  moderated_at = NOW()
WHERE id = [review_id];
```

**4. Flag Review**
```sql
UPDATE reviews
SET
  is_flagged = true,
  flag_reason = [reason]
WHERE id = [review_id];
```

### Visibility Rules

**Public View (Anyone):**
```sql
SELECT * FROM reviews
WHERE moderation_status = 'Approved';
```

**Own Reviews (Authenticated User):**
```sql
SELECT * FROM reviews
WHERE reviewer_id = auth.uid()
OR reviewee_id = auth.uid();
```

**Admin View (All):**
```sql
SELECT * FROM reviews
-- No filter, see all statuses
```

---

## Incentives & Rewards System

### Campaign Types

#### 1. Credit Campaigns
**Purpose:** Award platform credits for future bookings

**Example:**
```
Campaign: "Write a review, get $5 credit"
Reward: $5.00 credit
Requirements: Minimum 3-star rating, 50+ characters
Max per user: 5 reviews
```

#### 2. Discount Campaigns
**Purpose:** Generate discount codes for reviewers

**Example:**
```
Campaign: "Review and save 20%"
Reward: 20% discount code
Requirements: Photo included
Max per user: 1 review
```

#### 3. Badge Campaigns
**Purpose:** Award achievement badges

**Example:**
```
Campaign: "Verified Reviewer Badge"
Reward: "Trusted Reviewer" badge
Requirements: 10+ reviews submitted
```

#### 4. XP Campaigns
**Purpose:** Bonus gamification points

**Example:**
```
Campaign: "Double XP Weekend"
Reward: 2x XP multiplier
Active: Weekends only
```

#### 5. Contest Entry Campaigns
**Purpose:** Enter users into prize drawings

**Example:**
```
Campaign: "Monthly Review Raffle"
Reward: 1 raffle entry
Prize: $100 gift card
Requirements: Photo + detailed review
```

#### 6. Cashback Campaigns
**Purpose:** Direct money refunds

**Example:**
```
Campaign: "Cashback for Quality Reviews"
Reward: $10 cashback
Requirements: 5-star + photo + 200+ characters
```

### Reward Distribution Workflow

**Step 1: Review Submission**
```
Customer submits review
```

**Step 2: Campaign Matching**
```typescript
// Check active campaigns
const eligibleCampaigns = campaigns.filter(c =>
  c.is_active &&
  c.start_date <= now &&
  c.end_date >= now &&
  meetsEligibilityCriteria(review, c.eligibility_criteria) &&
  meetsRequirements(review, c.requirements)
);
```

**Step 3: Requirements Check**

**Common Requirements:**
- **Minimum Rating:** e.g., 4+ stars only
- **Minimum Length:** e.g., 100+ characters
- **Photo Required:** Must include image
- **Verified Only:** Only verified bookings
- **Time Window:** Review within X days of completion

**Step 4: Reward Creation**
```sql
INSERT INTO review_rewards (
  campaign_id,
  review_id,
  user_id,
  booking_id,
  incentive_type,
  reward_value,
  reward_description,
  status,
  expires_at
) VALUES (
  [campaign_id],
  [review_id],
  [user_id],
  [booking_id],
  [incentive_type],
  [reward_value],
  [reward_description],
  'Pending', -- or 'Approved' for auto-approve
  NOW() + INTERVAL '30 days'
);
```

**Step 5: Reward Approval**

**Auto-Approved Campaigns:**
```sql
-- Immediately distribute reward
status = 'Approved'

-- If credit type:
INSERT INTO wallet_transactions (
  user_id,
  amount,
  type,
  description
) VALUES (
  [user_id],
  [reward_value],
  'Credit',
  'Review reward: [campaign_name]'
);
```

**Manual Approval Required:**
```sql
-- Admin reviews and approves
status = 'Pending'

-- Admin action required to change to 'Approved'
-- Then distribute reward
```

**Step 6: Claim Tracking**
```sql
UPDATE review_rewards
SET
  status = 'Claimed',
  claimed_at = NOW()
WHERE id = [reward_id];

-- Update campaign counter
UPDATE review_incentive_campaigns
SET rewards_claimed = rewards_claimed + 1
WHERE id = [campaign_id];
```

### Contest System

#### Contest Workflow

**1. Contest Creation**
```sql
INSERT INTO review_contests (
  name,
  description,
  contest_type,
  prize_pool,
  start_date,
  end_date,
  winner_count,
  entry_requirements,
  is_active
);
```

**2. Entry Submission**
```sql
-- Automatic on qualifying review submission
INSERT INTO review_contest_entries (
  contest_id,
  user_id,
  review_id,
  entry_score
);
```

**3. Winner Selection**

**By Contest Type:**

**MostReviews:**
```sql
SELECT user_id, COUNT(*) as review_count
FROM review_contest_entries
WHERE contest_id = [id]
GROUP BY user_id
ORDER BY review_count DESC
LIMIT [winner_count];
```

**BestReview:**
```sql
SELECT user_id, review_id, entry_score
FROM review_contest_entries
WHERE contest_id = [id]
ORDER BY entry_score DESC
LIMIT [winner_count];
```

**PhotoReview:**
```sql
SELECT e.user_id, e.review_id
FROM review_contest_entries e
JOIN reviews r ON e.review_id = r.id
JOIN review_images i ON r.id = i.review_id
WHERE e.contest_id = [id]
ORDER BY e.entry_score DESC
LIMIT [winner_count];
```

**Raffle:**
```sql
-- Random selection
SELECT user_id
FROM review_contest_entries
WHERE contest_id = [id]
ORDER BY RANDOM()
LIMIT [winner_count];
```

**4. Winner Notification**
```sql
UPDATE review_contest_entries
SET
  is_winner = true,
  prize_won = [prize_description]
WHERE user_id IN ([winner_ids])
AND contest_id = [contest_id];

-- Send notifications to winners
```

### Milestone System

**Milestone Tracking:**
```sql
-- Check user's review count
SELECT COUNT(*) as review_count
FROM reviews
WHERE reviewer_id = [user_id]
AND moderation_status = 'Approved';

-- Check against milestones
SELECT * FROM review_milestones
WHERE review_count_required <= [user_review_count]
AND is_active = true;

-- Award unclaimed milestones
INSERT INTO user_review_milestones (
  user_id,
  milestone_id,
  achieved_at
) VALUES (
  [user_id],
  [milestone_id],
  NOW()
);
```

**Milestone Rewards:**
```sql
-- Distribute milestone reward
IF reward_type = 'Credit' THEN
  INSERT INTO wallet_transactions (...)
ELSIF reward_type = 'Badge' THEN
  INSERT INTO user_badges (...)
ELSIF reward_type = 'XP' THEN
  UPDATE user_gamification SET current_xp = current_xp + [value]
END IF;
```

---

## Review Features

### Provider Responses

**Capability:** Providers can respond to reviews about them

**Access Control:**
```sql
-- RLS Policy
CREATE POLICY "Providers can respond to reviews about them"
ON reviews FOR UPDATE
TO authenticated
USING (reviewee_id = auth.uid());
```

**Response Submission:**
```sql
UPDATE reviews
SET
  response = [response_text],
  response_date = NOW()
WHERE id = [review_id]
AND reviewee_id = [provider_id];
```

**Benefits:**
- Increases response_rate metric
- Shows provider engagement
- Helps resolve customer concerns publicly
- Boosts provider credibility

### Helpful Votes

**Purpose:** Community validation of review quality

**Vote Submission:**
```sql
INSERT INTO review_votes (
  review_id,
  user_id,
  vote_type
) VALUES (
  [review_id],
  [user_id],
  'helpful' -- or 'unhelpful'
)
ON CONFLICT (review_id, user_id)
DO UPDATE SET vote_type = [new_vote];
```

**Vote Count Update (Automatic):**
```sql
-- Trigger: trigger_update_vote_counts
-- Function: update_review_vote_counts()

UPDATE reviews
SET
  helpful_count = (SELECT COUNT(*) FROM review_votes WHERE review_id = [id] AND vote_type = 'helpful'),
  unhelpful_count = (SELECT COUNT(*) FROM review_votes WHERE review_id = [id] AND vote_type = 'unhelpful')
WHERE id = [review_id];
```

**Display Logic:**
```
If helpful_count > 10:
  Display: "[helpful_count] people found this helpful"

If helpful_count < unhelpful_count:
  Display warning: "Some users found this review unhelpful"
```

### Review Media (Photos/Videos)

**Upload Flow:**

**1. Select Media**
```typescript
// Using ReviewMediaUpload component
const [media, setMedia] = useState<MediaItem[]>([]);
```

**2. Upload to Storage**
```typescript
// Upload to Supabase Storage or CDN
const imageUrl = await uploadImage(file);
```

**3. Attach to Review**
```sql
INSERT INTO review_images (
  review_id,
  image_url,
  caption,
  order_index
) VALUES (
  [review_id],
  [image_url],
  [caption],
  [order]
);
```

**Display:**
- Image gallery/carousel on review cards
- Click to enlarge
- Captions displayed
- Ordered by order_index

**Benefits:**
- Increases review credibility
- Helps future customers
- May qualify for photo-specific rewards
- Required for some incentive campaigns

---

## Security & Access Control

### Row Level Security (RLS) Policies

#### Reviews Table

**Policy 1: Public View of Approved Reviews**
```sql
CREATE POLICY "Anyone can view approved reviews"
ON reviews FOR SELECT
USING (moderation_status = 'Approved');
```

**Policy 2: Create Review for Own Bookings**
```sql
CREATE POLICY "Users can create reviews for their bookings"
ON reviews FOR INSERT
TO authenticated
WITH CHECK (
  reviewer_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM bookings
    WHERE bookings.id = booking_id
    AND bookings.customer_id = auth.uid()
    AND bookings.status = 'Completed'
  )
);
```

**Policy 3: Update Own Reviews (30-day limit)**
```sql
CREATE POLICY "Users can update own reviews within 30 days"
ON reviews FOR UPDATE
TO authenticated
USING (
  reviewer_id = auth.uid() AND
  created_at > now() - interval '30 days'
);
```

**Policy 4: Provider Responses**
```sql
CREATE POLICY "Providers can respond to reviews about them"
ON reviews FOR UPDATE
TO authenticated
USING (reviewee_id = auth.uid());
```

#### Review Votes Table

**All Users Can:**
- View all votes
- Cast votes on any review
- Update their own votes
- Delete their own votes

**Constraint:** One vote per user per review

#### Review Images Table

**Users Can:**
- View images for approved reviews
- Upload images for their own reviews

#### Provider Ratings Table

**Everyone Can:**
- View all provider ratings (public data)

**Only System Can:**
- Update ratings (via triggers)

#### Review Prompts Table

**Users Can:**
- View prompts where they are customer or provider

**Service Role Can:**
- Manage all prompts

#### Review Incentive System Tables

**Users Can:**
- View active campaigns
- View their own rewards

**Admins Can:**
- Create and manage campaigns
- Approve/reject rewards
- View all reward data

---

## Integration Points

### 1. Bookings System

**Integration:** Review eligibility tied to booking completion

**Fields Used:**
- `bookings.status` - Must be 'Completed'
- `bookings.can_review` - Set to true after completion
- `bookings.review_submitted` - Marked true after review
- `bookings.review_reminder_sent` - Tracks reminder

**Trigger:** Completion triggers review prompt

### 2. Notifications System

**Integration:** Review prompts, reminders, and provider alerts

**Notification Types:**
- `review_prompt` - Initial request
- `review_reminder` - 24-hour reminder
- `ReviewReceived` - Provider notification

**Edge Function:** `/functions/v1/send-notification`

### 3. Gamification System

**Integration:** XP rewards for reviews

**Rewards:**
- Provider completes booking: +50 XP
- Customer submits review: +20 XP
- Milestone achievements: Variable XP

**Table:** `user_gamification`

### 4. Wallet System

**Integration:** Credit rewards distribution

**Transaction Types:**
- `Credit` - Review reward credits
- Linked to `review_rewards` table

**Table:** `wallet_transactions`

### 5. Badge System

**Integration:** Achievement badges

**Award Types:**
- Review milestones
- Quality reviewer badges
- Contest winners

**Table:** `user_badges`

### 6. Profile System

**Integration:** Cached rating data

**Profile Fields:**
- `average_rating` - Provider's avg rating
- `total_reviews` - Provider's review count
- `rating_updated_at` - Last calculation
- `review_prompt_preferences` - User notification settings

**Real-time Updates:** Via triggers on review changes

### 7. Service Listings

**Integration:** Listing-specific ratings

**Fields:**
- `service_listings.rating_average`
- `service_listings.rating_count`
- `service_listings.total_reviews`

**Calculated from:** Reviews with matching `listing_id`

### 8. Moderation System

**Integration:** Content flagging and approval

**Tables:**
- `content_flags` - User reports
- `moderation_queue` - Admin review queue

**Process:** Flagged reviews enter moderation queue

---

## Key Metrics & Analytics

### Review Performance Metrics

**1. Submission Rate**
```sql
SELECT
  (COUNT(*) FILTER (WHERE status = 'Submitted')::numeric /
   NULLIF(COUNT(*), 0) * 100) as submission_rate
FROM review_prompts;
```

**2. Average Response Time**
```sql
SELECT AVG(
  EXTRACT(EPOCH FROM (review_submitted_at - prompt_sent_at)) / 3600
) as avg_hours_to_review
FROM review_prompts
WHERE status = 'Submitted';
```

**3. Reminder Effectiveness**
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'Submitted' AND reminder_sent_at IS NOT NULL) as reviews_after_reminder,
  COUNT(*) FILTER (WHERE status = 'Submitted' AND reminder_sent_at IS NULL) as reviews_without_reminder
FROM review_prompts;
```

**4. Expiration Rate**
```sql
SELECT
  (COUNT(*) FILTER (WHERE status = 'Expired')::numeric /
   NULLIF(COUNT(*), 0) * 100) as expiration_rate
FROM review_prompts;
```

### Provider Performance Metrics

**Rating Distribution:**
```
5 stars: [rating_5_count] ([percentage]%)
4 stars: [rating_4_count] ([percentage]%)
3 stars: [rating_3_count] ([percentage]%)
2 stars: [rating_2_count] ([percentage]%)
1 star:  [rating_1_count] ([percentage]%)
```

**Quality Indicators:**
- Average Rating: [0.0 - 5.0]
- Total Reviews: [count]
- Recommendation Rate: [0-100]%
- Response Rate: [0-100]%
- Last Review: [date]

### Incentive Campaign Metrics

**Campaign Performance:**
```sql
SELECT
  name,
  rewards_claimed,
  max_total_rewards,
  (rewards_claimed::numeric / max_total_rewards * 100) as completion_rate
FROM review_incentive_campaigns;
```

**ROI Metrics:**
- Cost per review
- Reviews per campaign
- User participation rate
- Reward redemption rate

---

## Summary

The DollarSmiley rating system is a comprehensive, automated review platform that:

1. **Automatically prompts** customers to review after service completion
2. **Sends reminders** after 24 hours if no review submitted
3. **Expires prompts** after 7 days to maintain urgency
4. **Supports rich media** with photo and video uploads
5. **Enables provider responses** for engagement and issue resolution
6. **Community validation** through helpful votes
7. **Incentivizes quality** reviews with rewards and contests
8. **Auto-calculates** and caches provider ratings
9. **Integrates** with gamification, wallets, and notifications
10. **Maintains security** with comprehensive RLS policies

**Key Features:**
- Zero-friction submission process
- Automatic notifications and reminders
- Real-time rating updates
- Flexible reward campaigns
- Contest and milestone systems
- Moderation workflow
- Analytics and metrics
- Full security and access control

**Data Flow:**
```
Booking Complete → Review Prompt → [24h] → Reminder → [7d] → Expiration
                           ↓
                    Review Submission
                           ↓
                    ├─→ Rating Calculation
                    ├─→ Provider Notification
                    ├─→ Reward Distribution
                    ├─→ XP Award
                    └─→ Profile Update
```

---

**Documentation Status:** Complete and current as of January 11, 2026
**System Version:** Production
**Last Updated:** 2026-01-11
