-- Acton BR Library — role migration (run entire script in Supabase SQL Editor)
-- Run this BEFORE: update public.profiles set role = 'acton' ...

-- Step 1: Allow user, acton, and admin roles
alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'acton', 'admin'));

-- Step 2: Helper — who can read floorplans
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

-- Step 3: Floorplans table — only acton + admin (DROP POLICY requires ON table_name)
drop policy if exists "Anyone can view floorplans" on public.floorplans;
drop policy if exists "Acton and admin can view floorplans" on public.floorplans;

create policy "Acton and admin can view floorplans"
  on public.floorplans
  for select
  to authenticated
  using (public.can_view_floorplans());

-- Step 4: Storage bucket (optional — uncomment if bucket "floorplans" exists)
-- drop policy if exists "Anyone can read floorplan files" on storage.objects;
-- drop policy if exists "Acton and admin can read floorplan files" on storage.objects;
--
-- create policy "Acton and admin can read floorplan files"
--   on storage.objects
--   for select
--   to authenticated
--   using (bucket_id = 'floorplans' and public.can_view_floorplans());

-- Step 5: Grant access (run separately per person)
-- update public.profiles set role = 'acton' where email = 'you@example.com';
-- update public.profiles set role = 'admin' where email = 'admin@example.com';
