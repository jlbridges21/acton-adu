import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchCustomerPresentationByToken } from "../lib/customerPresentations";

export default function SharePresentationPage() {
  const { shareToken } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [presentation, setPresentation] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadPresentation() {
      setLoading(true);
      setError("");

      try {
        const data = await fetchCustomerPresentationByToken(shareToken);
        if (!active) return;

        if (!data) {
          setError("This presentation link is invalid or no longer available.");
          setPresentation(null);
          return;
        }

        setPresentation(data);
      } catch (err) {
        if (!active) return;
        setError(err.message || "Could not load this presentation.");
        setPresentation(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPresentation();
    return () => {
      active = false;
    };
  }, [shareToken]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Acton ADU
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 sm:text-3xl">
            Acton ADU Build-Ready Presentation
          </h1>
          {presentation?.title && (
            <p className="mt-2 text-sm text-slate-600">Prepared for {presentation.title}</p>
          )}
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl">
          {loading && (
            <p className="text-sm font-medium text-slate-600">Loading presentation…</p>
          )}

          {!loading && error && (
            <div
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {error}
            </div>
          )}

          {!loading && presentation && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={presentation.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Open / Download PDF
                </a>
                {presentation.fileSizeMb != null && (
                  <p className="text-sm text-slate-500">
                    File size: {Number(presentation.fileSizeMb).toFixed(1)} MB
                  </p>
                )}
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <iframe
                  title="Acton ADU presentation"
                  src={presentation.fileUrl}
                  className="h-[75vh] w-full"
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
