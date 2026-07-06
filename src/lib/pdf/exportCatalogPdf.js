import { buildCatalogPdfBytes } from "../generateCatalogPdf";
import { compressPdf } from "../compressPdf";
import {
  bytesToMb,
  formatMb,
  PDF_FILENAME_EMAIL_READY,
  PDF_FILENAME_PRESENTATION,
} from "./pdfSizeUtils";

function logExportDebug(message, data) {
  if (import.meta.env.DEV) {
    console.debug(`[PDF export] ${message}`, data);
  }
}

function buildCompressionDetails(result) {
  const parts = [];
  if (result.originalSizeMb > 0) {
    parts.push(`Original: ${result.originalSizeMb.toFixed(1)} MB`);
  }
  parts.push(`Compressed: ${result.compressedSizeMb.toFixed(1)} MB`);
  if (result.preset) parts.push(`Preset: ${result.preset}`);
  if (result.dpi) parts.push(`DPI: ${result.dpi}`);
  return parts.join(" · ");
}

/**
 * Build the full-quality catalogue PDF in the browser.
 * Never calls the Render compressor.
 */
export async function buildHighQualityCatalogPdf(
  { customerName, plans, priceRegion, includePackageExamples = false },
  onStatus,
) {
  onStatus?.("Generating PDF…");

  const bytes = await buildCatalogPdfBytes({
    customerName,
    plans,
    priceRegion,
    includePackageExamples,
  });

  const originalSizeMb = bytesToMb(bytes);
  const blob = new Blob([bytes], { type: "application/pdf" });

  return {
    bytes,
    blob,
    sizeMb: originalSizeMb,
    originalSizeMb,
  };
}

/**
 * Optionally compress a PDF for email. Only call when shouldCompress is true.
 */
async function compressPdfForExport(originalBlob, originalSizeMb, onStatus) {
  onStatus?.("Compressing PDF for email…");
  logExportDebug("calling compressPdf", { originalSizeMb: originalSizeMb.toFixed(2) });

  const compression = await compressPdf(originalBlob);

  logExportDebug("compressPdf finished", {
    success: compression.success,
    error: compression.success ? null : compression.error,
  });

  if (compression.success) {
    const compressedBytes = new Uint8Array(await compression.blob.arrayBuffer());
    const compressedSizeMb = bytesToMb(compressedBytes);

    logExportDebug("using compressed PDF", {
      originalSizeMb: originalSizeMb.toFixed(2),
      compressedSizeMb: compressedSizeMb.toFixed(2),
    });

    return {
      blob: new Blob([compressedBytes], { type: "application/pdf" }),
      bytes: compressedBytes,
      fileName: PDF_FILENAME_EMAIL_READY,
      sizeMb: compressedSizeMb,
      originalSizeMb,
      compressed: true,
      usedCompression: true,
      warning: compression.compressionWarning || null,
      details: buildCompressionDetails(compression),
    };
  }

  if (compression.error === "PDF compression is not configured.") {
    console.warn("PDF compression is not configured.");
    return null;
  }

  return {
    fallback: true,
    warning: compression.error || "Compression failed, original PDF was used.",
  };
}

/**
 * Generate the final PDF once. Compress only when shouldCompress is true.
 * Share links should pass shouldCompress only when the Compress PDF checkbox is checked.
 */
export async function createFinalPdf(
  {
    customerName,
    plans,
    priceRegion,
    includePackageExamples = false,
    shouldCompress = false,
  },
  onStatus,
) {
  logExportDebug("starting", {
    shouldCompress,
    planCount: plans.length,
    includePackageExamples,
  });

  const highQuality = await buildHighQualityCatalogPdf(
    { customerName, plans, priceRegion, includePackageExamples },
    onStatus,
  );

  logExportDebug("original PDF built", {
    originalSizeMb: highQuality.originalSizeMb.toFixed(2),
    shouldCompress,
  });

  if (!shouldCompress) {
    logExportDebug("compression skipped", { reason: "shouldCompress is false" });
    return {
      blob: highQuality.blob,
      bytes: highQuality.bytes,
      fileName: PDF_FILENAME_PRESENTATION,
      sizeMb: highQuality.sizeMb,
      originalSizeMb: highQuality.originalSizeMb,
      compressed: false,
      usedCompression: false,
      warning: null,
      details: null,
    };
  }

  const compressionResult = await compressPdfForExport(
    highQuality.blob,
    highQuality.originalSizeMb,
    onStatus,
  );

  if (compressionResult && !compressionResult.fallback) {
    return compressionResult;
  }

  const warning =
    compressionResult?.warning ||
    (compressionResult === null
      ? "PDF compression is not configured. Original PDF was used."
      : "Compression failed, original PDF was used.");

  return {
    blob: highQuality.blob,
    bytes: highQuality.bytes,
    fileName: PDF_FILENAME_PRESENTATION,
    sizeMb: highQuality.sizeMb,
    originalSizeMb: highQuality.originalSizeMb,
    compressed: false,
    usedCompression: false,
    warning,
    details: null,
  };
}

export function downloadPdfExport({ blob, fileName }) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** @deprecated Use createFinalPdf directly */
export async function exportCatalogPdf(options, onStatus) {
  const result = await createFinalPdf(
    {
      ...options,
      shouldCompress: options.compressPdfEnabled === true,
    },
    onStatus,
  );

  return {
    ...result,
    notice: `PDF ready. (${formatMb(result.bytes)} MB)`,
  };
}
