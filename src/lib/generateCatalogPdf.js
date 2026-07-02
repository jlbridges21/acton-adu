import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import watermarkUrl from "../../public/watermark.png?url";
import { fetchEndTemplatePdfBytes } from "./catalogAssets";
import { formatPlanPrice } from "../config/pricing";
import { formatBaths } from "../utils/filters";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 48;
const COVER_PATH = `${import.meta.env.BASE_URL}catalog-cover.png`;
const WATERMARK_MAX_WIDTH = 100;
const WATERMARK_MARGIN = 24;

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load file (${response.status})`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

/** Detect format from file magic bytes (not URL extension). */
function detectImageFormat(bytes) {
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e) {
    return "png";
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return "jpeg";
  }
  return "unknown";
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image could not be decoded"));
    img.src = src;
  });
}

/** Decode any browser-supported image and embed as PNG in the PDF. */
async function embedViaCanvas(pdfDoc, bytes) {
  const blob = new Blob([bytes]);
  const objectUrl = URL.createObjectURL(blob);
  try {
    const img = await loadImageElement(objectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d").drawImage(img, 0, 0);
    const pngBuffer = await fetch(canvas.toDataURL("image/png"))
      .then((r) => r.arrayBuffer());
    return pdfDoc.embedPng(new Uint8Array(pngBuffer));
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function embedImageBytes(pdfDoc, bytes) {
  const format = detectImageFormat(bytes);
  if (format === "png") return pdfDoc.embedPng(bytes);
  if (format === "jpeg") return pdfDoc.embedJpg(bytes);
  return embedViaCanvas(pdfDoc, bytes);
}

async function renderPdfPageAsPngBytes(url) {
  const pdf = await pdfjsLib.getDocument(url).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d");
  await page.render({ canvasContext: context, viewport }).promise;
  const dataUrl = canvas.toDataURL("image/png");
  return fetch(dataUrl).then((r) => r.arrayBuffer()).then((b) => new Uint8Array(b));
}

async function embedPlanImage(pdfDoc, plan) {
  if (plan.fileType === "pdf") {
    const pngBytes = await renderPdfPageAsPngBytes(plan.fileUrl);
    return pdfDoc.embedPng(pngBytes);
  }

  const bytes = await fetchBytes(plan.fileUrl);
  return embedImageBytes(pdfDoc, bytes);
}

function drawWatermark(page, watermarkImage) {
  const scale = WATERMARK_MAX_WIDTH / watermarkImage.width;
  const width = watermarkImage.width * scale;
  const height = watermarkImage.height * scale;

  page.drawImage(watermarkImage, {
    x: WATERMARK_MARGIN,
    y: PAGE_HEIGHT - WATERMARK_MARGIN - height,
    width,
    height,
  });
}

function drawCoverPage(page, coverImage, customerName, fonts) {
  const coverScale = Math.max(
    PAGE_WIDTH / coverImage.width,
    PAGE_HEIGHT / coverImage.height,
  );
  const coverW = coverImage.width * coverScale;
  const coverH = coverImage.height * coverScale;
  const coverX = (PAGE_WIDTH - coverW) / 2;
  const coverY = (PAGE_HEIGHT - coverH) / 2;

  page.drawImage(coverImage, {
    x: coverX,
    y: coverY,
    width: coverW,
    height: coverH,
  });

  const title = `${customerName.trim()} Build Ready Catalogue`;
  const size = 20;
  let fontSize = size;
  let textWidth = fonts.bold.widthOfTextAtSize(title, fontSize);
  const maxWidth = PAGE_WIDTH - 80;

  while (textWidth > maxWidth && fontSize > 12) {
    fontSize -= 1;
    textWidth = fonts.bold.widthOfTextAtSize(title, fontSize);
  }

  page.drawText(title, {
    x: (PAGE_WIDTH - textWidth) / 2,
    y: 92,
    size: fontSize,
    font: fonts.bold,
    color: rgb(1, 1, 1),
  });
}

async function drawPlanPage(pdfDoc, plan, fonts, watermarkImage, priceRegion) {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: rgb(0.97, 0.98, 0.99),
  });

  let cursorY = PAGE_HEIGHT - MARGIN;

  const nameSize = 22;
  const nameWidth = fonts.bold.widthOfTextAtSize(plan.name, nameSize);
  page.drawText(plan.name, {
    x: (PAGE_WIDTH - nameWidth) / 2,
    y: cursorY - nameSize,
    size: nameSize,
    font: fonts.bold,
    color: rgb(0.12, 0.16, 0.22),
  });
  cursorY -= nameSize + 10;

  if (plan.series) {
    const seriesSize = 12;
    const seriesWidth = fonts.regular.widthOfTextAtSize(plan.series, seriesSize);
    page.drawText(plan.series, {
      x: (PAGE_WIDTH - seriesWidth) / 2,
      y: cursorY - seriesSize,
      size: seriesSize,
      font: fonts.regular,
      color: rgb(0.42, 0.47, 0.52),
    });
    cursorY -= seriesSize + 14;
  }

  const statsText = `${plan.beds} bed  ·  ${formatBaths(plan.baths)} bath  ·  ${plan.squareFeet?.toLocaleString()} sq ft`;
  const statsSize = 11;
  const statsWidth = fonts.regular.widthOfTextAtSize(statsText, statsSize);
  page.drawText(statsText, {
    x: (PAGE_WIDTH - statsWidth) / 2,
    y: cursorY - statsSize,
    size: statsSize,
    font: fonts.regular,
    color: rgb(0.35, 0.4, 0.45),
  });
  cursorY -= statsSize + 20;

  const priceBlockHeight = 52;
  const imageBottom = MARGIN + priceBlockHeight;
  const availableHeight = cursorY - imageBottom;
  const availableWidth = PAGE_WIDTH - MARGIN * 2;

  try {
    const image = await embedPlanImage(pdfDoc, plan);
    const scale = Math.min(
      availableWidth / image.width,
      availableHeight / image.height,
    );
    const width = image.width * scale;
    const height = image.height * scale;

    page.drawImage(image, {
      x: (PAGE_WIDTH - width) / 2,
      y: imageBottom + (availableHeight - height) / 2,
      width,
      height,
    });
  } catch {
    const fallback = "Floorplan image could not be loaded";
    const fallbackSize = 12;
    const fallbackWidth = fonts.regular.widthOfTextAtSize(fallback, fallbackSize);
    page.drawText(fallback, {
      x: (PAGE_WIDTH - fallbackWidth) / 2,
      y: imageBottom + availableHeight / 2,
      size: fallbackSize,
      font: fonts.regular,
      color: rgb(0.5, 0.52, 0.55),
    });
  }

  const label = "Base price";
  const labelSize = 10;
  const labelWidth = fonts.regular.widthOfTextAtSize(label, labelSize);
  page.drawText(label, {
    x: (PAGE_WIDTH - labelWidth) / 2,
    y: MARGIN + 30,
    size: labelSize,
    font: fonts.regular,
    color: rgb(0.45, 0.5, 0.55),
  });

  const priceText = formatPlanPrice(plan, priceRegion);
  const priceSize = 28;
  const priceWidth = fonts.bold.widthOfTextAtSize(priceText, priceSize);
  page.drawText(priceText, {
    x: (PAGE_WIDTH - priceWidth) / 2,
    y: MARGIN,
    size: priceSize,
    font: fonts.bold,
    color: rgb(0.05, 0.35, 0.75),
  });

  if (plan.preApproved) {
    const badge = "Pre-approved";
    const badgeSize = 9;
    page.drawText(badge, {
      x: MARGIN,
      y: PAGE_HEIGHT - MARGIN - 10,
      size: badgeSize,
      font: fonts.bold,
      color: rgb(0.05, 0.55, 0.35),
    });
  }

  if (watermarkImage) {
    drawWatermark(page, watermarkImage);
  }
}

export function downloadCatalogPdf(bytes, { customerName, emailReady = false } = {}) {
  const safeName = (customerName || "Customer")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ");

  const filename = emailReady
    ? "Acton-BR-Presentation-Email-Ready.pdf"
    : `${safeName} - Acton ADU - BR Catalogue.pdf`;

  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function appendEndTemplate(pdfDoc) {
  const templateBytes = await fetchEndTemplatePdfBytes();

  let templateDoc;
  try {
    templateDoc = await PDFDocument.load(templateBytes);
  } catch {
    throw new Error("The package examples PDF could not be parsed.");
  }

  const pageIndices = templateDoc.getPageIndices();
  const copiedPages = await pdfDoc.copyPages(templateDoc, pageIndices);

  for (const page of copiedPages) {
    pdfDoc.addPage(page);
  }
}

/**
 * Build the catalogue PDF bytes without downloading.
 */
export async function buildCatalogPdfBytes({
  customerName,
  plans,
  priceRegion,
  includePackageExamples = false,
}) {
  const trimmedName = customerName.trim();
  if (!trimmedName) {
    throw new Error("Enter a customer name for the catalogue.");
  }
  if (!plans.length) {
    throw new Error("Select at least one floorplan.");
  }

  const sortedPlans = [...plans].sort(
    (a, b) => (a.squareFeet ?? 0) - (b.squareFeet ?? 0),
  );

  const pdfDoc = await PDFDocument.create();
  const fonts = {
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
  };

  const coverBytes = await fetchBytes(COVER_PATH);
  const coverImage = await embedImageBytes(pdfDoc, coverBytes);
  const coverPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawCoverPage(coverPage, coverImage, trimmedName, fonts);

  let watermarkImage = null;
  try {
    const watermarkBytes = await fetchBytes(watermarkUrl);
    watermarkImage = await embedImageBytes(pdfDoc, watermarkBytes);
  } catch (err) {
    console.warn("Catalog watermark could not be loaded.", err);
  }

  for (const plan of sortedPlans) {
    await drawPlanPage(pdfDoc, plan, fonts, watermarkImage, priceRegion);
  }

  if (includePackageExamples) {
    try {
      await appendEndTemplate(pdfDoc);
    } catch (err) {
      throw new Error(
        err.message ||
          "Could not append the package examples PDF. Try again or export without package examples.",
      );
    }
  }

  return pdfDoc.save();
}

/**
 * Builds and downloads a branded PDF catalogue for the selected floorplans.
 */
export async function generateCatalogPdf({
  customerName,
  plans,
  priceRegion,
  includePackageExamples = false,
  emailReady = false,
}) {
  const pdfBytes = await buildCatalogPdfBytes({
    customerName,
    plans,
    priceRegion,
    includePackageExamples,
  });

  downloadCatalogPdf(pdfBytes, { customerName, emailReady });
  return pdfBytes;
}
