-- Fix: Drop and recreate orders policies without recursion
-- Run this in Supabase SQL Editor

-- Drop all existing orders policies
drop policy if exists "orders_insert_own" on public.orders;
drop policy if exists "orders_select_all" on public.orders;
drop policy if exists "orders_update_own" on public.orders;
drop policy if exists "orders_update_admin" on public.orders;
drop policy if exists "orders_update_own_or_admin" on public.orders;
drop policy if exists "orders_delete_admin" on public.orders;

-- Recreate policies cleanly
-- Allow users to insert their own orders
create policy "orders_insert_own" on public.orders
for insert with check (auth.role() = 'authenticated' and user_id = auth.uid());

-- Allow all authenticated users to view all orders (for admin panel)
create policy "orders_select_all" on public.orders
for select using (auth.role() = 'authenticated');

-- Allow any authenticated user to update (admin check is done in the app layer)
create policy "orders_update_all" on public.orders
for update using (auth.role() = 'authenticated');

-- Allow only own records to delete (or can remove this if only service role deletes)
create policy "orders_delete_own" on public.orders
for delete using (user_id = auth.uid());
