"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Banknote,
  Calculator,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import {
  PayrollAdjustmentDialog,
  type PayrollAdjustmentKind,
} from "@/components/hr/payroll-adjustment-dialog";

import {
  PayrollAdvanceRecoveryDialog,
} from "@/components/hr/payroll-advance-recovery-dialog";

import {
  PayrollCreateDialog,
} from "@/components/hr/payroll-create-dialog";

import {
  getEmployees,
} from "@/lib/api/employees";

import {
  calculatePayroll,
  getPayrolls,
  getPayrollPeriods,
  getSalaryAdvances,
} from "@/lib/api/payroll";

import type {
  EmployeeListItem,
} from "@/types/employees";

import type {
  Payroll,
  PayrollComponent,
  PayrollPeriod,
  PayrollStatus,
  SalaryAdvance,
} from "@/types/payroll";

type StatusFilter =
  | "ALL"
  | PayrollStatus;

export function PayrollProcessingPanel() {
  const [payrolls, setPayrolls] =
    useState<Payroll[]>([]);

  const [employees, setEmployees] =
    useState<EmployeeListItem[]>([]);

  const [periods, setPeriods] =
    useState<PayrollPeriod[]>([]);

  const [advances, setAdvances] =
    useState<SalaryAdvance[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    periodFilter,
    setPeriodFilter,
  ] = useState("ALL");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<StatusFilter>("ALL");

  const [createOpen, setCreateOpen] =
    useState(false);

  const [
    detailTarget,
    setDetailTarget,
  ] = useState<Payroll | null>(null);

  const [
    adjustmentKind,
    setAdjustmentKind,
  ] =
    useState<PayrollAdjustmentKind | null>(
      null,
    );

  const [
    recoveryTarget,
    setRecoveryTarget,
  ] = useState<Payroll | null>(null);

  const [
    calculatingId,
    setCalculatingId,
  ] = useState<string | null>(null);

  const loadData =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const [
          payrollData,
          employeeData,
          periodData,
          advanceData,
        ] = await Promise.all([
          getPayrolls(),
          getEmployees(),
          getPayrollPeriods(),
          getSalaryAdvances(),
        ]);

        setPayrolls(payrollData);
        setEmployees(employeeData);
        setPeriods(periodData);
        setAdvances(advanceData);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load payroll processing.",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return payrolls.filter(
      (payroll) => {
        if (
          periodFilter !== "ALL" &&
          payroll.period !== periodFilter
        ) {
          return false;
        }

        if (
          statusFilter !== "ALL" &&
          payroll.status !== statusFilter
        ) {
          return false;
        }

        if (!query) {
          return true;
        }

        return [
          payroll.employee_id,
          payroll.employee_name,
          payroll.period_display,
          payroll.status,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      },
    );
  }, [
    payrolls,
    search,
    periodFilter,
    statusFilter,
  ]);

  const metrics = useMemo(
    () => ({
      total: payrolls.length,

      draft: payrolls.filter(
        (item) =>
          item.status === "DRAFT",
      ).length,

      calculated: payrolls.filter(
        (item) =>
          item.status ===
          "CALCULATED",
      ).length,

      net: payrolls.reduce(
        (sum, item) =>
          sum +
          Number(item.net_salary || 0),
        0,
      ),
    }),
    [payrolls],
  );

  function updatePayroll(
    saved: Payroll,
  ) {
    setPayrolls((current) => {
      const exists = current.some(
        (item) => item.id === saved.id,
      );

      if (!exists) {
        return [saved, ...current];
      }

      return current.map((item) =>
        item.id === saved.id
          ? saved
          : item,
      );
    });

    if (
      detailTarget?.id === saved.id
    ) {
      setDetailTarget(saved);
    }
  }

  async function handleCalculate(
    payroll: Payroll,
  ) {
    if (
      payroll.status === "CALCULATED"
    ) {
      const confirmed =
        window.confirm(
          "Recalculate this payroll?\n\nRecalculation rebuilds the payroll component snapshot. Manual adjustments and advance-recovery components may need to be added again.",
        );

      if (!confirmed) {
        return;
      }
    }

    setCalculatingId(payroll.id);
    setError("");

    try {
      const saved =
        await calculatePayroll(
          payroll.id,
        );

      updatePayroll(saved);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to calculate payroll.",
      );
    } finally {
      setCalculatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Monthly Payroll
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-950">
            Payroll Processing
          </h2>

          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Create employee payroll drafts, calculate monthly salaries and manage payroll adjustments before approval.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void loadData()
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          <button
            type="button"
            onClick={() =>
              setCreateOpen(true)
            }
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Payroll
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Payroll Records"
          value={String(metrics.total)}
          helper="Current payroll records"
        />

        <MetricCard
          label="Draft"
          value={String(metrics.draft)}
          helper="Waiting for calculation"
        />

        <MetricCard
          label="Calculated"
          value={String(
            metrics.calculated,
          )}
          helper="Ready for adjustments"
        />

        <MetricCard
          label="Net Payroll"
          value={`₹${formatMoney(
            metrics.net,
          )}`}
          helper="Net value of loaded payrolls"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_190px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search employee or payroll period..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={periodFilter}
              onChange={(event) =>
                setPeriodFilter(
                  event.target.value,
                )
              }
              className={selectClass}
            >
              <option value="ALL">
                All periods
              </option>

              {periods.map((period) => (
                <option
                  key={period.id}
                  value={period.id}
                >
                  {formatPeriod(period)}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as StatusFilter,
                )
              }
              className={selectClass}
            >
              <option value="ALL">
                All statuses
              </option>
              <option value="DRAFT">
                Draft
              </option>
              <option value="CALCULATED">
                Calculated
              </option>
              <option value="APPROVED">
                Approved
              </option>
              <option value="PAID">
                Paid
              </option>
              <option value="CANCELLED">
                Cancelled
              </option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
            <Banknote className="mb-3 h-10 w-10 text-slate-300" />

            <h3 className="font-semibold text-slate-800">
              No payroll records found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Create an employee payroll or change the current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <TableHead>
                    Employee
                  </TableHead>
                  <TableHead>
                    Period
                  </TableHead>
                  <TableHead>
                    Base Salary
                  </TableHead>
                  <TableHead>
                    Gross
                  </TableHead>
                  <TableHead>
                    Deductions
                  </TableHead>
                  <TableHead>
                    Net Salary
                  </TableHead>
                  <TableHead>
                    Status
                  </TableHead>
                  <TableHead>
                    Actions
                  </TableHead>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filtered.map(
                  (payroll) => (
                    <tr
                      key={payroll.id}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="whitespace-nowrap px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {payroll.employee_name ||
                            "Unnamed employee"}
                        </p>

                        <p className="text-xs text-slate-500">
                          {payroll.employee_id}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                        {payroll.period_display}
                      </td>

                      <MoneyCell
                        value={
                          payroll.base_salary
                        }
                      />

                      <MoneyCell
                        value={
                          payroll.gross_earnings
                        }
                      />

                      <MoneyCell
                        value={
                          payroll.total_deductions
                        }
                      />

                      <MoneyCell
                        value={
                          payroll.net_salary
                        }
                        strong
                      />

                      <td className="whitespace-nowrap px-5 py-4">
                        <StatusBadge
                          status={
                            payroll.status
                          }
                        />
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setDetailTarget(
                                payroll,
                              )
                            }
                            className={actionClass}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>

                          {payroll.status ===
                            "DRAFT" ||
                          payroll.status ===
                            "CALCULATED" ? (
                            <button
                              type="button"
                              disabled={
                                calculatingId ===
                                payroll.id
                              }
                              onClick={() =>
                                void handleCalculate(
                                  payroll,
                                )
                              }
                              className={actionClass}
                            >
                              {calculatingId ===
                              payroll.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Calculator className="h-3.5 w-3.5" />
                              )}

                              {payroll.status ===
                              "DRAFT"
                                ? "Calculate"
                                : "Recalculate"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <PayrollCreateDialog
        open={createOpen}
        employees={employees}
        periods={periods}
        onClose={() =>
          setCreateOpen(false)
        }
        onSaved={(saved) => {
          updatePayroll(saved);
          setCreateOpen(false);
          setDetailTarget(saved);
        }}
      />

      <PayrollDetailDrawer
        payroll={detailTarget}
        calculating={
          calculatingId ===
          detailTarget?.id
        }
        onClose={() =>
          setDetailTarget(null)
        }
        onCalculate={(payroll) =>
          void handleCalculate(payroll)
        }
        onAdjustment={
          setAdjustmentKind
        }
        onAdvanceRecovery={() => {
          if (detailTarget) {
            setRecoveryTarget(
              detailTarget,
            );
          }
        }}
      />

      <PayrollAdjustmentDialog
        payroll={
          adjustmentKind
            ? detailTarget
            : null
        }
        kind={adjustmentKind}
        onClose={() =>
          setAdjustmentKind(null)
        }
        onSaved={(saved) => {
          updatePayroll(saved);
          setAdjustmentKind(null);
        }}
      />

      <PayrollAdvanceRecoveryDialog
        payroll={recoveryTarget}
        advances={advances}
        onClose={() =>
          setRecoveryTarget(null)
        }
        onSaved={(saved) => {
          updatePayroll(saved);
          setRecoveryTarget(null);
        }}
      />
    </div>
  );
}

function PayrollDetailDrawer({
  payroll,
  calculating,
  onClose,
  onCalculate,
  onAdjustment,
  onAdvanceRecovery,
}: {
  payroll: Payroll | null;
  calculating: boolean;
  onClose: () => void;
  onCalculate: (
    payroll: Payroll,
  ) => void;
  onAdjustment: (
    kind: PayrollAdjustmentKind,
  ) => void;
  onAdvanceRecovery: () => void;
}) {
  useEffect(() => {
    if (!payroll) {
      return;
    }

    const previous =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previous;
    };
  }, [payroll]);

  if (!payroll) {
    return null;
  }

  const editable =
    payroll.status === "CALCULATED";

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/40">
      <button
        type="button"
        aria-label="Close details"
        onClick={onClose}
        className="absolute inset-0"
      />

      <aside className="absolute right-0 top-0 z-10 h-full w-full max-w-3xl overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              Payroll Detail
            </p>

            <h3 className="mt-1 text-xl font-bold text-slate-950">
              {payroll.employee_name ||
                "Unnamed employee"}
            </h3>

            <p className="text-sm text-slate-500">
              {payroll.employee_id} ·{" "}
              {payroll.period_display}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={payroll.status}
            />

            {payroll.status ===
              "DRAFT" ||
            payroll.status ===
              "CALCULATED" ? (
              <button
                type="button"
                disabled={calculating}
                onClick={() =>
                  onCalculate(payroll)
                }
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
              >
                {calculating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Calculator className="h-4 w-4" />
                )}

                {payroll.status ===
                "DRAFT"
                  ? "Calculate Payroll"
                  : "Recalculate"}
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <AmountCard
              label="Base Salary"
              value={payroll.base_salary}
            />

            <AmountCard
              label="Gross Earnings"
              value={
                payroll.gross_earnings
              }
            />

            <AmountCard
              label="Total Deductions"
              value={
                payroll.total_deductions
              }
            />

            <AmountCard
              label="LOP Deduction"
              value={
                payroll.lop_deduction
              }
            />

            <AmountCard
              label="Advance Recovery"
              value={
                payroll.advance_recovery
              }
            />

            <AmountCard
              label="Net Salary"
              value={payroll.net_salary}
              strong
            />
          </div>

          <section className="rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 p-4">
              <h4 className="font-bold text-slate-950">
                Attendance Snapshot
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
              <SmallStat
                label="Calendar"
                value={payroll.calendar_days}
              />
              <SmallStat
                label="Payable"
                value={payroll.payable_days}
              />
              <SmallStat
                label="Present"
                value={payroll.present_days}
              />
              <SmallStat
                label="Paid Leave"
                value={payroll.paid_leave_days}
              />
              <SmallStat
                label="Unpaid Leave"
                value={payroll.unpaid_leave_days}
              />
              <SmallStat
                label="LOP"
                value={payroll.lop_days}
              />
            </div>
          </section>

          {editable ? (
            <section className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
              <h4 className="font-bold text-slate-950">
                Payroll Adjustments
              </h4>

              <p className="mt-1 text-sm text-slate-500">
                Adjustments update payroll totals immediately.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <AdjustmentButton
                  label="Add Incentive"
                  onClick={() =>
                    onAdjustment(
                      "INCENTIVE",
                    )
                  }
                />

                <AdjustmentButton
                  label="Add Bonus"
                  onClick={() =>
                    onAdjustment("BONUS")
                  }
                />

                <AdjustmentButton
                  label="Add Deduction"
                  onClick={() =>
                    onAdjustment(
                      "DEDUCTION",
                    )
                  }
                />

                <AdjustmentButton
                  label="Advance Recovery"
                  onClick={
                    onAdvanceRecovery
                  }
                />
              </div>

              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Recalculating after manual adjustments rebuilds the payroll component snapshot. Review adjustments before using Recalculate.
              </div>
            </section>
          ) : null}

          <PayrollComponents
            components={
              payroll.components
            }
          />

          <section className="rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 p-4">
              <h4 className="font-bold text-slate-950">
                Payroll Activity
              </h4>
            </div>

            {payroll.activities.length ===
            0 ? (
              <p className="p-4 text-sm text-slate-500">
                No payroll activity recorded.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {payroll.activities.map(
                  (activity) => (
                    <div
                      key={activity.id}
                      className="p-4"
                    >
                      <p className="text-sm font-semibold text-slate-800">
                        {activity.activity_type
                          .replaceAll(
                            "_",
                            " ",
                          )
                          .toLowerCase()
                          .replace(
                            /\b\w/g,
                            (value) =>
                              value.toUpperCase(),
                          )}
                      </p>

                      <p className="mt-1 text-sm text-slate-600">
                        {
                          activity.description
                        }
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {formatDateTime(
                          activity.created_at,
                        )}
                      </p>
                    </div>
                  ),
                )}
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function PayrollComponents({
  components,
}: {
  components: PayrollComponent[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="border-b border-slate-200 p-4">
        <h4 className="font-bold text-slate-950">
          Salary Components
        </h4>
      </div>

      {components.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">
          Calculate this payroll to generate the salary component snapshot.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <TableHead>Name</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {components.map(
                (component) => (
                  <tr key={component.id}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800">
                        {component.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {component.code}
                      </p>
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-600">
                      {component.source_type.replaceAll(
                        "_",
                        " ",
                      )}
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-600">
                      {component.component_type}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-900">
                      ₹
                      {formatMoney(
                        component.amount,
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {helper}
      </p>
    </div>
  );
}

function AmountCard({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl p-4",
        strong
          ? "bg-blue-600 text-white"
          : "bg-slate-50",
      ].join(" ")}
    >
      <p
        className={[
          "text-xs font-semibold uppercase tracking-wide",
          strong
            ? "text-blue-100"
            : "text-slate-500",
        ].join(" ")}
      >
        {label}
      </p>

      <p className="mt-1 text-lg font-bold">
        ₹{formatMoney(value)}
      </p>
    </div>
  );
}

function SmallStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function AdjustmentButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
    >
      {label}
    </button>
  );
}

function MoneyCell({
  value,
  strong = false,
}: {
  value: string;
  strong?: boolean;
}) {
  return (
    <td
      className={[
        "whitespace-nowrap px-5 py-4 text-sm",
        strong
          ? "font-bold text-slate-950"
          : "font-medium text-slate-700",
      ].join(" ")}
    >
      ₹{formatMoney(value)}
    </td>
  );
}

function TableHead({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}

function StatusBadge({
  status,
}: {
  status: PayrollStatus;
}) {
  const classes: Record<
    PayrollStatus,
    string
  > = {
    DRAFT:
      "bg-slate-100 text-slate-700 ring-slate-200",
    CALCULATED:
      "bg-blue-50 text-blue-700 ring-blue-200",
    APPROVED:
      "bg-amber-50 text-amber-700 ring-amber-200",
    PAID:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",
    CANCELLED:
      "bg-red-50 text-red-700 ring-red-200",
  };

  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset",
        classes[status],
      ].join(" ")}
    >
      {status
        .toLowerCase()
        .replace(/\b\w/g, (value) =>
          value.toUpperCase(),
        )}
    </span>
  );
}

function formatPeriod(
  period: PayrollPeriod,
) {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      month: "long",
      year: "numeric",
    },
  ).format(
    new Date(
      period.year,
      period.month - 1,
      1,
    ),
  );
}

function formatMoney(
  value: string | number,
) {
  return Number(value || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}

function formatDateTime(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return date.toLocaleString(
    "en-IN",
  );
}

const actionClass =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";

const selectClass =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none";