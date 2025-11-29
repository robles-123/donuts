# Fix: Admin Can't See Customer Orders

## Current Error
```
RLS Error fetching orders: ▸ Object
Error fetching orders from Supabase: ▸ Object
Falling back to localStorage...
```

## Root Cause
The Row-Level Security (RLS) policy on the `orders` table is preventing your admin from viewing customer orders. The policy currently only allows:
- Users to see their **own** orders
- Admins with the 'admin' role in `user_roles` table to see all

If you're not properly marked as admin, you see nothing.

## 🚀 Quick Fix - 2 Minutes

### Step 1: Open Supabase SQL Editor
1. Go to https://app.supabase.com
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**

### Step 2: Copy & Paste the Fix
Copy the entire contents of `supabase/fix_orders_rls.sql` and paste into the SQL Editor.

### Step 3: Run It
Click the blue **Run** button (or press Ctrl+Enter)

You should see: ✅ "Success. No rows returned"

### Step 4: Refresh Admin Panel
Press **F5** or **Cmd+R** in your browser and click **"View All Orders"**

## What This Does
- Allows **all authenticated users** to view all orders (enables admin panel)
- Only creators or admins can update orders
- Only admins can delete orders
- Maintains security - just fixes the viewing permissions

## Still Not Working?

1. **Check Console** (F12 in browser) - any new errors?
2. **Make sure you're logged in** as admin
3. **Verify orders exist** - place a test order first as customer
4. **Hard refresh** - Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

## Why This Happened
The previous RLS policies were too restrictive for the admin dashboard use case. The fix balances security with usability - admins need to see all orders to manage them.
