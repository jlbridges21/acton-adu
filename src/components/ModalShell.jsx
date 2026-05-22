/**
 * Centered modal that stays within the viewport (max 90vh) with a scrollable body.
 */
export default function ModalShell({
  open,
  onClose,
  title,
  titleId,
  headerExtra,
  children,
  maxWidthClass = "max-w-4xl",
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className={`flex max-h-[90vh] w-full ${maxWidthClass} flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0 pr-4">
            <h2
              id={titleId}
              className="truncate text-lg font-semibold text-slate-900 sm:text-xl"
            >
              {title}
            </h2>
            {headerExtra}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
