-- Catalogue end templates (package examples PDFs), versioned per region.
-- Run this in the Supabase SQL editor.
--
-- Make sure the "catalog-assets" bucket exists (it is PUBLIC, so leave it
-- public) and has a file size limit of at least 50 MB.

create table if not exists public.catalog_end_templates (
  id uuid primary key default gen_random_uuid(),
  region text not null check (region in ('san-jose', 'la')),
  file_path text not null,
  file_name text not null,
  file_size_bytes bigint,
  page_count int,
  is_active boolean not null default false,
  uploaded_by uuid references auth.users (id),
  uploaded_by_email text,
  created_at timestamptz not null default now()
);

create unique index if not exists catalog_end_templates_one_active_per_region
  on public.catalog_end_templates (region)
  where is_active;

alter table public.catalog_end_templates enable row level security;

drop policy if exists "Acton and admin can view end templates" on public.catalog_end_templates;
drop policy if exists "Admins can insert end templates" on public.catalog_end_templates;

create policy "Acton and admin can view end templates"
  on public.catalog_end_templates for select
  to authenticated
  using (public.can_view_floorplans());

create policy "Admins can insert end templates"
  on public.catalog_end_templates for insert
  to authenticated
  with check (public.is_admin());

-- Activation is admin-only. Deactivate the region first so the partial
-- unique index (one active row per region) is not violated.
create or replace function public.activate_end_template(p_template_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_region text;
begin
  if not public.is_admin() then
    raise exception 'Only admins can activate end templates.';
  end if;

  select region into v_region
  from public.catalog_end_templates
  where id = p_template_id;

  if v_region is null then
    raise exception 'End template not found.';
  end if;

  update public.catalog_end_templates
  set is_active = false
  where region = v_region;

  update public.catalog_end_templates
  set is_active = true
  where id = p_template_id;
end;
$$;

grant execute on function public.activate_end_template(uuid) to authenticated;

-- Storage writes under end-templates/. The catalog-assets bucket stays public,
-- so reads do not need a select policy. Existing catalog-assets policies are
-- left in place.
drop policy if exists "Acton and admin can read end template files" on storage.objects;
drop policy if exists "Admins can upload end template files" on storage.objects;
drop policy if exists "Admins can delete end template files" on storage.objects;

create policy "Admins can upload end template files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'catalog-assets'
    and name like 'end-templates/%'
    and public.is_admin()
  );

-- Only used to clean up an orphaned upload if the database insert fails.
create policy "Admins can delete end template files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'catalog-assets'
    and name like 'end-templates/%'
    and public.is_admin()
  );
