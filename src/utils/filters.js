export const DEFAULT_FILTERS = {
  search: "",
  series: "all",
  squareFeet: "all",
  beds: "all",
  baths: "all",
  basePrice: "all",
  preApproved: "all",
};

export function formatPrice(price) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatBaths(baths) {
  return Number.isInteger(baths) ? String(baths) : baths.toFixed(1);
}

/** Trim series; empty string if missing. */
export function normalizeSeries(series) {
  return (series ?? "").trim();
}

/**
 * Unique series labels for the filter dropdown (case-insensitive).
 * Keeps the first spelling seen for each series.
 */
export function getUniqueSeries(floorplans) {
  const byKey = new Map();

  for (const plan of floorplans) {
    const label = normalizeSeries(plan.series);
    if (!label) continue;
    const key = label.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, label);
  }

  return [...byKey.values()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

function matchesSquareFeet(sqft, range) {
  if (range === "all") return true;
  if (range === "under-500") return sqft < 500;
  if (range === "500-599") return sqft >= 500 && sqft <= 599;
  if (range === "600-749") return sqft >= 600 && sqft <= 749;
  if (range === "750-899") return sqft >= 750 && sqft <= 899;
  if (range === "900-plus") return sqft >= 900;
  return true;
}

function matchesBasePrice(price, range) {
  if (range === "all") return true;
  if (range === "under-300k") return price < 300000;
  if (range === "300k-350k") return price >= 300000 && price < 350000;
  if (range === "350k-400k") return price >= 350000 && price < 400000;
  if (range === "400k-plus") return price >= 400000;
  return true;
}

function matchesSeries(plan, filterSeries) {
  if (filterSeries === "all") return true;
  const planKey = normalizeSeries(plan.series).toLowerCase();
  const filterKey = filterSeries.toLowerCase();
  return planKey === filterKey;
}

export function filterFloorplans(floorplans, filters) {
  const search = filters.search.trim().toLowerCase();

  return floorplans.filter((plan) => {
    if (search && !plan.name.toLowerCase().includes(search)) return false;
    if (!matchesSeries(plan, filters.series)) return false;
    if (!matchesSquareFeet(plan.squareFeet, filters.squareFeet)) return false;
    if (filters.beds !== "all" && plan.beds !== Number(filters.beds)) return false;
    if (
      filters.baths !== "all" &&
      Number(plan.baths) !== Number(filters.baths)
    ) {
      return false;
    }
    if (!matchesBasePrice(plan.basePrice, filters.basePrice)) return false;
    if (filters.preApproved === "yes" && !plan.preApproved) return false;
    if (filters.preApproved === "no" && plan.preApproved) return false;
    return true;
  });
}
