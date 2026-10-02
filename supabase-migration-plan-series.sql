-- Admin-managed floorplan series (add, rename, delete)

create table if not exists public.plan_series (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamp with time zone default now()
);

alter table public.plan_series enable row level security;

drop policy if exists "Acton and admin can view plan series" on public.plan_series;
drop policy if exists "Admins can insert plan series" on public.plan_series;
drop policy if exists "Admins can update plan series" on public.plan_series;
drop policy if exists "Admins can delete plan series" on public.plan_series;

create policy "Acton and admin can view plan series"
  on public.plan_series for select
  to authenticated
  using (public.can_view_floorplans());

create policy "Admins can insert plan series"
  on public.plan_series for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update plan series"
  on public.plan_series for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete plan series"
  on public.plan_series for delete
  to authenticated
  using (public.is_admin());

insert into public.plan_series (name, sort_order)
values
  ('Investor Series', 1),
  ('Investor+ Series', 2),
  ('Signature Series', 3),
  ('Bonus Series', 4),
  ('Age In Place', 5),
  ('Adapt Series', 6),
  ('Black and White Series', 7)
on conflict (name) do nothing;
