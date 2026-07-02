import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  fetchCustomerPresentationByToken,
  PRESENTATION_STATUS,
} from "../lib/customerPresentations";

const POLL_INTERVAL_MS = 5000;

export default function SharePresentationPage() {
  const { shareToken } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [presentation, setPresentation] = useState(null);

  useEffect(() => {
    let active = true;
    let pollTimer = null;

    async function loadPresentation({ showLoading = true } = {}) {
      if (showLoading) {
        setLoading(true);
      }
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

        if (data.status === PRESENTATION_STATUS.PROCESSING && !pollTimer && active) {
          pollTimer = window.setInterval(() => {
            loadPresentation({ showLoading: false });
          }, POLL_INTERVAL_MS);
        }

        if (
          data.status === PRESENTATION_STATUS.READY ||
          data.status === PRESENTATION_STATUS.FAILED
        ) {
          if (pollTimer) {
            window.clearInterval(pollTimer);
            pollTimer = null;
          }
        }
      } catch (err) {
        if (!active) return;
        setError(err.message || "Could not load this presentation.");
        setPresentation(null);
      } finally {
        if (active && showLoading) {
          setLoading(false);
        }
      }
    }

    loadPresentation();

    return () => {
      active = false;
      if (pollTimer) {
        window.clearInterval(pollTimer);
      }
    };
  }, [shareToken]);

  const isProcessing = presentation?.status === PRESENTATION_STATUS.PROCESSING;
  const isFailed = presentation?.status === PRESENTATION_STATUS.FAILED;
  const isReady =
    presentation?.status === PRESENTATION_STATUS.READY && presentation.fileUrl;

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

          {!loading && presentation && isProcessing && (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
              <div
                className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600"
                aria-hidden="true"
              />
              <p className="text-base font-medium text-slate-900">
                Your Acton ADU presentation is being prepared.
              </p>
              <p className="mt-2 text-sm text-slate-600">Please check back in a moment.</p>
            </div>
          )}

          {!loading && presentation && isFailed && (
            <div
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900"
              role="alert"
            >
              We had trouble preparing this presentation. Please contact your Acton ADU advisor.
            </div>
          )}

          {!loading && isReady && (
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
