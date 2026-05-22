import { useState } from "react";
import { formatBaths, formatPrice } from "../utils/filters";

function ImagePreview({ plan }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-100 text-slate-400">
        <span className="text-xs font-medium">Preview unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={plan.fileUrl}
      alt={`${plan.name} floorplan preview`}
      className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-[1.01]"
      onError={() => setHasError(true)}
    />
  );
}

function PdfPreview({ plan }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-sm">
        <svg
          className="h-8 w-8 text-red-500"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 12h8v2H8v-2zm0 4h5v2H8v-2z" />
        </svg>
      </div>
      <span className="text-sm font-semibold text-slate-700">PDF Floorplan</span>
      <span className="mt-1 text-xs text-slate-500">{plan.name}</span>
    </div>
  );
}

export default function FloorplanCard({ plan, onOpenPlan }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {plan.fileType === "pdf" ? (
          <PdfPreview plan={plan} />
        ) : (
          <ImagePreview plan={plan} />
        )}
        {plan.preApproved && (
          <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
            Pre-Approved
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-lg font-semibold text-slate-900">{plan.name}</h2>
        {plan.series && (
          <p className="mt-0.5 text-sm text-slate-500">{plan.series}</p>
        )}

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-600">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Sq Ft</dt>
            <dd className="font-medium text-slate-800">
              {plan.squareFeet?.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Base Price</dt>
            <dd className="font-medium text-slate-800">{formatPrice(plan.basePrice)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Bedrooms</dt>
            <dd className="font-medium text-slate-800">{plan.beds}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Bathrooms</dt>
            <dd className="font-medium text-slate-800">{formatBaths(plan.baths)}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => onOpenPlan(plan)}
          className="mt-5 w-full rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Open Plan
        </button>
      </div>
    </article>
  );
}
