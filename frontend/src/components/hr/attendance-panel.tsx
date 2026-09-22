"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";

import {
  getAttendanceSummary,
  getDailyAttendance,
  getMissingAttendance,
} from "@/lib/api/attendance";

import {
  getEmployees,
} from "@/lib/api/employees";

import {
  AttendanceFormDialog,
} from "@/components/hr/attendance-form-dialog";

import type {
  Attendance,
  AttendanceStatus,
  AttendanceSummary,
} from "@/types/attendance";

import type {
  EmployeeListItem,
} from "@/types/employees";


function localDateString(
  date = new Date(),
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      date.getDate(),
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}


function moveDate(
  value: string,
  days: number,
) {
  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  const date =
    new Date(
      year,
      month - 1,
      day,
    );

  date.setDate(
    date.getDate() + days,
  );

  return localDateString(
    date,
  );
}


function displayDate(
  value: string,
) {
  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  const date =
    new Date(
      year,
      month - 1,
      day,
    );

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}


function getErrorMessage(
  error: unknown,
) {
  return error instanceof Error
    ? error.message
    : "Unable to load attendance.";
}


function statusLabel(
  status: AttendanceStatus,
) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}


function statusClass(
  status: AttendanceStatus,
) {
  switch (status) {
    case "PRESENT":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "LATE":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "HALF_DAY":
      return "bg-orange-50 text-orange-700 ring-orange-200";

    case "WORK_FROM_HOME":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "ON_LEAVE":
      return "bg-violet-50 text-violet-700 ring-violet-200";

    case "ABSENT":
      return "bg-red-50 text-red-700 ring-red-200";

    case "HOLIDAY":
      return "bg-cyan-50 text-cyan-700 ring-cyan-200";

    case "WEEK_OFF":
      return "bg-slate-100 text-slate-600 ring-slate-200";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}


function formatTime(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  const plain =
    value.match(
      /^(\d{2}):(\d{2})/,
    );

  if (plain) {
    const hour =
      Number(
        plain[1],
      );

    const minute =
      plain[2];

    const suffix =
      hour >= 12
        ? "PM"
        : "AM";

    const twelveHour =
      hour % 12 || 12;

    return `${String(
      twelveHour,
    ).padStart(
      2,
      "0",
    )}:${minute} ${suffix}`;
  }

  const date =
    new Date(value);

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
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}


function formatMinutes(
  minutes: number,
) {
  if (!minutes) {
    return "—";
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  const remainder =
    minutes % 60;

  if (!hours) {
    return `${remainder}m`;
  }

  if (!remainder) {
    return `${hours}h`;
  }

  return `${hours}h ${remainder}m`;
}


const EMPTY_SUMMARY: AttendanceSummary =
  {
    date: "",
    present: 0,
    absent: 0,
    half_day: 0,
    late: 0,
    work_from_home: 0,
    on_leave: 0,
    holiday: 0,
    week_off: 0,
  };


type AttendanceView =
  | "REGISTER"
  | "MISSING";


export function AttendancePanel() {
  const [
    selectedDate,
    setSelectedDate,
  ] = useState(
    () => localDateString(),
  );

  const [
    view,
    setView,
  ] =
    useState<AttendanceView>(
      "REGISTER",
    );

  const [
    attendance,
    setAttendance,
  ] = useState<
    Attendance[]
  >([]);

  const [
    missing,
    setMissing,
  ] = useState<
    EmployeeListItem[]
  >([]);

  const [
    employees,
    setEmployees,
  ] = useState<
    EmployeeListItem[]
  >([]);

  const [
    summary,
    setSummary,
  ] =
    useState<AttendanceSummary>(
      EMPTY_SUMMARY,
    );

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    dialogOpen,
    setDialogOpen,
  ] = useState(false);

  const [
    dialogMode,
    setDialogMode,
  ] = useState<
    "MARK" | "ADJUST"
  >("MARK");

  const [
    selectedMissingEmployee,
    setSelectedMissingEmployee,
  ] = useState<
    EmployeeListItem | null
  >(null);

  const [
    selectedAttendance,
    setSelectedAttendance,
  ] = useState<
    Attendance | null
  >(null);


  const loadAttendance =
    useCallback(
      async (
        background = false,
      ) => {
        if (background) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        try {
          const [
            attendanceData,
            summaryData,
            missingData,
            employeeData,
          ] =
            await Promise.all([
              getDailyAttendance(
                selectedDate,
              ),

              getAttendanceSummary(
                selectedDate,
              ),

              getMissingAttendance(
                selectedDate,
              ),

              getEmployees(),
            ]);

          setAttendance(
            attendanceData,
          );

          setSummary(
            summaryData,
          );

          setMissing(
            missingData,
          );

          setEmployees(
            employeeData.filter(
              (employee) =>
                employee.employment_status ===
                  "ACTIVE" ||
                employee.employment_status ===
                  "ON_LEAVE",
            ),
          );
        } catch (
          requestError
        ) {
          setError(
            getErrorMessage(
              requestError,
            ),
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [selectedDate],
    );


  useEffect(() => {
    void loadAttendance();
  }, [loadAttendance]);


  const filteredAttendance =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return attendance;
      }

      return attendance.filter(
        (record) =>
          record.employee_name
            .toLowerCase()
            .includes(query) ||
          record.employee_id
            .toLowerCase()
            .includes(query) ||
          statusLabel(
            record.status,
          )
            .toLowerCase()
            .includes(query),
      );
    }, [
      attendance,
      search,
    ]);


  const filteredMissing =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return missing;
      }

      return missing.filter(
        (employee) =>
          employee.employee_name
            .toLowerCase()
            .includes(query) ||
          employee.employee_id
            .toLowerCase()
            .includes(query) ||
          (
            employee.department_name ??
            ""
          )
            .toLowerCase()
            .includes(query),
      );
    }, [
      missing,
      search,
    ]);


  function openMarkAttendance(
    employee:
      | EmployeeListItem
      | null = null,
  ) {
    setSelectedAttendance(
      null,
    );

    setSelectedMissingEmployee(
      employee,
    );

    setDialogMode(
      "MARK",
    );

    setDialogOpen(true);
  }


  function openAdjustment(
    record: Attendance,
  ) {
    setSelectedMissingEmployee(
      null,
    );

    setSelectedAttendance(
      record,
    );

    setDialogMode(
      "ADJUST",
    );

    setDialogOpen(true);
  }


  function closeDialog() {
    setDialogOpen(false);

    setSelectedAttendance(
      null,
    );

    setSelectedMissingEmployee(
      null,
    );
  }


  async function handleSaved() {
    closeDialog();

    await loadAttendance(
      true,
    );
  }


  const recordedCount =
    attendance.length;

  const accountedCount =
    summary.present +
    summary.absent +
    summary.half_day +
    summary.late +
    summary.work_from_home +
    summary.on_leave +
    summary.holiday +
    summary.week_off;


  return (
    <>
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Daily Attendance
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Review, mark and adjust
                daily employee attendance.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  openMarkAttendance()
                }
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                Mark Attendance
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedDate(
                    (current) =>
                      moveDate(
                        current,
                        -1,
                      ),
                  )
                }
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50"
                title="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  setSelectedDate(
                    event.target.value ||
                      localDateString(),
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={() =>
                  setSelectedDate(
                    (current) =>
                      moveDate(
                        current,
                        1,
                      ),
                  )
                }
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:bg-slate-50"
                title="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedDate(
                    localDateString(),
                  )
                }
                className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Today
              </button>

              <button
                type="button"
                onClick={() =>
                  void loadAttendance(
                    true,
                  )
                }
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing
                      ? "animate-spin"
                      : ""
                  }`}
                />

                Refresh
              </button>
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CalendarDays className="h-4 w-4" />

              <span>
                {displayDate(
                  selectedDate,
                )}
              </span>
            </div>
          </div>
        </section>


        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}


        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Present"
            value={
              summary.present
            }
            helper="Marked present"
            icon={UserCheck}
          />

          <MetricCard
            label="Late"
            value={summary.late}
            helper="Late attendance"
            icon={Clock3}
          />

          <MetricCard
            label="Absent"
            value={
              summary.absent
            }
            helper="Marked absent"
            icon={UserMinus}
          />

          <MetricCard
            label="Missing"
            value={
              missing.length
            }
            helper="No attendance entry"
            icon={
              AlertTriangle
            }
          />
        </section>


        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SmallMetric
            label="Half Day"
            value={
              summary.half_day
            }
          />

          <SmallMetric
            label="Work From Home"
            value={
              summary.work_from_home
            }
          />

          <SmallMetric
            label="On Leave"
            value={
              summary.on_leave
            }
          />

          <SmallMetric
            label="Holiday / Week Off"
            value={
              summary.holiday +
              summary.week_off
            }
          />
        </section>


        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="font-bold text-slate-950">
                  Attendance Register
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {recordedCount} attendance
                  records · {accountedCount}{" "}
                  summarized ·{" "}
                  {missing.length} missing
                </p>
              </div>

              <div className="relative w-full xl:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Search attendance..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>


            <div className="mt-4 inline-flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() =>
                  setView(
                    "REGISTER",
                  )
                }
                className={[
                  "rounded-lg px-3.5 py-2 text-sm font-semibold transition",
                  view ===
                  "REGISTER"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-900",
                ].join(" ")}
              >
                Register (
                {
                  attendance.length
                }
                )
              </button>

              <button
                type="button"
                onClick={() =>
                  setView(
                    "MISSING",
                  )
                }
                className={[
                  "rounded-lg px-3.5 py-2 text-sm font-semibold transition",
                  view ===
                  "MISSING"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-900",
                ].join(" ")}
              >
                Missing (
                {missing.length})
              </button>
            </div>
          </div>


          <div className="p-5">
            {loading ? (
              <LoadingState />
            ) : view ===
              "REGISTER" ? (
              <AttendanceTable
                records={
                  filteredAttendance
                }
                onAdjust={
                  openAdjustment
                }
              />
            ) : (
              <MissingTable
                employees={
                  filteredMissing
                }
                onMark={
                  openMarkAttendance
                }
              />
            )}
          </div>
        </section>
      </div>


      <AttendanceFormDialog
        open={dialogOpen}
        mode={dialogMode}
        date={selectedDate}
        employees={employees}
        employee={
          selectedMissingEmployee
        }
        attendance={
          selectedAttendance
        }
        onClose={
          closeDialog
        }
        onSaved={() => {
          void handleSaved();
        }}
      />
    </>
  );
}


function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: number;
  helper: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {helper}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}


function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <span className="text-sm font-semibold text-slate-600">
        {label}
      </span>

      <span className="text-lg font-bold text-slate-950">
        {value}
      </span>
    </div>
  );
}


function AttendanceTable({
  records,
  onAdjust,
}: {
  records: Attendance[];

  onAdjust: (
    record: Attendance,
  ) => void;
}) {
  if (
    records.length === 0
  ) {
    return (
      <EmptyState
        icon={Users}
        title="No attendance records"
        description="No attendance records match the selected date and search."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1150px] border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
            <th className="border-b border-slate-200 px-4 py-3">
              Employee
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Status
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Check In
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Check Out
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Worked
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Late
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Overtime
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Remarks
            </th>

            <th className="border-b border-slate-200 px-4 py-3 text-right">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {records.map(
            (record) => (
              <tr
                key={record.id}
                className="hover:bg-slate-50"
              >
                <td className="border-b border-slate-100 px-4 py-4">
                  <p className="font-semibold text-slate-900">
                    {record.employee_name ||
                      "Unnamed Employee"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {
                      record.employee_id
                    }
                  </p>
                </td>

                <td className="border-b border-slate-100 px-4 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClass(
                      record.status,
                    )}`}
                  >
                    {statusLabel(
                      record.status,
                    )}
                  </span>
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                  {formatTime(
                    record.check_in,
                  )}
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                  {formatTime(
                    record.check_out,
                  )}
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm font-medium text-slate-700">
                  {formatMinutes(
                    record.working_minutes,
                  )}
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                  {formatMinutes(
                    record.late_minutes,
                  )}
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                  {formatMinutes(
                    record.overtime_minutes,
                  )}
                </td>

                <td className="max-w-xs border-b border-slate-100 px-4 py-4 text-sm text-slate-500">
                  {record.remarks ||
                    "—"}
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      onAdjust(
                        record,
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Adjust
                  </button>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}


function MissingTable({
  employees,
  onMark,
}: {
  employees: EmployeeListItem[];

  onMark: (
    employee: EmployeeListItem,
  ) => void;
}) {
  if (
    employees.length === 0
  ) {
    return (
      <EmptyState
        icon={UserCheck}
        title="No missing attendance"
        description="All applicable employees have an attendance entry for this date."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[950px] border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
            <th className="border-b border-slate-200 px-4 py-3">
              Employee
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Department
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Branch
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Designation
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Employment
            </th>

            <th className="border-b border-slate-200 px-4 py-3 text-right">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {employees.map(
            (employee) => (
              <tr
                key={employee.id}
                className="hover:bg-slate-50"
              >
                <td className="border-b border-slate-100 px-4 py-4">
                  <p className="font-semibold text-slate-900">
                    {employee.employee_name ||
                      "Unnamed Employee"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {
                      employee.employee_id
                    }
                  </p>
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                  {employee.department_name ||
                    "—"}
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                  {employee.branch_name ||
                    "—"}
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                  {employee.current_designation ||
                    "—"}
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                  {employee.employment_type.replaceAll(
                    "_",
                    " ",
                  )}
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      onMark(
                        employee,
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Mark
                  </button>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}


function LoadingState() {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
    </div>
  );
}


function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 text-center">
      <Icon className="h-10 w-10 text-slate-300" />

      <h3 className="mt-4 font-semibold text-slate-800">
        {title}
      </h3>

      <p className="mt-1 max-w-md text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}