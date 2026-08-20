import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import PriceRegionToggle from "../components/PriceRegionToggle";
import SeriesSelect from "../components/SeriesSelect";
import { getDisplayBasePrice, PRICE_REGION } from "../config/pricing";
import { useAuth } from "../context/AuthContext";
import { usePriceRegion } from "../context/PriceRegionContext";
import { fetchFloorplans, updateFloorplansBulk } from "../lib/floorplans";
import { formatPrice, normalizeSeries } from "../utils/filters";

const cellInputClass =
  "w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

const SORT_COLUMNS = [
  { key: "name", label: "Plan Name" },
  { key: "series", label: "Series" },
  { key: "squareFeet", label: "Sq Ft" },
  { key: "basePrice", label: "Base Price" },
  { key: "beds", label: "Beds" },
  { key: "baths", label: "Baths" },
  { key: "fileUrl", label: "Image URL" },
];

function planToDraft(plan) {
  return {
    id: plan.id,
    name: plan.name ?? "",
    series: plan.series ?? "",
    squareFeet: String(plan.squareFeet ?? ""),
    beds: String(plan.beds ?? ""),
    baths: String(plan.baths ?? ""),
    basePrice: String(plan.basePrice ?? ""),
    preApproved: Boolean(plan.preApproved),
    fileUrl: plan.fileUrl ?? "",
    fileType: plan.fileType,
    filePath: plan.filePath,
    createdAt: plan.createdAt,
  };
}

function draftsEqual(a, b) {
  return (
    a.name === b.name &&
    a.series === b.series &&
    a.squareFeet === b.squareFeet &&
    a.beds === b.beds &&
    a.baths === b.baths &&
    a.basePrice === b.basePrice &&
    a.preApproved === b.preApproved &&
    a.fileUrl === b.fileUrl
  );
}

function parseDraft(draft) {
  const name = draft.name.trim();
  const series = normalizeSeries(draft.series);
  const squareFeet = Number(draft.squareFeet);
  const beds = Number(draft.beds);
  const baths = Number(draft.baths);
  const basePrice = parseInt(String(draft.basePrice).replace(/,/g, ""), 10);
  const fileUrl = draft.fileUrl.trim();

  if (!name) return { error: `"${draft.name || "Untitled"}": plan name is required.` };
  if (!series) return { error: `"${name}": series is required.` };
  if (!squareFeet || squareFeet <= 0) {
    return { error: `"${name}": enter valid square footage.` };
  }
  if (!Number.isInteger(beds) || beds < 0) {
    return { error: `"${name}": enter a valid bedroom count.` };
  }
  if (!baths || baths <= 0) {
    return { error: `"${name}": enter a valid bathroom count.` };
  }
  if (!Number.isInteger(basePrice) || basePrice < 0) {
    return { error: `"${name}": enter a valid base price (whole dollars).` };
  }
  if (!fileUrl) {
    return { error: `"${name}": image URL is required.` };
  }

  return {
    plan: {
      id: draft.id,
      name,
      series,
      squareFeet,
      beds,
      baths,
      basePrice,
      preApproved: draft.preApproved,
      fileUrl,
    },
  };
}

function compareValues(a, b, key, priceRegion) {
  if (key === "name" || key === "series" || key === "fileUrl") {
    return String(a[key] ?? "").localeCompare(String(b[key] ?? ""), undefined, {
      sensitivity: "base",
    });
  }

  if (key === "basePrice") {
    const priceA = getDisplayBasePrice(
      Number(String(a.basePrice).replace(/,/g, "")) || 0,
      priceRegion,
      Number(a.squareFeet) || 0,
    );
    const priceB = getDisplayBasePrice(
      Number(String(b.basePrice).replace(/,/g, "")) || 0,
      priceRegion,
      Number(b.squareFeet) || 0,
    );
    return priceA - priceB;
  }

  return (Number(a[key]) || 0) - (Number(b[key]) || 0);
}

function SortHeader({ columnKey, label, sortKey, sortDir, onSort }) {
  const active = sortKey === columnKey;
  return (
    <th scope="col" className="px-3 py-3 text-left">
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900"
      >
        {label}
        <span className="text-slate-400" aria-hidden="true">
          {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

export default function AdminFloorplansPage() {
  const { isAdmin, user, signOut } = useAuth();
  const { priceRegion } = usePriceRegion();

  const [originals, setOriginals] = useState({});
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sortKey, setSortKey] = useState("series");
  const [sortDir, setSortDir] = useState("asc");

  const loadFloorplans = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchFloorplans();
      const nextOriginals = {};
      const nextDrafts = data.map((plan) => {
        const draft = planToDraft(plan);
        nextOriginals[plan.id] = draft;
        return draft;
      });
      setOriginals(nextOriginals);
      setDrafts(nextDrafts);
    } catch (err) {
      setError(err.message || "Could not load floorplans.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFloorplans();
  }, [loadFloorplans]);

  const dirtyIds = useMemo(() => {
    const ids = new Set();
    for (const draft of drafts) {
      const original = originals[draft.id];
      if (original && !draftsEqual(draft, original)) {
        ids.add(draft.id);
      }
    }
    return ids;
  }, [drafts, originals]);

  const dirtyCount = dirtyIds.size;

  const groupedRows = useMemo(() => {
    const sorted = [...drafts].sort((a, b) => {
      const result = compareValues(a, b, sortKey, priceRegion);
      return sortDir === "asc" ? result : -result;
    });

    const groups = new Map();
    for (const draft of sorted) {
      const label = normalizeSeries(draft.series) || "Unassigned series";
      const key = label.toLowerCase();
      if (!groups.has(key)) {
        groups.set(key, { key, label, plans: [] });
      }
      groups.get(key).plans.push(draft);
    }

    let groupList = [...groups.values()];

    if (sortKey === "series") {
      groupList.sort((a, b) => {
        const result = a.label.localeCompare(b.label, undefined, {
          sensitivity: "base",
        });
        return sortDir === "asc" ? result : -result;
      });
    } else {
      groupList.sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
      );
    }

    return groupList;
  }, [drafts, sortKey, sortDir, priceRegion]);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const updateDraft = (id, key, value) => {
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, [key]: value } : draft)),
    );
    setNotice("");
    setError("");
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleDiscard = () => {
    if (dirtyCount === 0) return;
    const confirmed = window.confirm(
      `Discard ${dirtyCount} unsaved change${dirtyCount === 1 ? "" : "s"}?`,
    );
    if (!confirmed) return;
    setDrafts(Object.values(originals).map((draft) => ({ ...draft })));
    setNotice("");
    setError("");
  };

  const handleSave = async () => {
    if (dirtyCount === 0) return;

    setError("");
    setNotice("");

    const toSave = [];
    for (const draft of drafts) {
      if (!dirtyIds.has(draft.id)) continue;
      const parsed = parseDraft(draft);
      if (parsed.error) {
        setError(parsed.error);
        return;
      }
      toSave.push(parsed.plan);
    }

    setSaving(true);
    try {
      const { saved, failed } = await updateFloorplansBulk(toSave);

      if (failed.length > 0) {
        setError(
          `Saved ${saved.length}, but ${failed.length} failed: ${failed
            .map((item) => `${item.name} (${item.error})`)
            .join("; ")}`,
        );
      } else {
        setNotice(
          `Saved ${saved.length} plan${saved.length === 1 ? "" : "s"}. Changes are live in the library.`,
        );
      }

      await loadFloorplans();
    } catch (err) {
      setError(err.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  const isLa = priceRegion === PRICE_REGION.LA;

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <header className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link
              to="/"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              ← Back to library
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
              Admin Plan Editor
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Edit plans in bulk by series. Base price is always stored as San Jose pricing;
              switch to LA to preview calculated LA prices.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <PriceRegionToggle />
            {user?.email && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="max-w-[220px] truncate">{user.email}</span>
                <button
                  type="button"
                  onClick={signOut}
                  className="font-medium text-blue-600 hover:text-blue-700"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-600">
              {loading
                ? "Loading plans…"
                : `${drafts.length} plan${drafts.length === 1 ? "" : "s"} · ${dirtyCount} unsaved change${dirtyCount === 1 ? "" : "s"}`}
            </p>
            {isLa && (
              <p className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                LA view — prices are calculated. Edit San Jose base price to change them.
              </p>
            )}
          </div>

          {error && (
            <div
              className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {error}
            </div>
          )}

          {notice && (
            <div
              className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              role="status"
            >
              {notice}
            </div>
          )}

          {!loading && drafts.length === 0 && !error && (
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
              No floorplans found.
            </p>
          )}

          {!loading && drafts.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50">
                  <tr className="border-b border-slate-200">
                    {SORT_COLUMNS.map((column) => (
                      <SortHeader
                        key={column.key}
                        columnKey={column.key}
                        label={
                          column.key === "basePrice"
                            ? isLa
                              ? "Base Price (SJ) / LA"
                              : "Base Price"
                            : column.label
                        }
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                      />
                    ))}
                  </tr>
                </thead>

                {groupedRows.map((group) => (
                  <tbody key={group.key}>
                    <tr className="bg-slate-100">
                      <td
                        colSpan={SORT_COLUMNS.length}
                        className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700"
                      >
                        {group.label}
                        <span className="ml-2 font-normal normal-case text-slate-500">
                          ({group.plans.length})
                        </span>
                      </td>
                    </tr>

                    {group.plans.map((draft) => {
                      const dirty = dirtyIds.has(draft.id);
                      const sjPrice =
                        Number(String(draft.basePrice).replace(/,/g, "")) || 0;
                      const laPrice = getDisplayBasePrice(
                        sjPrice,
                        PRICE_REGION.LA,
                        Number(draft.squareFeet) || 0,
                      );

                      return (
                        <tr
                          key={draft.id}
                          className={`border-b border-slate-100 ${
                            dirty ? "bg-blue-50/40" : "bg-white"
                          }`}
                        >
                          <td className="px-3 py-2 align-top">
                            <input
                              type="text"
                              value={draft.name}
                              onChange={(e) =>
                                updateDraft(draft.id, "name", e.target.value)
                              }
                              className={cellInputClass}
                              aria-label={`Plan name for ${draft.name}`}
                            />
                          </td>
                          <td className="px-3 py-2 align-top min-w-[11rem]">
                            <SeriesSelect
                              id={`series-${draft.id}`}
                              value={draft.series}
                              onChange={(value) =>
                                updateDraft(draft.id, "series", value)
                              }
                            />
                          </td>
                          <td className="px-3 py-2 align-top w-28">
                            <input
                              type="number"
                              min="0"
                              value={draft.squareFeet}
                              onChange={(e) =>
                                updateDraft(draft.id, "squareFeet", e.target.value)
                              }
                              className={cellInputClass}
                              aria-label={`Square footage for ${draft.name}`}
                            />
                          </td>
                          <td className="px-3 py-2 align-top min-w-[10rem]">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={draft.basePrice}
                              onChange={(e) =>
                                updateDraft(draft.id, "basePrice", e.target.value)
                              }
                              className={cellInputClass}
                              aria-label={`San Jose base price for ${draft.name}`}
                            />
                            {isLa && (
                              <p className="mt-1 text-xs text-slate-500">
                                LA: {formatPrice(laPrice)}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top w-24">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={draft.beds}
                              onChange={(e) =>
                                updateDraft(draft.id, "beds", e.target.value)
                              }
                              className={cellInputClass}
                              aria-label={`Bedrooms for ${draft.name}`}
                            />
                          </td>
                          <td className="px-3 py-2 align-top w-24">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={draft.baths}
                              onChange={(e) =>
                                updateDraft(draft.id, "baths", e.target.value)
                              }
                              className={cellInputClass}
                              aria-label={`Bathrooms for ${draft.name}`}
                            />
                          </td>
                          <td className="px-3 py-2 align-top min-w-[16rem]">
                            <input
                              type="url"
                              value={draft.fileUrl}
                              onChange={(e) =>
                                updateDraft(draft.id, "fileUrl", e.target.value)
                              }
                              className={cellInputClass}
                              aria-label={`Image URL for ${draft.name}`}
                            />
                            {draft.fileUrl && (
                              <a
                                href={draft.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-block text-xs font-medium text-blue-600 hover:text-blue-700"
                              >
                                Open
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                ))}
              </table>
            </div>
          )}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-4 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {dirtyCount === 0
              ? "No unsaved changes"
              : `${dirtyCount} plan${dirtyCount === 1 ? "" : "s"} with unsaved changes`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={saving || dirtyCount === 0}
              className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || dirtyCount === 0}
              className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
