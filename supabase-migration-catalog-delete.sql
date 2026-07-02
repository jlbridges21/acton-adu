-- Allow users to delete their own saved catalogues (if table already exists).

create policy "Users can delete own catalog exports"
  on public.catalog_exports for delete
  to authenticated
  using (auth.uid() = user_id and public.can_view_floorplans());
