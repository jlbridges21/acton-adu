import { supabase, isSupabaseConfigured } from "./supabaseClient";

export const CATALOG_ASSETS_BUCKET = "catalog-assets";
export const END_TEMPLATE_PATH = "package-examples/end-template.pdf";

/**
 * Fetch the fixed package-examples PDF from Supabase Storage.
 * Tries authenticated download first, then falls back to the public URL.
 */
export async function fetchEndTemplatePdfBytes() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase.storage
    .from(CATALOG_ASSETS_BUCKET)
    .download(END_TEMPLATE_PATH);

  if (!error && data) {
    return new Uint8Array(await data.arrayBuffer());
  }

  const { data: publicUrlData } = supabase.storage
    .from(CATALOG_ASSETS_BUCKET)
    .getPublicUrl(END_TEMPLATE_PATH);

  const response = await fetch(publicUrlData.publicUrl);
  if (!response.ok) {
    throw new Error(
      "Could not download the package examples PDF. Confirm the file exists at catalog-assets/package-examples/end-template.pdf and that storage read access is allowed for signed-in users.",
    );
  }

  return new Uint8Array(await response.arrayBuffer());
}
