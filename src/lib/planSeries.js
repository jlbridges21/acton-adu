import { supabase, isSupabaseConfigured } from "./supabaseClient";

export function mapPlanSeriesFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  };
}

export async function fetchPlanSeries() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from("plan_series")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message || "Could not load series.");
  }

  return (data ?? []).map(mapPlanSeriesFromDb);
}

export async function createPlanSeries(name) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Enter a series name.");
  }

  const existing = await fetchPlanSeries();
  const duplicate = existing.find(
    (item) => item.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (duplicate) {
    throw new Error(`"${duplicate.name}" already exists.`);
  }

  const nextOrder =
    existing.reduce((max, item) => Math.max(max, item.sortOrder || 0), 0) + 1;

  const { data, error } = await supabase
    .from("plan_series")
    .insert({ name: trimmed, sort_order: nextOrder })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message || "Could not add series.");
  }

  return mapPlanSeriesFromDb(data);
}

/**
 * Rename a series and update every floorplan that uses the old name.
 */
export async function updatePlanSeries(id, oldName, newName) {
  const trimmed = newName.trim();
  if (!trimmed) {
    throw new Error("Series name is required.");
  }

  if (trimmed === oldName) {
    return;
  }

  const existing = await fetchPlanSeries();
  const duplicate = existing.find(
    (item) =>
      item.id !== id && item.name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (duplicate) {
    throw new Error(`"${duplicate.name}" already exists.`);
  }

  const { error } = await supabase
    .from("plan_series")
    .update({ name: trimmed })
    .eq("id", id);

  if (error) {
    throw new Error(error.message || "Could not rename series.");
  }

  const { error: planError } = await supabase
    .from("floorplans")
    .update({ series: trimmed })
    .eq("series", oldName);

  if (planError) {
    throw new Error(
      planError.message ||
        "Series was renamed, but existing plans could not be updated.",
    );
  }
}

/**
 * Delete a series. Plans that used it become unassigned.
 */
export async function deletePlanSeries(id, name) {
  const { error: planError } = await supabase
    .from("floorplans")
    .update({ series: "" })
    .eq("series", name);

  if (planError) {
    throw new Error(planError.message || "Could not unassign plans from this series.");
  }

  const { error } = await supabase.from("plan_series").delete().eq("id", id);

  if (error) {
    throw new Error(error.message || "Could not delete series.");
  }
}
