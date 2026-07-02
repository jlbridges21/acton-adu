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
 * Generate the final PDF once. Compress only when shouldCompress is true.
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

  onStatus?.("Generating PDF…");
  const originalBytes = await buildCatalogPdfBytes({
    customerName,
    plans,
    priceRegion,
    includePackageExamples,
  });
  const originalSizeMb = bytesToMb(originalBytes);
  const originalBlob = new Blob([originalBytes], { type: "application/pdf" });

  logExportDebug("original PDF built", {
    originalSizeMb: originalSizeMb.toFixed(2),
    shouldCompress,
  });

  if (!shouldCompress) {
    logExportDebug("compression skipped", { reason: "shouldCompress is false" });
    return {
      blob: originalBlob,
      bytes: originalBytes,
      fileName: PDF_FILENAME_PRESENTATION,
      sizeMb: originalSizeMb,
      originalSizeMb,
      compressed: false,
      usedCompression: false,
      warning: null,
      details: null,
    };
  }

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
    return {
      blob: originalBlob,
      bytes: originalBytes,
      fileName: PDF_FILENAME_PRESENTATION,
      sizeMb: originalSizeMb,
      originalSizeMb,
      compressed: false,
      usedCompression: false,
      warning: "PDF compression is not configured. Original PDF was used.",
      details: null,
    };
  }

  return {
    blob: originalBlob,
    bytes: originalBytes,
    fileName: PDF_FILENAME_PRESENTATION,
    sizeMb: originalSizeMb,
    originalSizeMb,
    compressed: false,
    usedCompression: false,
    warning: compression.error || "Compression failed, original PDF was used.",
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
