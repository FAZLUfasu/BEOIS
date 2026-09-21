"use client";

import {
  useState,
} from "react";

import {
  CheckCircle2,
  Loader2,
  MessageSquarePlus,
} from "lucide-react";

import {
  addStudentNote,
  updateStudentProgress,
} from "@/lib/api/students";

import type {
  StudentDetail,
} from "@/types/students";

function formatDateTime(
  value: string,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

function getErrorMessage(
  error: unknown,
) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

export function StudentActivityPanel({
  student,
  onRefresh,
}: {
  student: StudentDetail;
  onRefresh: () => Promise<void>;
}) {
  const [year, setYear] =
    useState(
      String(student.current_year),
    );

  const [semester, setSemester] =
    useState(
      String(student.current_semester),
    );

  const [progressNotes, setProgressNotes] =
    useState("");

  const [note, setNote] =
    useState("");

  const [savingProgress, setSavingProgress] =
    useState(false);

  const [savingNote, setSavingNote] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  async function saveProgress() {
    setSavingProgress(true);
    setError("");
    setSuccess("");

    try {
      await updateStudentProgress(
        student.id,
        {
          current_year:
            year
              ? Number(year)
              : null,
          current_semester:
            semester
              ? Number(semester)
              : null,
          notes:
            progressNotes.trim(),
        },
      );

      setSuccess(
        "Academic progress updated.",
      );

      setProgressNotes("");

      await onRefresh();
    } catch (err) {
      setError(
        getErrorMessage(err),
      );
    } finally {
      setSavingProgress(false);
    }
  }

  async function saveNote() {
    if (!note.trim()) {
      setError(
        "Enter a note before saving.",
      );
      return;
    }

    setSavingNote(true);
    setError("");
    setSuccess("");

    try {
      await addStudentNote(
        student.id,
        {
          description:
            note.trim(),
        },
      );

      setNote("");
      setSuccess(
        "Student note added.",
      );

      await onRefresh();
    } catch (err) {
      setError(
        getErrorMessage(err),
      );
    } finally {
      setSavingNote(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">
          Academic Progress
        </h3>

        <p className="mt-1 text-xs text-slate-500">
          Update the student&apos;s
          current year and semester.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              Current Year
            </span>

            <input
              type="number"
              min={1}
              value={year}
              onChange={(event) =>
                setYear(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">
              Current Semester
            </span>

            <input
              type="number"
              min={1}
              value={semester}
              onChange={(event) =>
                setSemester(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          </label>
        </div>

        <textarea
          value={progressNotes}
          onChange={(event) =>
            setProgressNotes(
              event.target.value,
            )
          }
          placeholder="Progress note (optional)"
          rows={2}
          className="mt-3 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
        />

        <button
          type="button"
          disabled={savingProgress}
          onClick={() =>
            void saveProgress()
          }
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {savingProgress && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          Update Progress
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">
          Notes & Activity
        </h3>

        <div className="mt-4 flex gap-2">
          <input
            value={note}
            onChange={(event) =>
              setNote(
                event.target.value,
              )
            }
            onKeyDown={(event) => {
              if (
                event.key ===
                "Enter"
              ) {
                event.preventDefault();
                void saveNote();
              }
            }}
            placeholder="Add an operational note..."
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />

          <button
            type="button"
            disabled={savingNote}
            onClick={() =>
              void saveNote()
            }
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {savingNote ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquarePlus className="h-4 w-4" />
            )}
            Add
          </button>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {success && (
          <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {success}
          </p>
        )}

        <div className="mt-5 space-y-3">
          {student.activities.length ===
          0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
              No activity recorded yet.
            </div>
          ) : (
            student.activities.map(
              (activity) => (
                <div
                  key={activity.id}
                  className="relative border-l-2 border-slate-200 pl-4"
                >
                  <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-blue-600" />

                  <p className="text-sm font-medium text-slate-800">
                    {
                      activity.description
                    }
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    {
                      activity.activity_type_display
                    }
                    {" · "}
                    {formatDateTime(
                      activity.created_at,
                    )}
                    {activity.performed_by
                      ?.username
                      ? ` · ${activity.performed_by.username}`
                      : ""}
                  </p>
                </div>
              ),
            )
          )}
        </div>
      </section>
    </div>
  );
}