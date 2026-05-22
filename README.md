# Acton BR Library

Public floorplan library for Acton ADU plans. Anyone with the URL can browse. Only **admin** users (assigned in Supabase) can upload new plans after signing in.

## Tech stack

- React + Vite + Tailwind CSS
- Supabase Auth, Database, and Storage

## Setup

### 1. Supabase project

Create a project at [supabase.com](https://supabase.com). Copy **Project URL** and **anon key** from **Settings → API**.

### 2. Database

Run `supabase-schema.sql` in the **SQL Editor**. This creates:

- `floorplans` — plan metadata (public read)
- `profiles` — one row per user with `role` (`user` or `admin`)
- RLS so only admins can insert floorplans

### 3. Auth

In **Authentication → Providers**, enable **Email** (password sign-in).

Optional: disable “Confirm email” for faster internal testing.

### 4. Storage

1. Create a **public** bucket named `floorplans`.
2. Add storage policies from the bottom of `supabase-schema.sql` (public read, admin-only upload).

### 5. Grant admin access (manual)

When someone should upload plans, promote them in SQL:

```sql
update public.profiles
set role = 'admin'
where email = 'teammember@acton.com';
```

New sign-ups default to `user` (browse only).

**Existing projects:** add the `series` column:

```sql
alter table floorplans add column if not exists series text;
```

(See `supabase-migration-series.sql`.)

**Existing projects:** if the table already exists, run only the new policy:

```sql
create policy "Admins can update floorplans"
  on floorplans for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
```

### 6. Environment variables

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 7. Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173` — single page for everyone.

- **Browse** — no login required  
- **+ Add Plan** — sign in; only `admin` role can upload  

## How it works

| File | Purpose |
|------|---------|
| `src/lib/supabaseClient.js` | Supabase connection |
| `src/context/AuthContext.jsx` | Sign in/up, session, reads `profiles.role` |
| `src/pages/LibraryPage.jsx` | Public library + Add Plan flow |
| `src/components/LoginModal.jsx` | Login when adding a plan |
| `src/components/AddPlanModal.jsx` | Upload form (admins only) |
| `src/lib/floorplans.js` | Fetch plans / upload to Storage + table |

## Build

```bash
npm run build
npm run preview
```
