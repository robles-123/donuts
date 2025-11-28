-- Fix: Drop and recreate cart_items policies
-- Run this in Supabase SQL Editor

drop policy if exists "cart_items_select_own" on public.cart_items;
drop policy if exists "cart_items_insert_own" on public.cart_items;
drop policy if exists "cart_items_update_own" on public.cart_items;
drop policy if exists "cart_items_delete_own" on public.cart_items;

-- CART_ITEMS: users see/edit/delete their own
create policy "cart_items_select_own" on public.cart_items
for select using (user_id = auth.uid());

create policy "cart_items_insert_own" on public.cart_items
for insert with check (auth.role() = 'authenticated' and user_id = auth.uid());

create policy "cart_items_update_own" on public.cart_items
for update using (user_id = auth.uid());

create policy "cart_items_delete_own" on public.cart_items
for delete using (user_id = auth.uid());
