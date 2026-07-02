import { useEffect, useRef, useState } from "react";

export default function FilterMultiSelect({
  label,
  options,
  selected = [],
  onChange,
  ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const toggleValue = (value) => {
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onChange(next);
  };

  const buttonLabel =
    selected.length === 0 ? label : `${label} (${selected.length})`;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition ${
          selected.length > 0
            ? "border-blue-300 bg-blue-50 text-blue-800"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
        }`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel || label}
      >
        {buttonLabel}
      </button>

      {open && (
        <div
          className="absolute left-0 z-30 mt-2 min-w-[220px] max-w-[min(100vw-2rem,280px)] rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
          role="listbox"
          aria-label={ariaLabel || label}
        >
          <ul className="max-h-64 space-y-1 overflow-y-auto">
            {options.map((option) => (
              <li key={option.value}>
                <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selected.includes(option.value)}
                    onChange={() => toggleValue(option.value)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{option.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
