"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, ShieldCheck, UploadCloud } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import {
  confirmAcademicMasterImport,
  previewAcademicMasterImport,
  type AcademicImportReport,
} from "@/lib/api/academic-master-import";

const managementRoles = [
  "SUPER_ADMIN",
  "FULL_ACCESS",
  "CHAIRMAN",
  "GENERAL_MANAGER",
  "ADMISSION",
  "MANAGER",
  "DEPARTMENT_HEAD",
];

function Metric({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value ?? 0}</p>
    </div>
  );
}

export function AcademicMasterImportWorkspace() {
  const { user, loading, hasRole } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<AcademicImportReport | null>(null);
  const [acknowledge, setAcknowledge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const allowed = useMemo(
    () => Boolean(user?.is_superuser) || hasRole(...managementRoles),
    [hasRole, user?.is_superuser],
  );

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Loading...</div>;
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          You do not have permission to import academic master data.
        </div>
      </div>
    );
  }

  async function runDryRun() {
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    setReport(null);
    setAcknowledge(false);
    try {
      const result = await previewAcademicMasterImport(file);
      setReport(result);
      setMessage(result.valid ? "Dry run completed. Review the changes before importing." : "Dry run found blocking validation errors.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dry run failed.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmImport() {
    if (!report?.import_token) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await confirmAcademicMasterImport(report.import_token, acknowledge);
      setReport(null);
      setFile(null);
      setAcknowledge(false);
      setMessage(`Import completed successfully at ${new Date(result.completed_at).toLocaleString()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <p className="text-sm font-medium text-blue-600">Academic Master Data</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">Import Excel</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-500">
          Upload the normalized university master workbook, run a server-side dry run, review changes and warnings, then explicitly confirm the import.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <UploadCloud className="h-6 w-6 text-blue-600" />
          <h2 className="mt-3 font-semibold text-slate-900">1. Upload</h2>
          <p className="mt-1 text-sm text-slate-500">Only .xlsx files up to 15 MB.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <ShieldCheck className="h-6 w-6 text-emerald-600" />
          <h2 className="mt-3 font-semibold text-slate-900">2. Dry Run</h2>
          <p className="mt-1 text-sm text-slate-500">Validation and database comparison without writes.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <CheckCircle2 className="h-6 w-6 text-indigo-600" />
          <h2 className="mt-3 font-semibold text-slate-900">3. Review & Import</h2>
          <p className="mt-1 text-sm text-slate-500">Confirm only after reviewing warnings and changes.</p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 text-center hover:border-blue-400">
          <FileSpreadsheet className="h-9 w-9 text-slate-400" />
          <span className="mt-3 text-sm font-medium text-slate-800">{file ? file.name : "Choose academic master Excel workbook"}</span>
          <span className="mt-1 text-xs text-slate-500">.xlsx only · maximum 15 MB</span>
          <input
            className="hidden"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setReport(null);
              setError("");
              setMessage("");
            }}
          />
        </label>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={!file || busy}
            onClick={runDryRun}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy && !report ? "Running dry run…" : "Run Dry Run"}
          </button>
        </div>
      </section>

      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {report && (
        <section className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Review Import</h2>
            <p className="mt-1 text-xs text-slate-500">Server checksum: {report.sha256}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="Institutions" value={report.counts.institutions} />
            <Metric label="Offerings" value={report.counts.offerings} />
            <Metric label="Student Fee Plans" value={report.counts.student_fee_plans} />
            <Metric label="Center Fee Plans" value={report.counts.center_fee_plans} />
            <Metric label="Installments" value={report.counts.installments} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">Database Changes</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>New institutions: <strong>{report.changes.new_institutions}</strong></p>
                <p>Existing institutions to update: <strong>{report.changes.update_institutions}</strong></p>
                <p>New programs: <strong>{report.changes.new_programs}</strong></p>
                <p>Existing programs to update: <strong>{report.changes.update_programs}</strong></p>
                <p>New student fee plans: <strong>{report.changes.new_student_fee_plans}</strong></p>
                <p>Existing student fee plans to update: <strong>{report.changes.update_student_fee_plans}</strong></p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900">Review-Only Data</h3>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>Additional fees: <strong>{report.review_only.additional_fees}</strong></p>
                <p>Course streams: <strong>{report.review_only.course_streams}</strong></p>
                <p>Rules & notes: <strong>{report.review_only.rules_notes}</strong></p>
                <p>Data quality rows: <strong>{report.review_only.data_quality}</strong></p>
              </div>
            </div>
          </div>

          {report.errors.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <h3 className="flex items-center gap-2 font-semibold text-red-900"><AlertTriangle className="h-5 w-5" /> Blocking Errors ({report.errors.length})</h3>
              <div className="mt-3 max-h-64 space-y-2 overflow-auto text-sm text-red-800">
                {report.errors.map((item, index) => <p key={`${item.code}-${index}`}>{item.message}{item.row ? ` (row ${item.row})` : ""}</p>)}
              </div>
            </div>
          )}

          {report.warnings.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="flex items-center gap-2 font-semibold text-amber-900"><AlertTriangle className="h-5 w-5" /> Warnings ({report.warnings.length})</h3>
              <div className="mt-3 max-h-72 space-y-2 overflow-auto text-sm text-amber-900">
                {report.warnings.map((item, index) => (
                  <div key={`${item.code}-${index}`} className="rounded-lg bg-white/70 p-3">
                    <strong>{item.severity}: {item.code}</strong>
                    <p>{item.message}</p>
                    {item.action_required && <p className="mt-1 text-xs">Action: {item.action_required}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.valid && report.requires_warning_acknowledgement && (
            <label className="flex items-start gap-3 rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-700">
              <input type="checkbox" checked={acknowledge} onChange={(event) => setAcknowledge(event.target.checked)} className="mt-0.5 h-4 w-4" />
              <span>I reviewed the high-severity warnings and understand that the import will update the academic master data using the validated workbook.</span>
            </label>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => { setReport(null); setAcknowledge(false); }}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-40"
            >
              Cancel Review
            </button>
            <button
              type="button"
              disabled={!report.valid || busy || (report.requires_warning_acknowledgement && !acknowledge)}
              onClick={confirmImport}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Importing…" : "Confirm Import"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
