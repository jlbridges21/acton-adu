import { supabase, isSupabaseConfigured } from "./supabaseClient";

export const CATALOG_ASSETS_BUCKET = "catalog-assets";
export const END_TEMPLATE_PATH = "package-examples/end-template.pdf";
const STATIC_END_TEMPLATE_URL = `${import.meta.env.BASE_URL}package-examples/end-template.pdf`;

async function fetchBytesFromUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  return new Uint8Array(await response.arrayBuffer());
}

/**
 * Fetch the fixed package-examples PDF.
 * Prefers the copy shipped with the app (updated on each Vercel deploy),
 * then falls back to Supabase Storage.
 */
export async function fetchEndTemplatePdfBytes() {
  const staticBytes = await fetchBytesFromUrl(STATIC_END_TEMPLATE_URL);
  if (staticBytes) {
    return staticBytes;
  }

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

  const storageBytes = await fetchBytesFromUrl(publicUrlData.publicUrl);
  if (storageBytes) {
    return storageBytes;
  }

  throw new Error(
    "Could not download the package examples PDF. Confirm package-examples/end-template.pdf is deployed or uploaded to catalog-assets in Supabase Storage.",
  );
}
