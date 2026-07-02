-- Storage read access for catalogue PDF assets (run after creating bucket "catalog-assets").
-- Upload: package-examples/end-template.pdf

-- create policy "Acton and admin can read catalog assets"
-- on storage.objects for select
-- to authenticated
-- using (bucket_id = 'catalog-assets' and public.can_view_floorplans());
