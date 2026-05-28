-- Quick fix if you only got the constraint error when setting role = 'acton'
-- Run this first, then run your UPDATE again.

alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'acton', 'admin'));

-- Example:
-- update public.profiles set role = 'acton' where email = 'jackson.bridges21@gmail.com';
