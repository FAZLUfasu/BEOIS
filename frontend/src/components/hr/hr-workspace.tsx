"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  Users,
} from "lucide-react";

import {
  getEmployee,
  getEmployees,
} from "@/lib/api/employees";

import {
  getBranches,
  getDepartments,
} from "@/lib/api/organization";

import {
  AttendancePanel,
} from "@/components/hr/attendance-panel";

import {
  DesignationsPanel,
} from "@/components/hr/designations-panel";

import {
  EmployeeDetailDrawer,
} from "@/components/hr/employee-detail-drawer";

import {
  EmployeeFormDialog,
} from "@/components/hr/employee-form-dialog";

import type {
  EmployeeListItem,
  EmploymentStatus,
} from "@/types/employees";

import type {
  OrganizationBranch,
  OrganizationDepartment,
} from "@/types/organization";


type HRView =
  | "EMPLOYEES"
  | "ATTENDANCE"
  | "DESIGNATIONS";


const STATUS_OPTIONS: Array<{
  value: EmploymentStatus | "";
  label: string;
}> = [
  {
    value: "",
    label: "All statuses",
  },
  {
    value: "ACTIVE",
    label: "Active",
  },
  {
    value: "ON_LEAVE",
    label: "On Leave",
  },
  {
    value: "INACTIVE",
    label: "Inactive",
  },
  {
    value: "RESIGNED",
    label: "Resigned",
  },
  {
    value: "TERMINATED",
    label: "Terminated",
  },
];


function getErrorMessage(
  error: unknown,
) {
  return error instanceof Error
    ? error.message
    : "Unable to complete the request.";
}


function formatDate(
  value: string | null,
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


function statusClass(
  status: EmploymentStatus,
) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "ON_LEAVE":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "RESIGNED":
    case "TERMINATED":
      return "bg-red-50 text-red-700 ring-red-200";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}


function statusLabel(
  status: EmploymentStatus,
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


export function HRWorkspace() {
  const [
    view,
    setView,
  ] = useState<HRView>(
    "EMPLOYEES",
  );

  const [
    employees,
    setEmployees,
  ] = useState<
    EmployeeListItem[]
  >([]);

  const [
    branches,
    setBranches,
  ] = useState<
    OrganizationBranch[]
  >([]);

  const [
    departments,
    setDepartments,
  ] = useState<
    OrganizationDepartment[]
  >([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState<
    EmploymentStatus | ""
  >("");

  const [
    branchId,
    setBranchId,
  ] = useState("");

  const [
    departmentId,
    setDepartmentId,
  ] = useState("");

  const [
    selectedEmployee,
    setSelectedEmployee,
  ] = useState<
    EmployeeListItem | null
  >(null);

  const [
    formEmployee,
    setFormEmployee,
  ] = useState<
    EmployeeListItem | null
  >(null);

  const [
    formOpen,
    setFormOpen,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    referenceLoading,
    setReferenceLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");


  const loadReferenceData =
    useCallback(
      async () => {
        setReferenceLoading(true);

        try {
          const [
            branchData,
            departmentData,
          ] =
            await Promise.all([
              getBranches({
                active: true,
              }),

              getDepartments({
                active: true,
              }),
            ]);

          setBranches(
            branchData.sort(
              (a, b) =>
                a.name.localeCompare(
                  b.name,
                ),
            ),
          );

          setDepartments(
            departmentData.sort(
              (a, b) =>
                a.name.localeCompare(
                  b.name,
                ),
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
          setReferenceLoading(
            false,
          );
        }
      },
      [],
    );


  const loadEmployees =
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
          const data =
            await getEmployees({
              search:
                search.trim() ||
                undefined,

              branch:
                branchId ||
                undefined,

              department:
                departmentId ||
                undefined,

              employment_status:
                status ||
                undefined,
            });

          setEmployees(data);
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
      [
        search,
        branchId,
        departmentId,
        status,
      ],
    );


  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);


  useEffect(() => {
    if (
      view !== "EMPLOYEES"
    ) {
      return;
    }

    const timeout =
      window.setTimeout(
        () => {
          void loadEmployees();
        },
        search ? 300 : 0,
      );

    return () => {
      window.clearTimeout(
        timeout,
      );
    };
  }, [
    view,
    search,
    branchId,
    departmentId,
    status,
    loadEmployees,
  ]);


  const availableDepartments =
    useMemo(() => {
      if (!branchId) {
        return departments;
      }

      return departments.filter(
        (department) =>
          department.branch ===
            branchId ||
          department.branch ===
            null,
      );
    }, [
      departments,
      branchId,
    ]);


  useEffect(() => {
    if (
      departmentId &&
      !availableDepartments.some(
        (department) =>
          department.id ===
          departmentId,
      )
    ) {
      setDepartmentId("");
    }
  }, [
    availableDepartments,
    departmentId,
  ]);


  const metrics =
    useMemo(() => {
      const active =
        employees.filter(
          (employee) =>
            employee.employment_status ===
            "ACTIVE",
        ).length;

      const onLeave =
        employees.filter(
          (employee) =>
            employee.employment_status ===
            "ON_LEAVE",
        ).length;

      const departmentCount =
        new Set(
          employees
            .map(
              (employee) =>
                employee.department,
            )
            .filter(Boolean),
        ).size;

      return {
        total:
          employees.length,
        active,
        onLeave,
        departments:
          departmentCount,
      };
    }, [employees]);


  async function openEmployee(
    employeeId: string,
  ) {
    setError("");

    try {
      const employee =
        await getEmployee(
          employeeId,
        );

      setSelectedEmployee(
        employee,
      );
    } catch (
      requestError
    ) {
      setError(
        getErrorMessage(
          requestError,
        ),
      );
    }
  }


  function openCreate() {
    setFormEmployee(null);
    setFormOpen(true);
  }


  function openEdit(
    employee: EmployeeListItem,
  ) {
    setSelectedEmployee(null);
    setFormEmployee(employee);
    setFormOpen(true);
  }


  async function refreshAll() {
    await Promise.all([
      loadReferenceData(),
      loadEmployees(true),
    ]);
  }


  return (
    <>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              Human Resources
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              HR & Workforce Management
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Manage employees,
              organizational assignments,
              employment status,
              attendance and workforce
              configuration from one
              operational workspace.
            </p>
          </div>

          {view === "EMPLOYEES" ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Plus className="h-4 w-4" />
                New Employee
              </button>

              <button
                type="button"
                onClick={() =>
                  void refreshAll()
                }
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
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
          ) : null}
        </header>


        {view === "EMPLOYEES" ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Employees"
              value={metrics.total}
              helper="Current filtered workforce"
              icon={Users}
            />

            <SummaryCard
              label="Active"
              value={metrics.active}
              helper="Currently active employees"
              icon={UserCheck}
            />

            <SummaryCard
              label="On Leave"
              value={metrics.onLeave}
              helper="Employees currently on leave"
              icon={
                BriefcaseBusiness
              }
            />

            <SummaryCard
              label="Departments"
              value={
                metrics.departments
              }
              helper="Represented in current results"
              icon={Building2}
            />
          </section>
        ) : null}


        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex min-w-max gap-1">
            <button
              type="button"
              onClick={() =>
                setView(
                  "EMPLOYEES",
                )
              }
              className={[
                "inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition",
                view ===
                "EMPLOYEES"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
              ].join(" ")}
            >
              <Users className="h-4 w-4" />
              Employees
            </button>


            <button
              type="button"
              onClick={() =>
                setView(
                  "ATTENDANCE",
                )
              }
              className={[
                "inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition",
                view ===
                "ATTENDANCE"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
              ].join(" ")}
            >
              <CalendarCheck2 className="h-4 w-4" />
              Attendance
            </button>


            <button
              type="button"
              onClick={() =>
                setView(
                  "DESIGNATIONS",
                )
              }
              className={[
                "inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition",
                view ===
                "DESIGNATIONS"
                  ? "bg-slate-950 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
              ].join(" ")}
            >
              <BadgeCheck className="h-4 w-4" />
              Designations
            </button>
          </div>
        </div>


        {view ===
        "DESIGNATIONS" ? (
          <DesignationsPanel />
        ) : view ===
          "ATTENDANCE" ? (
          <AttendancePanel />
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    Employee Directory
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Search and manage
                    employees available
                    within your access
                    scope.
                  </p>
                </div>

                <div className="relative w-full xl:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    value={search}
                    onChange={(
                      event,
                    ) =>
                      setSearch(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Search employees..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>


              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <select
                  value={status}
                  onChange={(
                    event,
                  ) =>
                    setStatus(
                      event.target
                        .value as
                        | EmploymentStatus
                        | "",
                    )
                  }
                  className={
                    inputClass
                  }
                >
                  {STATUS_OPTIONS.map(
                    (option) => (
                      <option
                        key={
                          option.value ||
                          "ALL"
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

                <select
                  value={branchId}
                  onChange={(
                    event,
                  ) => {
                    setBranchId(
                      event.target
                        .value,
                    );

                    setDepartmentId(
                      "",
                    );
                  }}
                  disabled={
                    referenceLoading
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    All branches
                  </option>

                  {branches.map(
                    (branch) => (
                      <option
                        key={
                          branch.id
                        }
                        value={
                          branch.id
                        }
                      >
                        {branch.name}
                      </option>
                    ),
                  )}
                </select>

                <select
                  value={
                    departmentId
                  }
                  onChange={(
                    event,
                  ) =>
                    setDepartmentId(
                      event.target
                        .value,
                    )
                  }
                  disabled={
                    referenceLoading
                  }
                  className={
                    inputClass
                  }
                >
                  <option value="">
                    All departments
                  </option>

                  {availableDepartments.map(
                    (
                      department,
                    ) => (
                      <option
                        key={
                          department.id
                        }
                        value={
                          department.id
                        }
                      >
                        {
                          department.name
                        }

                        {department.branch ===
                        null
                          ? " (Shared)"
                          : ""}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>


            {error ? (
              <div className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}


            <div className="p-5">
              {loading ? (
                <LoadingState />
              ) : employees.length ===
                0 ? (
                <EmptyState />
              ) : (
                <EmployeeTable
                  employees={
                    employees
                  }
                  onOpen={
                    openEmployee
                  }
                />
              )}
            </div>
          </section>
        )}
      </div>


      <EmployeeDetailDrawer
        employee={
          selectedEmployee
        }
        onClose={() =>
          setSelectedEmployee(
            null,
          )
        }
        onEdit={
          openEdit
        }
      />


      <EmployeeFormDialog
        open={formOpen}
        employee={
          formEmployee
        }
        onClose={() => {
          setFormOpen(false);
          setFormEmployee(null);
        }}
        onSaved={(
          savedEmployee,
        ) => {
          setFormOpen(false);
          setFormEmployee(null);

          setSelectedEmployee(
            savedEmployee,
          );

          void loadEmployees(
            true,
          );
        }}
      />
    </>
  );
}


const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400";


function SummaryCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string | number;
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


function EmployeeTable({
  employees,
  onOpen,
}: {
  employees: EmployeeListItem[];

  onOpen: (
    employeeId: string,
  ) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1050px] border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
            <th className="border-b border-slate-200 px-4 py-3">
              Employee
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Designation
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Department
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Branch
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Type
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Joined
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Status
            </th>
          </tr>
        </thead>

        <tbody>
          {employees.map(
            (employee) => (
              <tr
                key={employee.id}
                className="transition hover:bg-slate-50"
              >
                <td className="border-b border-slate-100 px-4 py-4">
                  <button
                    type="button"
                    onClick={() =>
                      onOpen(
                        employee.id,
                      )
                    }
                    className="text-left font-semibold text-slate-900 transition hover:text-blue-700"
                  >
                    {employee.employee_name ||
                      "Unnamed Employee"}
                  </button>

                  <p className="mt-1 text-xs text-slate-500">
                    {
                      employee.employee_id
                    }
                  </p>
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm font-medium text-slate-700">
                  {employee.current_designation ||
                    "—"}
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
                  {employee.employment_type.replaceAll(
                    "_",
                    " ",
                  )}
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                  {formatDate(
                    employee.date_of_joining,
                  )}
                </td>

                <td className="border-b border-slate-100 px-4 py-4">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClass(
                      employee.employment_status,
                    )}`}
                  >
                    {statusLabel(
                      employee.employment_status,
                    )}
                  </span>
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
    <div className="flex min-h-[300px] items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
    </div>
  );
}


function EmptyState() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 text-center">
      <Users className="mb-4 h-10 w-10 text-slate-300" />

      <h3 className="text-base font-semibold text-slate-800">
        No employees found
      </h3>

      <p className="mt-1 max-w-md text-sm text-slate-500">
        No employee records match
        the current search, filters
        or your access scope.
      </p>
    </div>
  );
}