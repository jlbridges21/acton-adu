-- Acton BR Library — Supabase setup
-- Run in the Supabase SQL Editor (in order).

-- Floorplan metadata
create table floorplans (
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

-- Roles: user (no library access), acton (browse/export), admin (full access).
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user', 'acton', 'admin')),
  created_at timestamp with time zone default now()
);

-- Auto-create a profile when someone signs up (default role: user).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper for RLS: true when the logged-in user is an admin.
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

-- Helper for RLS: acton or admin can browse floorplans.
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

-- ---------- RLS: floorplans ----------
alter table floorplans enable row level security;

create policy "Acton and admin can view floorplans"
  on floorplans for select
  to authenticated
  using (public.can_view_floorplans());

create policy "Admins can insert floorplans"
  on floorplans for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update floorplans"
  on floorplans for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete floorplans"
  on floorplans for delete
  to authenticated
  using (public.is_admin());

-- Saved PDF catalogues per user
create table catalog_exports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_name text not null,
  floorplan_ids uuid[] not null default '{}',
  floorplans_snapshot jsonb not null default '[]'::jsonb
);

create index catalog_exports_user_id_idx on catalog_exports (user_id);

-- ---------- RLS: catalog_exports ----------
alter table catalog_exports enable row level security;

create policy "Users can view own catalog exports"
  on catalog_exports for select
  to authenticated
  using (auth.uid() = user_id and public.can_view_floorplans());

create policy "Users can create own catalog exports"
  on catalog_exports for insert
  to authenticated
  with check (auth.uid() = user_id and public.can_view_floorplans());

create policy "Users can delete own catalog exports"
  on catalog_exports for delete
  to authenticated
  using (auth.uid() = user_id and public.can_view_floorplans());

-- Customer-facing hosted PDF presentations
create table customer_presentations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  title text,
  file_url text not null,
  file_path text not null,
  included_examples boolean default false,
  compressed boolean default false,
  file_size_mb numeric,
  share_token text unique not null
);

create index customer_presentations_share_token_idx on customer_presentations (share_token);

alter table customer_presentations enable row level security;

create policy "Anyone can view customer presentations"
  on customer_presentations for select
  to anon, authenticated
  using (true);

create policy "Acton and admin can create customer presentations"
  on customer_presentations for insert
  to authenticated
  with check (public.can_view_floorplans());

-- ---------- RLS: profiles ----------
alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select
  to authenticated
  using (auth.uid() = id);

-- ---------- Storage policies (run after creating public bucket "floorplans") ----------
-- create policy "Acton and admin can read floorplan files"
-- on storage.objects for select
-- to authenticated
-- using (bucket_id = 'floorplans' and public.can_view_floorplans());
--
-- create policy "Admins can upload floorplan files"
-- on storage.objects for insert
-- to authenticated
-- with check (bucket_id = 'floorplans' and public.is_admin());
--
-- create policy "Admins can delete floorplan files"
-- on storage.objects for delete
-- to authenticated
-- using (bucket_id = 'floorplans' and public.is_admin());
--
-- Bucket: customer-presentations (public read recommended for share links)
-- create policy "Public can read customer presentations"
-- on storage.objects for select
-- to anon, authenticated
-- using (bucket_id = 'customer-presentations');
--
-- create policy "Acton and admin can upload customer presentations"
-- on storage.objects for insert
-- to authenticated
-- with check (bucket_id = 'customer-presentations' and public.can_view_floorplans());
