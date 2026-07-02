import { useCallback, useEffect, useState } from "react";
import ModalShell from "./ModalShell";
import {
  deleteCatalogExport,
  fetchCatalogExports,
  formatExportDate,
  groupExportsByCustomer,
} from "../lib/catalogExports";
import { formatPrice } from "../utils/filters";

export default function CatalogHistoryModal({ open, onClose, onRestoreSelection }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState([]);
  const [expandedCustomers, setExpandedCustomers] = useState(() => new Set());
  const [expandedExports, setExpandedExports] = useState(() => new Set());
  const [deletingId, setDeletingId] = useState(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const exports = await fetchCatalogExports();
      setGroups(groupExportsByCustomer(exports));
    } catch (err) {
      setError(err.message || "Could not load catalogue history.");
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    loadHistory();
  }, [open, loadHistory]);

  const toggleCustomer = (name) => {
    setExpandedCustomers((current) => {
      const next = new Set(current);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleExport = (id) => {
    setExpandedExports((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRestore = (entry) => {
    onRestoreSelection?.({
      customerName: entry.customerName,
      floorplanIds: entry.floorplanIds,
    });
    onClose();
  };

  const handleDelete = async (entry) => {
    const confirmed = window.confirm(
      `Delete this catalogue for ${entry.customerName}? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(entry.id);
    setError("");
    try {
      await deleteCatalogExport(entry.id);
      await loadHistory();
    } catch (err) {
      setError(err.message || "Could not delete catalogue.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!open) return null;

  return (
    <ModalShell
      open
      onClose={onClose}
      title="My Catalogues"
      titleId="catalog-history-title"
      maxWidthClass="max-w-2xl"
      headerExtra={
        <p className="mt-1 text-sm text-slate-500">
          PDFs you have generated, grouped by customer.
        </p>
      }
    >
      <div className="px-4 py-4 sm:px-5">
        {loading && (
          <p className="text-sm text-slate-600">Loading Catalogues…</p>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && groups.length === 0 && (
          <p className="text-sm text-slate-600">
            No Catalogues yet. Select floorplans, enter a customer name, and create a PDF to
            save your first entry.
          </p>
        )}

        {!loading && groups.length > 0 && (
          <ul className="space-y-3">
            {groups.map((group) => {
              const customerOpen = expandedCustomers.has(group.customerName);

              return (
                <li
                  key={group.customerName}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <button
                    type="button"
                    onClick={() => toggleCustomer(group.customerName)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                    aria-expanded={customerOpen}
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{group.customerName}</p>
                      <p className="text-xs text-slate-500">
                        {group.exports.length} Catalogue
                        {group.exports.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <svg
                      className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${customerOpen ? "rotate-180" : ""}`}
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

                  {customerOpen && (
                    <ul className="border-t border-slate-100">
                      {group.exports.map((entry) => {
                        const exportOpen = expandedExports.has(entry.id);

                        return (
                          <li key={entry.id} className="border-b border-slate-100 last:border-0">
                            <div className="flex flex-wrap items-start gap-2 px-4 py-3">
                              <button
                                type="button"
                                onClick={() => toggleExport(entry.id)}
                                className="min-w-0 flex-1 text-left"
                                aria-expanded={exportOpen}
                              >
                                <p className="text-sm font-medium text-slate-800">
                                  {formatExportDate(entry.createdAt)}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {entry.floorplans.length} floorplan
                                  {entry.floorplans.length === 1 ? "" : "s"}
                                </p>
                              </button>
                              <div className="flex shrink-0 flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleRestore(entry)}
                                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                                >
                                  Restore selection
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(entry)}
                                  disabled={deletingId === entry.id}
                                  className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60"
                                >
                                  {deletingId === entry.id ? "Deleting…" : "Delete"}
                                </button>
                              </div>
                            </div>

                            {exportOpen && (
                              <ul className="space-y-2 bg-slate-50 px-4 pb-3">
                                {entry.floorplans.map((plan) => (
                                  <li
                                    key={plan.id}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                  >
                                    <p className="font-medium text-slate-900">{plan.name}</p>
                                    <p className="text-xs text-slate-500">
                                      {plan.series && <span>{plan.series} · </span>}
                                      {plan.squareFeet?.toLocaleString()} sq ft ·{" "}
                                      {formatPrice(plan.basePrice)}
                                    </p>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ModalShell>
  );
}
