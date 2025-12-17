# Admin Password Update Instructions

## Issue
The admin user `admin@dollarsmiley.com` needs password updated to: `Above123`

## Current Status
- User ID: `e7a81243-410e-4f75-adca-12a8700de67d`
- Email: `admin@dollarsmiley.com`
- Profile: Created with SuperAdmin role
- Current Issue: Invalid credentials when logging in

## Solution Options

### Option 1: Use Supabase Dashboard (Recommended)
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `pglculraxewkypgsxrwl`
3. Navigate to **Authentication** → **Users**
4. Find user: `admin@dollarsmiley.com`
5. Click the three dots menu → **Reset Password**
6. Set new password: `Above123`

### Option 2: Use Supabase CLI
```bash
# Set the service role key in environment
export SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Run the update script
npx ts-node scripts/update-admin-password.ts
```

### Option 3: Use SQL with Password Reset Link
Since direct password updates require the service role key, the user can:

1. Request a password reset email:
```typescript
import { supabase } from '@/lib/supabase';

await supabase.auth.resetPasswordForEmail('admin@dollarsmiley.com', {
  redirectTo: 'your-app://reset-password'
});
```

2. Check email and follow the reset link
3. Set new password to: `Above123`

### Option 4: Create New Admin User (Alternative)
If password reset fails, create a new admin user:

```sql
-- This would need to be done through Supabase dashboard or with service role key
-- Sign up through the app with email: admin@dollarsmiley.com
-- Then run this SQL to assign admin role:

UPDATE profiles
SET user_type = 'Provider'
WHERE email = 'admin@dollarsmiley.com';

INSERT INTO admin_roles (id, user_id, role, permissions, assigned_by, assigned_at)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM profiles WHERE email = 'admin@dollarsmiley.com'),
  'SuperAdmin',
  '{"all": true, "manage_users": true, "manage_content": true, "manage_payments": true, "view_analytics": true}'::jsonb,
  (SELECT id FROM profiles WHERE email = 'admin@dollarsmiley.com'),
  NOW()
);
```

## For Development Testing
If you need to create a test admin quickly:

1. Sign up through the app with a new email (e.g., `testadmin@example.com`)
2. Note the user ID from the database
3. Run SQL to assign admin role:
```sql
UPDATE profiles
SET user_type = 'Provider'
WHERE email = 'testadmin@example.com';

INSERT INTO admin_roles (id, user_id, role, permissions, assigned_by, assigned_at)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM profiles WHERE email = 'testadmin@example.com'),
  'SuperAdmin',
  '{"all": true, "manage_users": true, "manage_content": true, "manage_payments": true, "view_analytics": true}'::jsonb,
  (SELECT id FROM profiles WHERE email = 'testadmin@example.com'),
  NOW()
);
```

## Verification
After password update, verify login:
- Email: `admin@dollarsmiley.com`
- Password: `Above123`
- Expected: Should successfully login and have admin access

## User Profile Status
| Email | User Type | Admin Role | Status |
|-------|-----------|------------|--------|
| admin@dollarsmiley.com | Provider | SuperAdmin | Password needs update |
| bbherty@gmail.com | Customer | - | Ready |
| tanohchris88@gmail.com | Provider | - | Ready |
| dollarsmiley.usa@gmail.com | Both | - | Ready |
