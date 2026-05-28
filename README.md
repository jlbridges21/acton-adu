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

**Existing projects:** run `supabase-migration-acton-role.sql` in the SQL Editor (run the **whole** script). If you only need to fix the role constraint error, run `supabase-fix-role-constraint.sql` first, then assign roles.

## Tech stack

- React + Vite + Tailwind CSS
- Supabase Auth, Database, and Storage

## Setup

### 1. Supabase project

Create a project at [supabase.com](https://supabase.com). Copy **Project URL** and **anon key** from **Settings → API**.

### 2. Database

Run `supabase-schema.sql` in the **SQL Editor**.

### 3. Auth

Enable **Email** under **Authentication → Providers**.

### 4. Storage

Create a **public** bucket named `floorplans` and apply storage policies from `supabase-schema.sql` (acton/admin read, admin upload).

### 5. Environment variables

```bash
cp .env.example .env
```

### 6. Run

```bash
npm install
npm run dev
```

## Features

- Sign in / create account required before any library content
- Filter, sort, and open floorplans (acton + admin)
- PDF catalogue export with customer name (acton + admin)
- Upload and edit plans (admin only)

## Build

```bash
npm run build
npm run preview
```
