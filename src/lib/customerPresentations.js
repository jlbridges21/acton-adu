import { supabase, isSupabaseConfigured } from "./supabaseClient";

export const CUSTOMER_PRESENTATIONS_BUCKET = "customer-presentations";
const PRESENTATION_FILE_NAME = "acton-br-presentation.pdf";

function createShareToken() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID().replace(/-/g, "");
  }

  return `${Date.now()}${Math.random().toString(36).slice(2, 12)}`;
}

export function buildShareUrl(shareToken) {
  return `${window.location.origin}/share/${shareToken}`;
}

export function mapCustomerPresentationFromDb(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    fileUrl: row.file_url,
    filePath: row.file_path,
    includedExamples: row.included_examples,
    compressed: row.compressed,
    fileSizeMb: row.file_size_mb,
    shareToken: row.share_token,
  };
}

export async function saveCustomerPresentation({
  title,
  pdfBytes,
  includedExamples,
  compressed,
  fileSizeMb,
}) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const shareToken = createShareToken();
  const folder = `${Date.now()}-${shareToken.slice(0, 8)}`;
  const filePath = `${folder}/${PRESENTATION_FILE_NAME}`;

  const { error: uploadError } = await supabase.storage
    .from(CUSTOMER_PRESENTATIONS_BUCKET)
    .upload(filePath, pdfBytes, {
      contentType: "application/pdf",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Could not upload customer presentation.");
  }

  const { data: publicUrlData } = supabase.storage
    .from(CUSTOMER_PRESENTATIONS_BUCKET)
    .getPublicUrl(filePath);

  const { error: insertError } = await supabase.from("customer_presentations").insert({
    title,
    file_url: publicUrlData.publicUrl,
    file_path: filePath,
    included_examples: includedExamples,
    compressed,
    file_size_mb: fileSizeMb,
    share_token: shareToken,
  });

  if (insertError) {
    await supabase.storage.from(CUSTOMER_PRESENTATIONS_BUCKET).remove([filePath]);
    throw new Error(insertError.message || "Could not save customer presentation.");
  }

  return {
    shareToken,
    fileUrl: publicUrlData.publicUrl,
    shareUrl: buildShareUrl(shareToken),
  };
}

export async function fetchCustomerPresentationByToken(shareToken) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("customer_presentations")
    .select("*")
    .eq("share_token", shareToken)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Could not load presentation.");
  }

  if (!data) {
    return null;
  }

  return mapCustomerPresentationFromDb(data);
}
