export default function EmptyState({
  variant = "filtered",
  onClearFilters,
}) {
  if (variant === "library") {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
        <p className="text-lg font-medium text-slate-800">No floorplans yet</p>
        <p className="mt-2 text-sm text-slate-500">
          An admin can add the first plan using + Add Plan once Supabase is connected.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
      <p className="text-lg font-medium text-slate-800">
        No floorplans match your filters.
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Try adjusting your search or filter selections.
      </p>
      <button
        type="button"
        onClick={onClearFilters}
        className="mt-6 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Clear Filters
      </button>
    </div>
  );
}
