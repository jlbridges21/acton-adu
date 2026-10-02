import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import ManageSeriesPanel from "../components/ManageSeriesPanel";
import PriceRegionToggle from "../components/PriceRegionToggle";
import { getDisplayBasePrice, PRICE_REGION } from "../config/pricing";
import { useAuth } from "../context/AuthContext";
import { usePriceRegion } from "../context/PriceRegionContext";
import { useSeries } from "../context/SeriesContext";
import { fetchFloorplans, updateFloorplansBulk } from "../lib/floorplans";
import { formatPrice, normalizeSeries } from "../utils/filters";

/** Column order used for display, sort, copy, and paste. */
const COLUMNS = [
  { key: "name", label: "Plan Name" },
  { key: "series", label: "Series" },
  { key: "squareFeet", label: "Sq Ft" },
  { key: "basePrice", label: "Base Price" },
  { key: "beds", label: "Beds" },
  { key: "baths", label: "Baths" },
  { key: "fileUrl", label: "Image URL" },
];

const COLUMN_KEYS = COLUMNS.map((c) => c.key);

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

function cleanPastedValue(key, raw, seriesNames) {
  let value = String(raw ?? "").trim();
  if (!value) return "";

  if (key === "basePrice" || key === "squareFeet" || key === "beds" || key === "baths") {
    value = value.replace(/[$,]/g, "").replace(/\s/g, "");
  }

  if (key === "series") {
    const match = seriesNames.find(
      (option) => option.toLowerCase() === value.toLowerCase(),
    );
    return match || value;
  }

  return value;
}

/**
 * Parse Excel / Google Sheets clipboard text into a 2D grid.
 */
export function parseClipboardGrid(text) {
  const normalized = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.replace(/\n$/, "").split("\n");
  if (lines.length === 1 && lines[0] === "") return [];

  return lines.map((line) => {
    if (line.includes("\t")) return line.split("\t");
    return [line];
  });
}

function getSelectionBounds(selection) {
  if (!selection) return null;
  return {
    rowStart: Math.min(selection.anchorRow, selection.focusRow),
    rowEnd: Math.max(selection.anchorRow, selection.focusRow),
    colStart: Math.min(selection.anchorCol, selection.focusCol),
    colEnd: Math.max(selection.anchorCol, selection.focusCol),
  };
}

function isCellSelected(selection, rowIndex, colIndex) {
  const bounds = getSelectionBounds(selection);
  if (!bounds) return false;
  return (
    rowIndex >= bounds.rowStart &&
    rowIndex <= bounds.rowEnd &&
    colIndex >= bounds.colStart &&
    colIndex <= bounds.colEnd
  );
}

function buildClipboardTsv(draftsById, visiblePlanIds, selection) {
  const bounds = getSelectionBounds(selection);
  if (!bounds) return "";

  const lines = [];
  for (let r = bounds.rowStart; r <= bounds.rowEnd; r += 1) {
    const planId = visiblePlanIds[r];
    const draft = draftsById.get(planId);
    if (!draft) continue;

    const cells = [];
    for (let c = bounds.colStart; c <= bounds.colEnd; c += 1) {
      const key = COLUMN_KEYS[c];
      cells.push(String(draft[key] ?? ""));
    }
    lines.push(cells.join("\t"));
  }

  return lines.join("\n");
}

function selectionCellCount(selection) {
  const bounds = getSelectionBounds(selection);
  if (!bounds) return 0;
  return (bounds.rowEnd - bounds.rowStart + 1) * (bounds.colEnd - bounds.colStart + 1);
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

function hasNativeTextSelection() {
  const el = document.activeElement;
  if (!el) return false;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
    const start = el.selectionStart;
    const end = el.selectionEnd;
    return typeof start === "number" && typeof end === "number" && start !== end;
  }
  const selection = window.getSelection?.();
  return Boolean(selection && selection.toString());
}

export default function AdminFloorplansPage() {
  const { isAdmin, user, signOut } = useAuth();
  const { priceRegion } = usePriceRegion();
  const { seriesNames } = useSeries();
  const tableRef = useRef(null);
  const isDraggingRef = useRef(false);

  const [originals, setOriginals] = useState({});
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sortKey, setSortKey] = useState("series");
  const [sortDir, setSortDir] = useState("asc");
  const [collapsedSeries, setCollapsedSeries] = useState(() => new Set());
  const [selection, setSelection] = useState(null);

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

  useEffect(() => {
    const stopDrag = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener("mouseup", stopDrag);
    return () => window.removeEventListener("mouseup", stopDrag);
  }, []);

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

  const draftsById = useMemo(() => {
    const map = new Map();
    for (const draft of drafts) map.set(draft.id, draft);
    return map;
  }, [drafts]);

  const groupedRows = useMemo(() => {
    const sorted = [...drafts].sort((a, b) => {
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

  const visiblePlanIds = useMemo(() => {
    const ids = [];
    for (const group of groupedRows) {
      if (collapsedSeries.has(group.key)) continue;
      for (const plan of group.plans) ids.push(plan.id);
    }
    return ids;
  }, [groupedRows, collapsedSeries]);

  const selectedCount = selectionCellCount(selection);

  const copySelectionToClipboard = useCallback(async () => {
    if (!selection) return false;

    const text = buildClipboardTsv(draftsById, visiblePlanIds, selection);
    if (!text) return false;

    try {
      await navigator.clipboard.writeText(text);
      setNotice(
        `Copied ${selectedCount} cell${selectedCount === 1 ? "" : "s"} to clipboard.`,
      );
      return true;
    } catch {
      setError("Could not copy to clipboard. Check browser permissions.");
      return false;
    }
  }, [selection, draftsById, visiblePlanIds, selectedCount]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const isCopy =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c";
      if (!isCopy) return;
      if (!selection) return;
      if (hasNativeTextSelection()) return;

      event.preventDefault();
      copySelectionToClipboard();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selection, copySelectionToClipboard]);

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

  const selectCell = (rowIndex, colIndex, { extend = false } = {}) => {
    setSelection((current) => {
      if (extend && current) {
        return {
          ...current,
          focusRow: rowIndex,
          focusCol: colIndex,
        };
      }
      return {
        anchorRow: rowIndex,
        anchorCol: colIndex,
        focusRow: rowIndex,
        focusCol: colIndex,
      };
    });
  };

  const handleCellMouseDown = (event, rowIndex, colIndex) => {
    if (event.button !== 0) return;

    if (event.shiftKey) {
      event.preventDefault();
      selectCell(rowIndex, colIndex, { extend: true });
      return;
    }

    isDraggingRef.current = true;
    selectCell(rowIndex, colIndex);
  };

  const handleCellMouseEnter = (rowIndex, colIndex) => {
    if (!isDraggingRef.current) return;
    setSelection((current) => {
      if (!current) {
        return {
          anchorRow: rowIndex,
          anchorCol: colIndex,
          focusRow: rowIndex,
          focusCol: colIndex,
        };
      }
      return {
        ...current,
        focusRow: rowIndex,
        focusCol: colIndex,
      };
    });
  };

  const applyPaste = (startRowIndex, startColIndex, clipboardText) => {
    const grid = parseClipboardGrid(clipboardText);
    if (grid.length === 0) return;

    const updates = new Map();
    let updatedCells = 0;

    for (let r = 0; r < grid.length; r += 1) {
      const planId = visiblePlanIds[startRowIndex + r];
      if (!planId) break;

      const current = draftsById.get(planId);
      if (!current) continue;

      const next = { ...(updates.get(planId) || current) };
      const row = grid[r];
      let rowChanged = false;

      for (let c = 0; c < row.length; c += 1) {
        const columnKey = COLUMN_KEYS[startColIndex + c];
        if (!columnKey) break;

        const nextValue = cleanPastedValue(columnKey, row[c], seriesNames);
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
      `Pasted into ${updates.size} plan${updates.size === 1 ? "" : "s"} (${updatedCells} cell${updatedCells === 1 ? "" : "s"}). Review highlighted rows, then Save Changes.`,
    );
  };

  const handleCellPaste = (event, rowIndex, colIndex) => {
    const text = event.clipboardData?.getData("text/plain");
    if (!text || (!text.includes("\t") && !text.includes("\n"))) {
      return;
    }

    event.preventDefault();

    const bounds = getSelectionBounds(selection);
    const startRow = bounds ? bounds.rowStart : rowIndex;
    const startCol = bounds ? bounds.colStart : colIndex;
    applyPaste(startRow, startCol, text);
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setSelection(null);
  };

  const toggleSeries = (key) => {
    setCollapsedSeries((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setSelection(null);
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
    value && !seriesNames.includes(value) ? [value, ...seriesNames] : seriesNames;

  const renderEditableCell = ({
    draft,
    rowIndex,
    colIndex,
    columnKey,
    extraTdClass = "",
    children,
  }) => {
    const selected = isCellSelected(selection, rowIndex, colIndex);
    return (
      <td
        className={`${tdClass} ${extraTdClass} ${
          selected ? "bg-blue-100 ring-1 ring-inset ring-blue-400" : ""
        }`}
        onMouseDown={(event) => handleCellMouseDown(event, rowIndex, colIndex)}
        onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
        data-row={rowIndex}
        data-col={colIndex}
      >
        {children ?? (
          <input
            type="text"
            value={draft[columnKey]}
            onChange={(e) => updateDraft(draft.id, columnKey, e.target.value)}
            onPaste={(e) => handleCellPaste(e, rowIndex, colIndex)}
            onFocus={() => selectCell(rowIndex, colIndex)}
            className={cellClass}
            aria-label={`${COLUMNS[colIndex].label} for ${draft.name}`}
          />
        )}
      </td>
    );
  };

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
              Excel-style grid: select cells, copy (Cmd/Ctrl+C), paste (Cmd/Ctrl+V), then Save.
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
          <ManageSeriesPanel onChanged={loadFloorplans} />

          <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <p className="font-semibold">Copy & paste like Excel</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-blue-900/90">
              <li>
                <strong>Select:</strong> click a cell, Shift+click to extend, or click and drag
                across cells.
              </li>
              <li>
                <strong>Copy:</strong> Cmd/Ctrl+C (or the Copy button) copies the selection as
                spreadsheet rows.
              </li>
              <li>
                <strong>Paste:</strong> click a starting cell (or keep a selection) and Cmd/Ctrl+V
                to fill downward in the same order.
              </li>
            </ul>
            <p className="mt-2 text-xs text-blue-800">
              Column order: Plan Name → Series → Sq Ft → Base Price → Beds → Baths → Image URL.
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
            <button
              type="button"
              onClick={copySelectionToClipboard}
              disabled={!selection}
              className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              Copy selection{selectedCount > 0 ? ` (${selectedCount})` : ""}
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
            <div
              ref={tableRef}
              className="overflow-x-auto border border-slate-300 bg-white shadow-sm select-none"
              onMouseLeave={() => {
                isDraggingRef.current = false;
              }}
            >
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
                          const rowIndex = visiblePlanIds.indexOf(draft.id);
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
                              className={dirty ? "bg-blue-50/40" : "bg-white"}
                            >
                              {renderEditableCell({
                                draft,
                                rowIndex,
                                colIndex: 0,
                                columnKey: "name",
                                extraTdClass: "min-w-[10rem]",
                              })}

                              {renderEditableCell({
                                draft,
                                rowIndex,
                                colIndex: 1,
                                columnKey: "series",
                                extraTdClass: "min-w-[11rem]",
                                children: (
                                  <select
                                    value={draft.series}
                                    onChange={(e) =>
                                      updateDraft(draft.id, "series", e.target.value)
                                    }
                                    onPaste={(e) =>
                                      handleCellPaste(e, rowIndex, 1)
                                    }
                                    onFocus={() => selectCell(rowIndex, 1)}
                                    className={`${cellClass} cursor-pointer`}
                                    aria-label={`Series for ${draft.name}`}
                                  >
                                    <option value="" disabled>
                                      Select…
                                    </option>
                                    {seriesOptionsWithCurrent(draft.series).map(
                                      (series) => (
                                        <option key={series} value={series}>
                                          {series}
                                        </option>
                                      ),
                                    )}
                                  </select>
                                ),
                              })}

                              {renderEditableCell({
                                draft,
                                rowIndex,
                                colIndex: 2,
                                columnKey: "squareFeet",
                                extraTdClass: "w-24",
                              })}

                              {renderEditableCell({
                                draft,
                                rowIndex,
                                colIndex: 3,
                                columnKey: "basePrice",
                                extraTdClass: "min-w-[9rem] bg-emerald-50/40",
                                children: (
                                  <>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={draft.basePrice}
                                      onChange={(e) =>
                                        updateDraft(draft.id, "basePrice", e.target.value)
                                      }
                                      onPaste={(e) =>
                                        handleCellPaste(e, rowIndex, 3)
                                      }
                                      onFocus={() => selectCell(rowIndex, 3)}
                                      className={cellClass}
                                      aria-label={`San Jose base price for ${draft.name}`}
                                    />
                                    {isLa && (
                                      <p className="border-t border-slate-200 px-2 py-0.5 text-[11px] text-slate-500">
                                        LA {formatPrice(laPrice)}
                                      </p>
                                    )}
                                  </>
                                ),
                              })}

                              {renderEditableCell({
                                draft,
                                rowIndex,
                                colIndex: 4,
                                columnKey: "beds",
                                extraTdClass: "w-20",
                              })}

                              {renderEditableCell({
                                draft,
                                rowIndex,
                                colIndex: 5,
                                columnKey: "baths",
                                extraTdClass: "w-20",
                              })}

                              {renderEditableCell({
                                draft,
                                rowIndex,
                                colIndex: 6,
                                columnKey: "fileUrl",
                                extraTdClass: "min-w-[14rem]",
                                children: (
                                  <div className="flex items-stretch">
                                    <input
                                      type="text"
                                      value={draft.fileUrl}
                                      onChange={(e) =>
                                        updateDraft(draft.id, "fileUrl", e.target.value)
                                      }
                                      onPaste={(e) =>
                                        handleCellPaste(e, rowIndex, 6)
                                      }
                                      onFocus={() => selectCell(rowIndex, 6)}
                                      className={`${cellClass} flex-1`}
                                      aria-label={`Image URL for ${draft.name}`}
                                    />
                                    {draft.fileUrl && (
                                      <a
                                        href={draft.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="shrink-0 border-l border-slate-200 px-2 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                                        onMouseDown={(e) => e.stopPropagation()}
                                      >
                                        LINK
                                      </a>
                                    )}
                                  </div>
                                ),
                              })}
                            </tr>
                          );
                        })}
                    </tbody>
                  );
                })}
              </table>
            </div>
          )}

          {selection && (
            <p className="mt-2 text-xs text-slate-500">
              {selectedCount} cell{selectedCount === 1 ? "" : "s"} selected · press Cmd/Ctrl+C
              to copy, or use Copy selection
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
