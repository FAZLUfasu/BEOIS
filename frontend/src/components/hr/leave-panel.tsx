"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  CalendarPlus2,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Scale,
  Settings2,
  XCircle,
} from "lucide-react";

import {
  getEmployees,
} from "@/lib/api/employees";

import {
  getLeaveRequests,
  getLeaveTypes,
} from "@/lib/api/leave";

import {
  LeaveRequestDialog,
} from "@/components/hr/leave-request-dialog";

import {
  LeaveActionDialog,
  type LeaveAction,
} from "@/components/hr/leave-action-dialog";

import {
  LeaveBalancesPanel,
} from "@/components/hr/leave-balances-panel";

import {
  LeaveTypesPanel,
} from "@/components/hr/leave-types-panel";

import type {
  EmployeeListItem,
} from "@/types/employees";

import type {
  LeaveRequest,
  LeaveRequestStatus,
  LeaveType,
} from "@/types/leave";


type LeaveWorkspaceView =
  | "REQUESTS"
  | "BALANCES"
  | "TYPES";


type RequestView =
  | "ALL"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";


function getErrorMessage(
  error: unknown,
) {
  return error instanceof Error
    ? error.message
    : "Unable to load leave management.";
}


function formatDayType(
  value: string,
) {
  return value
    .toLowerCase()
    .replaceAll(
      "_",
      " ",
    )
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}


function statusClass(
  status:
    LeaveRequestStatus,
) {
  switch (status) {
    case "APPROVED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "REJECTED":
      return "bg-red-50 text-red-700 ring-red-200";

    case "CANCELLED":
      return "bg-slate-100 text-slate-600 ring-slate-200";

    default:
      return "bg-amber-50 text-amber-700 ring-amber-200";
  }
}


export function LeavePanel() {
  const [
    workspaceView,
    setWorkspaceView,
  ] =
    useState<LeaveWorkspaceView>(
      "REQUESTS",
    );

  const [
    requests,
    setRequests,
  ] = useState<
    LeaveRequest[]
  >([]);

  const [
    employees,
    setEmployees,
  ] = useState<
    EmployeeListItem[]
  >([]);

  const [
    leaveTypes,
    setLeaveTypes,
  ] = useState<
    LeaveType[]
  >([]);

  const [
    view,
    setView,
  ] =
    useState<RequestView>(
      "PENDING",
    );

  const [
    employeeFilter,
    setEmployeeFilter,
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
    applyOpen,
    setApplyOpen,
  ] = useState(false);

  const [
    selectedRequest,
    setSelectedRequest,
  ] = useState<
    LeaveRequest | null
  >(null);

  const [
    action,
    setAction,
  ] =
    useState<LeaveAction>(
      "APPROVE",
    );

  const [
    actionOpen,
    setActionOpen,
  ] = useState(false);


  const loadData =
    useCallback(
      async (
        silent = false,
      ) => {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        try {
          const [
            requestData,
            employeeData,
            typeData,
          ] =
            await Promise.all([
              getLeaveRequests(),
              getEmployees(),
              getLeaveTypes(),
            ]);

          setRequests(
            requestData,
          );

          setEmployees(
            employeeData,
          );

          setLeaveTypes(
            typeData,
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
      [],
    );


  useEffect(() => {
    if (
      workspaceView !==
      "REQUESTS"
    ) {
      return;
    }

    void loadData();
  }, [
    workspaceView,
    loadData,
  ]);


  const activeEmployees =
    useMemo(
      () =>
        employees.filter(
          (employee) =>
            employee.employment_status ===
              "ACTIVE" ||
            employee.employment_status ===
              "ON_LEAVE",
        ),
      [employees],
    );


  const filteredRequests =
    useMemo(() => {
      return requests.filter(
        (request) => {
          if (
            view !== "ALL" &&
            request.status !==
              view
          ) {
            return false;
          }

          if (
            employeeFilter &&
            request.employee !==
              employeeFilter
          ) {
            return false;
          }

          return true;
        },
      );
    }, [
      requests,
      view,
      employeeFilter,
    ]);


  const counts =
    useMemo(
      () => ({
        all:
          requests.length,

        pending:
          requests.filter(
            (item) =>
              item.status ===
              "PENDING",
          ).length,

        approved:
          requests.filter(
            (item) =>
              item.status ===
              "APPROVED",
          ).length,

        rejected:
          requests.filter(
            (item) =>
              item.status ===
              "REJECTED",
          ).length,
      }),
      [requests],
    );


  function openAction(
    request:
      LeaveRequest,
    nextAction:
      LeaveAction,
  ) {
    setSelectedRequest(
      request,
    );

    setAction(
      nextAction,
    );

    setActionOpen(true);
  }


  function handleSaved() {
    setApplyOpen(false);
    setActionOpen(false);
    setSelectedRequest(null);

    void loadData(true);
  }


  return (
    <>
      <div className="space-y-6">

        {/* LEAVE SUB-NAVIGATION */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex min-w-max gap-1">

            <WorkspaceButton
              active={
                workspaceView ===
                "REQUESTS"
              }
              onClick={() =>
                setWorkspaceView(
                  "REQUESTS",
                )
              }
              icon={
                CalendarDays
              }
            >
              Leave Requests
            </WorkspaceButton>

            <WorkspaceButton
              active={
                workspaceView ===
                "BALANCES"
              }
              onClick={() =>
                setWorkspaceView(
                  "BALANCES",
                )
              }
              icon={
                Scale
              }
            >
              Leave Balances
            </WorkspaceButton>

            <WorkspaceButton
              active={
                workspaceView ===
                "TYPES"
              }
              onClick={() =>
                setWorkspaceView(
                  "TYPES",
                )
              }
              icon={
                Settings2
              }
            >
              Leave Types
            </WorkspaceButton>

          </div>
        </div>


        {workspaceView ===
        "BALANCES" ? (
          <LeaveBalancesPanel />
        ) : workspaceView ===
          "TYPES" ? (
          <LeaveTypesPanel />
        ) : loading ? (
          <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-600">
                  Leave Operations
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  Leave Requests
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Apply, review and
                  manage employee
                  leave requests.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    void loadData(
                      true,
                    )
                  }
                  disabled={
                    refreshing
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
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

                <button
                  type="button"
                  onClick={() =>
                    setApplyOpen(
                      true,
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <CalendarPlus2 className="h-4 w-4" />

                  Apply Leave
                </button>
              </div>
            </div>


            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}


            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                title="Pending"
                value={
                  counts.pending
                }
                icon={
                  <Clock3 className="h-5 w-5" />
                }
              />

              <SummaryCard
                title="Approved"
                value={
                  counts.approved
                }
                icon={
                  <CheckCircle2 className="h-5 w-5" />
                }
              />

              <SummaryCard
                title="Rejected"
                value={
                  counts.rejected
                }
                icon={
                  <XCircle className="h-5 w-5" />
                }
              />

              <SummaryCard
                title="Total Requests"
                value={
                  counts.all
                }
                icon={
                  <CalendarPlus2 className="h-5 w-5" />
                }
              />
            </div>


            <div className="rounded-2xl border border-slate-200 bg-white">
              <div className="flex flex-col gap-4 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      [
                        "PENDING",
                        "Pending",
                      ],
                      [
                        "ALL",
                        "All",
                      ],
                      [
                        "APPROVED",
                        "Approved",
                      ],
                      [
                        "REJECTED",
                        "Rejected",
                      ],
                      [
                        "CANCELLED",
                        "Cancelled",
                      ],
                    ] as Array<
                      [
                        RequestView,
                        string,
                      ]
                    >
                  ).map(
                    ([
                      value,
                      label,
                    ]) => (
                      <button
                        key={
                          value
                        }
                        type="button"
                        onClick={() =>
                          setView(
                            value,
                          )
                        }
                        className={
                          view ===
                          value
                            ? "rounded-xl bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white"
                            : "rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                        }
                      >
                        {
                          label
                        }
                      </button>
                    ),
                  )}
                </div>


                <select
                  value={
                    employeeFilter
                  }
                  onChange={(
                    event,
                  ) =>
                    setEmployeeFilter(
                      event.target
                        .value,
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 lg:w-64"
                >
                  <option value="">
                    All employees
                  </option>

                  {activeEmployees.map(
                    (
                      employee,
                    ) => (
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


              {filteredRequests.length ===
              0 ? (
                <div className="px-6 py-16 text-center">
                  <CalendarPlus2 className="mx-auto h-9 w-9 text-slate-300" />

                  <p className="mt-3 font-semibold text-slate-700">
                    No leave requests found
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Requests matching
                    the selected filters
                    will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1100px] w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <TableHeading>
                          Employee
                        </TableHeading>

                        <TableHeading>
                          Leave
                        </TableHeading>

                        <TableHeading>
                          Period
                        </TableHeading>

                        <TableHeading>
                          Days
                        </TableHeading>

                        <TableHeading>
                          Status
                        </TableHeading>

                        <TableHeading>
                          Reason
                        </TableHeading>

                        <TableHeading>
                          Actions
                        </TableHeading>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredRequests.map(
                        (
                          request,
                        ) => (
                          <tr
                            key={
                              request.id
                            }
                          >
                            <TableCell>
                              <p className="font-semibold text-slate-900">
                                {request.employee_name ||
                                  "Unnamed Employee"}
                              </p>

                              <p className="mt-0.5 text-xs text-slate-500">
                                {
                                  request.employee_id
                                }
                              </p>
                            </TableCell>

                            <TableCell>
                              <p className="font-medium text-slate-800">
                                {
                                  request.leave_type_name
                                }
                              </p>

                              <p className="mt-0.5 text-xs text-slate-500">
                                {formatDayType(
                                  request.day_type,
                                )}
                              </p>
                            </TableCell>

                            <TableCell>
                              <p className="whitespace-nowrap text-slate-700">
                                {
                                  request.start_date
                                }
                              </p>

                              {request.end_date !==
                              request.start_date ? (
                                <p className="mt-0.5 whitespace-nowrap text-xs text-slate-500">
                                  to{" "}
                                  {
                                    request.end_date
                                  }
                                </p>
                              ) : null}
                            </TableCell>

                            <TableCell>
                              <span className="font-semibold text-slate-900">
                                {
                                  request.requested_days
                                }
                              </span>
                            </TableCell>

                            <TableCell>
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClass(
                                  request.status,
                                )}`}
                              >
                                {
                                  request.status_display
                                }
                              </span>
                            </TableCell>

                            <TableCell>
                              <div className="max-w-xs">
                                <p className="line-clamp-2 text-sm text-slate-600">
                                  {
                                    request.reason
                                  }
                                </p>

                                {request.rejection_reason ? (
                                  <p className="mt-1 text-xs font-medium text-red-600">
                                    {
                                      request.rejection_reason
                                    }
                                  </p>
                                ) : null}
                              </div>
                            </TableCell>

                            <TableCell>
                              {request.status ===
                              "PENDING" ? (
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openAction(
                                        request,
                                        "APPROVE",
                                      )
                                    }
                                    className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                                  >
                                    Approve
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openAction(
                                        request,
                                        "REJECT",
                                      )
                                    }
                                    className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                                  >
                                    Reject
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openAction(
                                        request,
                                        "CANCEL",
                                      )
                                    }
                                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : request.status ===
                                "APPROVED" ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openAction(
                                      request,
                                      "CANCEL",
                                    )
                                  }
                                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                >
                                  Cancel
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  Completed
                                </span>
                              )}
                            </TableCell>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>


      <LeaveRequestDialog
        open={
          applyOpen
        }
        employees={
          activeEmployees
        }
        leaveTypes={
          leaveTypes
        }
        onClose={() =>
          setApplyOpen(
            false,
          )
        }
        onSaved={
          handleSaved
        }
      />


      <LeaveActionDialog
        open={
          actionOpen
        }
        action={
          action
        }
        request={
          selectedRequest
        }
        onClose={() => {
          setActionOpen(
            false,
          );

          setSelectedRequest(
            null,
          );
        }}
        onSaved={
          handleSaved
        }
      />
    </>
  );
}


function WorkspaceButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon:
    React.ElementType;
  children:
    React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition",
        active
          ? "bg-slate-950 text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
      ].join(" ")}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}


function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon:
    React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-3 text-slate-600">
          {icon}
        </div>
      </div>
    </div>
  );
}


function TableHeading({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}


function TableCell({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <td className="px-4 py-4 align-top text-sm">
      {children}
    </td>
  );
}