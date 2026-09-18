"use client";

import {
  useState,
} from "react";

import {
  CheckCircle2,
  FilePlus2,
  FileText,
  LoaderCircle,
  XCircle,
} from "lucide-react";

import {
  addAdmissionDocument,
  rejectAdmissionDocument,
  verifyAdmissionDocument,
} from "@/lib/api/admissions";

import type {
  AdmissionDocument,
} from "@/types/admissions";

const DOCUMENT_TYPES = [
  ["PHOTO", "Photo"],
  ["AADHAAR", "Aadhaar"],
  ["SSLC", "SSLC"],
  ["PLUS_TWO", "Plus Two"],
  ["UG_CERTIFICATE", "UG Certificate"],
  ["PG_CERTIFICATE", "PG Certificate"],
  ["TRANSFER_CERTIFICATE", "Transfer Certificate"],
  ["MIGRATION_CERTIFICATE", "Migration Certificate"],
  ["MARK_SHEET", "Mark Sheet"],
  ["PREVIOUS_SEMESTER", "Previous Semester Document"],
  ["OTHER", "Other"],
] as const;

interface Props {
  admissionId: string;
  documents: AdmissionDocument[];
  canManage: boolean;
  onChanged: () => Promise<void>;
}

export function AdmissionDocumentPanel({
  admissionId,
  documents,
  canManage,
  onChanged,
}: Props) {
  const [documentType, setDocumentType] =
    useState("AADHAAR");

  const [documentName, setDocumentName] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [file, setFile] =
    useState<File | null>(null);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleAddDocument() {
    setSaving(true);
    setError("");

    try {
      const formData = new FormData();

      formData.append(
        "document_type",
        documentType,
      );

      if (documentName.trim()) {
        formData.append(
          "document_name",
          documentName.trim(),
        );
      }

      if (notes.trim()) {
        formData.append(
          "notes",
          notes.trim(),
        );
      }

      if (file) {
        formData.append("file", file);
      }

      await addAdmissionDocument(
        admissionId,
        formData,
      );

      setDocumentName("");
      setNotes("");
      setFile(null);

      await onChanged();
    } catch {
      setError(
        "Unable to add the document.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleVerify(
    documentId: string,
  ) {
    const verificationNotes =
      window.prompt(
        "Verification notes (optional):",
        "",
      );

    if (verificationNotes === null) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await verifyAdmissionDocument(
        admissionId,
        documentId,
        verificationNotes,
      );

      await onChanged();
    } catch {
      setError(
        "Unable to verify the document.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleReject(
    documentId: string,
  ) {
    const reason = window.prompt(
      "Enter rejection reason:",
      "",
    );

    if (!reason?.trim()) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await rejectAdmissionDocument(
        admissionId,
        documentId,
        reason.trim(),
      );

      await onChanged();
    } catch {
      setError(
        "Unable to reject the document.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <FileText size={19} />
        </div>

        <div>
          <h3 className="font-semibold text-slate-950">
            Admission Documents
          </h3>

          <p className="text-xs text-slate-500">
            Receive and verify applicant documents.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {canManage && (
        <div className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-2">
          <select
            value={documentType}
            onChange={(event) =>
              setDocumentType(
                event.target.value,
              )
            }
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            {DOCUMENT_TYPES.map(
              ([value, label]) => (
                <option
                  key={value}
                  value={value}
                >
                  {label}
                </option>
              ),
            )}
          </select>

          <input
            value={documentName}
            onChange={(event) =>
              setDocumentName(
                event.target.value,
              )
            }
            placeholder="Document name"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          />

          <input
            type="file"
            onChange={(event) =>
              setFile(
                event.target.files?.[0] ??
                  null,
              )
            }
            className="text-sm text-slate-600"
          />

          <input
            value={notes}
            onChange={(event) =>
              setNotes(
                event.target.value,
              )
            }
            placeholder="Notes"
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm"
          />

          <button
            type="button"
            disabled={saving}
            onClick={() =>
              void handleAddDocument()
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-60 md:col-span-2"
          >
            {saving ? (
              <LoaderCircle
                size={16}
                className="animate-spin"
              />
            ) : (
              <FilePlus2 size={16} />
            )}

            Add Document
          </button>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
            No admission documents added.
          </div>
        ) : (
          documents.map((document) => (
            <div
              key={document.id}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row">
                <div>
                  <div className="font-medium text-slate-900">
                    {document.document_name ||
                      document.document_type_display}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {document.document_type_display}
                    {" • "}
                    {document.status_display}
                  </div>

                  {document.rejection_reason && (
                    <p className="mt-2 text-xs text-rose-600">
                      {document.rejection_reason}
                    </p>
                  )}
                </div>

                {canManage && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        void handleVerify(
                          document.id,
                        )
                      }
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-50 px-3 text-xs font-semibold text-emerald-700"
                    >
                      <CheckCircle2
                        size={14}
                      />
                      Verify
                    </button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        void handleReject(
                          document.id,
                        )
                      }
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-rose-50 px-3 text-xs font-semibold text-rose-700"
                    >
                      <XCircle size={14} />
                      Reject
                    </button>
                  </div>
                )}
              </div>

              {document.file && (
                <div className="mt-3 text-xs text-blue-700">
                  Document file attached
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}