import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import PriceRegionToggle from "../components/PriceRegionToggle";
import { SERIES_OPTIONS } from "../config/series";
import { getDisplayBasePrice, PRICE_REGION } from "../config/pricing";
import { useAuth } from "../context/AuthContext";
import { usePriceRegion } from "../context/PriceRegionContext";
import { fetchFloorplans, updateFloorplansBulk } from "../lib/floorplans";
import { formatPrice, normalizeSeries } from "../utils/filters";

/** Column order used for display, sort, and Excel paste. */
const COLUMNS = [
  { key: "name", label: "Plan Name", pasteable: true },
  { key: "series", label: "Series", pasteable: true },
  { key: "squareFeet", label: "Sq Ft", pasteable: true },
  { key: "basePrice", label: "Base Price", pasteable: true },
  { key: "beds", label: "Beds", pasteable: true },
  { key: "baths", label: "Baths", pasteable: true },
  { key: "fileUrl", label: "Image URL", pasteable: true },
];

const PASTEABLE_KEYS = COLUMNS.filter((c) => c.pasteable).map((c) => c.key);

const cellClass =
  "box-border h-9 w-full border-0 bg-transparent px-2 text-sm text-slate-800 outline-none focus:bg-blue-50 focus:ring-2 focus:ring-inset focus:ring-blue-500";

const tdClass = "border border-slate-200 p-0 align-middle";

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

function cleanPastedValue(key, raw) {
  let value = String(raw ?? "").trim();
  if (!value) return "";

  if (key === "basePrice" || key === "squareFeet" || key === "beds" || key === "baths") {
    value = value.replace(/[$,]/g, "").replace(/\s/g, "");
  }

  if (key === "series") {
    const match = SERIES_OPTIONS.find(
      (option) => option.toLowerCase() === value.toLowerCase(),
    );
    return match || value;
  }

  return value;
}

/**
 * Parse Excel / Google Sheets clipboard text into a 2D grid.
 * Sheets copy as tab-separated values with newline-separated rows.
 */
export function parseClipboardGrid(text) {
  const normalized = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.replace(/\n$/, "").split("\n");
  if (lines.length === 1 && lines[0] === "") return [];

  return lines.map((line) => {
    if (line.includes("\t")) return line.split("\t");
    // Fallback when a single column of values was copied
    return [line];
  });
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
    <th
      scope="col"
      className="border border-slate-300 bg-slate-700 px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white"
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className="inline-flex items-center gap-1 hover:text-blue-100"
      >
        {label}
        <span aria-hidden="true">{active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
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
  const [collapsedSeries, setCollapsedSeries] = useState(() => new Set());
  const [activeCell, setActiveCell] = useState(null);

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
      // Keep series as primary grouping even when sorting another column.
      if (sortKey !== "series") {
        const bySeries = normalizeSeries(a.series).localeCompare(
          normalizeSeries(b.series),
          undefined,
          { sensitivity: "base" },
        );
        if (bySeries !== 0) return bySeries;
      }

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
    }

    return groupList;
  }, [drafts, sortKey, sortDir, priceRegion]);

  /** Visible plan rows in table order — paste fills down this list. */
  const visiblePlanIds = useMemo(() => {
    const ids = [];
    for (const group of groupedRows) {
      if (collapsedSeries.has(group.key)) continue;
      for (const plan of group.plans) ids.push(plan.id);
    }
    return ids;
  }, [groupedRows, collapsedSeries]);

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

  const applyPaste = (startPlanId, startColumnKey, clipboardText) => {
    const grid = parseClipboardGrid(clipboardText);
    if (grid.length === 0) return;

    const startRowIndex = visiblePlanIds.indexOf(startPlanId);
    const startColIndex = PASTEABLE_KEYS.indexOf(startColumnKey);
    if (startRowIndex < 0 || startColIndex < 0) return;

    const updates = new Map();
    let updatedCells = 0;

    for (let r = 0; r < grid.length; r += 1) {
      const planId = visiblePlanIds[startRowIndex + r];
      if (!planId) break;

      const current = drafts.find((draft) => draft.id === planId);
      if (!current) continue;

      const next = { ...(updates.get(planId) || current) };
      const row = grid[r];
      let rowChanged = false;

      for (let c = 0; c < row.length; c += 1) {
        const columnKey = PASTEABLE_KEYS[startColIndex + c];
        if (!columnKey) break;

        const nextValue = cleanPastedValue(columnKey, row[c]);
        if (next[columnKey] !== nextValue) {
          next[columnKey] = nextValue;
          updatedCells += 1;
          rowChanged = true;
        }
      }

      if (rowChanged) {
        updates.set(planId, next);
      }
    }

    if (updates.size === 0) {
      setNotice("Paste did not change any cells. Check column start and plan order.");
      return;
    }

    setDrafts((current) =>
      current.map((draft) => updates.get(draft.id) || draft),
    );
    setError("");
    setNotice(
      `Pasted into ${updates.size} plan${updates.size === 1 ? "" : "s"} (${updatedCells} cell${updatedCells === 1 ? "" : "s"}). Review the highlighted rows, then Save Changes.`,
    );
  };

  const handleCellPaste = (event, planId, columnKey) => {
    const text = event.clipboardData?.getData("text/plain");
    if (!text || (!text.includes("\t") && !text.includes("\n"))) {
      // Single-cell paste — let the input handle it normally.
      return;
    }

    event.preventDefault();
    applyPaste(planId, columnKey, text);
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleSeries = (key) => {
    setCollapsedSeries((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => setCollapsedSeries(new Set());
  const collapseAll = () =>
    setCollapsedSeries(new Set(groupedRows.map((group) => group.key)));

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
  const seriesOptionsWithCurrent = (value) =>
    value && !SERIES_OPTIONS.includes(value)
      ? [value, ...SERIES_OPTIONS]
      : SERIES_OPTIONS;

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
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Excel-style grid: click a cell, paste rows from your spreadsheet (Cmd/Ctrl+V),
              then Save. Plans must be in the same order as your sheet.
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
          <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <p className="font-semibold">How to paste from Excel / Google Sheets</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5 text-blue-900/90">
              <li>Sort this table so plans match your spreadsheet order (usually Series, then name or sq ft).</li>
              <li>Copy one or more rows/cells from your sheet.</li>
              <li>
                Click the starting cell here (for example Base Price on the first plan), then paste
                (Cmd+V / Ctrl+V).
              </li>
              <li>Values fill down in visible order. Click Save Changes when ready.</li>
            </ol>
            <p className="mt-2 text-xs text-blue-800">
              Column order: Plan Name → Series → Sq Ft → Base Price → Beds → Baths → Image URL.
              You can paste a subset (e.g. only Base Price) by starting in that column.
              Currency symbols and commas are stripped automatically.
            </p>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-600">
              {loading
                ? "Loading plans…"
                : `${drafts.length} plan${drafts.length === 1 ? "" : "s"} · ${dirtyCount} unsaved change${dirtyCount === 1 ? "" : "s"}`}
            </p>
            <button
              type="button"
              onClick={expandAll}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Collapse all
            </button>
            {isLa && (
              <p className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                LA view — paste/edit San Jose base price; LA preview updates below each price.
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
            <div className="overflow-x-auto border border-slate-300 bg-white shadow-sm">
              <table className="min-w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  <tr>
                    {COLUMNS.map((column) => (
                      <SortHeader
                        key={column.key}
                        columnKey={column.key}
                        label={
                          column.key === "basePrice"
                            ? isLa
                              ? "Base Price (SJ)"
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

                {groupedRows.map((group) => {
                  const collapsed = collapsedSeries.has(group.key);
                  return (
                    <tbody key={group.key}>
                      <tr className="bg-amber-50">
                        <td
                          colSpan={COLUMNS.length}
                          className="border border-slate-300 px-2 py-1.5"
                        >
                          <button
                            type="button"
                            onClick={() => toggleSeries(group.key)}
                            className="inline-flex items-center gap-2 text-left text-sm font-semibold text-slate-800"
                          >
                            <span
                              className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white text-xs"
                              aria-hidden="true"
                            >
                              {collapsed ? "+" : "−"}
                            </span>
                            {group.label}
                            <span className="font-normal text-slate-500">
                              ({group.plans.length})
                            </span>
                          </button>
                        </td>
                      </tr>

                      {!collapsed &&
                        group.plans.map((draft) => {
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
                              className={dirty ? "bg-blue-50/70" : "bg-white"}
                            >
                              <td className={`${tdClass} min-w-[10rem]`}>
                                <input
                                  type="text"
                                  value={draft.name}
                                  onChange={(e) =>
                                    updateDraft(draft.id, "name", e.target.value)
                                  }
                                  onPaste={(e) =>
                                    handleCellPaste(e, draft.id, "name")
                                  }
                                  onFocus={() =>
                                    setActiveCell({ id: draft.id, key: "name" })
                                  }
                                  className={cellClass}
                                  aria-label={`Plan name for ${draft.name}`}
                                />
                              </td>
                              <td className={`${tdClass} min-w-[11rem]`}>
                                <select
                                  value={draft.series}
                                  onChange={(e) =>
                                    updateDraft(draft.id, "series", e.target.value)
                                  }
                                  onPaste={(e) =>
                                    handleCellPaste(e, draft.id, "series")
                                  }
                                  onFocus={() =>
                                    setActiveCell({ id: draft.id, key: "series" })
                                  }
                                  className={`${cellClass} cursor-pointer`}
                                  aria-label={`Series for ${draft.name}`}
                                >
                                  <option value="" disabled>
                                    Select…
                                  </option>
                                  {seriesOptionsWithCurrent(draft.series).map((series) => (
                                    <option key={series} value={series}>
                                      {series}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className={`${tdClass} w-24`}>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={draft.squareFeet}
                                  onChange={(e) =>
                                    updateDraft(draft.id, "squareFeet", e.target.value)
                                  }
                                  onPaste={(e) =>
                                    handleCellPaste(e, draft.id, "squareFeet")
                                  }
                                  onFocus={() =>
                                    setActiveCell({ id: draft.id, key: "squareFeet" })
                                  }
                                  className={cellClass}
                                  aria-label={`Square footage for ${draft.name}`}
                                />
                              </td>
                              <td className={`${tdClass} min-w-[9rem] bg-emerald-50/40`}>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={draft.basePrice}
                                  onChange={(e) =>
                                    updateDraft(draft.id, "basePrice", e.target.value)
                                  }
                                  onPaste={(e) =>
                                    handleCellPaste(e, draft.id, "basePrice")
                                  }
                                  onFocus={() =>
                                    setActiveCell({ id: draft.id, key: "basePrice" })
                                  }
                                  className={cellClass}
                                  aria-label={`San Jose base price for ${draft.name}`}
                                />
                                {isLa && (
                                  <p className="border-t border-slate-200 px-2 py-0.5 text-[11px] text-slate-500">
                                    LA {formatPrice(laPrice)}
                                  </p>
                                )}
                              </td>
                              <td className={`${tdClass} w-20`}>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={draft.beds}
                                  onChange={(e) =>
                                    updateDraft(draft.id, "beds", e.target.value)
                                  }
                                  onPaste={(e) =>
                                    handleCellPaste(e, draft.id, "beds")
                                  }
                                  onFocus={() =>
                                    setActiveCell({ id: draft.id, key: "beds" })
                                  }
                                  className={cellClass}
                                  aria-label={`Bedrooms for ${draft.name}`}
                                />
                              </td>
                              <td className={`${tdClass} w-20`}>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={draft.baths}
                                  onChange={(e) =>
                                    updateDraft(draft.id, "baths", e.target.value)
                                  }
                                  onPaste={(e) =>
                                    handleCellPaste(e, draft.id, "baths")
                                  }
                                  onFocus={() =>
                                    setActiveCell({ id: draft.id, key: "baths" })
                                  }
                                  className={cellClass}
                                  aria-label={`Bathrooms for ${draft.name}`}
                                />
                              </td>
                              <td className={`${tdClass} min-w-[14rem]`}>
                                <div className="flex items-stretch">
                                  <input
                                    type="text"
                                    value={draft.fileUrl}
                                    onChange={(e) =>
                                      updateDraft(draft.id, "fileUrl", e.target.value)
                                    }
                                    onPaste={(e) =>
                                      handleCellPaste(e, draft.id, "fileUrl")
                                    }
                                    onFocus={() =>
                                      setActiveCell({ id: draft.id, key: "fileUrl" })
                                    }
                                    className={`${cellClass} flex-1`}
                                    aria-label={`Image URL for ${draft.name}`}
                                  />
                                  {draft.fileUrl && (
                                    <a
                                      href={draft.fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="shrink-0 border-l border-slate-200 px-2 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                                    >
                                      LINK
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  );
                })}
              </table>
            </div>
          )}

          {activeCell && (
            <p className="mt-2 text-xs text-slate-500">
              Active cell: {activeCell.key} · paste starts here and fills downward
            </p>
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
