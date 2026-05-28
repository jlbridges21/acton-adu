export default function Header({
  badge = "Floorplan Library",
  onAddPlan,
  showAddPlan = false,
  userEmail,
  onSignOut,
}) {
  return (
    <header className="relative border-b border-slate-200 bg-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="absolute right-4 top-4 flex flex-col items-end gap-2 sm:right-6 lg:right-8">
        {showAddPlan && onAddPlan && (
          <button
            type="button"
            onClick={onAddPlan}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            + Add Plan
          </button>
        )}
        {userEmail && onSignOut && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="max-w-[160px] truncate sm:max-w-[220px]">{userEmail}</span>
            <button
              type="button"
              onClick={onSignOut}
              className="font-medium text-blue-600 hover:text-blue-700"
            >
              Sign out
            </button>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-7xl text-center">
        <span className="mb-4 inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          {badge}
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Acton BR Library
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 sm:text-lg">
          Browse and filter Acton&apos;s build-ready ADU floorplans.
        </p>
      </div>
    </header>
  );
}
