import { useState } from "react";

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20";

export default function AuthForm({ onAuth, showClose = false, onClose }) {
  const [mode, setMode] = useState("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);

    try {
      await onAuth({ mode, email, password });
      if (mode === "signUp") {
        setMessage(
          "Account created. If email confirmation is enabled, check your inbox, then sign in. New accounts need Acton access before floorplans are visible.",
        );
      }
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Sign in to Acton BR Library</h2>
          <p className="mt-1 text-sm text-slate-600">
            Create an account or sign in. Floorplans are only visible with Acton or Admin access.
          </p>
        </div>
        {showClose && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>

      <div className="mt-4 flex gap-2 rounded-full bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("signIn");
            setError("");
            setMessage("");
          }}
          className={`flex-1 rounded-full py-1.5 text-sm font-medium ${
            mode === "signIn" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signUp");
            setError("");
            setMessage("");
          }}
          className={`flex-1 rounded-full py-1.5 text-sm font-medium ${
            mode === "signUp" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
          }`}
        >
          Create account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="auth-password">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "signIn" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="text-sm text-emerald-700" role="status">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? "Please wait…" : mode === "signIn" ? "Sign in" : "Create account"}
        </button>
      </form>
    </div>
  );
}
