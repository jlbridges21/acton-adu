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
  openImageInNewTab = false,
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

  const openFullSize = () => {
    window.open(plan.fileUrl, "_blank", "noopener,noreferrer");
  };

  const image = (
    <img
      src={plan.fileUrl}
      alt={`${plan.name} floorplan`}
      className={`w-full ${maxHeightClass} object-contain`}
      onError={() => setHasError(true)}
    />
  );

  return (
    <div className="flex w-full items-center justify-center bg-slate-50 p-3">
      {openImageInNewTab ? (
        <button
          type="button"
          onClick={openFullSize}
          className="group w-full cursor-zoom-in rounded-lg transition hover:bg-slate-100/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          title="Open full size in new tab"
        >
          {image}
          <span className="mt-2 block text-center text-xs font-medium text-slate-500 opacity-0 transition group-hover:opacity-100">
            Click to open full size
          </span>
        </button>
      ) : (
        image
      )}
    </div>
  );
}
