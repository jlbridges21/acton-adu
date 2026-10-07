import { useState } from "react";
import { useSeries } from "../context/SeriesContext";
import {
  createPlanSeries,
  deletePlanSeries,
  updatePlanSeries,
} from "../lib/planSeries";

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

export default function ManageSeriesPanel({ onChanged }) {
  const { series, usingFallback, error: loadError, refresh } = useSeries();
  const [newName, setNewName] = useState("");
  const [draftNames, setDraftNames] = useState({});
  const [draftSeries, setDraftSeries] = useState(series);
  const [busyId, setBusyId] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (series !== draftSeries) {
    const next = {};
    for (const item of series) {
      next[item.id] = item.name;
    }
    setDraftSeries(series);
    setDraftNames(next);
  }

  const handleAdd = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setAdding(true);
    try {
      await createPlanSeries(newName);
      setNewName("");
      setNotice("Series added.");
      await refresh();
      await onChanged?.();
    } catch (err) {
      setError(err.message || "Could not add series.");
    } finally {
      setAdding(false);
    }
  };

  const handleRename = async (item) => {
    const nextName = (draftNames[item.id] ?? "").trim();
    if (!nextName || nextName === item.name) return;

    setError("");
    setNotice("");
    setBusyId(item.id);
    try {
      await updatePlanSeries(item.id, item.name, nextName);
      setNotice(`Renamed "${item.name}" to "${nextName}". Plans in that series were updated.`);
      await refresh();
      await onChanged?.();
    } catch (err) {
      setError(err.message || "Could not rename series.");
    } finally {
      setBusyId("");
    }
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      `Delete "${item.name}"? Plans in this series will become unassigned.`,
    );
    if (!confirmed) return;

    setError("");
    setNotice("");
    setBusyId(item.id);
    try {
      await deletePlanSeries(item.id, item.name);
      setNotice(`Deleted "${item.name}".`);
      await refresh();
      await onChanged?.();
    } catch (err) {
      setError(err.message || "Could not delete series.");
    } finally {
      setBusyId("");
    }
  };

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-semibold text-slate-900">Series</h2>
      <p className="mt-1 text-sm text-slate-600">
        Add, rename, or delete series. Renaming updates every plan in that series.
      </p>

      {usingFallback && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Series are read-only until the database is updated. Run{" "}
          <code className="font-mono text-xs">supabase-migration-plan-series.sql</code> in the
          Supabase SQL Editor.
          {loadError ? ` (${loadError})` : ""}
        </p>
      )}

      <form onSubmit={handleAdd} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New series name"
          disabled={usingFallback || adding}
          className={inputClass}
          aria-label="New series name"
        />
        <button
          type="submit"
          disabled={usingFallback || adding || !newName.trim()}
          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {adding ? "Adding…" : "Add series"}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="mt-3 text-sm text-emerald-700" role="status">
          {notice}
        </p>
      )}

      {!usingFallback && (
        <ul className="mt-4 divide-y divide-slate-100">
          {series.length === 0 && (
            <li className="py-3 text-sm text-slate-500">No series yet.</li>
          )}
          {series.map((item) => {
            const draft = draftNames[item.id] ?? item.name;
            const dirty = draft.trim() !== item.name;
            const busy = busyId === item.id;
            return (
              <li
                key={item.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center"
              >
                <input
                  type="text"
                  value={draft}
                  onChange={(e) =>
                    setDraftNames((current) => ({
                      ...current,
                      [item.id]: e.target.value,
                    }))
                  }
                  className={inputClass}
                  aria-label={`Series name ${item.name}`}
                  disabled={busy}
                />
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRename(item)}
                    disabled={busy || !dirty}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {busy ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    disabled={busy}
                    className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
