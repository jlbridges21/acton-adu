import { useState } from "react";
import { usePriceRegion } from "../context/PriceRegionContext";
import { compressCatalogPdf } from "../lib/compressPdf";
import { saveCatalogExport } from "../lib/catalogExports";
import { saveCustomerPresentation } from "../lib/customerPresentations";
import { buildCatalogPdfBytes, downloadCatalogPdf } from "../lib/generateCatalogPdf";

export default function CatalogExportBar({
  selectedCount,
  selectedPlans,
  customerName,
  onCustomerNameChange,
  onClearSelection,
  onExportSaved,
}) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [generating, setGenerating] = useState(false);
  const [includePackageExamples, setIncludePackageExamples] = useState(false);
  const [createShareableLink, setCreateShareableLink] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [finalSizeMb, setFinalSizeMb] = useState(null);
  const { priceRegion } = usePriceRegion();

  if (selectedCount === 0) return null;

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNotice("Share link copied to clipboard.");
    } catch {
      setNotice("Could not copy automatically. Copy the link manually.");
    }
  };

  const handleCreatePdf = async () => {
    setError("");
    setNotice("");
    setShareUrl("");
    setFinalSizeMb(null);
    setGenerating(true);

    try {
      const pdfBytes = await buildCatalogPdfBytes({
        customerName,
        plans: selectedPlans,
        priceRegion,
        includePackageExamples,
      });

      setNotice("Compressing PDF for email…");
      const compression = await compressCatalogPdf(pdfBytes);
      const finalBytes = compression.bytes;
      setFinalSizeMb(compression.sizeMb);

      if (compression.warning) {
        setNotice(compression.warning);
      } else if (compression.notice) {
        setNotice(compression.notice);
      }

      if (createShareableLink) {
        const presentation = await saveCustomerPresentation({
          title: customerName.trim(),
          pdfBytes: finalBytes,
          includedExamples: includePackageExamples,
          compressed: compression.compressed,
          fileSizeMb: compression.sizeMb,
        });
        setShareUrl(presentation.shareUrl);
        window.open(presentation.shareUrl, "_blank", "noopener,noreferrer");
        setNotice((current) =>
          `${current ? `${current} ` : ""}Customer share link created.`,
        );
      }

      downloadCatalogPdf(finalBytes, {
        customerName,
        emailReady: compression.compressed,
      });

      try {
        await saveCatalogExport({
          customerName,
          plans: selectedPlans,
        });
        onExportSaved?.();
      } catch (saveErr) {
        setError(
          saveErr.message ||
            "PDF was created, but your catalogue history could not be saved.",
        );
      }
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
              onCustomerNameChange(e.target.value);
              setError("");
              setNotice("");
            }}
            placeholder="e.g. Smith Family"
            className="mt-1 w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />

          <label className="mt-3 flex max-w-xl cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={includePackageExamples}
              onChange={(e) => {
                setIncludePackageExamples(e.target.checked);
                setError("");
              }}
              disabled={generating}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">
              Include exterior, interior, and feasibility package examples
            </span>
          </label>

          <label className="mt-2 flex max-w-xl cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={createShareableLink}
              onChange={(e) => {
                setCreateShareableLink(e.target.checked);
                setError("");
                setShareUrl("");
              }}
              disabled={generating}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">Create shareable customer link</span>
          </label>

          {finalSizeMb != null && (
            <p className="mt-2 text-xs text-slate-500">
              Final PDF size: {finalSizeMb.toFixed(1)} MB
            </p>
          )}

          {shareUrl && (
            <div className="mt-3 flex max-w-xl flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              />
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                Copy Link
              </button>
            </div>
          )}

          {notice && (
            <p className="mt-2 text-sm text-emerald-700" role="status">
              {notice}
            </p>
          )}

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
            {generating
              ? includePackageExamples
                ? "Creating combined PDF…"
                : "Creating PDF…"
              : "Create PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}
