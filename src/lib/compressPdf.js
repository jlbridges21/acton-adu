const COMPRESS_URL = (import.meta.env.VITE_COMPRESS_API_URL || "").trim();

function readResponseHeader(response, name) {
  return response.headers.get(name) || "";
}

/**
 * Send a generated PDF to the Acton PDF Compressor API on Render.
 * @param {Blob} pdfBlob
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
        else if (payload.message) message = payload.message;
      } catch {
        if (errorText) message = errorText;
      }

      return { success: false, error: message };
    }

    const compressedBuffer = await response.arrayBuffer();
    const blob = new Blob([compressedBuffer], { type: "application/pdf" });

    return {
      success: true,
      blob,
      originalSizeMb: Number(readResponseHeader(response, "X-Original-Size-MB") || 0),
      compressedSizeMb:
        Number(readResponseHeader(response, "X-Compressed-Size-MB") || 0) ||
        blob.size / (1024 * 1024),
      preset: readResponseHeader(response, "X-Compression-Preset"),
      dpi: readResponseHeader(response, "X-Compression-DPI"),
      compressionWarning: readResponseHeader(response, "X-Compression-Warning"),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Could not reach the PDF compression service.",
    };
  }
}
