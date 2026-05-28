import FloorplanGrid from "./FloorplanGrid";

/**
 * Renders plans grouped under collapsible series headings (Series A–Z sort).
 * Groups are collapsed by default unless their key is in expandedKeys.
 */
export default function FloorplanSeriesSections({
  groups,
  expandedKeys,
  onToggleGroup,
  onOpenPlan,
  selectedIds,
  onToggleSelect,
}) {
  return (
    <div className="space-y-10">
      {groups.map((group) => {
        const isExpanded = expandedKeys.has(group.key);

        return (
          <section key={group.key}>
            <button
              type="button"
              onClick={() => onToggleGroup(group.key)}
              className="mb-4 flex w-full items-start justify-between gap-3 border-b border-slate-200 pb-2 text-left transition hover:border-slate-300"
              aria-expanded={isExpanded}
              aria-controls={`series-panel-${group.key}`}
            >
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900">
                  {group.label}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {group.plans.length} floorplan{group.plans.length === 1 ? "" : "s"}
                </p>
              </div>
              <span
                className="mt-1 shrink-0 rounded-full p-2 text-slate-500 hover:bg-slate-100"
                aria-hidden="true"
              >
                <svg
                  className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
            </button>

            {isExpanded && (
              <div id={`series-panel-${group.key}`}>
                <FloorplanGrid
                  plans={group.plans}
                  onOpenPlan={onOpenPlan}
                  selectedIds={selectedIds}
                  onToggleSelect={onToggleSelect}
                />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
