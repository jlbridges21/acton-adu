import { useState } from "react";

const MODAL_IMAGE_MAX = "max-h-[min(38vh,420px)]";
const MODAL_PDF_HEIGHT = "min(38vh, 420px)";

/**
 * Shows the full floorplan without cropping or stretching.
 * Images use object-contain; PDFs use an embedded viewer.
 */
export default function FloorplanMedia({
  plan,
  maxHeightClass = MODAL_IMAGE_MAX,
  pdfHeight = MODAL_PDF_HEIGHT,
}) {
  const [hasError, setHasError] = useState(false);

  if (plan.fileType === "pdf") {
    return (
      <div className="flex w-full flex-col items-center gap-3 bg-slate-50 p-3">
        <iframe
          title={`${plan.name} PDF`}
          src={plan.fileUrl}
          className="w-full rounded-lg border border-slate-200 bg-white"
          style={{ height: pdfHeight }}
        />
        <a
          href={plan.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Open PDF in new tab
        </a>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex min-h-[160px] items-center justify-center bg-slate-100 text-slate-500">
        Preview unavailable
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-center bg-slate-50 p-3">
      <img
        src={plan.fileUrl}
        alt={`${plan.name} floorplan`}
        className={`w-full ${maxHeightClass} object-contain`}
        onError={() => setHasError(true)}
      />
    </div>
  );
}
