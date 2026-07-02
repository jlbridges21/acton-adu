import FloorplanCard from "./FloorplanCard";

export default function FloorplanGrid({
  plans,
  onOpenPlan,
  selectedIds,
  onToggleSelect,
}) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {plans.map((plan) => (
        <FloorplanCard
          key={plan.id}
          plan={plan}
          onOpenPlan={onOpenPlan}
          selected={selectedIds.has(plan.id)}
          onToggleSelect={onToggleSelect}
        />
      ))}
    </div>
  );
}
