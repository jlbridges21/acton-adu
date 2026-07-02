import { getDisplayBasePrice } from "../config/pricing";

export const DEFAULT_FILTERS = {
  search: "",
  series: [],
  squareFeet: [],
  beds: [],
  baths: [],
  basePrice: [],
  preApproved: [],
};

export const SQFT_FILTER_OPTIONS = [
  { value: "under-400", label: "Under 400" },
  { value: "400-599", label: "400–599" },
  { value: "600-799", label: "600–799" },
  { value: "800-999", label: "800–999" },
  { value: "1000-plus", label: "1000+" },
];

export const BED_FILTER_OPTIONS = [
  { value: "1", label: "1 bedroom" },
  { value: "2", label: "2 bedrooms" },
  { value: "3", label: "3 bedrooms" },
];

export const BATH_FILTER_OPTIONS = [
  { value: "1", label: "1 bath" },
  { value: "1.5", label: "1.5 baths" },
  { value: "2", label: "2 baths" },
  { value: "2.5", label: "2.5 baths" },
  { value: "3", label: "3 baths" },
];

export const PRICE_FILTER_OPTIONS = [
  { value: "under-250k", label: "Under $250k" },
  { value: "250k-299k", label: "$250k–$299k" },
  { value: "300k-349k", label: "$300k–$349k" },
  { value: "350k-399k", label: "$350k–$399k" },
  { value: "400k-plus", label: "$400k+" },
];

export const PRE_APPROVED_FILTER_OPTIONS = [
  { value: "yes", label: "Pre-approved" },
  { value: "no", label: "Not pre-approved" },
];

export const DEFAULT_SORT = "series";

export const SORT_OPTIONS = [
  { value: "sqft-desc", label: "Sq ft: largest to smallest" },
  { value: "sqft-asc", label: "Sq ft: smallest to largest" },
  { value: "price-desc", label: "Price: highest to lowest" },
  { value: "price-asc", label: "Price: lowest to highest" },
  { value: "series", label: "Series (A–Z)" },
];

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

export function normalizeSeries(series) {
  return (series ?? "").trim();
}

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
  if (range === "under-400") return sqft < 400;
  if (range === "400-599") return sqft >= 400 && sqft <= 599;
  if (range === "600-799") return sqft >= 600 && sqft <= 799;
  if (range === "800-999") return sqft >= 800 && sqft <= 999;
  if (range === "1000-plus") return sqft >= 1000;
  return false;
}

function matchesBasePrice(price, range) {
  if (range === "under-250k") return price < 250000;
  if (range === "250k-299k") return price >= 250000 && price < 300000;
  if (range === "300k-349k") return price >= 300000 && price < 350000;
  if (range === "350k-399k") return price >= 350000 && price < 400000;
  if (range === "400k-plus") return price >= 400000;
  return false;
}

function matchesAny(selected, matcher) {
  if (!selected.length) return true;
  return selected.some((value) => matcher(value));
}

export function sortFloorplans(floorplans, sortBy = DEFAULT_SORT, priceRegion) {
  const list = [...floorplans];
  const displayPrice = (plan) =>
    getDisplayBasePrice(plan.basePrice, priceRegion, plan.squareFeet);

  switch (sortBy) {
    case "sqft-desc":
      return list.sort((a, b) => (b.squareFeet ?? 0) - (a.squareFeet ?? 0));
    case "sqft-asc":
      return list.sort((a, b) => (a.squareFeet ?? 0) - (b.squareFeet ?? 0));
    case "price-desc":
      return list.sort((a, b) => displayPrice(b) - displayPrice(a));
    case "price-asc":
      return list.sort((a, b) => displayPrice(a) - displayPrice(b));
    case "series":
      return list.sort((a, b) => {
        const bySeries = normalizeSeries(a.series).localeCompare(
          normalizeSeries(b.series),
          undefined,
          { sensitivity: "base" },
        );
        if (bySeries !== 0) return bySeries;
        const bySqft = (a.squareFeet ?? 0) - (b.squareFeet ?? 0);
        if (bySqft !== 0) return bySqft;
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      });
    case "newest":
    default:
      return list.sort(
        (a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0),
      );
  }
}

export function groupFloorplansBySeries(floorplans) {
  const byKey = new Map();

  for (const plan of floorplans) {
    const label = normalizeSeries(plan.series);
    const key = label ? label.toLowerCase() : "__unassigned__";
    const displayLabel = label || "Unassigned series";

    if (!byKey.has(key)) {
      byKey.set(key, { key, label: displayLabel, plans: [] });
    }
    byKey.get(key).plans.push(plan);
  }

  return [...byKey.values()].sort((a, b) => {
    if (a.key === "__unassigned__") return 1;
    if (b.key === "__unassigned__") return -1;
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  });
}

export function filterFloorplans(floorplans, filters, priceRegion) {
  const search = filters.search.trim().toLowerCase();

  return floorplans.filter((plan) => {
    if (search && !plan.name.toLowerCase().includes(search)) return false;

    if (
      !matchesAny(filters.series, (value) => {
        const planKey = normalizeSeries(plan.series).toLowerCase();
        return planKey === value.toLowerCase();
      })
    ) {
      return false;
    }

    if (
      !matchesAny(filters.squareFeet, (value) =>
        matchesSquareFeet(plan.squareFeet, value),
      )
    ) {
      return false;
    }

    if (
      !matchesAny(filters.beds, (value) => plan.beds === Number(value))
    ) {
      return false;
    }

    if (
      !matchesAny(filters.baths, (value) => Number(plan.baths) === Number(value))
    ) {
      return false;
    }

    const displayPrice = getDisplayBasePrice(
      plan.basePrice,
      priceRegion,
      plan.squareFeet,
    );

    if (
      !matchesAny(filters.basePrice, (value) =>
        matchesBasePrice(displayPrice, value),
      )
    ) {
      return false;
    }

    if (
      !matchesAny(filters.preApproved, (value) => {
        if (value === "yes") return plan.preApproved;
        if (value === "no") return !plan.preApproved;
        return false;
      })
    ) {
      return false;
    }

    return true;
  });
}
