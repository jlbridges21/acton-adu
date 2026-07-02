-- Customer-facing hosted PDF presentations

create table if not exists public.customer_presentations (
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

create index if not exists customer_presentations_share_token_idx
  on public.customer_presentations (share_token);

alter table public.customer_presentations enable row level security;

create policy "Anyone can view customer presentations"
  on public.customer_presentations for select
  to anon, authenticated
  using (true);

create policy "Acton and admin can create customer presentations"
  on public.customer_presentations for insert
  to authenticated
  with check (public.can_view_floorplans());

-- Storage bucket: customer-presentations (public read recommended)
-- create policy "Public can read customer presentations"
-- on storage.objects for select
-- to anon, authenticated
-- using (bucket_id = 'customer-presentations');
--
-- create policy "Acton and admin can upload customer presentations"
-- on storage.objects for insert
-- to authenticated
-- with check (bucket_id = 'customer-presentations' and public.can_view_floorplans());
