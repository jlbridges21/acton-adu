import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { PRICE_REGION } from "../config/pricing";

export const CATALOG_ASSETS_BUCKET = "catalog-assets";

// Region-specific end templates (appended as the package examples appendix).
const END_TEMPLATE_FILES = {
  [PRICE_REGION.SAN_JOSE]: "bay-area-end-template.pdf",
  [PRICE_REGION.LA]: "la-end-template.pdf",
};

// Legacy single template, kept as a fallback if a region file is missing.
const DEFAULT_END_TEMPLATE_FILE = "end-template.pdf";

function endTemplateFileForRegion(priceRegion) {
  return END_TEMPLATE_FILES[priceRegion] || DEFAULT_END_TEMPLATE_FILE;
}

export function endTemplateStoragePath(priceRegion) {
  return `package-examples/${endTemplateFileForRegion(priceRegion)}`;
}

async function fetchBytesFromUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function fetchTemplateByFileName(fileName) {
  const storagePath = `package-examples/${fileName}`;

  // 1. Prefer the copy shipped with the app (updated on each Vercel deploy).
  const staticBytes = await fetchBytesFromUrl(
    `${import.meta.env.BASE_URL}package-examples/${encodeURIComponent(fileName)}`,
  );
  if (staticBytes) {
    return staticBytes;
  }

  if (!isSupabaseConfigured) {
    return null;
  }

  // 2. Fall back to Supabase Storage.
  const { data, error } = await supabase.storage
    .from(CATALOG_ASSETS_BUCKET)
    .download(storagePath);

  if (!error && data) {
    return new Uint8Array(await data.arrayBuffer());
  }

  const { data: publicUrlData } = supabase.storage
    .from(CATALOG_ASSETS_BUCKET)
    .getPublicUrl(storagePath);

  return fetchBytesFromUrl(publicUrlData.publicUrl);
}

/**
 * Fetch the package-examples PDF for the given price region.
 * Bay Area (San Jose) and LA each have their own end template, with a
 * fallback to the legacy end-template.pdf if the region file is not found.
 */
export async function fetchEndTemplatePdfBytes(priceRegion) {
  const candidateFiles = [
    endTemplateFileForRegion(priceRegion),
    DEFAULT_END_TEMPLATE_FILE,
  ].filter((file, index, files) => files.indexOf(file) === index);

  for (const fileName of candidateFiles) {
    const bytes = await fetchTemplateByFileName(fileName);
    if (bytes) {
      return bytes;
    }
  }

  throw new Error(
    "Could not download the package examples PDF. Confirm the region end template " +
      `(${endTemplateFileForRegion(priceRegion)}) is deployed under package-examples/ ` +
      "or uploaded to catalog-assets in Supabase Storage.",
  );
}
