-- Async share links: create record first, upload PDF in background

alter table public.customer_presentations
  add column if not exists status text default 'processing';

alter table public.customer_presentations
  add column if not exists error_message text;

alter table public.customer_presentations
  alter column file_url drop not null;

alter table public.customer_presentations
  alter column file_path drop not null;

-- Existing completed presentations should stay ready
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
