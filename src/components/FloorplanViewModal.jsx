import FloorplanCard from "./FloorplanCard";
import FloorplanMedia from "./FloorplanMedia";
import ModalShell from "./ModalShell";
import { formatBaths, formatPrice } from "../utils/filters";
import { getSimilarFloorplans } from "../utils/similarFloorplans";

export default function FloorplanViewModal({
  plan,
  allPlans,
  onClose,
  onOpenPlan,
}) {
  if (!plan) return null;

  const similar = getSimilarFloorplans(plan, allPlans);

  return (
    <ModalShell
      open
      onClose={onClose}
      title={plan.name}
      titleId="view-plan-title"
      maxWidthClass="max-w-4xl"
      headerExtra={
        <>
          {plan.series && (
            <p className="mt-0.5 text-sm text-slate-500">{plan.series}</p>
          )}
          {plan.preApproved && (
            <span className="mt-2 inline-block rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-semibold text-white">
              Pre-Approved
            </span>
          )}
        </>
      }
    >
      <FloorplanMedia plan={plan} openImageInNewTab />

      <dl className="grid grid-cols-2 gap-3 border-b border-slate-200 px-4 py-4 sm:grid-cols-3 sm:px-5">
        {plan.series && (
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Series
            </dt>
            <dd className="mt-0.5 text-base font-semibold text-slate-900">{plan.series}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Square footage
          </dt>
          <dd className="mt-0.5 text-base font-semibold text-slate-900">
            {plan.squareFeet?.toLocaleString()} sq ft
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Base price
          </dt>
          <dd className="mt-0.5 text-base font-semibold text-slate-900">
            {formatPrice(plan.basePrice)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Bedrooms
          </dt>
          <dd className="mt-0.5 text-base font-semibold text-slate-900">{plan.beds}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Bathrooms
          </dt>
          <dd className="mt-0.5 text-base font-semibold text-slate-900">
            {formatBaths(plan.baths)}
          </dd>
        </div>
      </dl>

      {similar.length > 0 && (
        <section className="bg-slate-50 px-4 py-4 sm:px-5">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Similar floorplans
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Same bedroom count or within ±100 sq ft
          </p>
          <div className="mt-3 flex gap-4 overflow-x-auto pb-2">
            {similar.map((similarPlan) => (
              <div key={similarPlan.id} className="w-[min(100%,260px)] shrink-0 sm:w-[260px]">
                <FloorplanCard plan={similarPlan} onOpenPlan={onOpenPlan} />
              </div>
            ))}
          </div>
        </section>
      )}
    </ModalShell>
  );
}
