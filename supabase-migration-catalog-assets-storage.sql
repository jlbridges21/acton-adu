-- Storage read access for catalogue PDF assets (run after creating bucket "catalog-assets").
-- End-template upload, versioning, and storage policies are in
-- supabase-migration-end-templates.sql. Do not upload package-examples PDFs by hand.

-- create policy "Acton and admin can read catalog assets"
-- on storage.objects for select
-- to authenticated
-- using (bucket_id = 'catalog-assets' and public.can_view_floorplans());
