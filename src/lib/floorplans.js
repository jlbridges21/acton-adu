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

  const { error } = await supabase
    .from("floorplans")
    .update({
      name: plan.name,
      square_feet: plan.squareFeet,
      beds: plan.beds,
      baths: plan.baths,
      base_price: plan.basePrice,
      pre_approved: plan.preApproved,
      series: plan.series,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message || "Failed to update floorplan.");
  }
}
