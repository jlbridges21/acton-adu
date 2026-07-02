import { supabase, isSupabaseConfigured } from "./supabaseClient";

export const CUSTOMER_PRESENTATIONS_BUCKET = "customer-presentations";
export const PRESENTATION_STATUS = {
  PROCESSING: "processing",
  READY: "ready",
  FAILED: "failed",
};

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
    status: row.status || (row.file_url ? PRESENTATION_STATUS.READY : PRESENTATION_STATUS.PROCESSING),
    errorMessage: row.error_message,
  };
}

/**
 * Create a share record immediately before the PDF exists.
 */
export async function createPendingCustomerPresentation({
  title,
  includedExamples,
  compressed,
}) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const shareToken = createShareToken();

  const { data, error } = await supabase
    .from("customer_presentations")
    .insert({
      title,
      share_token: shareToken,
      included_examples: includedExamples,
      compressed,
      status: PRESENTATION_STATUS.PROCESSING,
      file_url: null,
      file_path: null,
    })
    .select("id, share_token")
    .single();

  if (error) {
    throw new Error(error.message || "Could not create share link.");
  }

  return {
    id: data.id,
    shareToken: data.share_token,
    shareUrl: buildShareUrl(data.share_token),
  };
}

export async function updateCustomerPresentationReady({
  presentationId,
  fileUrl,
  filePath,
  compressed,
  fileSizeMb,
}) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("customer_presentations")
    .update({
      file_url: fileUrl,
      file_path: filePath,
      compressed,
      file_size_mb: fileSizeMb,
      status: PRESENTATION_STATUS.READY,
      error_message: null,
    })
    .eq("id", presentationId);

  if (error) {
    throw new Error(error.message || "Could not update customer presentation.");
  }
}

export async function markCustomerPresentationFailed(presentationId, errorMessage) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("customer_presentations")
    .update({
      status: PRESENTATION_STATUS.FAILED,
      error_message: errorMessage || "Could not prepare this presentation.",
    })
    .eq("id", presentationId);

  if (error) {
    console.warn("Could not mark presentation as failed.", error);
  }
}

/**
 * Upload PDF bytes to storage and mark the pending presentation ready.
 */
export async function uploadPdfForExistingPresentation({
  presentationId,
  shareToken,
  pdfBytes,
  compressed,
  fileSizeMb,
}) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

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

  await updateCustomerPresentationReady({
    presentationId,
    fileUrl: publicUrlData.publicUrl,
    filePath,
    compressed,
    fileSizeMb,
  });

  return {
    fileUrl: publicUrlData.publicUrl,
    filePath,
  };
}

/** Legacy one-step save (kept for compatibility). */
export async function saveCustomerPresentation({
  title,
  pdfBytes,
  includedExamples,
  compressed,
  fileSizeMb,
}) {
  const pending = await createPendingCustomerPresentation({
    title,
    includedExamples,
    compressed,
  });

  await uploadPdfForExistingPresentation({
    presentationId: pending.id,
    shareToken: pending.shareToken,
    pdfBytes,
    compressed,
    fileSizeMb,
  });

  return {
    shareToken: pending.shareToken,
    shareUrl: pending.shareUrl,
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
