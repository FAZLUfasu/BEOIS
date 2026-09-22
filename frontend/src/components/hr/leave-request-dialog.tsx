"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  CalendarDays,
  Loader2,
  X,
} from "lucide-react";

import {
  applyLeave,
} from "@/lib/api/leave";

import type {
  EmployeeListItem,
} from "@/types/employees";

import type {
  LeaveDayType,
  LeaveRequest,
  LeaveType,
} from "@/types/leave";


interface LeaveRequestDialogProps {
  open: boolean;
  employees: EmployeeListItem[];
  leaveTypes: LeaveType[];
  employee?: EmployeeListItem | null;
  onClose: () => void;
  onSaved: (
    request: LeaveRequest,
  ) => void;
}


const DAY_TYPES: Array<{
  value: LeaveDayType;
  label: string;
}> = [
  {
    value: "FULL_DAY",
    label: "Full Day",
  },
  {
    value: "FIRST_HALF",
    label: "First Half",
  },
  {
    value: "SECOND_HALF",
    label: "Second Half",
  },
];


function todayValue() {
  const now = new Date();

  const offset =
    now.getTimezoneOffset();

  const local =
    new Date(
      now.getTime() -
        offset * 60_000,
    );

  return local
    .toISOString()
    .slice(0, 10);
}


function getErrorMessage(
  error: unknown,
) {
  return error instanceof Error
    ? error.message
    : "Unable to apply for leave.";
}


export function LeaveRequestDialog({
  open,
  employees,
  leaveTypes,
  employee = null,
  onClose,
  onSaved,
}: LeaveRequestDialogProps) {
  const [
    employeeId,
    setEmployeeId,
  ] = useState("");

  const [
    leaveTypeId,
    setLeaveTypeId,
  ] = useState("");

  const [
    startDate,
    setStartDate,
  ] = useState(
    todayValue(),
  );

  const [
    endDate,
    setEndDate,
  ] = useState(
    todayValue(),
  );

  const [
    dayType,
    setDayType,
  ] =
    useState<LeaveDayType>(
      "FULL_DAY",
    );

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

    const today =
      todayValue();

    setEmployeeId(
      employee?.id ?? "",
    );

    setLeaveTypeId(
      leaveTypes.find(
        (item) =>
          item.is_active,
      )?.id ?? "",
    );

    setStartDate(today);
    setEndDate(today);

    setDayType(
      "FULL_DAY",
    );

    setReason("");
    setError("");
  }, [
    open,
    employee,
    leaveTypes,
  ]);


  useEffect(() => {
    if (
      dayType !== "FULL_DAY"
    ) {
      setEndDate(
        startDate,
      );
    }
  }, [
    dayType,
    startDate,
  ]);


  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [open]);


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
      !startDate ||
      !endDate
    ) {
      setError(
        "Select the leave dates.",
      );
      return;
    }

    if (
      endDate < startDate
    ) {
      setError(
        "End date cannot be earlier than start date.",
      );
      return;
    }

    if (
      dayType !==
        "FULL_DAY" &&
      endDate !== startDate
    ) {
      setError(
        "Half-day leave must use a single date.",
      );
      return;
    }

    if (
      !reason.trim()
    ) {
      setError(
        "Enter the reason for leave.",
      );
      return;
    }

    setSaving(true);

    try {
      const saved =
        await applyLeave({
          employee:
            employeeId,

          leave_type:
            leaveTypeId,

          start_date:
            startDate,

          end_date:
            endDate,

          day_type:
            dayType,

          reason:
            reason.trim(),
        });

      onSaved(saved);
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

        {/* HEADER */}
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-600">
              Leave Management
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              Apply Leave
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Submit a new employee
              leave request.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>


        {/* FORM */}
        <form
          onSubmit={
            handleSubmit
          }
          className="flex min-h-0 flex-1 flex-col"
        >

          {/* SCROLLABLE FORM BODY */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-4 p-6">

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              ) : null}


              {/* EMPLOYEE */}
              <div>
                <label
                  className={
                    labelClass
                  }
                >
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
                    Boolean(
                      employee,
                    ) ||
                    saving
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    Select employee
                  </option>

                  {employees.map(
                    (item) => (
                      <option
                        key={
                          item.id
                        }
                        value={
                          item.id
                        }
                      >
                        {item.employee_name ||
                          "Unnamed Employee"}{" "}
                        (
                        {
                          item.employee_id
                        }
                        )
                      </option>
                    ),
                  )}
                </select>
              </div>


              {/* LEAVE TYPE */}
              <div>
                <label
                  className={
                    labelClass
                  }
                >
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
                    saving
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
                          {item.is_paid
                            ? " — Paid"
                            : " — Unpaid"}
                        </option>
                      ),
                    )}
                </select>
              </div>


              {/* DAY TYPE */}
              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Day Type
                </label>

                <select
                  value={
                    dayType
                  }
                  onChange={(
                    event,
                  ) =>
                    setDayType(
                      event.target
                        .value as
                        LeaveDayType,
                    )
                  }
                  disabled={
                    saving
                  }
                  className={
                    inputClass
                  }
                >
                  {DAY_TYPES.map(
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


              {/* DATES */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    className={
                      labelClass
                    }
                  >
                    Start Date
                  </label>

                  <input
                    type="date"
                    value={
                      startDate
                    }
                    onChange={(
                      event,
                    ) =>
                      setStartDate(
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
                  <label
                    className={
                      labelClass
                    }
                  >
                    End Date
                  </label>

                  <input
                    type="date"
                    value={
                      endDate
                    }
                    min={
                      startDate
                    }
                    onChange={(
                      event,
                    ) =>
                      setEndDate(
                        event.target
                          .value,
                      )
                    }
                    disabled={
                      saving ||
                      dayType !==
                        "FULL_DAY"
                    }
                    className={
                      inputClass
                    }
                  />
                </div>
              </div>


              {/* REASON */}
              <div>
                <label
                  className={
                    labelClass
                  }
                >
                  Reason
                </label>

                <textarea
                  value={
                    reason
                  }
                  onChange={(
                    event,
                  ) =>
                    setReason(
                      event.target
                        .value,
                    )
                  }
                  rows={3}
                  disabled={
                    saving
                  }
                  placeholder="Enter the reason for this leave request..."
                  className={`${inputClass} resize-none`}
                />
              </div>


              {/* INFO */}
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <div className="flex gap-3">
                  <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

                  <p className="text-sm leading-6 text-blue-800">
                    Paid leave
                    requests are
                    validated against
                    the employee&apos;s
                    available balance.
                    Requested days are
                    calculated
                    automatically by
                    the HR system.
                  </p>
                </div>
              </div>
            </div>
          </div>


          {/* ALWAYS VISIBLE FOOTER */}
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={
                onClose
              }
              disabled={
                saving
              }
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                saving
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarDays className="h-4 w-4" />
              )}

              {saving
                ? "Submitting..."
                : "Submit Leave Request"}
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
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400";