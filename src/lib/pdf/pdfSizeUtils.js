export const PDF_FILENAME_PRESENTATION = "Acton-BR-Presentation.pdf";
export const PDF_FILENAME_EMAIL_READY = "Acton-BR-Presentation-Email-Ready.pdf";

export const PRESENTATION_TITLE_SUFFIX = "Acton ADU Build Ready Plans";

export function sanitizePresentationName(customerName) {
  return (customerName || "Customer")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ");
}

export function buildPresentationTitle(customerName) {
  const safeName = sanitizePresentationName(customerName);
  return `${safeName} - ${PRESENTATION_TITLE_SUFFIX}`;
}

export function buildPresentationFileName(customerName, { emailReady = false } = {}) {
  const title = buildPresentationTitle(customerName);
  return emailReady ? `${title} (Email Ready).pdf` : `${title}.pdf`;
}

export function bytesToMb(bytes) {
  return bytes.length / (1024 * 1024);
}

export function formatMb(bytes) {
  return bytesToMb(bytes).toFixed(1);
}
