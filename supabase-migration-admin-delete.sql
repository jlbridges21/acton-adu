-- Allow admins to delete floorplans and storage files (run if delete fails in app).

create policy "Admins can delete floorplans"
  on public.floorplans for delete
  to authenticated
  using (public.is_admin());

-- Storage (bucket "floorplans"):
-- create policy "Admins can delete floorplan files"
-- on storage.objects for delete
-- to authenticated
-- using (bucket_id = 'floorplans' and public.is_admin());
