# Acton BR Library

Internal Acton ADU floorplan library. Users must sign in; only **acton** and **admin** roles can view plans. **Admin** can upload and edit.

## Roles

| Role | Access |
|------|--------|
| `user` | Signed in only — no floorplans (default for new accounts) |
| `acton` | Browse, filter, export PDF catalogues |
| `admin` | Everything acton can do, plus upload and edit |

Grant access in Supabase SQL:

```sql
update public.profiles set role = 'acton' where email = 'sales@acton.com';
update public.profiles set role = 'admin' where email = 'admin@acton.com';
```

## Tech stack

- React + Vite + Tailwind CSS
- Supabase Auth, Database, and Storage
- `pdf-lib` for catalogue generation
- Acton PDF Compressor API on Render for email-friendly PDF compression

## Setup

### 1. Supabase project

Create a project at [supabase.com](https://supabase.com). Copy **Project URL** and **anon key** from **Settings → API**.

### 2. Database

Run `supabase-schema.sql` in the **SQL Editor** for new projects.

**Existing projects:** also run any needed migration files:

- `supabase-migration-acton-role.sql`
- `supabase-migration-admin-delete.sql`
- `supabase-migration-catalog-exports.sql`
- `supabase-migration-catalog-assets-storage.sql`
- `supabase-migration-customer-presentations.sql`

### 3. Auth

Enable **Email** under **Authentication → Providers**.

### 4. Storage buckets

Create these buckets in Supabase Storage:

| Bucket | Purpose | Suggested access |
|--------|---------|------------------|
| `floorplans` | Plan images/PDFs | Public read; admin upload |
| `catalog-assets` | Package examples end template | Public read or authenticated read |
| `customer-presentations` | Hosted customer PDF links | Public read; acton/admin upload |

Apply the storage policies from `supabase-schema.sql` and the migration files.

Upload the package examples file to:

`catalog-assets/package-examples/end-template.pdf`

### 5. Environment variables

```bash
cp .env.example .env
```

Required:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional:

- `VITE_COMPRESS_API_URL` — full URL of the Acton PDF Compressor API (see **PDF Compression Setup** below)

### 6. Run locally

```bash
npm install
npm run dev
```

The app runs on `http://localhost:5173`.

## PDF Compression Setup

PDF compression is handled by a separate **Render** service called **Acton PDF Compressor**.

**Endpoint:**

`https://acton-pdf-compressor.onrender.com/compress-pdf`

### Local development

Add this to `.env` or `.env.local`:

```bash
VITE_COMPRESS_API_URL=https://acton-pdf-compressor.onrender.com/compress-pdf
```

Restart `npm run dev` after changing env vars.

### Production (Vercel)

1. Open your Vercel project → **Settings** → **Environment Variables**
2. Add:

   `VITE_COMPRESS_API_URL` = `https://acton-pdf-compressor.onrender.com/compress-pdf`

3. **Redeploy** the Vercel app after saving the variable

### How it works in the app

1. The app builds the PDF once in the browser.
2. **Compress PDF unchecked (default):** downloads `Acton-BR-Presentation.pdf` immediately. No Render API call.
3. **Compress PDF checked:** sends that PDF once to Render as `FormData` field `file`, then downloads `Acton-BR-Presentation-Email-Ready.pdf` if compression succeeds.
4. If compression fails or is not configured, the original PDF is downloaded instead.
5. The Render compressor controls quality and file size. Final size may vary; the goal is under 20 MB, not exactly 12 MB.

## Features

- Sign in / create account required before library access
- Multi-select checkbox filters (series, sq ft, beds, baths, price, pre-approved)
- San Jose / LA pricing toggle
- PDF catalogue export with optional package examples appendix
- Optional PDF compression for email-friendly downloads (user opt-in checkbox)
- Optional shareable customer presentation links (`/share/:token`)
- Admin upload, edit, delete, and replace plan files
- Saved catalogue history per user

## PDF export flow

1. Select floorplans and enter a customer name
2. Optional: include package examples
3. Optional: compress PDF for email (smaller file, may take longer)
4. Optional: create shareable customer link
5. App builds the PDF once in the browser
6. If “Compress PDF” is checked, that PDF is sent once to the Render compressor API
7. Compressed PDF downloads as `Acton-BR-Presentation-Email-Ready.pdf` when compression succeeds
8. Normal PDF downloads as `Acton-BR-Presentation.pdf` when compression is unchecked
9. If share link is enabled, the same PDF (compressed or original) uploads to `customer-presentations`

If compression fails, the original PDF is downloaded and a warning is shown.

## Shareable customer links

Public route: `/share/:shareToken`

- No login required
- Loads presentation metadata from `customer_presentations`
- Embeds the hosted PDF from Supabase Storage
- Customers can view or download the PDF

## Admin edit troubleshooting

If admin edits appear to save but data does not change:

1. Confirm your user has `role = 'admin'` in `profiles`
2. Confirm the `"Admins can update floorplans"` RLS policy exists
3. The app now verifies that Supabase returns an updated row and shows an error if not

## Build & deploy

### Frontend (Vercel)

```bash
npm run build
```

Deploy the repo to Vercel. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

`vercel.json` includes SPA rewrites so `/share/:token` works.

## Project scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start local dev server |
| `npm run build` | Production frontend build |
| `npm run preview` | Preview production build |
