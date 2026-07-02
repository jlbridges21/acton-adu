const COMPRESS_URL = (import.meta.env.VITE_COMPRESS_API_URL || "").trim();
const COMPRESS_MIN_MB = Number(import.meta.env.VITE_COMPRESS_MIN_MB || 12);
const COMPRESS_DPI = Number(import.meta.env.VITE_COMPRESS_DPI || 300);

function readResponseHeader(response, name) {
  return response.headers.get(name) || "";
}

/**
 * Send a generated PDF to the Acton PDF Compressor API on Render.
 * @param {Blob} pdfBlob - Generated presentation PDF
 * @returns {Promise<{ success: true, blob: Blob, originalSizeMb: number, compressedSizeMb: number, preset: string, dpi: string, compressionWarning: string } | { success: false, error: string }>}
 */
export async function compressPdf(pdfBlob) {
  if (!COMPRESS_URL) {
    console.warn("PDF compression is not configured.");
    return { success: false, error: "PDF compression is not configured." };
  }

  try {
    const formData = new FormData();
    formData.append("file", pdfBlob, "presentation.pdf");
    formData.append("minMb", String(COMPRESS_MIN_MB));
    formData.append("dpi", String(COMPRESS_DPI));

    const response = await fetch(COMPRESS_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      let message = `Optimization failed (${response.status}).`;

      try {
        const payload = JSON.parse(errorText);
        if (payload.error) message = payload.error;
        else if (payload.message) message = payload.message;
      } catch {
        if (errorText) message = errorText;
      }

      return { success: false, error: message };
    }

    const compressedBuffer = await response.arrayBuffer();
    const blob = new Blob([compressedBuffer], { type: "application/pdf" });

    const originalSizeMb = Number(readResponseHeader(response, "X-Original-Size-MB") || 0);
    const compressedSizeMb =
      Number(readResponseHeader(response, "X-Compressed-Size-MB") || 0) ||
      blob.size / (1024 * 1024);
    const preset = readResponseHeader(response, "X-Compression-Preset");
    const dpi = readResponseHeader(response, "X-Compression-DPI");
    const compressionWarning = readResponseHeader(response, "X-Compression-Warning");

    return {
      success: true,
      blob,
      originalSizeMb,
      compressedSizeMb,
      preset,
      dpi,
      compressionWarning,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Could not reach the PDF optimization service.",
    };
  }
}

function buildOptimizationDetails(result) {
  const parts = [];

  if (result.originalSizeMb > 0) {
    parts.push(`Original: ${result.originalSizeMb.toFixed(1)} MB`);
  }

  parts.push(`Optimized: ${result.compressedSizeMb.toFixed(1)} MB`);

  if (result.preset) {
    parts.push(`Preset: ${result.preset}`);
  }

  if (result.dpi) {
    parts.push(`DPI: ${result.dpi}`);
  }

  return parts.join(" · ");
}

/**
 * Optimize catalogue PDF bytes for the export bar.
 * Falls back to the original PDF when optimization is unavailable or fails.
 */
export async function compressCatalogPdf(pdfBytes) {
  const originalBlob = new Blob([pdfBytes], { type: "application/pdf" });
  const originalSizeMb = pdfBytes.length / (1024 * 1024);
  const result = await compressPdf(originalBlob);

  if (result.success) {
    const compressedBytes = new Uint8Array(await result.blob.arrayBuffer());

    return {
      bytes: compressedBytes,
      sizeMb: result.compressedSizeMb,
      compressed: true,
      warning: null,
      apiWarning: result.compressionWarning || null,
      notice: `PDF optimized for email: ${result.compressedSizeMb.toFixed(1)} MB.`,
      details: buildOptimizationDetails(result),
      notConfigured: false,
    };
  }

  if (result.error === "PDF compression is not configured.") {
    return {
      bytes: pdfBytes,
      sizeMb: originalSizeMb,
      compressed: false,
      warning: "PDF compression is not configured.",
      apiWarning: null,
      notice: null,
      details: null,
      notConfigured: true,
    };
  }

  return {
    bytes: pdfBytes,
    sizeMb: originalSizeMb,
    compressed: false,
    warning: "PDF compression failed, so the original PDF was used.",
    apiWarning: null,
    notice: null,
    details: null,
    notConfigured: false,
  };
}
