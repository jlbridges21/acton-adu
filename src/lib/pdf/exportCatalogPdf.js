import { buildCatalogPdfBytes } from "../generateCatalogPdf";
import { compressPdf } from "../compressPdf";
import {
  bytesToMb,
  formatMb,
  PDF_FILENAME_EMAIL_READY,
  PDF_FILENAME_PRESENTATION,
} from "./pdfSizeUtils";

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
 * Build the final catalogue PDF for download and optional Supabase upload.
 */
export async function exportCatalogPdf(
  {
    customerName,
    plans,
    priceRegion,
    includePackageExamples = false,
    compressPdfEnabled = false,
  },
  onStatus,
) {
  onStatus?.("Generating PDF…");
  const originalBytes = await buildCatalogPdfBytes({
    customerName,
    plans,
    priceRegion,
    includePackageExamples,
  });

  if (!compressPdfEnabled) {
    onStatus?.(`Final PDF ready: ${formatMb(originalBytes)} MB.`);
    return {
      blob: new Blob([originalBytes], { type: "application/pdf" }),
      bytes: originalBytes,
      fileName: PDF_FILENAME_PRESENTATION,
      sizeMb: bytesToMb(originalBytes),
      compressed: false,
      notice: `Final PDF ready: ${formatMb(originalBytes)} MB.`,
      warning: null,
      details: null,
    };
  }

  onStatus?.("Compressing PDF for email…");
  const compression = await compressPdf(
    new Blob([originalBytes], { type: "application/pdf" }),
  );

  if (compression.success) {
    const compressedBytes = new Uint8Array(await compression.blob.arrayBuffer());
    onStatus?.(`Final PDF ready: ${formatMb(compressedBytes)} MB.`);

    return {
      blob: new Blob([compressedBytes], { type: "application/pdf" }),
      bytes: compressedBytes,
      fileName: PDF_FILENAME_EMAIL_READY,
      sizeMb: bytesToMb(compressedBytes),
      compressed: true,
      notice: `Final PDF ready: ${formatMb(compressedBytes)} MB.`,
      warning: compression.compressionWarning || null,
      details: buildCompressionDetails(compression),
    };
  }

  if (compression.error === "PDF compression is not configured.") {
    console.warn("PDF compression is not configured.");
    onStatus?.(`Final PDF ready: ${formatMb(originalBytes)} MB.`);
    return {
      blob: new Blob([originalBytes], { type: "application/pdf" }),
      bytes: originalBytes,
      fileName: PDF_FILENAME_PRESENTATION,
      sizeMb: bytesToMb(originalBytes),
      compressed: false,
      notice: `Final PDF ready: ${formatMb(originalBytes)} MB.`,
      warning: "PDF compression is not configured. Original PDF downloaded.",
      details: null,
    };
  }

  onStatus?.("Compression failed, original PDF downloaded.");
  return {
    blob: new Blob([originalBytes], { type: "application/pdf" }),
    bytes: originalBytes,
    fileName: PDF_FILENAME_PRESENTATION,
    sizeMb: bytesToMb(originalBytes),
    compressed: false,
    notice: "Compression failed, original PDF downloaded.",
    warning: compression.error || "Compression failed, original PDF downloaded.",
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
