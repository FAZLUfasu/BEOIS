"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  Loader2,
  X,
} from "lucide-react";

import {
  createLeaveType,
  updateLeaveType,
} from "@/lib/api/leave";

import type {
  LeaveType,
} from "@/types/leave";


interface LeaveTypeDialogProps {
  open: boolean;
  leaveType?: LeaveType | null;
  onClose: () => void;
  onSaved: () => void;
}


function getErrorMessage(
  error: unknown,
) {
  return error instanceof Error
    ? error.message
    : "Unable to save leave type.";
}


export function LeaveTypeDialog({
  open,
  leaveType = null,
  onClose,
  onSaved,
}: LeaveTypeDialogProps) {
  const [
    name,
    setName,
  ] = useState("");

  const [
    code,
    setCode,
  ] = useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [
    defaultDays,
    setDefaultDays,
  ] = useState("0");

  const [
    isPaid,
    setIsPaid,
  ] = useState(true);

  const [
    carryForward,
    setCarryForward,
  ] = useState(false);

  const [
    maximumCarryForward,
    setMaximumCarryForward,
  ] = useState("0");

  const [
    requiresApproval,
    setRequiresApproval,
  ] = useState(true);

  const [
    isActive,
    setIsActive,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");


  useEffect(() => {
    if (!open) {
      return;
    }

    setName(
      leaveType?.name ?? "",
    );

    setCode(
      leaveType?.code ?? "",
    );

    setDescription(
      leaveType?.description ??
        "",
    );

    setDefaultDays(
      leaveType?.default_days_per_year ??
        "0",
    );

    setIsPaid(
      leaveType?.is_paid ??
        true,
    );

    setCarryForward(
      leaveType?.carry_forward_allowed ??
        false,
    );

    setMaximumCarryForward(
      leaveType?.maximum_carry_forward ??
        "0",
    );

    setRequiresApproval(
      leaveType?.requires_approval ??
        true,
    );

    setIsActive(
      leaveType?.is_active ??
        true,
    );

    setError("");
  }, [
    open,
    leaveType,
  ]);


  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");

    if (!name.trim()) {
      setError(
        "Leave type name is required.",
      );
      return;
    }

    if (!code.trim()) {
      setError(
        "Leave type code is required.",
      );
      return;
    }

    if (
      Number(
        defaultDays,
      ) < 0
    ) {
      setError(
        "Default days cannot be negative.",
      );
      return;
    }

    if (
      Number(
        maximumCarryForward,
      ) < 0
    ) {
      setError(
        "Maximum carry forward cannot be negative.",
      );
      return;
    }

    setSaving(true);

    const payload = {
      name:
        name.trim(),

      code:
        code
          .trim()
          .toUpperCase(),

      description:
        description.trim(),

      default_days_per_year:
        defaultDays,

      is_paid:
        isPaid,

      carry_forward_allowed:
        carryForward,

      maximum_carry_forward:
        carryForward
          ? maximumCarryForward
          : "0",

      requires_approval:
        requiresApproval,

      is_active:
        isActive,
    };

    try {
      if (leaveType) {
        await updateLeaveType(
          leaveType.id,
          payload,
        );
      } else {
        await createLeaveType(
          payload,
        );
      }

      onSaved();
    } catch (
      requestError
    ) {
      setError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      setSaving(false);
    }
  }


  if (!open) {
    return null;
  }


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-[2px]">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-600">
              Leave Policy
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              {leaveType
                ? "Edit Leave Type"
                : "New Leave Type"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Configure annual leave
              rules and policy
              behaviour.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>


        <form
          onSubmit={
            handleSubmit
          }
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="space-y-5">

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              ) : null}


              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Leave Type Name
                  </label>

                  <input
                    value={name}
                    onChange={(
                      event,
                    ) =>
                      setName(
                        event.target
                          .value,
                      )
                    }
                    disabled={
                      saving
                    }
                    placeholder="Casual Leave"
                    className={
                      inputClass
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Code
                  </label>

                  <input
                    value={code}
                    onChange={(
                      event,
                    ) =>
                      setCode(
                        event.target
                          .value,
                      )
                    }
                    disabled={
                      saving
                    }
                    placeholder="CL"
                    className={
                      inputClass
                    }
                  />
                </div>
              </div>


              <div>
                <label className={labelClass}>
                  Description
                </label>

                <textarea
                  rows={3}
                  value={
                    description
                  }
                  onChange={(
                    event,
                  ) =>
                    setDescription(
                      event.target
                        .value,
                    )
                  }
                  disabled={
                    saving
                  }
                  className={`${inputClass} resize-none`}
                />
              </div>


              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Default Days / Year
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={
                      defaultDays
                    }
                    onChange={(
                      event,
                    ) =>
                      setDefaultDays(
                        event.target
                          .value,
                      )
                    }
                    disabled={
                      saving
                    }
                    className={
                      inputClass
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Maximum Carry Forward
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={
                      maximumCarryForward
                    }
                    onChange={(
                      event,
                    ) =>
                      setMaximumCarryForward(
                        event.target
                          .value,
                      )
                    }
                    disabled={
                      saving ||
                      !carryForward
                    }
                    className={
                      inputClass
                    }
                  />
                </div>
              </div>


              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <Toggle
                  checked={
                    isPaid
                  }
                  onChange={
                    setIsPaid
                  }
                  label="Paid Leave"
                  helper="Leave is included in the employee's paid leave entitlement."
                />

                <Toggle
                  checked={
                    carryForward
                  }
                  onChange={
                    setCarryForward
                  }
                  label="Allow Carry Forward"
                  helper="Unused leave may be carried into the next year."
                />

                <Toggle
                  checked={
                    requiresApproval
                  }
                  onChange={
                    setRequiresApproval
                  }
                  label="Requires Approval"
                  helper="Leave requests require HR or management approval."
                />

                <Toggle
                  checked={
                    isActive
                  }
                  onChange={
                    setIsActive
                  }
                  label="Active"
                  helper="Available for new leave requests."
                />
              </div>
            </div>
          </div>


          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}

              {leaveType
                ? "Save Changes"
                : "Create Leave Type"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function Toggle({
  checked,
  onChange,
  label,
  helper,
}: {
  checked: boolean;
  onChange:
    (value: boolean) => void;
  label: string;
  helper: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={
          checked
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .checked,
          )
        }
        className="mt-1 h-4 w-4 rounded border-slate-300"
      />

      <span>
        <span className="block text-sm font-semibold text-slate-800">
          {label}
        </span>

        <span className="mt-0.5 block text-xs leading-5 text-slate-500">
          {helper}
        </span>
      </span>
    </label>
  );
}


const labelClass =
  "mb-1.5 block text-sm font-semibold text-slate-700";


const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400";