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
  adjustLeaveBalance,
  initializeLeaveBalance,
} from "@/lib/api/leave";

import type {
  EmployeeListItem,
} from "@/types/employees";

import type {
  EmployeeLeaveBalance,
  LeaveType,
} from "@/types/leave";


export type LeaveBalanceAction =
  | "INITIALIZE"
  | "ADJUST";


interface LeaveBalanceDialogProps {
  open: boolean;
  action: LeaveBalanceAction;

  employees: EmployeeListItem[];
  leaveTypes: LeaveType[];

  balance?: EmployeeLeaveBalance | null;

  onClose: () => void;
  onSaved: () => void;
}


function currentYear() {
  return new Date().getFullYear();
}


function getErrorMessage(
  error: unknown,
) {
  return error instanceof Error
    ? error.message
    : "Unable to update leave balance.";
}


export function LeaveBalanceDialog({
  open,
  action,
  employees,
  leaveTypes,
  balance = null,
  onClose,
  onSaved,
}: LeaveBalanceDialogProps) {
  const [
    employeeId,
    setEmployeeId,
  ] = useState("");

  const [
    leaveTypeId,
    setLeaveTypeId,
  ] = useState("");

  const [
    year,
    setYear,
  ] = useState(
    currentYear(),
  );

  const [
    openingBalance,
    setOpeningBalance,
  ] = useState("0");

  const [
    allocatedDays,
    setAllocatedDays,
  ] = useState("");

  const [
    adjustment,
    setAdjustment,
  ] = useState("");

  const [
    reason,
    setReason,
  ] = useState("");

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

    setEmployeeId(
      balance?.employee ?? "",
    );

    setLeaveTypeId(
      balance?.leave_type ??
        leaveTypes.find(
          (item) =>
            item.is_active,
        )?.id ??
        "",
    );

    setYear(
      balance?.year ??
        currentYear(),
    );

    setOpeningBalance(
      balance?.opening_balance ??
        "0",
    );

    setAllocatedDays(
      balance?.allocated_days ??
        "",
    );

    setAdjustment("");
    setReason("");
    setError("");
  }, [
    open,
    balance,
    leaveTypes,
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

    if (!employeeId) {
      setError(
        "Select an employee.",
      );
      return;
    }

    if (!leaveTypeId) {
      setError(
        "Select a leave type.",
      );
      return;
    }

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2200
    ) {
      setError(
        "Enter a valid year.",
      );
      return;
    }

    if (
      action ===
      "INITIALIZE"
    ) {
      if (
        allocatedDays !== "" &&
        Number(
          allocatedDays,
        ) < 0
      ) {
        setError(
          "Allocated days cannot be negative.",
        );
        return;
      }
    }

    if (
      action === "ADJUST"
    ) {
      if (
        adjustment.trim() === "" ||
        Number.isNaN(
          Number(
            adjustment,
          ),
        )
      ) {
        setError(
          "Enter a valid adjustment.",
        );
        return;
      }

      if (
        Number(
          adjustment,
        ) === 0
      ) {
        setError(
          "Adjustment cannot be zero.",
        );
        return;
      }
    }

    setSaving(true);

    try {
      if (
        action ===
        "INITIALIZE"
      ) {
        await initializeLeaveBalance({
          employee:
            employeeId,

          leave_type:
            leaveTypeId,

          year,

          opening_balance:
            openingBalance ||
            "0",

          ...(allocatedDays !== ""
            ? {
                allocated_days:
                  allocatedDays,
              }
            : {}),
        });
      } else {
        await adjustLeaveBalance({
          employee:
            employeeId,

          leave_type:
            leaveTypeId,

          adjustment,

          year,

          reason:
            reason.trim(),
        });
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


  const isAdjust =
    action === "ADJUST";


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-[2px]">
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-600">
              Leave Balance
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              {isAdjust
                ? "Adjust Leave Balance"
                : "Initialize Leave Balance"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {isAdjust
                ? "Add or deduct leave days while preserving the balance audit trail."
                : "Create the annual leave allocation for an employee."}
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


        <form
          onSubmit={
            handleSubmit
          }
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="space-y-4">

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              ) : null}


              <div>
                <label className={labelClass}>
                  Employee
                </label>

                <select
                  value={
                    employeeId
                  }
                  onChange={(
                    event,
                  ) =>
                    setEmployeeId(
                      event.target
                        .value,
                    )
                  }
                  disabled={
                    saving ||
                    Boolean(
                      balance,
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    Select employee
                  </option>

                  {employees.map(
                    (employee) => (
                      <option
                        key={
                          employee.id
                        }
                        value={
                          employee.id
                        }
                      >
                        {employee.employee_name ||
                          "Unnamed Employee"}{" "}
                        (
                        {
                          employee.employee_id
                        }
                        )
                      </option>
                    ),
                  )}
                </select>
              </div>


              <div>
                <label className={labelClass}>
                  Leave Type
                </label>

                <select
                  value={
                    leaveTypeId
                  }
                  onChange={(
                    event,
                  ) =>
                    setLeaveTypeId(
                      event.target
                        .value,
                    )
                  }
                  disabled={
                    saving ||
                    Boolean(
                      balance,
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    Select leave type
                  </option>

                  {leaveTypes
                    .filter(
                      (item) =>
                        item.is_active,
                    )
                    .map(
                      (item) => (
                        <option
                          key={
                            item.id
                          }
                          value={
                            item.id
                          }
                        >
                          {
                            item.name
                          }{" "}
                          (
                          {
                            item.code
                          }
                          )
                        </option>
                      ),
                    )}
                </select>
              </div>


              <div>
                <label className={labelClass}>
                  Year
                </label>

                <input
                  type="number"
                  min="2000"
                  max="2200"
                  value={year}
                  onChange={(
                    event,
                  ) =>
                    setYear(
                      Number(
                        event.target
                          .value,
                      ),
                    )
                  }
                  disabled={
                    saving ||
                    Boolean(
                      balance,
                    )
                  }
                  className={
                    inputClass
                  }
                />
              </div>


              {!isAdjust ? (
                <>
                  <div>
                    <label className={labelClass}>
                      Opening Balance
                    </label>

                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={
                        openingBalance
                      }
                      onChange={(
                        event,
                      ) =>
                        setOpeningBalance(
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
                      Allocated Days
                    </label>

                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={
                        allocatedDays
                      }
                      onChange={(
                        event,
                      ) =>
                        setAllocatedDays(
                          event.target
                            .value,
                        )
                      }
                      disabled={
                        saving
                      }
                      placeholder="Leave blank to use leave type default"
                      className={
                        inputClass
                      }
                    />

                    <p className="mt-1.5 text-xs text-slate-500">
                      Leave blank to use
                      the default annual
                      allocation configured
                      for the leave type.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {balance ? (
                    <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4">
                      <BalanceValue
                        label="Allocated"
                        value={
                          balance.allocated_days
                        }
                      />

                      <BalanceValue
                        label="Used"
                        value={
                          balance.used_days
                        }
                      />

                      <BalanceValue
                        label="Adjusted"
                        value={
                          balance.adjusted_days
                        }
                      />

                      <BalanceValue
                        label="Available"
                        value={
                          balance.available_days
                        }
                      />
                    </div>
                  ) : null}

                  <div>
                    <label className={labelClass}>
                      Adjustment
                    </label>

                    <input
                      type="number"
                      step="0.5"
                      value={
                        adjustment
                      }
                      onChange={(
                        event,
                      ) =>
                        setAdjustment(
                          event.target
                            .value,
                        )
                      }
                      disabled={
                        saving
                      }
                      placeholder="Example: 2 or -1"
                      className={
                        inputClass
                      }
                    />

                    <p className="mt-1.5 text-xs text-slate-500">
                      Use a positive value
                      to add days and a
                      negative value to
                      deduct days.
                    </p>
                  </div>

                  <div>
                    <label className={labelClass}>
                      Adjustment Reason
                    </label>

                    <textarea
                      rows={3}
                      value={reason}
                      onChange={(
                        event,
                      ) =>
                        setReason(
                          event.target
                            .value,
                        )
                      }
                      disabled={
                        saving
                      }
                      placeholder="Example: Opening correction, special allocation..."
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                </>
              )}
            </div>
          </div>


          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
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

              {isAdjust
                ? "Save Adjustment"
                : "Initialize Balance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function BalanceValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}


const labelClass =
  "mb-1.5 block text-sm font-semibold text-slate-700";


const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400";