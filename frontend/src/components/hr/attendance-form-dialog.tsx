"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Loader2,
  X,
} from "lucide-react";

import {
  adjustAttendance,
  markAttendance,
} from "@/lib/api/attendance";

import type {
  Attendance,
  AttendanceStatus,
} from "@/types/attendance";

import type {
  EmployeeListItem,
} from "@/types/employees";


const STATUS_OPTIONS: Array<{
  value: AttendanceStatus;
  label: string;
}> = [
  {
    value: "PRESENT",
    label: "Present",
  },
  {
    value: "ABSENT",
    label: "Absent",
  },
  {
    value: "HALF_DAY",
    label: "Half Day",
  },
  {
    value: "LATE",
    label: "Late",
  },
  {
    value: "WORK_FROM_HOME",
    label: "Work From Home",
  },
  {
    value: "ON_LEAVE",
    label: "On Leave",
  },
  {
    value: "HOLIDAY",
    label: "Holiday",
  },
  {
    value: "WEEK_OFF",
    label: "Week Off",
  },
];


interface AttendanceFormDialogProps {
  open: boolean;

  mode: "MARK" | "ADJUST";

  date: string;

  employees: EmployeeListItem[];

  employee?: EmployeeListItem | null;

  attendance?: Attendance | null;

  onClose: () => void;

  onSaved: (
    attendance: Attendance,
  ) => void;
}


function getErrorMessage(
  error: unknown,
) {
  return error instanceof Error
    ? error.message
    : "Unable to save attendance.";
}


/*
 * Converts a backend datetime such as:
 *
 * 2026-09-22T09:30:00+05:30
 *
 * into the HH:MM value required by
 * <input type="time">.
 *
 * We intentionally extract the clock time
 * directly from the ISO string when possible
 * so that the browser does not unnecessarily
 * convert it into another timezone.
 */
function timeInputValue(
  value: string | null | undefined,
) {
  if (!value) {
    return "";
  }

  const isoMatch =
    value.match(
      /T(\d{2}):(\d{2})/,
    );

  if (isoMatch) {
    return `${isoMatch[1]}:${isoMatch[2]}`;
  }

  const plainTime =
    value.match(
      /^(\d{2}):(\d{2})/,
    );

  if (plainTime) {
    return `${plainTime[1]}:${plainTime[2]}`;
  }

  return "";
}


/*
 * Django REST Framework expects a complete
 * DateTimeField value, not just HH:MM.
 *
 * Example:
 *
 * date = 2026-09-22
 * time = 09:30
 *
 * becomes:
 *
 * 2026-09-22T09:30:00+05:30
 *
 * BEOIS currently operates in Asia/Kolkata,
 * so we explicitly preserve the office-local
 * wall-clock time with India's UTC offset.
 */
function attendanceDateTime(
  date: string,
  time: string,
) {
  if (!time) {
    return null;
  }

  return `${date}T${time}:00+05:30`;
}


function statusUsesTime(
  status: AttendanceStatus,
) {
  return ![
    "ABSENT",
    "ON_LEAVE",
    "HOLIDAY",
    "WEEK_OFF",
  ].includes(status);
}


export function AttendanceFormDialog({
  open,
  mode,
  date,
  employees,
  employee = null,
  attendance = null,
  onClose,
  onSaved,
}: AttendanceFormDialogProps) {
  const [
    employeeId,
    setEmployeeId,
  ] = useState("");

  const [
    status,
    setStatus,
  ] =
    useState<AttendanceStatus>(
      "PRESENT",
    );

  const [
    checkIn,
    setCheckIn,
  ] = useState("");

  const [
    checkOut,
    setCheckOut,
  ] = useState("");

  const [
    remarks,
    setRemarks,
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

    setError("");

    if (
      mode === "ADJUST" &&
      attendance
    ) {
      setEmployeeId(
        attendance.employee,
      );

      setStatus(
        attendance.status,
      );

      setCheckIn(
        timeInputValue(
          attendance.check_in,
        ),
      );

      setCheckOut(
        timeInputValue(
          attendance.check_out,
        ),
      );

      setRemarks(
        attendance.remarks ??
          "",
      );

      return;
    }

    setEmployeeId(
      employee?.id ?? "",
    );

    setStatus("PRESENT");
    setCheckIn("");
    setCheckOut("");
    setRemarks("");
  }, [
    open,
    mode,
    employee,
    attendance,
  ]);


  const selectedEmployee =
    useMemo(
      () =>
        employees.find(
          (item) =>
            item.id ===
            employeeId,
        ) ??
        employee ??
        null,
      [
        employees,
        employeeId,
        employee,
      ],
    );


  const showTimeFields =
    statusUsesTime(
      status,
    );


  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");

    if (
      mode === "MARK" &&
      !employeeId
    ) {
      setError(
        "Select an employee.",
      );

      return;
    }

    if (
      checkIn &&
      checkOut &&
      checkOut < checkIn
    ) {
      setError(
        "Check-out time cannot be earlier than check-in time.",
      );

      return;
    }

    setSaving(true);

    try {
      let saved: Attendance;

      const checkInDateTime =
        showTimeFields
          ? attendanceDateTime(
              date,
              checkIn,
            )
          : null;

      const checkOutDateTime =
        showTimeFields
          ? attendanceDateTime(
              date,
              checkOut,
            )
          : null;


      if (
        mode === "ADJUST"
      ) {
        if (!attendance) {
          throw new Error(
            "Attendance record is not available.",
          );
        }

        saved =
          await adjustAttendance(
            attendance.id,
            {
              status,

              check_in:
                checkInDateTime,

              check_out:
                checkOutDateTime,

              remarks:
                remarks.trim(),
            },
          );
      } else {
        saved =
          await markAttendance(
            {
              employee:
                employeeId,

              date,

              status,

              check_in:
                checkInDateTime,

              check_out:
                checkOutDateTime,

              remarks:
                remarks.trim(),
            },
          );
      }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-600">
              Attendance
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-950">
              {mode === "ADJUST"
                ? "Adjust Attendance"
                : "Mark Attendance"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {date}
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
        >
          <div className="space-y-5 p-6">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}


            <div>
              <label className={labelClass}>
                Employee
              </label>

              {mode ===
              "ADJUST" ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="font-semibold text-slate-900">
                    {attendance?.employee_name ||
                      selectedEmployee?.employee_name ||
                      "Employee"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {attendance?.employee_id ||
                      selectedEmployee?.employee_id ||
                      ""}
                  </p>
                </div>
              ) : (
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
                    ) || saving
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

                  {employee &&
                  !employees.some(
                    (item) =>
                      item.id ===
                      employee.id,
                  ) ? (
                    <option
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
                  ) : null}
                </select>
              )}
            </div>


            <div>
              <label className={labelClass}>
                Status
              </label>

              <select
                value={status}
                onChange={(
                  event,
                ) =>
                  setStatus(
                    event.target
                      .value as AttendanceStatus,
                  )
                }
                disabled={saving}
                className={
                  inputClass
                }
              >
                {STATUS_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {
                        option.label
                      }
                    </option>
                  ),
                )}
              </select>
            </div>


            {showTimeFields ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    Check In
                  </label>

                  <input
                    type="time"
                    value={checkIn}
                    onChange={(
                      event,
                    ) =>
                      setCheckIn(
                        event.target
                          .value,
                      )
                    }
                    disabled={saving}
                    className={
                      inputClass
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    Check Out
                  </label>

                  <input
                    type="time"
                    value={
                      checkOut
                    }
                    onChange={(
                      event,
                    ) =>
                      setCheckOut(
                        event.target
                          .value,
                      )
                    }
                    disabled={saving}
                    className={
                      inputClass
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Check-in and check-out
                are not required for
                this attendance status.
              </div>
            )}


            <div>
              <label className={labelClass}>
                Remarks
              </label>

              <textarea
                value={remarks}
                onChange={(
                  event,
                ) =>
                  setRemarks(
                    event.target
                      .value,
                  )
                }
                rows={3}
                disabled={saving}
                placeholder="Optional attendance remarks"
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
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                (mode ===
                  "MARK" &&
                  !employeeId)
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}

              {mode === "ADJUST"
                ? "Save Adjustment"
                : "Mark Attendance"}
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