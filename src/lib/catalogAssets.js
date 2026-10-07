import { PDFDocument } from "pdf-lib";
import { PRICE_REGION_LABELS } from "../config/pricing";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

export const CATALOG_ASSETS_BUCKET = "catalog-assets";

const MAX_TEMPLATE_BYTES = 50 * 1024 * 1024;

function regionLabel(region) {
  return PRICE_REGION_LABELS[region] || region;
}

function assertSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }
}

function mapEndTemplate(row) {
  return {
    id: row.id,
    region: row.region,
    filePath: row.file_path,
    fileName: row.file_name,
    fileSizeBytes: row.file_size_bytes,
    pageCount: row.page_count,
    isActive: row.is_active,
    uploadedBy: row.uploaded_by,
    uploadedByEmail: row.uploaded_by_email,
    createdAt: row.created_at,
  };
}

export async function fetchActiveEndTemplate(region) {
  assertSupabase();

  const { data, error } = await supabase
    .from("catalog_end_templates")
    .select("*")
    .eq("region", region)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Could not load the end template.");
  }

  return data ? mapEndTemplate(data) : null;
}

export async function listEndTemplateVersions(region) {
  assertSupabase();

  const { data, error } = await supabase
    .from("catalog_end_templates")
    .select("*")
    .eq("region", region)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Could not load end template history.");
  }

  return (data ?? []).map(mapEndTemplate);
}

async function removeUploadedFile(filePath) {
  const { error } = await supabase.storage.from(CATALOG_ASSETS_BUCKET).remove([filePath]);
  if (error) {
    console.warn("Could not remove failed end template upload.", error.message);
  }
}

/**
 * Upload a new end-template PDF and make it the active version for the region.
 */
export async function uploadEndTemplate({ region, file, onStatus }) {
  assertSupabase();

  onStatus?.("Checking PDF…");

  const isPdf =
    file?.type === "application/pdf" || file?.name?.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    throw new Error("Upload a PDF file.");
  }
  if (file.size > MAX_TEMPLATE_BYTES) {
    throw new Error("PDF must be 50 MB or smaller.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  let pageCount;
  try {
    const pdfDoc = await PDFDocument.load(bytes);
    pageCount = pdfDoc.getPageCount();
  } catch {
    throw new Error("This PDF could not be read.");
  }

  const filePath = `end-templates/${region}/${Date.now()}-${crypto.randomUUID()}.pdf`;

  onStatus?.("Uploading…");
  const { error: uploadError } = await supabase.storage
    .from(CATALOG_ASSETS_BUCKET)
    .upload(filePath, bytes, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Could not upload the end template.");
  }

  let inserted;
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      throw new Error(userError.message || "Could not confirm the signed-in admin.");
    }

    const { data, error: insertError } = await supabase
      .from("catalog_end_templates")
      .insert({
        region,
        file_path: filePath,
        file_name: file.name,
        file_size_bytes: file.size,
        page_count: pageCount,
        is_active: false,
        uploaded_by: userData.user?.id ?? null,
        uploaded_by_email: userData.user?.email ?? null,
      })
      .select("id")
      .single();

    if (insertError) {
      throw new Error(insertError.message || "Could not save the end template.");
    }

    inserted = data;
  } catch (error) {
    await removeUploadedFile(filePath);
    throw error;
  }

  onStatus?.("Activating…");
  const { error: activateError } = await supabase.rpc("activate_end_template", {
    p_template_id: inserted.id,
  });

  if (activateError) {
    throw new Error(
      activateError.message ||
        "The template was saved but could not be activated. Restore it from version history.",
    );
  }

  return inserted.id;
}

export async function activateEndTemplate(templateId) {
  assertSupabase();

  const { error } = await supabase.rpc("activate_end_template", {
    p_template_id: templateId,
  });

  if (error) {
    throw new Error(error.message || "Could not restore this end template.");
  }
}

export function getEndTemplatePublicUrl(filePath) {
  const { data } = supabase.storage.from(CATALOG_ASSETS_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Bytes of the active package-examples PDF for the catalogue's price region.
 */
export async function fetchEndTemplatePdfBytes(priceRegion) {
  assertSupabase();

  const label = regionLabel(priceRegion);
  const active = await fetchActiveEndTemplate(priceRegion);
  if (!active) {
    throw new Error(
      `No end template has been uploaded for ${label}. An admin can upload one in Settings → Catalogue end templates.`,
    );
  }

  const { data, error } = await supabase.storage
    .from(CATALOG_ASSETS_BUCKET)
    .download(active.filePath);

  if (!error && data) {
    return new Uint8Array(await data.arrayBuffer());
  }

  try {
    const response = await fetch(getEndTemplatePublicUrl(active.filePath));
    if (response.ok) {
      return new Uint8Array(await response.arrayBuffer());
    }
  } catch {
    // Fall through to the error below.
  }

  throw new Error(error?.message || `Could not download the ${label} end template.`);
}
