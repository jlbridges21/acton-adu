import { supabase, isSupabaseConfigured } from "./supabaseClient";

const BUCKET = "floorplans";

const ACCEPTED_MIME = {
  "image/jpeg": "image",
  "image/png": "image",
  "application/pdf": "pdf",
};

/** Convert a Supabase row (snake_case) into the shape our UI components use. */
export function mapFloorplanFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    squareFeet: row.square_feet,
    beds: row.beds,
    baths: Number(row.baths),
    basePrice: row.base_price,
    preApproved: row.pre_approved,
    fileType: row.file_type,
    fileUrl: row.file_url,
    filePath: row.file_path,
    series: row.series ?? "",
    createdAt: row.created_at,
  };
}

/**
 * Fetch all floorplans for the public library page.
 * Ordered newest first.
 */
export async function fetchFloorplans() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.",
    );
  }

  const { data, error } = await supabase
    .from("floorplans")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapFloorplanFromDb);
}

export function getFileTypeFromMime(mimeType) {
  return ACCEPTED_MIME[mimeType] ?? null;
}

function sanitizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

/**
 * Upload a floorplan file to Storage, then save metadata to the floorplans table.
 */
export async function uploadFloorplan({ plan, file }) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const fileType = getFileTypeFromMime(file.type);
  if (!fileType) {
    throw new Error("Unsupported file type. Use JPEG, PNG, or PDF.");
  }

  const filePath = `${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { cacheControl: "3600", upsert: false });

  if (uploadError) {
    throw new Error(uploadError.message || "Failed to upload file to storage.");
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  const fileUrl = publicUrlData.publicUrl;

  const { error: insertError } = await supabase.from("floorplans").insert({
    name: plan.name,
    square_feet: plan.squareFeet,
    beds: plan.beds,
    baths: plan.baths,
    base_price: plan.basePrice,
    pre_approved: plan.preApproved,
    series: plan.series,
    file_type: fileType,
    file_url: fileUrl,
    file_path: filePath,
  });

  if (insertError) {
    throw new Error(insertError.message || "Failed to save plan metadata.");
  }

  return { fileUrl, filePath };
}

/**
 * Update floorplan metadata (admins only — enforced by Supabase RLS).
 */
export async function updateFloorplan(id, plan) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("floorplans")
    .update({
      name: plan.name,
      square_feet: Math.round(Number(plan.squareFeet)),
      beds: Math.round(Number(plan.beds)),
      baths: Number(plan.baths),
      base_price: Math.round(Number(plan.basePrice)),
      pre_approved: Boolean(plan.preApproved),
      series: plan.series,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to update floorplan.");
  }

  if (!data) {
    throw new Error(
      "No floorplan was updated. Confirm you have admin access and that the update policy is enabled in Supabase.",
    );
  }

  return data;
}

async function removeStorageFile(filePath) {
  if (!filePath) return;
  const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
  if (error) {
    console.warn("Could not remove old floorplan file:", error.message);
  }
}

/**
 * Replace the floorplan file in Storage and update metadata (admins only).
 */
export async function replaceFloorplanFile(id, { file, previousFilePath }) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const fileType = getFileTypeFromMime(file.type);
  if (!fileType) {
    throw new Error("Unsupported file type. Use JPEG, PNG, or PDF.");
  }

  const filePath = `${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { cacheControl: "3600", upsert: false });

  if (uploadError) {
    throw new Error(uploadError.message || "Failed to upload file to storage.");
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  const { data, error: updateError } = await supabase
    .from("floorplans")
    .update({
      file_type: fileType,
      file_url: publicUrlData.publicUrl,
      file_path: filePath,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    await removeStorageFile(filePath);
    throw new Error(updateError.message || "Failed to update floorplan file.");
  }

  if (!data) {
    await removeStorageFile(filePath);
    throw new Error(
      "Floorplan file could not be updated. Confirm you have admin access in Supabase.",
    );
  }

  if (previousFilePath && previousFilePath !== filePath) {
    await removeStorageFile(previousFilePath);
  }

  return { fileUrl: publicUrlData.publicUrl, filePath, fileType };
}

/**
 * Delete a floorplan row and its storage file (admins only).
 */
export async function deleteFloorplan(plan) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const { error: deleteError } = await supabase
    .from("floorplans")
    .delete()
    .eq("id", plan.id);

  if (deleteError) {
    throw new Error(deleteError.message || "Failed to delete floorplan.");
  }

  await removeStorageFile(plan.filePath);
}
