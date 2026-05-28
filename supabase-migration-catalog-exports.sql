-- Saved PDF catalogue exports per user (run on existing Supabase projects).

create table if not exists public.catalog_exports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_name text not null,
  floorplan_ids uuid[] not null default '{}',
  floorplans_snapshot jsonb not null default '[]'::jsonb
);

create index if not exists catalog_exports_user_id_idx on public.catalog_exports (user_id);
create index if not exists catalog_exports_customer_name_idx on public.catalog_exports (user_id, customer_name);

alter table public.catalog_exports enable row level security;

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
