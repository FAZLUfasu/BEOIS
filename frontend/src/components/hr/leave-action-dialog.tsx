"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  X,
  XCircle,
} from "lucide-react";

import {
  approveLeave,
  cancelLeave,
  rejectLeave,
} from "@/lib/api/leave";

import type { LeaveRequest } from "@/types/leave";

export type LeaveAction =
  | "APPROVE"
  | "REJECT"
  | "CANCEL";

interface LeaveActionDialogProps {
  open: boolean;
  action: LeaveAction;
  request: LeaveRequest | null;
  onClose: () => void;
  onSaved: (request: LeaveRequest) => void;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to update the leave request.";
}

export function LeaveActionDialog({
  open,
  action,
  request,
  onClose,
  onSaved,
}: LeaveActionDialogProps) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setNotes("");
    setError("");
  }, [open, action, request]);

  if (!open || !request) return null;

  const title =
    action === "APPROVE"
      ? "Approve Leave"
      : action === "REJECT"
        ? "Reject Leave"
        : "Cancel Leave";

  const description =
    action === "APPROVE"
      ? "Confirm approval of this leave request."
      : action === "REJECT"
        ? "Provide a reason for rejecting this request."
        : "Cancel this leave request.";

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) return;

    if (!request) return;

    setError("");

    if (action === "REJECT" && !notes.trim()) {
      setError("Rejection reason is required.");
      return;
    }

    setSaving(true);

    try {
      let saved: LeaveRequest;

      if (action === "APPROVE") {
        saved = await approveLeave(request.id, {
          notes: notes.trim(),
        });
      } else if (action === "REJECT") {
        saved = await rejectLeave(request.id, {
          reason: notes.trim(),
        });
      } else {
        saved = await cancelLeave(request.id, {
          reason: notes.trim(),
        });
      }

      onSaved(saved);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-600">
              Leave Workflow
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              {title}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 p-6">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-950">
                {request.employee_name || "Employee"}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {request.employee_id} · {request.leave_type_name}
              </p>

              <p className="mt-2 text-sm text-slate-700">
                {request.start_date}
                {request.end_date !== request.start_date
                  ? ` → ${request.end_date}`
                  : ""}
                {" · "}
                {request.requested_days} day(s)
              </p>

              <p className="mt-2 text-sm text-slate-600">
                {request.reason}
              </p>
            </div>

            <div>
              <label className={labelClass}>
                {action === "APPROVE"
                  ? "Approval Notes"
                  : action === "REJECT"
                    ? "Rejection Reason"
                    : "Cancellation Reason"}
              </label>

              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(event.target.value)
                }
                rows={4}
                disabled={saving}
                placeholder={
                  action === "REJECT"
                    ? "Reason is required..."
                    : "Optional notes..."
                }
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Close
            </button>

            <button
              type="submit"
              disabled={saving}
              className={
                action === "REJECT" || action === "CANCEL"
                  ? "inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                  : "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              }
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : action === "APPROVE" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}

              {title}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelClass =
  "mb-1.5 block text-sm font-semibold text-slate-700";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50";