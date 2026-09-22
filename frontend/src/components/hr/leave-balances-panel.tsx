"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarRange,
  Loader2,
  Plus,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";

import {
  getEmployees,
} from "@/lib/api/employees";

import {
  getLeaveBalances,
  getLeaveTypes,
} from "@/lib/api/leave";

import {
  LeaveBalanceDialog,
  type LeaveBalanceAction,
} from "@/components/hr/leave-balance-dialog";

import type {
  EmployeeListItem,
} from "@/types/employees";

import type {
  EmployeeLeaveBalance,
  LeaveType,
} from "@/types/leave";


function getErrorMessage(
  error: unknown,
) {
  return error instanceof Error
    ? error.message
    : "Unable to load leave balances.";
}


export function LeaveBalancesPanel() {
  const [
    balances,
    setBalances,
  ] = useState<
    EmployeeLeaveBalance[]
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
    employeeFilter,
    setEmployeeFilter,
  ] = useState("");

  const [
    year,
    setYear,
  ] = useState(
    new Date().getFullYear(),
  );

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
    action,
    setAction,
  ] =
    useState<LeaveBalanceAction>(
      "INITIALIZE",
    );

  const [
    selectedBalance,
    setSelectedBalance,
  ] = useState<
    EmployeeLeaveBalance | null
  >(null);


  const loadData =
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
            balanceData,
            employeeData,
            leaveTypeData,
          ] =
            await Promise.all([
              getLeaveBalances({
                year,
              }),

              getEmployees(),

              getLeaveTypes(),
            ]);

          setBalances(
            balanceData,
          );

          setEmployees(
            employeeData,
          );

          setLeaveTypes(
            leaveTypeData,
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
      [year],
    );


  useEffect(() => {
    void loadData();
  }, [loadData]);


  const filteredBalances =
    useMemo(() => {
      if (!employeeFilter) {
        return balances;
      }

      return balances.filter(
        (balance) =>
          balance.employee ===
          employeeFilter,
      );
    }, [
      balances,
      employeeFilter,
    ]);


  const totals =
    useMemo(() => {
      return filteredBalances.reduce(
        (
          result,
          balance,
        ) => {
          result.allocated +=
            Number(
              balance.allocated_days,
            ) || 0;

          result.used +=
            Number(
              balance.used_days,
            ) || 0;

          result.available +=
            Number(
              balance.available_days,
            ) || 0;

          return result;
        },
        {
          allocated: 0,
          used: 0,
          available: 0,
        },
      );
    }, [
      filteredBalances,
    ]);


  function openInitialize() {
    setSelectedBalance(
      null,
    );

    setAction(
      "INITIALIZE",
    );

    setDialogOpen(true);
  }


  function openAdjustment(
    balance:
      EmployeeLeaveBalance,
  ) {
    setSelectedBalance(
      balance,
    );

    setAction(
      "ADJUST",
    );

    setDialogOpen(true);
  }


  function handleSaved() {
    setDialogOpen(false);
    setSelectedBalance(null);

    void loadData(true);
  }


  return (
    <>
      <div className="space-y-6">

        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-600">
              Leave Accounting
            </p>

            <h3 className="mt-1 text-xl font-bold text-slate-950">
              Employee Leave Balances
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Review annual allocations,
              usage, adjustments and
              available leave.
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
              onClick={
                openInitialize
              }
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />

              Initialize Balance
            </button>
          </div>
        </div>


        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}


        <div className="grid gap-4 sm:grid-cols-3">
          <Metric
            label="Allocated"
            value={
              totals.allocated
            }
          />

          <Metric
            label="Used"
            value={
              totals.used
            }
          />

          <Metric
            label="Available"
            value={
              totals.available
            }
          />
        </div>


        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="grid gap-3 border-b border-slate-200 p-4 md:grid-cols-2">
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
              className={
                inputClass
              }
            >
              <option value="">
                All employees
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
              className={
                inputClass
              }
            />
          </div>


          {loading ? (
            <div className="flex min-h-72 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : filteredBalances.length ===
            0 ? (
            <div className="px-6 py-16 text-center">
              <CalendarRange className="mx-auto h-10 w-10 text-slate-300" />

              <p className="mt-3 font-semibold text-slate-700">
                No leave balances found
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Initialize a balance for
                this employee and year.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1000px] w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <Heading>
                      Employee
                    </Heading>

                    <Heading>
                      Leave Type
                    </Heading>

                    <Heading>
                      Year
                    </Heading>

                    <Heading>
                      Opening
                    </Heading>

                    <Heading>
                      Allocated
                    </Heading>

                    <Heading>
                      Used
                    </Heading>

                    <Heading>
                      Adjusted
                    </Heading>

                    <Heading>
                      Available
                    </Heading>

                    <Heading>
                      Action
                    </Heading>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredBalances.map(
                    (balance) => (
                      <tr
                        key={
                          balance.id
                        }
                        className="hover:bg-slate-50"
                      >
                        <Cell>
                          <p className="font-semibold text-slate-900">
                            {balance.employee_name ||
                              "Unnamed Employee"}
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {
                              balance.employee_id
                            }
                          </p>
                        </Cell>

                        <Cell>
                          <p className="font-medium text-slate-800">
                            {
                              balance.leave_type_name
                            }
                          </p>

                          <p className="mt-0.5 text-xs text-slate-500">
                            {
                              balance.leave_type_code
                            }
                          </p>
                        </Cell>

                        <Cell>
                          {
                            balance.year
                          }
                        </Cell>

                        <Cell>
                          {
                            balance.opening_balance
                          }
                        </Cell>

                        <Cell>
                          {
                            balance.allocated_days
                          }
                        </Cell>

                        <Cell>
                          <span className="font-semibold text-amber-700">
                            {
                              balance.used_days
                            }
                          </span>
                        </Cell>

                        <Cell>
                          {
                            balance.adjusted_days
                          }
                        </Cell>

                        <Cell>
                          <span className="font-bold text-emerald-700">
                            {
                              balance.available_days
                            }
                          </span>
                        </Cell>

                        <Cell>
                          <button
                            type="button"
                            onClick={() =>
                              openAdjustment(
                                balance,
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />

                            Adjust
                          </button>
                        </Cell>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>


      <LeaveBalanceDialog
        open={
          dialogOpen
        }
        action={
          action
        }
        employees={
          employees
        }
        leaveTypes={
          leaveTypes
        }
        balance={
          selectedBalance
        }
        onClose={() => {
          setDialogOpen(
            false,
          );

          setSelectedBalance(
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


function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-950">
        {value.toFixed(2)}
      </p>
    </div>
  );
}


function Heading({
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


function Cell({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
      {children}
    </td>
  );
}


const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";