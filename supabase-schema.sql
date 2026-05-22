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

-- User roles: you assign admin manually in Supabase (see README).
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
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

-- ---------- RLS: floorplans ----------
alter table floorplans enable row level security;

create policy "Anyone can view floorplans"
  on floorplans for select
  using (true);

create policy "Admins can insert floorplans"
  on floorplans for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update floorplans"
  on floorplans for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- RLS: profiles ----------
alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select
  to authenticated
  using (auth.uid() = id);

-- ---------- Storage policies (run after creating public bucket "floorplans") ----------
-- create policy "Anyone can read floorplan files"
-- on storage.objects for select
-- using (bucket_id = 'floorplans');
--
-- create policy "Admins can upload floorplan files"
-- on storage.objects for insert
-- to authenticated
-- with check (bucket_id = 'floorplans' and public.is_admin());
