import AuthForm from "./AuthForm";
import { useAuth } from "../context/AuthContext";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <p className="text-sm font-medium text-slate-600">Loading…</p>
    </div>
  );
}

function NoAccessScreen({ email, onSignOut }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Acton access required</h2>
        <p className="mt-3 text-sm text-slate-600">
          You are signed in as <strong>{email}</strong>, but this account does not have
          permission to view floorplans yet.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Ask an administrator to set your role to <strong>acton</strong> or{" "}
          <strong>admin</strong> in Supabase.
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-6 rounded-full border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function SignInScreen({ onAuth }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-8 text-center">
        <span className="mb-3 inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
          Floorplan Library
        </span>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Acton BR Library</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
          Sign in or create an account to continue.
        </p>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <AuthForm onAuth={onAuth} />
      </main>
    </div>
  );
}

/**
 * Blocks the library until the user is signed in with acton or admin access.
 */
export default function AuthGate({ children }) {
  const {
    user,
    canViewFloorplans,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  } = useAuth();

  const handleAuth = async ({ mode, email, password }) => {
    if (mode === "signUp") {
      await signUp(email, password);
      return;
    }
    await signIn(email, password);
    await refreshProfile();
  };

  if (loading) return <LoadingScreen />;
  if (!user) return <SignInScreen onAuth={handleAuth} />;
  if (!canViewFloorplans) {
    return <NoAccessScreen email={user.email} onSignOut={signOut} />;
  }

  return children;
}
