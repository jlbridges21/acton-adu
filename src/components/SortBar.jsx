const selectClass =
  "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

export default function SortBar({
  showingCount,
  totalCount,
  sortBy,
  sortOptions,
  onSortChange,
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-slate-600">
        Showing {showingCount} of {totalCount} floorplans
      </p>
      <div className="flex items-center gap-2 sm:justify-end">
        <label htmlFor="sort-by" className="text-sm font-medium text-slate-600">
          Sort by
        </label>
        <select
          id="sort-by"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
          className={selectClass}
          aria-label="Sort floorplans"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
