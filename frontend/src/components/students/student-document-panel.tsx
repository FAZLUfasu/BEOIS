"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  FileText,
  GraduationCap,
  Loader2,
  Upload,
} from "lucide-react";

import {
  addStudentDocument,
  completeStudentCourse,
  verifyStudentDocument,
} from "@/lib/api/students";

import type {
  StudentDetail,
  StudentDocumentType,
} from "@/types/students";

// ============================================================
// CONFIG
// ============================================================

const DOCUMENT_TYPES: Array<{
  value: StudentDocumentType;
  label: string;
}> = [
  {
    value: "EXAM_APPLICATION",
    label: "Exam Application",
  },
  {
    value: "HALL_TICKET",
    label: "Hall Ticket",
  },
  {
    value: "SEMINAR",
    label: "Seminar",
  },
  {
    value: "PROJECT",
    label: "Project",
  },
  {
    value: "RESULT",
    label: "Result",
  },
  {
    value: "MARK_SHEET",
    label: "Mark Sheet",
  },
  {
    value: "PROVISIONAL",
    label: "Provisional Certificate",
  },
  {
    value: "DEGREE_CERTIFICATE",
    label: "Degree Certificate",
  },
  {
    value: "TRANSFER_CERTIFICATE",
    label: "Transfer Certificate",
  },
  {
    value: "OTHER",
    label: "Other",
  },
];

// ============================================================
// HELPERS
// ============================================================

function getErrorMessage(
  error: unknown,
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return "Something went wrong.";
}

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export function StudentDocumentPanel({
  student,
  onRefresh,
}: {
  student: StudentDetail;
  onRefresh: () => Promise<void>;
}) {
  const [
    showUpload,
    setShowUpload,
  ] = useState(false);

  const [
    documentType,
    setDocumentType,
  ] =
    useState<StudentDocumentType>(
      "EXAM_APPLICATION",
    );

  const [title, setTitle] =
    useState("");

  const [file, setFile] =
    useState<File | null>(
      null,
    );

  const [
    processId,
    setProcessId,
  ] = useState("");

  const [
    referenceNumber,
    setReferenceNumber,
  ] = useState("");

  const [
    issuedDate,
    setIssuedDate,
  ] = useState("");

  const [
    receivedDate,
    setReceivedDate,
  ] = useState("");

  const [notes, setNotes] =
    useState("");

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    verifyingId,
    setVerifyingId,
  ] = useState<
    string | null
  >(null);

  const [
    completionNotes,
    setCompletionNotes,
  ] = useState("");

  const [
    completing,
    setCompleting,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const sortedDocuments =
    useMemo(
      () =>
        [
          ...student.documents,
        ].sort((a, b) =>
          b.created_at.localeCompare(
            a.created_at,
          ),
        ),
      [student.documents],
    );

  const incompleteProcesses =
    useMemo(
      () =>
        student.processes.filter(
          (process) =>
            ![
              "COMPLETED",
              "NOT_APPLICABLE",
              "CANCELLED",
            ].includes(
              process.status,
            ),
        ),
      [student.processes],
    );

  const canCompleteCourse =
    student.status !==
      "COMPLETED" &&
    incompleteProcesses.length ===
      0;

  // ==========================================================
  // UPLOAD
  // ==========================================================

  async function uploadDocument() {
    setError("");
    setSuccess("");

    if (!file) {
      setError(
        "Select a document file before uploading.",
      );
      return;
    }

    if (!title.trim()) {
      setError(
        "Enter a document title.",
      );
      return;
    }

    setUploading(true);

    try {
      const formData =
        new FormData();

      formData.append(
        "document_type",
        documentType,
      );

      formData.append(
        "title",
        title.trim(),
      );

      formData.append(
        "file",
        file,
      );

      if (processId) {
        formData.append(
          "process_id",
          processId,
        );
      }

      if (
        referenceNumber.trim()
      ) {
        formData.append(
          "reference_number",
          referenceNumber.trim(),
        );
      }

      if (issuedDate) {
        formData.append(
          "issued_date",
          issuedDate,
        );
      }

      if (receivedDate) {
        formData.append(
          "received_date",
          receivedDate,
        );
      }

      if (notes.trim()) {
        formData.append(
          "notes",
          notes.trim(),
        );
      }

      await addStudentDocument(
        student.id,
        formData,
      );

      setSuccess(
        "Document uploaded successfully.",
      );

      setShowUpload(false);

      setDocumentType(
        "EXAM_APPLICATION",
      );

      setTitle("");
      setFile(null);
      setProcessId("");
      setReferenceNumber("");
      setIssuedDate("");
      setReceivedDate("");
      setNotes("");

      await onRefresh();
    } catch (err) {
      setError(
        getErrorMessage(err),
      );
    } finally {
      setUploading(false);
    }
  }

  // ==========================================================
  // VERIFY
  // ==========================================================

  async function verifyDocument(
    documentId: string,
  ) {
    setVerifyingId(
      documentId,
    );

    setError("");
    setSuccess("");

    try {
      await verifyStudentDocument(
        student.id,
        documentId,
        "Verified through Education Process Management.",
        );
      setSuccess(
        "Document verified successfully.",
      );

      await onRefresh();
    } catch (err) {
      setError(
        getErrorMessage(err),
      );
    } finally {
      setVerifyingId(null);
    }
  }

  // ==========================================================
  // COMPLETE COURSE
  // ==========================================================

  async function completeCourse() {
    setError("");
    setSuccess("");

    if (
      student.status ===
      "COMPLETED"
    ) {
      return;
    }

    if (
      incompleteProcesses.length >
      0
    ) {
      setError(
        `Course cannot be completed yet. ${incompleteProcesses.length} education process${
          incompleteProcesses.length ===
          1
            ? " is"
            : "es are"
        } still unfinished.`,
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Complete the course for ${student.name} (${student.student_id})? This will mark the student course as completed.`,
      );

    if (!confirmed) {
      return;
    }

    setCompleting(true);

    try {
      await completeStudentCourse(
        student.id,
        completionNotes.trim(),
        );

      setSuccess(
        "Student course completed successfully.",
      );

      setCompletionNotes("");

      await onRefresh();
    } catch (err) {
      setError(
        getErrorMessage(err),
      );
    } finally {
      setCompleting(false);
    }
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">
              Student Documents
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Upload and verify
              academic documents,
              results, mark sheets and
              certificates.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowUpload(
                (value) =>
                  !value,
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {success}
            </span>
          </div>
        )}

        {showUpload && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Document Type">
                <select
                  value={
                    documentType
                  }
                  onChange={(
                    event,
                  ) =>
                    setDocumentType(
                      event
                        .target
                        .value as StudentDocumentType,
                    )
                  }
                  className="input"
                >
                  {DOCUMENT_TYPES.map(
                    (
                      item,
                    ) => (
                      <option
                        key={
                          item.value
                        }
                        value={
                          item.value
                        }
                      >
                        {
                          item.label
                        }
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Document Title">
                <input
                  value={title}
                  onChange={(
                    event,
                  ) =>
                    setTitle(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Example: Semester 1 Hall Ticket"
                  className="input"
                />
              </Field>

              <Field label="File">
                <input
                  type="file"
                  onChange={(
                    event,
                  ) =>
                    setFile(
                      event
                        .target
                        .files?.[0] ??
                        null,
                    )
                  }
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
                />
              </Field>

              <Field label="Related Process">
                <select
                  value={
                    processId
                  }
                  onChange={(
                    event,
                  ) =>
                    setProcessId(
                      event
                        .target
                        .value,
                    )
                  }
                  className="input"
                >
                  <option value="">
                    No specific
                    process
                  </option>

                  {student.processes.map(
                    (
                      process,
                    ) => (
                      <option
                        key={
                          process.id
                        }
                        value={
                          process.id
                        }
                      >
                        {process.title ||
                          process.process_type_display}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Reference Number">
                <input
                  value={
                    referenceNumber
                  }
                  onChange={(
                    event,
                  ) =>
                    setReferenceNumber(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Optional"
                  className="input"
                />
              </Field>

              <Field label="Issued Date">
                <input
                  type="date"
                  value={
                    issuedDate
                  }
                  onChange={(
                    event,
                  ) =>
                    setIssuedDate(
                      event
                        .target
                        .value,
                    )
                  }
                  className="input"
                />
              </Field>

              <Field label="Received Date">
                <input
                  type="date"
                  value={
                    receivedDate
                  }
                  onChange={(
                    event,
                  ) =>
                    setReceivedDate(
                      event
                        .target
                        .value,
                    )
                  }
                  className="input"
                />
              </Field>

              <Field label="Notes">
                <input
                  value={notes}
                  onChange={(
                    event,
                  ) =>
                    setNotes(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Optional notes"
                  className="input"
                />
              </Field>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={
                  uploading
                }
                onClick={() =>
                  setShowUpload(
                    false,
                  )
                }
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  uploading
                }
                onClick={() =>
                  void uploadDocument()
                }
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}

                Upload
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 space-y-3">
          {sortedDocuments.length ===
          0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-300" />

              <p className="mt-2 text-sm font-medium text-slate-700">
                No documents uploaded
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Academic documents
                uploaded for this
                student will appear
                here.
              </p>
            </div>
          ) : (
            sortedDocuments.map(
              (document) => (
                <div
                  key={
                    document.id
                  }
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-blue-600" />

                        <p className="font-medium text-slate-900">
                          {document.title ||
                            document.document_type_display}
                        </p>

                        {document.verified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                            <CheckCircle2 className="h-3 w-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                            Pending
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        {
                          document.document_type_display
                        }

                        {document.reference_number
                          ? ` · Ref: ${document.reference_number}`
                          : ""}

                        {document.issued_date
                          ? ` · Issued ${formatDate(document.issued_date)}`
                          : ""}

                        {document.received_date
                          ? ` · Received ${formatDate(document.received_date)}`
                          : ""}
                      </p>

                      {document.notes && (
                        <p className="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
                          {
                            document.notes
                          }
                        </p>
                      )}
                    </div>

                    {!document.verified && (
                      <button
                        type="button"
                        disabled={
                          verifyingId ===
                          document.id
                        }
                        onClick={() =>
                          void verifyDocument(
                            document.id,
                          )
                        }
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                      >
                        {verifyingId ===
                        document.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileCheck2 className="h-4 w-4" />
                        )}

                        Verify
                      </button>
                    )}
                  </div>

                  {document.file && (
                    <div className="mt-3">
                      <a
                        href={
                          document.file
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        Open Document
                      </a>
                    </div>
                  )}

                  {document.verified &&
                    document.verified_by && (
                      <p className="mt-3 text-xs text-slate-400">
                        Verified by{" "}
                        {
                          document
                            .verified_by
                            .username
                        }
                      </p>
                    )}
                </div>
              ),
            )
          )}
        </div>
      </section>

      {/* ==================================================== */}
      {/* COURSE COMPLETION                                    */}
      {/* ==================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5">
            <GraduationCap className="h-5 w-5 text-blue-600" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-900">
              Course Completion
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Complete the student
              lifecycle only after all
              required education
              processes have been
              resolved.
            </p>
          </div>
        </div>

        {student.status ===
        "COMPLETED" ? (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

            <div>
              <p className="text-sm font-semibold text-emerald-800">
                Course Completed
              </p>

              <p className="mt-1 text-xs text-emerald-700">
                This student has
                completed the course.

                {student.course_completed_at
                  ? ` Completion date: ${formatDate(student.course_completed_at)}.`
                  : ""}
              </p>
            </div>
          </div>
        ) : (
          <>
            {incompleteProcesses.length >
              0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      {
                        incompleteProcesses.length
                      }{" "}
                      unfinished process
                      {incompleteProcesses.length ===
                      1
                        ? ""
                        : "es"}
                    </p>

                    <p className="mt-1 text-xs text-amber-700">
                      Complete, cancel
                      or mark these
                      processes as not
                      applicable before
                      completing the
                      course.
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {incompleteProcesses.map(
                    (
                      process,
                    ) => (
                      <span
                        key={
                          process.id
                        }
                        className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200"
                      >
                        {process.title ||
                          process.process_type_display}
                        {" · "}
                        {
                          process.status_display
                        }
                      </span>
                    ),
                  )}
                </div>
              </div>
            )}

            {canCompleteCourse && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />

                  <div>
                    <p className="text-sm font-semibold text-emerald-800">
                      Ready for course
                      completion
                    </p>

                    <p className="mt-1 text-xs text-emerald-700">
                      All education
                      processes are in
                      an acceptable
                      final state.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <textarea
              value={
                completionNotes
              }
              onChange={(
                event,
              ) =>
                setCompletionNotes(
                  event.target
                    .value,
                )
              }
              rows={3}
              placeholder="Course completion notes (optional)"
              className="mt-4 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />

            <button
              type="button"
              disabled={
                completing ||
                !canCompleteCourse
              }
              onClick={() =>
                void completeCourse()
              }
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {completing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GraduationCap className="h-4 w-4" />
              )}

              Complete Course
            </button>
          </>
        )}
      </section>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid
            rgb(226 232 240);
          border-radius: 0.75rem;
          background: white;
          padding: 0.625rem
            0.75rem;
          font-size: 0.875rem;
          color: rgb(30 41 59);
          outline: none;
        }

        .input:focus {
          border-color: rgb(
            96 165 250
          );
          box-shadow: 0 0 0
            4px rgb(239 246 255);
        }
      `}</style>
    </div>
  );
}

// ============================================================
// FIELD
// ============================================================

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
      </span>

      {children}
    </label>
  );
}