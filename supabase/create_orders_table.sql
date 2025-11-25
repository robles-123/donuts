-- Enable pgcrypto to use gen_random_uuid()
create extension if not exists pgcrypto;

-- Create orders table
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

-- Enable Row Level Security
alter table public.orders enable row level security;

-- Policy: allow inserts for authenticated users
create policy "allow insert for authenticated users" on public.orders
for insert
with check (auth.role() = 'authenticated');
