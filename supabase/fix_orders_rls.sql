-- QUICK FIX: Update Orders RLS Policies to allow admin to see all orders
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/YOUR_PROJECT_ID/sql

-- Drop existing conflicting policies
drop policy if exists "orders_select_own" on public.orders;
drop policy if exists "orders_select_all" on public.orders;
drop policy if exists "orders_update_own" on public.orders;
drop policy if exists "orders_update_own_or_admin" on public.orders;
drop policy if exists "orders_admin_all" on public.orders;
drop policy if exists "orders_insert_own" on public.orders;
drop policy if exists "orders_delete_admin" on public.orders;

-- Create new policies that allow all authenticated users to view orders
-- but only insert/update their own (except admins can update any)
create policy "orders_select_all" on public.orders
for select using (auth.role() = 'authenticated');

create policy "orders_insert_own" on public.orders
for insert with check (auth.role() = 'authenticated' and user_id = auth.uid());

create policy "orders_update_own_or_admin" on public.orders
for update using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create policy "orders_delete_admin" on public.orders
for delete using (public.is_admin());

-- Verify RLS is enabled
alter table public.orders enable row level security;

-- Test: This query should now work for any authenticated user
-- SELECT id, email, status, total FROM public.orders LIMIT 10;
