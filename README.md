# Acton BR Library

Full-stack floorplan library for Acton ADU plans. Anyone with the URL can browse plans; team members upload via a password-protected admin page.

## Tech stack

- React + Vite + Tailwind CSS
- Supabase (PostgreSQL + Storage)
- React Router (`/` public library, `/admin` upload)

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a project.
2. Copy your **Project URL** and **anon public** key from **Settings → API**.

### 2. Database table

In the Supabase **SQL Editor**, run the script in `supabase-schema.sql` (creates the `floorplans` table and basic RLS policies for version 1).

### 3. Storage bucket

1. Open **Storage** in Supabase.
2. Create a bucket named **`floorplans`**.
3. Make it **public** (so plan files can open in the browser).
4. Add a storage policy allowing uploads with the anon key, for example:

```sql
create policy "Allow public uploads"
on storage.objects for insert
with check (bucket_id = 'floorplans');

create policy "Allow public read"
on storage.objects for select
using (bucket_id = 'floorplans');
```

### 4. Environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Never commit `.env` or real keys.

### 5. Run the app

```bash
npm install
npm run dev
```

- Public library: `http://localhost:5173/`
- Admin upload: `http://localhost:5173/admin` (password: `actonadmin`)

Change the admin password in `src/config/admin.js`. For production, replace this with **Supabase Auth** and tighten RLS policies.

## How the app works

| Area | File | Purpose |
|------|------|---------|
| Supabase client | `src/lib/supabaseClient.js` | Connects using `VITE_*` env vars |
| Fetch plans | `src/lib/floorplans.js` → `fetchFloorplans()` | Loads rows from the `floorplans` table |
| Upload | `src/lib/floorplans.js` → `uploadFloorplan()` | File → Storage bucket, then row insert |
| Public UI | `src/pages/LibraryPage.jsx` | Search, filters, cards |
| Admin UI | `src/pages/AdminPage.jsx` | Password gate + upload form |

## Deploying

For client-side routing (`/admin`), configure your host to serve `index.html` for all routes (SPA fallback).

## Build

```bash
npm run build
npm run preview
```
# acton-adu
