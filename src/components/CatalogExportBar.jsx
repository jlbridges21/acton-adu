import { useState } from "react";
import { generateCatalogPdf } from "../lib/generateCatalogPdf";

export default function CatalogExportBar({
  selectedCount,
  selectedPlans,
  onClearSelection,
}) {
  const [customerName, setCustomerName] = useState("");
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  if (selectedCount === 0) return null;

  const handleCreatePdf = async () => {
    setError("");
    setGenerating(true);

    try {
      await generateCatalogPdf({
        customerName,
        plans: selectedPlans,
      });
    } catch (err) {
      setError(err.message || "Could not create PDF. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-4 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">
            {selectedCount} plan{selectedCount === 1 ? "" : "s"} selected
          </p>
          <label className="mt-2 block text-sm font-medium text-slate-700" htmlFor="customer-name">
            Customer name
          </label>
          <input
            id="customer-name"
            type="text"
            value={customerName}
            onChange={(e) => {
              setCustomerName(e.target.value);
              setError("");
            }}
            placeholder="e.g. Smith Family"
            className="mt-1 w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {error && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">
          <button
            type="button"
            onClick={onClearSelection}
            className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Clear selection
          </button>
          <button
            type="button"
            onClick={handleCreatePdf}
            disabled={generating}
            className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            {generating ? "Creating PDF…" : "Create PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
