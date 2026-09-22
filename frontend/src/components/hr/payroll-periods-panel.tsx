"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  CircleDollarSign,
  Eye,
  Loader2,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";

import {
  PayrollPeriodCloseDialog,
} from "@/components/hr/payroll-period-close-dialog";

import {
  PayrollPeriodDialog,
} from "@/components/hr/payroll-period-dialog";

import {
  getPayrollPeriodSummary,
  getPayrollPeriods,
} from "@/lib/api/payroll";

import type {
  PayrollPeriod,
  PayrollPeriodStatus,
  PayrollPeriodSummary,
} from "@/types/payroll";


type StatusFilter =
  | "ALL"
  | PayrollPeriodStatus;


export function PayrollPeriodsPanel() {
  const [
    periods,
    setPeriods,
  ] = useState<PayrollPeriod[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<StatusFilter>("ALL");

  const [
    createOpen,
    setCreateOpen,
  ] = useState(false);

  const [
    detailTarget,
    setDetailTarget,
  ] = useState<PayrollPeriod | null>(
    null,
  );

  const [
    closeTarget,
    setCloseTarget,
  ] = useState<PayrollPeriod | null>(
    null,
  );


  const loadPeriods =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const data =
          await getPayrollPeriods();

        setPeriods(
          [...data].sort(
            (a, b) =>
              b.year - a.year ||
              b.month - a.month,
          ),
        );
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load payroll periods.",
        );
      } finally {
        setLoading(false);
      }
    }, []);


  useEffect(() => {
    void loadPeriods();
  }, [loadPeriods]);


  const filtered =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return periods.filter(
        (period) => {
          if (
            statusFilter !== "ALL" &&
            period.status !==
              statusFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            getPeriodName(period),
            period.year,
            period.month,
            period.notes,
            period.status,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        },
      );
    }, [
      periods,
      search,
      statusFilter,
    ]);


  const metrics =
    useMemo(
      () => ({
        total: periods.length,

        open:
          periods.filter(
            (period) =>
              period.status === "OPEN",
          ).length,

        processing:
          periods.filter(
            (period) =>
              period.status ===
              "PROCESSING",
          ).length,

        closed:
          periods.filter(
            (period) =>
              period.status ===
              "CLOSED",
          ).length,
      }),
      [periods],
    );


  function updatePeriod(
    saved: PayrollPeriod,
  ) {
    setPeriods((current) => {
      const exists =
        current.some(
          (item) =>
            item.id === saved.id,
        );

      const next = exists
        ? current.map(
            (item) =>
              item.id === saved.id
                ? saved
                : item,
          )
        : [
            saved,
            ...current,
          ];

      return [...next].sort(
        (a, b) =>
          b.year - a.year ||
          b.month - a.month,
      );
    });

    if (
      detailTarget?.id === saved.id
    ) {
      setDetailTarget(saved);
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Payroll Cycles
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-950">
            Payroll Periods
          </h2>

          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Create monthly payroll cycles, review period totals and close completed payroll periods.
          </p>
        </div>


        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void loadPeriods()
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
            Create Period
          </button>
        </div>
      </div>


      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Periods"
          value={metrics.total}
          helper="Payroll cycles"
        />

        <MetricCard
          label="Open"
          value={metrics.open}
          helper="Available for payroll"
        />

        <MetricCard
          label="Processing"
          value={metrics.processing}
          helper="Payroll in progress"
        />

        <MetricCard
          label="Closed"
          value={metrics.closed}
          helper="Completed periods"
        />
      </div>


      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search payroll period..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as StatusFilter,
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none"
            >
              <option value="ALL">
                All statuses
              </option>

              <option value="OPEN">
                Open
              </option>

              <option value="PROCESSING">
                Processing
              </option>

              <option value="CLOSED">
                Closed
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
          <div className="flex min-h-[280px] items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
            <CalendarDays className="mb-3 h-10 w-10 text-slate-300" />

            <h3 className="font-semibold text-slate-800">
              No payroll periods found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Create the first monthly payroll period to continue.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <TableHead>
                    Payroll Period
                  </TableHead>

                  <TableHead>
                    Date Range
                  </TableHead>

                  <TableHead>
                    Status
                  </TableHead>

                  <TableHead>
                    Notes
                  </TableHead>

                  <TableHead>
                    Actions
                  </TableHead>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filtered.map(
                  (period) => (
                    <tr
                      key={period.id}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="whitespace-nowrap px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {getPeriodName(
                            period,
                          )}
                        </p>

                        <p className="text-xs text-slate-500">
                          Month {period.month}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {formatDate(
                          period.start_date,
                        )}
                        {" — "}
                        {formatDate(
                          period.end_date,
                        )}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <StatusBadge
                          status={
                            period.status
                          }
                        />
                      </td>

                      <td className="max-w-xs px-5 py-4 text-sm text-slate-600">
                        {period.notes || "—"}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex gap-2">
                          <ActionButton
                            icon={Eye}
                            label="Summary"
                            onClick={() =>
                              setDetailTarget(
                                period,
                              )
                            }
                          />

                          {period.status !==
                          "CLOSED" ? (
                            <ActionButton
                              icon={
                                LockKeyhole
                              }
                              label="Close"
                              onClick={() =>
                                setCloseTarget(
                                  period,
                                )
                              }
                            />
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


      <PayrollPeriodDialog
        open={createOpen}
        onClose={() =>
          setCreateOpen(false)
        }
        onSaved={(saved) => {
          updatePeriod(saved);
          setCreateOpen(false);
        }}
      />


      <PayrollPeriodCloseDialog
        open={
          closeTarget !== null
        }
        period={closeTarget}
        onClose={() =>
          setCloseTarget(null)
        }
        onSaved={(saved) => {
          updatePeriod(saved);
          setCloseTarget(null);
        }}
      />


      <PayrollPeriodSummaryDrawer
        period={detailTarget}
        onClose={() =>
          setDetailTarget(null)
        }
      />
    </div>
  );
}


function PayrollPeriodSummaryDrawer({
  period,
  onClose,
}: {
  period: PayrollPeriod | null;
  onClose: () => void;
}) {
  const [
    summary,
    setSummary,
  ] = useState<PayrollPeriodSummary | null>(
    null,
  );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");


  useEffect(() => {
    if (!period) {
      setSummary(null);
      setError("");
      return;
    }

    let active = true;

    async function loadSummary() {
      if (!period) {
        return;
      }

      setLoading(true);
      setError("");
      setSummary(null);

      try {
        const data =
          await getPayrollPeriodSummary(
            period.id,
          );

        if (active) {
          setSummary(data);
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load payroll summary.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      active = false;
    };
  }, [period]);


  useEffect(() => {
    if (!period) {
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
  }, [period]);


  if (!period) {
    return null;
  }


  return (
    <div className="fixed inset-0 z-[65] bg-slate-950/40">
      <button
        type="button"
        aria-label="Close payroll summary"
        onClick={onClose}
        className="absolute inset-0"
      />

      <aside className="absolute right-0 top-0 z-10 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              Payroll Summary
            </p>

            <h3 className="mt-1 text-xl font-bold text-slate-950">
              {getPeriodName(period)}
            </h3>

            <div className="mt-2">
              <StatusBadge
                status={period.status}
              />
            </div>
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
          {loading ? (
            <div className="flex min-h-[250px] items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : summary ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <SummaryCard
                  icon={Users}
                  label="Employees"
                  value={String(
                    summary.employees,
                  )}
                />

                <SummaryCard
                  icon={
                    CircleDollarSign
                  }
                  label="Net Payroll"
                  value={`₹${formatMoney(
                    summary.net_payroll,
                  )}`}
                />
              </div>


              <div className="grid gap-3 sm:grid-cols-3">
                <MoneyCard
                  label="Gross Earnings"
                  value={
                    summary.gross_earnings
                  }
                />

                <MoneyCard
                  label="Deductions"
                  value={
                    summary.total_deductions
                  }
                />

                <MoneyCard
                  label="Net Payroll"
                  value={
                    summary.net_payroll
                  }
                />
              </div>


              <div>
                <h4 className="mb-3 font-bold text-slate-900">
                  Payroll Status
                </h4>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <CountCard
                    label="Draft"
                    value={summary.draft}
                  />

                  <CountCard
                    label="Calculated"
                    value={
                      summary.calculated
                    }
                  />

                  <CountCard
                    label="Approved"
                    value={
                      summary.approved
                    }
                  />

                  <CountCard
                    label="Paid"
                    value={summary.paid}
                  />
                </div>
              </div>


              <div className="rounded-xl bg-slate-50 p-4">
                <DetailRow
                  label="Period"
                  value={summary.period}
                />

                <DetailRow
                  label="Date Range"
                  value={`${formatDate(
                    period.start_date,
                  )} — ${formatDate(
                    period.end_date,
                  )}`}
                />

                <DetailRow
                  label="Notes"
                  value={
                    period.notes || "—"
                  }
                  last
                />
              </div>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  );
}


function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
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


function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />

        <span className="text-xs font-bold uppercase tracking-wide">
          {label}
        </span>
      </div>

      <p className="mt-2 text-xl font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}


function MoneyCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-950">
        ₹{formatMoney(value)}
      </p>
    </div>
  );
}


function CountCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
      <p className="text-xl font-bold text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-xs font-semibold text-slate-500">
        {label}
      </p>
    </div>
  );
}


function DetailRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={
        last
          ? "py-3"
          : "border-b border-slate-200 py-3"
      }
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
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


function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}


function StatusBadge({
  status,
}: {
  status: PayrollPeriodStatus;
}) {
  const classes: Record<
    PayrollPeriodStatus,
    string
  > = {
    OPEN:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",

    PROCESSING:
      "bg-blue-50 text-blue-700 ring-blue-200",

    CLOSED:
      "bg-slate-100 text-slate-600 ring-slate-200",
  };

  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset",
        classes[status],
      ].join(" ")}
    >
      {status.charAt(0) +
        status
          .slice(1)
          .toLowerCase()}
    </span>
  );
}


function getPeriodName(
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


function formatDate(
  value: string,
) {
  const parts =
    value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}