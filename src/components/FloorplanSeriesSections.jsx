import FloorplanGrid from "./FloorplanGrid";

/**
 * Renders plans grouped under series headings (used when sort is Series A–Z).
 */
export default function FloorplanSeriesSections({ groups, onOpenPlan }) {
  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.key}>
          <div className="mb-4 border-b border-slate-200 pb-2">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">
              {group.label}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {group.plans.length} floorplan{group.plans.length === 1 ? "" : "s"}
            </p>
          </div>
          <FloorplanGrid plans={group.plans} onOpenPlan={onOpenPlan} />
        </section>
      ))}
    </div>
  );
}
