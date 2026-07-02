-- =============================================================================
-- Acton BR Library — COMPLETE MIGRATION (existing Supabase projects)
-- =============================================================================
-- Paste this entire file into the Supabase SQL Editor and click Run once.
--
-- Safe to re-run: uses IF NOT EXISTS, DROP POLICY IF EXISTS, CREATE OR REPLACE.
-- Does NOT drop your floorplans data.
--
-- BEFORE running:
--   1. Create Storage buckets in Dashboard → Storage (if they do not exist):
--        • floorplans            (public)
--        • catalog-assets        (public)
--        • customer-presentations (public)
--   2. Upload catalog-assets/package-examples/end-template.pdf (optional appendix)
--
-- AFTER running, grant roles:
--   update public.profiles set role = 'acton' where email = 'you@example.com';
--   update public.profiles set role = 'admin' where email = 'admin@example.com';
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. TABLES (create only if missing)
-- -----------------------------------------------------------------------------

create table if not exists public.floorplans (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  name text not null,
  series text,
  square_feet integer,
  beds integer,
  baths numeric,
  base_price integer,
  pre_approved boolean default false,
  file_type text,
  file_url text not null,
  file_path text
);

-- Add columns that older projects may be missing
alter table public.floorplans add column if not exists series text;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'user',
  created_at timestamp with time zone default now()
);

create table if not exists public.catalog_exports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_name text not null,
  floorplan_ids uuid[] not null default '{}',
  floorplans_snapshot jsonb not null default '[]'::jsonb
);

create table if not exists public.customer_presentations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  title text,
  file_url text,
  file_path text,
  included_examples boolean default false,
  compressed boolean default false,
  file_size_mb numeric,
  share_token text unique not null,
  status text default 'processing',
  error_message text
);


-- -----------------------------------------------------------------------------
-- 2. ROLE CONSTRAINT (user | acton | admin)
-- -----------------------------------------------------------------------------

alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'acton', 'admin'));


-- -----------------------------------------------------------------------------
-- 3. HELPER FUNCTIONS
-- -----------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.can_view_floorplans()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('acton', 'admin')
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do nothing;
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 4. AUTH TRIGGER (auto-create profile on signup)
-- -----------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- -----------------------------------------------------------------------------
-- 5. INDEXES
-- -----------------------------------------------------------------------------

create index if not exists catalog_exports_user_id_idx
  on public.catalog_exports (user_id);

create index if not exists customer_presentations_share_token_idx
  on public.customer_presentations (share_token);


-- -----------------------------------------------------------------------------
-- 6. RLS — floorplans
-- -----------------------------------------------------------------------------

alter table public.floorplans enable row level security;

drop policy if exists "Anyone can view floorplans" on public.floorplans;
drop policy if exists "Acton and admin can view floorplans" on public.floorplans;
drop policy if exists "Admins can insert floorplans" on public.floorplans;
drop policy if exists "Admins can update floorplans" on public.floorplans;
drop policy if exists "Admins can delete floorplans" on public.floorplans;

create policy "Acton and admin can view floorplans"
  on public.floorplans for select
  to authenticated
  using (public.can_view_floorplans());

create policy "Admins can insert floorplans"
  on public.floorplans for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update floorplans"
  on public.floorplans for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete floorplans"
  on public.floorplans for delete
  to authenticated
  using (public.is_admin());


-- -----------------------------------------------------------------------------
-- 7. RLS — catalog_exports (My Catalogues history)
-- -----------------------------------------------------------------------------

alter table public.catalog_exports enable row level security;

drop policy if exists "Users can view own catalog exports" on public.catalog_exports;
drop policy if exists "Users can create own catalog exports" on public.catalog_exports;
drop policy if exists "Users can delete own catalog exports" on public.catalog_exports;

create policy "Users can view own catalog exports"
  on public.catalog_exports for select
  to authenticated
  using (auth.uid() = user_id and public.can_view_floorplans());

create policy "Users can create own catalog exports"
  on public.catalog_exports for insert
  to authenticated
  with check (auth.uid() = user_id and public.can_view_floorplans());

create policy "Users can delete own catalog exports"
  on public.catalog_exports for delete
  to authenticated
  using (auth.uid() = user_id and public.can_view_floorplans());


-- -----------------------------------------------------------------------------
-- 8. RLS — customer_presentations (shareable customer PDF links)
-- -----------------------------------------------------------------------------

alter table public.customer_presentations enable row level security;

drop policy if exists "Anyone can view customer presentations" on public.customer_presentations;
drop policy if exists "Acton and admin can create customer presentations" on public.customer_presentations;

create policy "Anyone can view customer presentations"
  on public.customer_presentations for select
  to anon, authenticated
  using (true);

create policy "Acton and admin can create customer presentations"
  on public.customer_presentations for insert
  to authenticated
  with check (public.can_view_floorplans());

drop policy if exists "Acton and admin can update customer presentations"
  on public.customer_presentations;

create policy "Acton and admin can update customer presentations"
  on public.customer_presentations for update
  to authenticated
  using (public.can_view_floorplans())
  with check (public.can_view_floorplans());


-- -----------------------------------------------------------------------------
-- 9. RLS — profiles
-- -----------------------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;

create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);


-- -----------------------------------------------------------------------------
-- 10. STORAGE BUCKETS (creates if missing; marks public)
--     If this section errors, create buckets manually in Dashboard → Storage.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('floorplans', 'floorplans', true),
  ('catalog-assets', 'catalog-assets', true),
  ('customer-presentations', 'customer-presentations', true)
on conflict (id) do update
  set public = excluded.public;


-- -----------------------------------------------------------------------------
-- 11. STORAGE POLICIES — floorplans bucket
-- -----------------------------------------------------------------------------

drop policy if exists "Anyone can read floorplan files" on storage.objects;
drop policy if exists "Acton and admin can read floorplan files" on storage.objects;
drop policy if exists "Admins can upload floorplan files" on storage.objects;
drop policy if exists "Admins can delete floorplan files" on storage.objects;
drop policy if exists "Admins can update floorplan files" on storage.objects;

create policy "Acton and admin can read floorplan files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'floorplans' and public.can_view_floorplans());

create policy "Admins can upload floorplan files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'floorplans' and public.is_admin());

create policy "Admins can update floorplan files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'floorplans' and public.is_admin())
  with check (bucket_id = 'floorplans' and public.is_admin());

create policy "Admins can delete floorplan files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'floorplans' and public.is_admin());


-- -----------------------------------------------------------------------------
-- 12. STORAGE POLICIES — catalog-assets bucket (package examples PDF)
-- -----------------------------------------------------------------------------

drop policy if exists "Acton and admin can read catalog assets" on storage.objects;
drop policy if exists "Public can read catalog assets" on storage.objects;

create policy "Public can read catalog assets"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'catalog-assets');

create policy "Acton and admin can read catalog assets"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'catalog-assets' and public.can_view_floorplans());


-- -----------------------------------------------------------------------------
-- 13. STORAGE POLICIES — customer-presentations bucket (hosted share links)
-- -----------------------------------------------------------------------------

drop policy if exists "Public can read customer presentations" on storage.objects;
drop policy if exists "Acton and admin can upload customer presentations" on storage.objects;

create policy "Public can read customer presentations"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'customer-presentations');

create policy "Acton and admin can upload customer presentations"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'customer-presentations' and public.can_view_floorplans());


-- -----------------------------------------------------------------------------
-- 14. ASYNC SHARE LINKS — processing status + nullable file fields
-- -----------------------------------------------------------------------------

alter table public.customer_presentations
  add column if not exists status text default 'processing';

alter table public.customer_presentations
  add column if not exists error_message text;

alter table public.customer_presentations
  alter column file_url drop not null;

alter table public.customer_presentations
  alter column file_path drop not null;

update public.customer_presentations
set status = 'ready'
where file_url is not null
  and (status is null or status = 'processing');

drop policy if exists "Acton and admin can update customer presentations"
  on public.customer_presentations;

create policy "Acton and admin can update customer presentations"
  on public.customer_presentations for update
  to authenticated
  using (public.can_view_floorplans())
  with check (public.can_view_floorplans());


-- -----------------------------------------------------------------------------
-- DONE. Grant yourself access:
--
--   update public.profiles set role = 'admin' where email = 'your@email.com';
--
-- Then sign out and sign back in so the app picks up your role.
-- =============================================================================
