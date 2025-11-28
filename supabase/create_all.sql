-- supabase/create_all.sql
-- Unified migration: creates users, inventory, products, cart_items, and orders with triggers and RLS.
-- Run this to set up the complete database schema.

create extension if not exists pgcrypto;

-- ============================================================================
-- USER_ROLES TABLE & HELPER FUNCTIONS
-- ============================================================================

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz default now(),
  unique(user_id, role)
);

create index if not exists idx_user_roles_user_id_role on public.user_roles (user_id, role);

-- Helper function to check if current user is admin
create or replace function public.is_admin() returns boolean
language sql stable as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  );
$$;

-- ============================================================================
-- PRODUCTS TABLE
-- ============================================================================

create table if not exists public.products (
  id text primary key,
  name text not null,
  category text,
  price numeric not null,
  quantity integer default 0,
  description text,
  image text,
  customizable boolean default false,
  flavors jsonb,
  toppings jsonb,
  max_flavors integer,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Seed products
insert into public.products (id, name, category, price, quantity, description, image, customizable, flavors, toppings, max_flavors)
values
('party-30', 'Party Set - 30pcs', 'party', 250, 30, 'Perfect for small gatherings', 'https://doughnuttime.eu/cdn/shop/files/square_DTB_EmmaPharaoh_14May25_403.jpg?v=1754474820', false, null, null, null),
('party-40', 'Party Set - 40pcs', 'party', 320, 40, 'Great for larger parties', 'https://127531799.cdn6.editmysite.com/uploads/1/2/7/5/127531799/U7UPIIUMMGQ5OKEK6SICIUVO.jpeg', false, null, null, null),
('messy-8', 'Messy Donuts - 8pcs', 'messy', 65, 8, 'Deliciously messy treats', 'https://media.karousell.com/media/photos/products/2023/9/10/mini_donuts_for_party__mini_do_1694347994_5b6e9d22_progressive.jpg', true, '[]'::jsonb, null, 2),
('messy-10', 'Messy Donuts - 10pcs', 'messy', 75, 10, 'More messy goodness', 'https://s3-media0.fl.yelpcdn.com/bphoto/fJtzYXeHCCNcYN7sswuIaw/348s.jpg', true, '[]'::jsonb, null, 2),
('mini-6', 'Mini Donuts - 6pcs', 'mini', 75, 6, '1 Classic & 1 Premium topping', 'https://www.sugarhero.com/wp-content/uploads/2011/03/chocolate-doughnuts-3sq-featured-image.jpg', true, '[]'::jsonb, '{}', 2),
('mini-12', 'Mini Donuts - 12pcs', 'mini', 145, 12, '1 Classic & 1 Premium topping', 'https://i.pinimg.com/736x/be/d8/60/bed860e97c924716f18e00837dc82c04.jpg', true, '[]'::jsonb, '{}', 2),
('mini-25', 'Mini Donuts - 25pcs', 'mini', 300, 25, '1 Classic & 1 Premium topping', 'https://cdn.christmas-cookies.com/wp-content/uploads/2021/06/easy-baked-mini-donuts.jpg', true, '[]'::jsonb, '{}', 3)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  price = excluded.price,
  quantity = excluded.quantity,
  description = excluded.description,
  image = excluded.image,
  customizable = excluded.customizable,
  flavors = excluded.flavors,
  toppings = excluded.toppings,
  max_flavors = excluded.max_flavors;

-- ============================================================================
-- INVENTORY TABLE & TRIGGERS
-- ============================================================================

create table if not exists public.inventory (
  product_id text primary key references public.products(id) on delete cascade,
  stock integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Seed inventory from products
insert into public.inventory (product_id, stock)
select id, quantity from public.products
on conflict (product_id) do update set stock = excluded.stock, updated_at = now();

-- Helper functions for stock management
create or replace function public.increment_stock(p_product_id text, p_qty integer)
returns void
language plpgsql security definer
as $$
begin
  if p_qty <= 0 then
    return;
  end if;
  insert into public.inventory(product_id, stock, updated_at)
  values (p_product_id, p_qty, now())
  on conflict (product_id) do update set stock = public.inventory.stock + excluded.stock, updated_at = now();
end;
$$;

create or replace function public.decrement_stock(p_product_id text, p_qty integer)
returns void
language plpgsql security definer
as $$
begin
  if p_qty <= 0 then
    return;
  end if;
  update public.inventory set stock = stock - p_qty, updated_at = now() where product_id = p_product_id;
end;
$$;

-- ============================================================================
-- ORDERS TABLE
-- ============================================================================

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  email text,
  items jsonb,
  total numeric,
  status text default 'pending',
  metadata jsonb,
  created_at timestamptz default now()
);

-- Function: decrement inventory when order is inserted (if items provided)
create or replace function public.decrement_inventory_for_order()
returns trigger
language plpgsql security definer
as $$
declare
  items jsonb;
  item jsonb;
  p_id text;
  qty int;
  cur_stock int;
begin
  items := NEW.items;
  if items is null or items = '[]'::jsonb then
    return NEW;
  end if;

  for item in select * from jsonb_array_elements(items) loop
    begin
      qty := coalesce((item->>'quantity')::int, 0);
    exception when others then
      qty := 0;
    end;

    -- extract product id from possible shapes
    if item ? 'product' then
      begin
        p_id := (item->'product'->>'id')::text;
      exception when others then
        p_id := null;
      end;
    elsif item ? 'productId' then
      begin
        p_id := (item->>'productId')::text;
      exception when others then
        p_id := null;
      end;
    elsif item ? 'product_id' then
      begin
        p_id := (item->>'product_id')::text;
      exception when others then
        p_id := null;
      end;
    else
      p_id := null;
    end if;

    if p_id is null or qty <= 0 then
      continue;
    end if;

    select stock into cur_stock from public.inventory where product_id = p_id for update;

    if NOT FOUND then
      raise notice 'No inventory row for product %', p_id;
      continue;
    end if;

    if cur_stock < qty then
      raise exception 'Insufficient stock for product % (have %, need %)', p_id, cur_stock, qty;
    end if;

    update public.inventory set stock = stock - qty, updated_at = now() where product_id = p_id;
  end loop;

  return NEW;
end;
$$;

-- Trigger: decrement on order insert
drop trigger if exists trg_decrement_inventory_on_order_insert on public.orders;
create trigger trg_decrement_inventory_on_order_insert
before insert on public.orders
for each row
execute function public.decrement_inventory_for_order();

-- Function: restore inventory on order cancel
create or replace function public.restore_inventory_on_order_cancel()
returns trigger
language plpgsql security definer
as $$
declare
  old_items jsonb;
  item jsonb;
  p_id text;
  qty int;
begin
  old_items := OLD.items;
  if old_items is null or old_items = '[]'::jsonb then
    return NEW;
  end if;

  if (TG_OP = 'UPDATE') then
    if (OLD.status = 'cancelled') or (NEW.status IS NULL) or (NEW.status <> 'cancelled') then
      return NEW;
    end if;
  else
    return NEW;
  end if;

  for item in select * from jsonb_array_elements(old_items) loop
    begin
      qty := coalesce((item->>'quantity')::int, 0);
    exception when others then
      qty := 0;
    end;

    if item ? 'product' then
      begin
        p_id := (item->'product'->>'id')::text;
      exception when others then
        p_id := null;
      end;
    elsif item ? 'productId' then
      begin
        p_id := (item->>'productId')::text;
      exception when others then
        p_id := null;
      end;
    elsif item ? 'product_id' then
      begin
        p_id := (item->>'product_id')::text;
      exception when others then
        p_id := null;
      end;
    else
      p_id := null;
    end if;

    if p_id is null or qty <= 0 then
      continue;
    end if;

    update public.inventory set stock = stock + qty, updated_at = now() where product_id = p_id;
  end loop;

  return NEW;
end;
$$;

-- Trigger: restore on order status change to cancelled
drop trigger if exists trg_restore_inventory_on_order_update on public.orders;
create trigger trg_restore_inventory_on_order_update
after update on public.orders
for each row
when (OLD.status IS DISTINCT FROM NEW.status)
execute function public.restore_inventory_on_order_cancel();

-- ============================================================================
-- CART_ITEMS TABLE
-- ============================================================================

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  product_id text references public.products(id) on delete cascade,
  quantity integer not null default 1,
  customizations jsonb,
  created_at timestamptz default now()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
alter table public.products enable row level security;
alter table public.inventory enable row level security;
alter table public.orders enable row level security;
alter table public.cart_items enable row level security;

-- Drop existing policies to avoid conflicts
drop policy if exists "products_select_all" on public.products;
drop policy if exists "products_insert_admin" on public.products;
drop policy if exists "products_update_admin" on public.products;
drop policy if exists "products_delete_admin" on public.products;

drop policy if exists "inventory_select_all" on public.inventory;
drop policy if exists "inventory_insert_admin" on public.inventory;
drop policy if exists "inventory_update_admin" on public.inventory;
drop policy if exists "inventory_delete_admin" on public.inventory;

drop policy if exists "orders_insert_own" on public.orders;
drop policy if exists "orders_select_own" on public.orders;
drop policy if exists "orders_select_all" on public.orders;
drop policy if exists "orders_update_own" on public.orders;
drop policy if exists "orders_update_own_or_admin" on public.orders;
drop policy if exists "orders_admin_all" on public.orders;
drop policy if exists "orders_delete_admin" on public.orders;

drop policy if exists "cart_items_select_own" on public.cart_items;
drop policy if exists "cart_items_insert_own" on public.cart_items;
drop policy if exists "cart_items_update_own" on public.cart_items;
drop policy if exists "cart_items_delete_own" on public.cart_items;

-- PRODUCTS: anyone can read, only admins can write
create policy "products_select_all" on public.products
for select using (true);

create policy "products_insert_admin" on public.products
for insert with check (public.is_admin());

create policy "products_update_admin" on public.products
for update using (public.is_admin());

create policy "products_delete_admin" on public.products
for delete using (public.is_admin());

-- INVENTORY: anyone can read, only admins can write
create policy "inventory_select_all" on public.inventory
for select using (true);

create policy "inventory_insert_admin" on public.inventory
for insert with check (public.is_admin());

create policy "inventory_update_admin" on public.inventory
for update using (public.is_admin());

create policy "inventory_delete_admin" on public.inventory
for delete using (public.is_admin());

-- ORDERS: users see their own, all authenticated users can view all (for admin panel)
create policy "orders_insert_own" on public.orders
for insert with check (auth.role() = 'authenticated' and user_id = auth.uid());

create policy "orders_select_all" on public.orders
for select using (auth.role() = 'authenticated');

create policy "orders_update_all" on public.orders
for update using (auth.role() = 'authenticated');

create policy "orders_delete_own" on public.orders
for delete using (user_id = auth.uid());

-- CART_ITEMS: users see/edit their own
create policy "cart_items_select_own" on public.cart_items
for select using (user_id = auth.uid());

create policy "cart_items_insert_own" on public.cart_items
for insert with check (auth.role() = 'authenticated' and user_id = auth.uid());

create policy "cart_items_update_own" on public.cart_items
for update using (user_id = auth.uid());

create policy "cart_items_delete_own" on public.cart_items
for delete using (user_id = auth.uid());

-- ============================================================================
-- GRANTS
-- ============================================================================

grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.inventory to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.cart_items to authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.increment_stock(text, integer) to authenticated;
grant execute on function public.decrement_stock(text, integer) to authenticated;

-- End of create_all.sql
