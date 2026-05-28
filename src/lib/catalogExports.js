import { supabase, isSupabaseConfigured } from "./supabaseClient";

function snapshotFromPlans(plans) {
  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    series: plan.series ?? "",
    squareFeet: plan.squareFeet,
    beds: plan.beds,
    baths: plan.baths,
    basePrice: plan.basePrice,
  }));
}

export function mapCatalogExportFromDb(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    customerName: row.customer_name,
    floorplanIds: row.floorplan_ids ?? [],
    floorplans: row.floorplans_snapshot ?? [],
  };
}

/**
 * Persist a generated catalogue for the current user.
 */
export async function saveCatalogExport({ customerName, plans }) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be signed in to save catalogue history.");
  }

  const trimmedName = customerName.trim();
  const floorplanIds = plans.map((plan) => plan.id);

  const { error } = await supabase.from("catalog_exports").insert({
    user_id: user.id,
    customer_name: trimmedName,
    floorplan_ids: floorplanIds,
    floorplans_snapshot: snapshotFromPlans(plans),
  });

  if (error) {
    throw new Error(error.message || "Could not save catalogue history.");
  }
}

/**
 * Fetch the signed-in user's saved catalogues, newest first.
 */
export async function fetchCatalogExports() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("catalog_exports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Could not load catalogue history.");
  }

  return (data ?? []).map(mapCatalogExportFromDb);
}

/**
 * Delete a saved catalogue export (current user only — enforced by RLS).
 */
export async function deleteCatalogExport(exportId) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.from("catalog_exports").delete().eq("id", exportId);

  if (error) {
    throw new Error(error.message || "Could not delete catalogue.");
  }
}

/** Group exports by customer name for display. */
export function groupExportsByCustomer(exports) {
  const byCustomer = new Map();

  for (const entry of exports) {
    const key = entry.customerName.trim();
    if (!byCustomer.has(key)) {
      byCustomer.set(key, { customerName: key, exports: [] });
    }
    byCustomer.get(key).exports.push(entry);
  }

  return [...byCustomer.values()].sort((a, b) =>
    a.customerName.localeCompare(b.customerName, undefined, { sensitivity: "base" }),
  );
}

export function formatExportDate(isoString) {
  if (!isoString) return "";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoString));
}
