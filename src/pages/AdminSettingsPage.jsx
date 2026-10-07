import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { PRICE_REGION, PRICE_REGION_LABELS } from "../config/pricing";
import { useAuth } from "../context/AuthContext";
import {
  activateEndTemplate,
  fetchActiveEndTemplate,
  getEndTemplatePublicUrl,
  listEndTemplateVersions,
  uploadEndTemplate,
} from "../lib/catalogAssets";
import { formatMb } from "../lib/pdf/pdfSizeUtils";

const REGIONS = [
  { id: PRICE_REGION.SAN_JOSE, label: PRICE_REGION_LABELS[PRICE_REGION.SAN_JOSE] },
  { id: PRICE_REGION.LA, label: PRICE_REGION_LABELS[PRICE_REGION.LA] },
];

function formatUploadedAt(value) {
  if (!value) return "Unknown date";
  return new Date(value).toLocaleString();
}

function formatSize(fileSizeBytes) {
  return `${formatMb({ length: Number(fileSizeBytes) || 0 })} MB`;
}

function TemplateMeta({ template }) {
  return (
    <p className="mt-1 text-sm text-slate-600">
      {template.fileName}
      <span className="text-slate-400"> · </span>
      {formatUploadedAt(template.createdAt)}
      <span className="text-slate-400"> · </span>
      {template.uploadedByEmail || "Unknown uploader"}
      <span className="text-slate-400"> · </span>
      {template.pageCount ?? "?"} pages
      <span className="text-slate-400"> · </span>
      {formatSize(template.fileSizeBytes)}
    </p>
  );
}

function EndTemplateCard({ region }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [versions, setVersions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = () => setReloadKey((value) => value + 1);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [nextActive, nextVersions] = await Promise.all([
          fetchActiveEndTemplate(region.id),
          listEndTemplateVersions(region.id),
        ]);
        if (!active) return;
        setActiveTemplate(nextActive);
        setVersions(nextVersions);
        setLoadError("");
      } catch (err) {
        if (!active) return;
        setLoadError(err.message || "Could not load end templates.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [region.id, reloadKey]);

  const openPreview = (template) => {
    if (!template?.filePath) return;
    window.open(getEndTemplatePublicUrl(template.filePath), "_blank", "noopener,noreferrer");
  };

  const handleUpload = async (file) => {
    setBusy(true);
    setStatusText("");
    setError("");
    setNotice("");

    try {
      await uploadEndTemplate({
        region: region.id,
        file,
        onStatus: setStatusText,
      });
      setNotice("New template is live.");
      refresh();
    } catch (err) {
      setError(err.message || "Could not upload this template.");
    } finally {
      setBusy(false);
      setStatusText("");
    }
  };

  const handleRestore = async (version) => {
    const confirmed = window.confirm(
      `Make this version the active end template for ${region.label}?`,
    );
    if (!confirmed) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await activateEndTemplate(version.id);
      setNotice("Restored template is live.");
      refresh();
    } catch (err) {
      setError(err.message || "Could not restore this template.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{region.label}</h3>

      {loading && <p className="mt-3 text-sm text-slate-600">Loading template…</p>}

      {!loading && loadError && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {loadError}
        </p>
      )}

      {!loading && !loadError && activeTemplate && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Active template
          </p>
          <TemplateMeta template={activeTemplate} />
        </div>
      )}

      {!loading && !loadError && !activeTemplate && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No template uploaded. Exports with package examples will fail for this region.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => openPreview(activeTemplate)}
          disabled={busy || !activeTemplate}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Preview
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Upload new template
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) handleUpload(file);
          }}
        />
      </div>

      {busy && statusText && (
        <p className="mt-3 text-sm text-slate-600" role="status">
          {statusText}
        </p>
      )}
      {notice && (
        <p className="mt-3 text-sm text-emerald-700" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="mt-5 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={() => setHistoryOpen((open) => !open)}
          className="text-sm font-semibold text-slate-700 hover:text-slate-900"
          aria-expanded={historyOpen}
        >
          {historyOpen ? "Hide version history" : "Version history"}
        </button>

        {historyOpen && (
          <ul className="mt-3 divide-y divide-slate-100">
            {versions.length === 0 && (
              <li className="py-2 text-sm text-slate-500">No versions yet.</li>
            )}
            {versions.map((version) => (
              <li
                key={version.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{version.fileName}</p>
                    {version.isActive && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatUploadedAt(version.createdAt)} · {version.uploadedByEmail || "Unknown"} ·{" "}
                    {version.pageCount ?? "?"} pages · {formatSize(version.fileSizeBytes)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => openPreview(version)}
                    disabled={busy}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Preview
                  </button>
                  {!version.isActive && (
                    <button
                      type="button"
                      onClick={() => handleRestore(version)}
                      disabled={busy}
                      className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default function AdminSettingsPage() {
  const { isAdmin, user, signOut } = useAuth();

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                ← Back to library
              </Link>
              <Link
                to="/admin/plans"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Edit Plans Table
              </Link>
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">Settings</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Manage catalogue files used when exporting PDFs.
            </p>
          </div>
          {user?.email && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="max-w-[220px] truncate">{user.email}</span>
              <button
                type="button"
                onClick={signOut}
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-xl font-semibold text-slate-900">Catalogue end templates</h2>
          <p className="mt-1 text-sm text-slate-600">
            This PDF is appended to exported catalogues when &quot;Include exterior, interior, and
            feasibility package examples&quot; is checked. Changes apply to the next catalogue
            exported. No redeploy needed.
          </p>

          <div className="mt-6 space-y-4">
            {REGIONS.map((region) => (
              <EndTemplateCard key={region.id} region={region} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
