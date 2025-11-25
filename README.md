# SimpleDough — Supabase Integration

This project was updated to use Supabase for authentication. The following instructions will help you configure and run the app locally.

Required environment variables (Vite):

- `VITE_SUPABASE_URL` — your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — your Supabase anon/public key

Create a `.env` or `.env.local` file at project root with:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Install dependencies and run:

```powershell
# from project root
npm install
npm run dev
```

Notes:
- Authentication is handled by Supabase; user metadata (name, phone, address, role) is stored as user metadata when registering.
- Order history is currently still stored in `localStorage` (keeps original app behavior).
- If you want to store orders in Supabase, add a `orders` table and update `addOrder` to persist there.

If you want, I can also wire order persistence into Supabase and migrate existing localStorage orders.

SQL to create a simple `orders` table in Supabase

```sql
-- Run this in the SQL editor in the Supabase dashboard
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

-- Optional: enable Row Level Security and allow authenticated users to insert their own orders
alter table public.orders enable row level security;

-- Example policy to allow inserts for authenticated users
create policy "allow insert for authenticated users" on public.orders
for insert
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');
```
