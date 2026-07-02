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
    <div className="space-y-8">
      {groups.map((group) => {
        const isExpanded = expandedKeys.has(group.key);

        return (
          <section key={group.key}>
            <button
              type="button"
              onClick={() => onToggleGroup(group.key)}
              className="group mb-3 inline-flex max-w-full items-center gap-2 rounded-md border border-slate-200/70 bg-white px-2.5 py-1 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              aria-expanded={isExpanded}
              aria-controls={`series-panel-${group.key}`}
            >
              <span className="text-sm font-medium tracking-tight text-slate-800">
                {group.label}
              </span>
              <span className="text-xs text-slate-400" aria-hidden="true">
                ·
              </span>
              <span className="text-xs text-slate-500">
                {group.plans.length} plan{group.plans.length === 1 ? "" : "s"}
              </span>
              <svg
                className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:text-slate-600 ${isExpanded ? "rotate-180" : ""}`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
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
