import AuthForm from "./AuthForm";

export default function LoginModal({ open, onClose, onSuccess }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <AuthForm onAuth={onSuccess} showClose onClose={onClose} />
    </div>
  );
}
