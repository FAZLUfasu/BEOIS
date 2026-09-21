"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";

import {
  changeStudentProcessStatus,
  createStudentProcess,
  initializeStudentProcesses,
} from "@/lib/api/students";

import type {
  CreateStudentProcessPayload,
  StudentDetail,
  StudentProcessStatus,
  StudentProcessType,
} from "@/types/students";

const PROCESS_TYPES: Array<{
  value: StudentProcessType;
  label: string;
}> = [
  { value: "EXAM", label: "Exam" },
  { value: "SEMINAR", label: "Seminar" },
  { value: "PROJECT", label: "Project" },
  { value: "RESULT", label: "Result" },
  { value: "MARK_SHEET", label: "Mark Sheet" },
  { value: "CERTIFICATE", label: "Certificate" },
];

const PROCESS_STATUSES: Array<{
  value: StudentProcessStatus;
  label: string;
}> = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "COMPLETED", label: "Completed" },
  { value: "NOT_APPLICABLE", label: "Not Applicable" },
  { value: "CANCELLED", label: "Cancelled" },
];

function messageFromError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

function badgeClass(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "IN_PROGRESS":
    case "SUBMITTED":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "PENDING":
    case "NOT_STARTED":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "CANCELLED":
      return "bg-red-50 text-red-700 ring-red-200";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

export function StudentProcessPanel({
  student,
  onRefresh,
}: {
  student: StudentDetail;
  onRefresh: () => Promise<void>;
}) {
  const [initializing, setInitializing] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [showCreate, setShowCreate] =
    useState(false);

  const [processType, setProcessType] =
    useState<StudentProcessType>("EXAM");

  const [title, setTitle] =
    useState("");

  const [academicYear, setAcademicYear] =
    useState(
      String(student.current_year),
    );

  const [semester, setSemester] =
    useState(
      String(student.current_semester),
    );

  const [dueDate, setDueDate] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const sortedProcesses = useMemo(
    () =>
      [...student.processes].sort(
        (a, b) =>
          a.process_type.localeCompare(
            b.process_type,
          ),
      ),
    [student.processes],
  );

  async function initializeProcesses() {
    setInitializing(true);
    setError("");
    setSuccess("");

    try {
      const result =
        await initializeStudentProcesses(
          student.id,
        );

      setSuccess(
        result.created_count > 0
          ? `${result.created_count} standard processes created.`
          : "Standard processes are already initialized.",
      );

      await onRefresh();
    } catch (err) {
      setError(
        messageFromError(err),
      );
    } finally {
      setInitializing(false);
    }
  }

  async function createProcess() {
    setCreating(true);
    setError("");
    setSuccess("");

    try {
      const payload: CreateStudentProcessPayload =
        {
          process_type: processType,
          title:
            title.trim() ||
            undefined,
          academic_year:
            academicYear
              ? Number(academicYear)
              : null,
          semester:
            semester
              ? Number(semester)
              : null,
          due_date:
            dueDate || null,
          notes:
            notes.trim(),
        };

      await createStudentProcess(
        student.id,
        payload,
      );

      setSuccess(
        "Education process created successfully.",
      );

      setShowCreate(false);
      setTitle("");
      setDueDate("");
      setNotes("");

      await onRefresh();
    } catch (err) {
      setError(
        messageFromError(err),
      );
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(
    processId: string,
    status: StudentProcessStatus,
  ) {
    setUpdatingId(processId);
    setError("");
    setSuccess("");

    try {
      await changeStudentProcessStatus(
        student.id,
        processId,
        {
          status,
        },
      );

      setSuccess(
        "Process status updated.",
      );

      await onRefresh();
    } catch (err) {
      setError(
        messageFromError(err),
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">
            Education Processes
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Manage exams, seminar,
            project, result, mark sheet
            and certification stages.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void initializeProcesses()
            }
            disabled={initializing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {initializing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Initialize
          </button>

          <button
            type="button"
            onClick={() =>
              setShowCreate(
                (value) => !value,
              )
            }
            className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add Process
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {showCreate && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Process Type">
              <select
                value={processType}
                onChange={(event) =>
                  setProcessType(
                    event.target
                      .value as StudentProcessType,
                  )
                }
                className="input"
              >
                {PROCESS_TYPES.map(
                  (item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field label="Title">
              <input
                value={title}
                onChange={(event) =>
                  setTitle(
                    event.target.value,
                  )
                }
                placeholder="Optional title"
                className="input"
              />
            </Field>

            <Field label="Academic Year">
              <input
                type="number"
                min={1}
                value={academicYear}
                onChange={(event) =>
                  setAcademicYear(
                    event.target.value,
                  )
                }
                className="input"
              />
            </Field>

            <Field label="Semester">
              <input
                type="number"
                min={1}
                value={semester}
                onChange={(event) =>
                  setSemester(
                    event.target.value,
                  )
                }
                className="input"
              />
            </Field>

            <Field label="Due Date">
              <input
                type="date"
                value={dueDate}
                onChange={(event) =>
                  setDueDate(
                    event.target.value,
                  )
                }
                className="input"
              />
            </Field>

            <Field label="Notes">
              <input
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value,
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
              onClick={() =>
                setShowCreate(false)
              }
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={creating}
              onClick={() =>
                void createProcess()
              }
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {creating && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Create Process
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 space-y-3">
        {sortedProcesses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No education processes
            have been created yet.
          </div>
        ) : (
          sortedProcesses.map(
            (process) => (
              <div
                key={process.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {process.title ||
                          process.process_type_display}
                      </p>

                      <span
                        className={[
                          "rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                          badgeClass(
                            process.status,
                          ),
                        ].join(" ")}
                      >
                        {
                          process.status_display
                        }
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      {
                        process.process_type_display
                      }
                      {process.academic_year
                        ? ` · Year ${process.academic_year}`
                        : ""}
                      {process.semester
                        ? ` · Semester ${process.semester}`
                        : ""}
                      {process.due_date
                        ? ` · Due ${process.due_date}`
                        : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {updatingId ===
                      process.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    )}

                    <select
                      value={process.status}
                      disabled={
                        updatingId ===
                        process.id
                      }
                      onChange={(event) =>
                        void updateStatus(
                          process.id,
                          event.target
                            .value as StudentProcessStatus,
                        )
                      }
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400"
                    >
                      {PROCESS_STATUSES.map(
                        (item) => (
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
                  </div>
                </div>

                {process.notes && (
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    {process.notes}
                  </p>
                )}
              </div>
            ),
          )
        )}
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.75rem;
          background: white;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          color: rgb(30 41 59);
          outline: none;
        }

        .input:focus {
          border-color: rgb(96 165 250);
          box-shadow: 0 0 0 4px
            rgb(239 246 255);
        }
      `}</style>
    </section>
  );
}

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