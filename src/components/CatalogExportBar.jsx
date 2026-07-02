import { useState } from "react";
import { usePriceRegion } from "../context/PriceRegionContext";
import { copyToClipboard } from "../lib/copyToClipboard";
import { saveCatalogExport } from "../lib/catalogExports";
import {
  createPendingCustomerPresentation,
  markCustomerPresentationFailed,
  uploadPdfForExistingPresentation,
} from "../lib/customerPresentations";
import { createFinalPdf, downloadPdfExport } from "../lib/pdf/exportCatalogPdf";
import { formatMb } from "../lib/pdf/pdfSizeUtils";

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
  const [backgroundProcessing, setBackgroundProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [includePackageExamples, setIncludePackageExamples] = useState(false);
  const [createShareableLink, setCreateShareableLink] = useState(false);
  const [compressPdfEnabled, setCompressPdfEnabled] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [exportDetails, setExportDetails] = useState("");
  const [exportWarning, setExportWarning] = useState("");
  const { priceRegion } = usePriceRegion();

  if (selectedCount === 0) return null;

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;

    setCopyFeedback("");
    const copied = await copyToClipboard(shareUrl);

    if (copied) {
      setCopyFeedback("Copied!");
      window.setTimeout(() => setCopyFeedback(""), 2000);
      return;
    }

    setCopyFeedback("Could not copy link. Please copy it manually.");
  };

  const handleCreatePdf = async () => {
    const shouldCompress = compressPdfEnabled === true;
    const trimmedName = customerName.trim();

    if (!trimmedName) {
      setError("Enter a customer name for the catalogue.");
      return;
    }

    setError("");
    setNotice("");
    setCopyFeedback("");
    setShareUrl("");
    setExportDetails("");
    setExportWarning("");
    setStatusText("");
    setGenerating(true);
    setBackgroundProcessing(false);

    let pendingPresentation = null;

    try {
      if (createShareableLink) {
        pendingPresentation = await createPendingCustomerPresentation({
          title: trimmedName,
          includedExamples: includePackageExamples,
          compressed: shouldCompress,
        });

        setShareUrl(pendingPresentation.shareUrl);
        setNotice(
          "Share link created. Preparing PDF in the background… You can copy and send the link now. The PDF will appear once processing finishes.",
        );
        setGenerating(false);
        setBackgroundProcessing(true);
        window.open(pendingPresentation.shareUrl, "_blank", "noopener,noreferrer");
      }

      const finalPdf = await createFinalPdf(
        {
          customerName: trimmedName,
          plans: selectedPlans,
          priceRegion,
          includePackageExamples,
          shouldCompress,
        },
        (message) => {
          setStatusText(message);
        },
      );

      setExportDetails(finalPdf.details || "");
      setExportWarning(finalPdf.warning || "");
      downloadPdfExport(finalPdf);

      if (!createShareableLink) {
        setNotice(`PDF ready. (${formatMb(finalPdf.bytes)} MB)`);
      }

      if (createShareableLink && pendingPresentation) {
        setNotice(
          "Share link created. Uploading PDF in the background… Keep this tab open until the upload finishes.",
        );

        await uploadPdfForExistingPresentation({
          presentationId: pendingPresentation.id,
          shareToken: pendingPresentation.shareToken,
          pdfBytes: finalPdf.bytes,
          compressed: finalPdf.compressed,
          fileSizeMb: finalPdf.sizeMb,
        });

        setNotice("PDF uploaded. Share link is ready.");
      }

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
      const message = err.message || "Could not create PDF. Try again.";

      if (pendingPresentation) {
        await markCustomerPresentationFailed(pendingPresentation.id, message);
        setNotice(
          "PDF failed to generate. The share link was created, but the presentation could not be prepared.",
        );
      } else {
        setError(message);
      }
    } finally {
      setGenerating(false);
      setBackgroundProcessing(false);
      setStatusText("");
    }
  };

  const buttonLabel = generating
    ? statusText || "Generating PDF…"
    : backgroundProcessing
      ? "Preparing PDF…"
      : "Create PDF";

  const controlsDisabled = generating;

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
              disabled={controlsDisabled}
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
                setCopyFeedback("");
              }}
              disabled={controlsDisabled}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">
              Create shareable customer link
              <span className="mt-0.5 block text-xs text-slate-500">
                Link appears immediately. PDF uploads in the background.
              </span>
            </span>
          </label>

          <label className="mt-2 flex max-w-xl cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={compressPdfEnabled}
              onChange={(e) => {
                setCompressPdfEnabled(e.target.checked);
                setError("");
                setNotice("");
                setExportDetails("");
                setExportWarning("");
              }}
              disabled={controlsDisabled}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">
              <span className="block font-medium">Compress PDF</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Only affects the downloaded/shared PDF. Does not affect how fast the link appears.
              </span>
            </span>
          </label>

          {backgroundProcessing && (
            <p className="mt-2 text-xs text-amber-700" role="status">
              Keep this tab open until the upload finishes.
            </p>
          )}

          {notice && (
            <p
              className={`mt-2 text-sm ${
                notice.includes("failed") || notice.includes("not configured")
                  ? "text-amber-700"
                  : "text-emerald-700"
              }`}
              role="status"
            >
              {notice}
            </p>
          )}

          {exportDetails && (
            <p className="mt-1 text-xs text-slate-500" role="status">
              {exportDetails}
            </p>
          )}

          {exportWarning && exportWarning !== notice && (
            <p className="mt-1 text-xs text-amber-700" role="status">
              {exportWarning}
            </p>
          )}

          {shareUrl && (
            <div className="mt-3 max-w-xl">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
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
              {copyFeedback && (
                <p
                  className={`mt-1.5 text-xs ${
                    copyFeedback === "Copied!" ? "text-emerald-700" : "text-amber-700"
                  }`}
                  role="status"
                >
                  {copyFeedback}
                </p>
              )}
            </div>
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
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
