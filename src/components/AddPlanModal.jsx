import { useState } from "react";
import { uploadFloorplan } from "../lib/floorplans";
import { normalizeSeries } from "../utils/filters";
import SeriesSelect from "./SeriesSelect";

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export default function AddPlanModal({ open, onClose, onUploaded }) {
  const [formKey, setFormKey] = useState(0);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    name: "",
    series: "",
    squareFeet: "",
    beds: "",
    baths: "",
    basePrice: "",
    preApproved: false,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleClose = () => {
    setError("");
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!file) {
      setError("Upload a floorplan file (JPEG, PNG, or PDF).");
      return;
    }

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

    setSubmitting(true);

    try {
      await uploadFloorplan({
        plan: {
          name,
          series,
          squareFeet,
          beds,
          baths,
          basePrice,
          preApproved: form.preApproved,
        },
        file,
      });

      setFormKey((k) => k + 1);
      setFile(null);
      setForm({
        name: "",
        series: "",
        squareFeet: "",
        beds: "",
        baths: "",
        basePrice: "",
        preApproved: false,
      });
      onUploaded();
      handleClose();
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-plan-title"
    >
      <div className="my-4 w-full max-w-xl rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="add-plan-title" className="text-lg font-semibold text-slate-900">
            Add floorplan
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form key={formKey} onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className={labelClass} htmlFor="plan-name">
              Plan name *
            </label>
            <input
              id="plan-name"
              type="text"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="plan-series">
              Series *
            </label>
            <SeriesSelect
              id="plan-series"
              value={form.series}
              onChange={(value) => update("series", value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="sqft">
                Square footage *
              </label>
              <input
                id="sqft"
                type="number"
                min="1"
                required
                value={form.squareFeet}
                onChange={(e) => update("squareFeet", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="price">
                Base price ($) *
              </label>
              <input
                id="price"
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
              <label className={labelClass} htmlFor="beds">
                Bedrooms *
              </label>
              <input
                id="beds"
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
              <label className={labelClass} htmlFor="baths">
                Bathrooms *
              </label>
              <input
                id="baths"
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
              id="pre-approved"
              type="checkbox"
              checked={form.preApproved}
              onChange={(e) => update("preApproved", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            <label htmlFor="pre-approved" className="text-sm font-medium text-slate-700">
              Pre-approved plan
            </label>
          </div>

          <div>
            <label className={labelClass} htmlFor="floorplan-file">
              Floorplan file (JPEG, PNG, or PDF) *
            </label>
            <input
              id="floorplan-file"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? "Uploading…" : "Save plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
