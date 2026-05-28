import PriceRegionToggle from "./PriceRegionToggle";

const selectClass =
  "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const inputClass =
  "w-full min-w-[180px] rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:w-auto sm:min-w-[220px]";

export default function FilterBar({
  filters,
  seriesOptions = [],
  onFilterChange,
  onClearFilters,
}) {
  const update = (key, value) => onFilterChange({ ...filters, [key]: value });

  return (
    <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm backdrop-blur sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
        <input
          type="search"
          placeholder="Search by plan name..."
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
          className={inputClass}
          aria-label="Search by plan name"
        />

        <select
          value={filters.series}
          onChange={(e) => update("series", e.target.value)}
          className={selectClass}
          aria-label="Filter by series"
        >
          <option value="all">All series</option>
          {seriesOptions.map((series) => (
            <option key={series.toLowerCase()} value={series}>
              {series}
            </option>
          ))}
        </select>

        <select
          value={filters.squareFeet}
          onChange={(e) => update("squareFeet", e.target.value)}
          className={selectClass}
          aria-label="Filter by square footage"
        >
          <option value="all">All sq ft</option>
          <option value="under-500">Under 500</option>
          <option value="500-599">500 – 599</option>
          <option value="600-749">600 – 749</option>
          <option value="750-899">750 – 899</option>
          <option value="900-plus">900+</option>
        </select>

        <select
          value={filters.beds}
          onChange={(e) => update("beds", e.target.value)}
          className={selectClass}
          aria-label="Filter by bedrooms"
        >
          <option value="all">All beds</option>
          <option value="1">1 bed</option>
          <option value="2">2 beds</option>
          <option value="3">3 beds</option>
        </select>

        <select
          value={filters.baths}
          onChange={(e) => update("baths", e.target.value)}
          className={selectClass}
          aria-label="Filter by bathrooms"
        >
          <option value="all">All baths</option>
          <option value="1">1 bath</option>
          <option value="1.5">1.5 baths</option>
          <option value="2">2 baths</option>
          <option value="2.5">2.5 baths</option>
          <option value="3">3 baths</option>
        </select>

        <select
          value={filters.basePrice}
          onChange={(e) => update("basePrice", e.target.value)}
          className={selectClass}
          aria-label="Filter by base price"
        >
          <option value="all">All prices</option>
          <option value="under-300k">Under $300k</option>
          <option value="300k-350k">$300k – $350k</option>
          <option value="350k-400k">$350k – $400k</option>
          <option value="400k-plus">$400k+</option>
        </select>

        <select
          value={filters.preApproved}
          onChange={(e) => update("preApproved", e.target.value)}
          className={selectClass}
          aria-label="Filter by pre-approved status"
        >
          <option value="all">Pre-approved: All</option>
          <option value="yes">Pre-approved: Yes</option>
          <option value="no">Pre-approved: No</option>
        </select>

        <PriceRegionToggle />

        <button
          type="button"
          onClick={onClearFilters}
          className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
}
