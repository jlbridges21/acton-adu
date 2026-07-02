const COMPRESS_URL = (import.meta.env.VITE_COMPRESS_API_URL || "").trim();

/**
 * Send a generated PDF to the Acton PDF Compressor API on Render.
 * @param {Blob} pdfBlob - Generated presentation PDF
 * @returns {Promise<{ success: true, blob: Blob, originalSizeMb: number, compressedSizeMb: number, preset: string } | { success: false, error: string }>}
 */
export async function compressPdf(pdfBlob) {
  if (!COMPRESS_URL) {
    console.warn("PDF compression is not configured.");
    return { success: false, error: "PDF compression is not configured." };
  }

  try {
    const formData = new FormData();
    formData.append("file", pdfBlob, "presentation.pdf");

    const response = await fetch(COMPRESS_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      let message = `Compression failed (${response.status}).`;

      try {
        const payload = JSON.parse(errorText);
        if (payload.error) message = payload.error;
      } catch {
        if (errorText) message = errorText;
      }

      return { success: false, error: message };
    }

    const compressedBuffer = await response.arrayBuffer();
    const blob = new Blob([compressedBuffer], { type: "application/pdf" });

    const originalSizeMb = Number(response.headers.get("X-Original-Size-MB") || 0);
    const compressedSizeMb =
      Number(response.headers.get("X-Compressed-Size-MB") || 0) ||
      blob.size / (1024 * 1024);
    const preset = response.headers.get("X-Compression-Preset") || "";

    return {
      success: true,
      blob,
      originalSizeMb,
      compressedSizeMb,
      preset,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Could not reach the PDF compression service.",
    };
  }
}

/**
 * Compress catalogue PDF bytes for the export bar.
 * Falls back to the original PDF when compression is unavailable or fails.
 */
export async function compressCatalogPdf(pdfBytes) {
  const originalBlob = new Blob([pdfBytes], { type: "application/pdf" });
  const originalSizeMb = pdfBytes.length / (1024 * 1024);
  const result = await compressPdf(originalBlob);

  if (result.success) {
    const compressedBytes = new Uint8Array(await result.blob.arrayBuffer());
    const sizeParts = [];
    if (result.originalSizeMb > 0) {
      sizeParts.push(`from ${result.originalSizeMb.toFixed(1)} MB`);
    }
    sizeParts.push(`to ${result.compressedSizeMb.toFixed(1)} MB`);
    if (result.preset) {
      sizeParts.push(`(${result.preset})`);
    }

    const sizeDetail =
      sizeParts.length > 0 ? ` (${sizeParts.join(" ")})` : "";

    return {
      bytes: compressedBytes,
      sizeMb: result.compressedSizeMb,
      compressed: true,
      warning: null,
      notice: `PDF compressed successfully.${sizeDetail}`,
      notConfigured: false,
    };
  }

  if (result.error === "PDF compression is not configured.") {
    return {
      bytes: pdfBytes,
      sizeMb: originalSizeMb,
      compressed: false,
      warning: "PDF compression is not configured.",
      notice: null,
      notConfigured: true,
    };
  }

  return {
    bytes: pdfBytes,
    sizeMb: originalSizeMb,
    compressed: false,
    warning: "PDF compression failed, so the original PDF was used.",
    notice: null,
    notConfigured: false,
  };
}
