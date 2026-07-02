export default function PermissionModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Admin access required</h2>
        <p className="mt-2 text-sm text-slate-600">
          Only <strong>admin</strong> accounts can upload or edit floorplans. Ask an
          administrator to upgrade your role in Supabase if you need upload access.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          OK
        </button>
      </div>
    </div>
  );
}
