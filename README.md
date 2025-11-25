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
