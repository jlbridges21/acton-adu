import { useEffect, useState } from "react";
import FloorplanMedia from "./FloorplanMedia";
import ModalShell from "./ModalShell";
import { updateFloorplan } from "../lib/floorplans";
import { normalizeSeries } from "../utils/filters";

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export default function FloorplanEditModal({ plan, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!plan) return;
    setForm({
      name: plan.name,
      series: plan.series ?? "",
      squareFeet: String(plan.squareFeet ?? ""),
      beds: String(plan.beds ?? ""),
      baths: String(plan.baths ?? ""),
      basePrice: String(plan.basePrice ?? ""),
      preApproved: plan.preApproved ?? false,
    });
    setError("");
  }, [plan]);

  if (!plan || !form) return null;

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const name = form.name.trim();
    const series = normalizeSeries(form.series);
    const squareFeet = Number(form.squareFeet);
    const beds = Number(form.beds);
    const baths = Number(form.baths);
    const basePrice = parseInt(String(form.basePrice).replace(/,/g, ""), 10);

    if (!name) {
      setError("Plan name is required.");
      return;
    }
    if (!series) {
      setError("Series is required.");
      return;
    }
    if (!squareFeet || squareFeet <= 0) {
      setError("Enter valid square footage.");
      return;
    }
    if (!Number.isInteger(beds) || beds < 0) {
      setError("Enter a valid bedroom count.");
      return;
    }
    if (!baths || baths <= 0) {
      setError("Enter a valid bathroom count.");
      return;
    }
    if (!Number.isInteger(basePrice) || basePrice < 0) {
      setError("Enter a valid base price (whole dollars).");
      return;
    }

    setSaving(true);
    try {
      await updateFloorplan(plan.id, {
        name,
        series,
        squareFeet,
        beds,
        baths,
        basePrice,
        preApproved: form.preApproved,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open
      onClose={onClose}
      title="Edit floorplan"
      titleId="edit-plan-title"
      maxWidthClass="max-w-3xl"
    >
      <FloorplanMedia plan={plan} />

      <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4 sm:px-5">
        <div>
          <label className={labelClass} htmlFor="edit-name">
            Plan name
          </label>
          <input
            id="edit-name"
            type="text"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="edit-series">
            Series
          </label>
          <input
            id="edit-series"
            type="text"
            required
            value={form.series}
            onChange={(e) => update("series", e.target.value)}
            className={inputClass}
            placeholder="e.g. BR, Studio, Premium"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="edit-sqft">
              Square footage
            </label>
            <input
              id="edit-sqft"
              type="number"
              min="1"
              required
              value={form.squareFeet}
              onChange={(e) => update("squareFeet", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-price">
              Base price ($)
            </label>
            <input
              id="edit-price"
              type="number"
              min="0"
              step="1"
              required
              value={form.basePrice}
              onChange={(e) => update("basePrice", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-beds">
              Bedrooms
            </label>
            <input
              id="edit-beds"
              type="number"
              min="0"
              step="1"
              required
              value={form.beds}
              onChange={(e) => update("beds", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="edit-baths">
              Bathrooms
            </label>
            <input
              id="edit-baths"
              type="number"
              min="0.5"
              step="0.5"
              required
              value={form.baths}
              onChange={(e) => update("baths", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="edit-pre-approved"
            type="checkbox"
            checked={form.preApproved}
            onChange={(e) => update("preApproved", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
          <label htmlFor="edit-pre-approved" className="text-sm font-medium text-slate-700">
            Pre-approved plan
          </label>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
