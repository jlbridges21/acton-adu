import PriceRegionToggle from "./PriceRegionToggle";
import FilterMultiSelect from "./FilterMultiSelect";
import {
  BATH_FILTER_OPTIONS,
  BED_FILTER_OPTIONS,
  PRE_APPROVED_FILTER_OPTIONS,
  PRICE_FILTER_OPTIONS,
  SQFT_FILTER_OPTIONS,
} from "../utils/filters";

const inputClass =
  "w-full min-w-[180px] rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-auto sm:min-w-[220px]";

export default function FilterBar({
  filters,
  seriesOptions = [],
  onFilterChange,
  onClearFilters,
}) {
  const update = (key, value) => onFilterChange({ ...filters, [key]: value });

  const seriesFilterOptions = seriesOptions.map((series) => ({
    value: series,
    label: series,
  }));

  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search by plan name..."
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            className={inputClass}
            aria-label="Search by plan name"
          />

          <PriceRegionToggle />

          <button
            type="button"
            onClick={onClearFilters}
            className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
          >
            Clear Filters
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterMultiSelect
            label="Series"
            options={seriesFilterOptions}
            selected={filters.series}
            onChange={(value) => update("series", value)}
            ariaLabel="Filter by series"
          />
          <FilterMultiSelect
            label="Square footage"
            options={SQFT_FILTER_OPTIONS}
            selected={filters.squareFeet}
            onChange={(value) => update("squareFeet", value)}
            ariaLabel="Filter by square footage"
          />
          <FilterMultiSelect
            label="Bedrooms"
            options={BED_FILTER_OPTIONS}
            selected={filters.beds}
            onChange={(value) => update("beds", value)}
            ariaLabel="Filter by bedrooms"
          />
          <FilterMultiSelect
            label="Bathrooms"
            options={BATH_FILTER_OPTIONS}
            selected={filters.baths}
            onChange={(value) => update("baths", value)}
            ariaLabel="Filter by bathrooms"
          />
          <FilterMultiSelect
            label="Base price"
            options={PRICE_FILTER_OPTIONS}
            selected={filters.basePrice}
            onChange={(value) => update("basePrice", value)}
            ariaLabel="Filter by base price"
          />
          <FilterMultiSelect
            label="Pre-approved"
            options={PRE_APPROVED_FILTER_OPTIONS}
            selected={filters.preApproved}
            onChange={(value) => update("preApproved", value)}
            ariaLabel="Filter by pre-approved status"
          />
        </div>
      </div>
    </div>
  );
}
