"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  GraduationCap,
  LoaderCircle,
  RefreshCw,
  TrendingUp,
  UsersRound,
  WalletCards,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AttentionCentre } from "@/components/dashboard/attention-centre";
import { TaskIntelligencePanel } from "@/components/dashboard/task-intelligence-panel";
import {
  InstitutionPerformanceTable,
  PartnerPerformanceTable,
  StaffPerformanceTable,
} from "@/components/dashboard/intelligence-tables";

import {
  getExceptionIntelligence,
  getFinancialIntelligence,
  getInstitutionIntelligence,
  getIntelligenceOverview,
  getIntelligenceTrends,
  getPartnerIntelligence,
  getStaffIntelligence,
  getTaskIntelligence,
} from "@/lib/api/dashboard";

import type {
  ExceptionIntelligence,
  FinancialIntelligence,
  InstitutionIntelligence,
  IntelligenceOverview,
  IntelligenceTrends,
  PartnerIntelligence,
  StaffIntelligence,
  TaskIntelligence,
} from "@/types/dashboard";

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");
  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function currentMonthStart() {
  const now = new Date();

  return localDateString(
    new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ),
  );
}

function today() {
  return localDateString(new Date());
}

function formatNumber(
  value: number | null | undefined,
) {
  return new Intl.NumberFormat(
    "en-IN",
  ).format(Number(value ?? 0));
}

function formatCurrency(
  value: number | null | undefined,
) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    },
  ).format(Number(value ?? 0));
}

function shortCurrency(value: number) {
  const amount = Number(value || 0);

  if (Math.abs(amount) >= 10000000) {
    return `₹${(
      amount / 10000000
    ).toFixed(1)}Cr`;
  }

  if (Math.abs(amount) >= 100000) {
    return `₹${(
      amount / 100000
    ).toFixed(1)}L`;
  }

  if (Math.abs(amount) >= 1000) {
    return `₹${(
      amount / 1000
    ).toFixed(1)}K`;
  }

  return `₹${amount}`;
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "numeric",
      month: "short",
    },
  ).format(
    new Date(`${value}T00:00:00`),
  );
}

function ChangeIndicator({
  value,
}: {
  value: number | null;
}) {
  if (value === null) {
    return (
      <span className="text-xs font-semibold text-slate-400">
        New period
      </span>
    );
  }

  const positive = value >= 0;

  return (
    <span
      className={
        positive
          ? "inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"
          : "inline-flex items-center gap-1 text-xs font-semibold text-red-600"
      }
    >
      {positive ? (
        <ArrowUpRight size={14} />
      ) : (
        <ArrowDownRight size={14} />
      )}

      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function SummaryCard({
  title,
  value,
  change,
  icon,
}: {
  title: string;
  value: string;
  change?: number | null;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-[var(--brand)]">
          {icon}
        </div>

        {change !== undefined && (
          <ChangeIndicator value={change} />
        )}
      </div>

      <div className="mt-5 text-xs font-medium text-slate-500">
        {title}
      </div>

      <div className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </div>
    </div>
  );
}

function ChartEmptyState() {
  return (
    <div className="flex h-[280px] items-center justify-center text-center">
      <div>
        <TrendingUp
          size={27}
          className="mx-auto text-slate-300"
        />

        <div className="mt-3 text-sm font-semibold text-slate-500">
          No activity in this period
        </div>

        <div className="mt-1 text-xs text-slate-400">
          Chart data will appear as
          operations are recorded.
        </div>
      </div>
    </div>
  );
}

function FinanceRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-5 border-t border-slate-100 py-3 first:border-0">
      <span className="text-xs text-slate-500">
        {label}
      </span>

      <span className="text-sm font-bold text-slate-800">
        {value}
      </span>
    </div>
  );
}

export function IntelligenceDashboard() {
  const [startDate, setStartDate] =
    useState(currentMonthStart);

  const [endDate, setEndDate] =
    useState(today);

  const [overview, setOverview] =
    useState<IntelligenceOverview | null>(
      null,
    );

  const [trends, setTrends] =
    useState<IntelligenceTrends | null>(
      null,
    );

  const [finance, setFinance] =
    useState<FinancialIntelligence | null>(
      null,
    );

  const [exceptions, setExceptions] =
    useState<ExceptionIntelligence | null>(
      null,
    );

  const [
    institutions,
    setInstitutions,
  ] =
    useState<InstitutionIntelligence | null>(
      null,
    );

  const [partners, setPartners] =
    useState<PartnerIntelligence | null>(
      null,
    );

  const [staff, setStaff] =
    useState<StaffIntelligence | null>(
      null,
    );

  const [taskIntelligence, setTaskIntelligence] =
    useState<TaskIntelligence | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadData = useCallback(
    async (
      manual = false,
      requestedStart = startDate,
      requestedEnd = endDate,
    ) => {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const period = {
          startDate: requestedStart,
          endDate: requestedEnd,
        };

        const [
          overviewResponse,
          trendsResponse,
          financeResponse,
          exceptionResponse,
          institutionResponse,
          partnerResponse,
          staffResponse,
          taskResponse,
        ] = await Promise.all([
          getIntelligenceOverview(
            period,
          ),
          getIntelligenceTrends(
            period,
          ),
          getFinancialIntelligence(
            period,
          ),
          getExceptionIntelligence(
            period,
          ),
          getInstitutionIntelligence(
            period,
          ),
          getPartnerIntelligence(
            period,
          ),
          getStaffIntelligence(
            period,
          ),
          getTaskIntelligence(
            period,
          ),
        ]);

        setOverview(
          overviewResponse,
        );

        setTrends(
          trendsResponse,
        );

        setFinance(
          financeResponse,
        );

        setExceptions(
          exceptionResponse,
        );

        setInstitutions(
          institutionResponse,
        );

        setPartners(
          partnerResponse,
        );

        setStaff(
          staffResponse,
        );

        setTaskIntelligence(
          taskResponse,
        );
      } catch {
        setError(
          "Unable to retrieve intelligence data from BEOIS.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [startDate, endDate],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function applyPeriod() {
    void loadData(
      true,
      startDate,
      endDate,
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <div className="text-center">
          <LoaderCircle
            size={30}
            className="mx-auto animate-spin text-[var(--brand)]"
          />

          <div className="mt-3 text-sm font-medium text-slate-500">
            Loading intelligence...
          </div>
        </div>
      </div>
    );
  }

  if (
    error ||
    !overview ||
    !trends ||
    !finance ||
    !exceptions ||
    !institutions ||
    !partners ||
    !staff ||
    !taskIntelligence
  ) {
    return (
      <div className="rounded-2xl border border-red-100 bg-white p-10 text-center">
        <AlertTriangle
          size={32}
          className="mx-auto text-red-500"
        />

        <h1 className="mt-4 text-xl font-bold text-slate-900">
          Intelligence unavailable
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          {error ||
            "Some intelligence data could not be loaded."}
        </p>

        <button
          type="button"
          onClick={() =>
            void loadData(true)
          }
          className="mx-auto mt-5 flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white"
        >
          <RefreshCw size={16} />
          Try again
        </button>
      </div>
    );
  }

  const attentionCount =
    exceptions.summary
      .overdue_followups +
    exceptions.summary
      .overdue_education_processes +
    exceptions.summary
      .urgent_partner_issues +
    exceptions.summary
      .university_payables +
    exceptions.summary
      .operational_expenses;

  return (
    <div>
      <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">
            Reporting & Intelligence
          </div>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">
            Executive Intelligence
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Live operational intelligence
            across admissions, students,
            finance, partners, institutions
            and organizational performance.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
              From
            </label>

            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(event) =>
                setStartDate(
                  event.target.value,
                )
              }
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-[var(--brand)]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
              To
            </label>

            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(event) =>
                setEndDate(
                  event.target.value,
                )
              }
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none focus:border-[var(--brand)]"
            />
          </div>

          <button
            type="button"
            onClick={applyPeriod}
            disabled={
              refreshing ||
              !startDate ||
              !endDate
            }
            className="flex h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white disabled:opacity-60"
          >
            {refreshing ? (
              <LoaderCircle
                size={15}
                className="animate-spin"
              />
            ) : (
              <CalendarDays
                size={15}
              />
            )}

            Apply
          </button>
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="New Leads"
          value={formatNumber(
            overview.kpis.leads.current,
          )}
          change={
            overview.kpis.leads
              .change_percentage
          }
          icon={
            <UsersRound size={20} />
          }
        />

        <SummaryCard
          title="Admissions"
          value={formatNumber(
            overview.kpis.admissions
              .current,
          )}
          change={
            overview.kpis.admissions
              .change_percentage
          }
          icon={
            <GraduationCap
              size={20}
            />
          }
        />

        <SummaryCard
          title="Collections"
          value={formatCurrency(
            overview.kpis.collections
              .current,
          )}
          change={
            overview.kpis.collections
              .change_percentage
          }
          icon={
            <CircleDollarSign
              size={20}
            />
          }
        />

        <SummaryCard
          title="Needs Attention"
          value={formatNumber(
            attentionCount,
          )}
          icon={
            <AlertTriangle
              size={20}
            />
          }
        />
      </div>

      <TaskIntelligencePanel
        data={taskIntelligence}
      />

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Lead & Conversion Trend
            </h2>

            <p className="mt-1 text-[11px] text-slate-400">
              Leads created and converted
              during the selected period
            </p>
          </div>

          {trends.lead_trend.length ===
          0 ? (
            <ChartEmptyState />
          ) : (
            <div className="mt-5 h-[280px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={
                    trends.lead_trend
                  }
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    tickFormatter={
                      shortDate
                    }
                    tick={{
                      fontSize: 10,
                    }}
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{
                      fontSize: 10,
                    }}
                  />

                  <Tooltip
                    labelFormatter={(
                      value,
                    ) =>
                      shortDate(
                        String(value),
                      )
                    }
                  />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="leads"
                    name="Leads"
                    stroke="currentColor"
                    strokeWidth={2}
                    dot
                  />

                  <Line
                    type="monotone"
                    dataKey="converted"
                    name="Converted"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Admission Trend
            </h2>

            <p className="mt-1 text-[11px] text-slate-400">
              Admissions created and
              completed
            </p>
          </div>

          {trends.admission_trend
            .length === 0 ? (
            <ChartEmptyState />
          ) : (
            <div className="mt-5 h-[280px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={
                    trends.admission_trend
                  }
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    tickFormatter={
                      shortDate
                    }
                    tick={{
                      fontSize: 10,
                    }}
                  />

                  <YAxis
                    allowDecimals={false}
                    tick={{
                      fontSize: 10,
                    }}
                  />

                  <Tooltip
                    labelFormatter={(
                      value,
                    ) =>
                      shortDate(
                        String(value),
                      )
                    }
                  />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="admissions"
                    name="Admissions"
                    stroke="currentColor"
                    strokeWidth={2}
                    dot
                  />

                  <Line
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Collection Trend
            </h2>

            <p className="mt-1 text-[11px] text-slate-400">
              Student fee collections by
              date
            </p>
          </div>

          {trends.collection_trend
            .length === 0 ? (
            <ChartEmptyState />
          ) : (
            <div className="mt-5 h-[280px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <AreaChart
                  data={
                    trends.collection_trend
                  }
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    tickFormatter={
                      shortDate
                    }
                    tick={{
                      fontSize: 10,
                    }}
                  />

                  <YAxis
                    tickFormatter={
                      shortCurrency
                    }
                    tick={{
                      fontSize: 10,
                    }}
                  />

                  <Tooltip
                    formatter={(value) =>
                      formatCurrency(
                        Number(value),
                      )
                    }
                    labelFormatter={(
                      value,
                    ) =>
                      shortDate(
                        String(value),
                      )
                    }
                  />

                  <Area
                    type="monotone"
                    dataKey="amount"
                    name="Collections"
                    stroke="currentColor"
                    fill="currentColor"
                    fillOpacity={0.08}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Cash Flow Trend
            </h2>

            <p className="mt-1 text-[11px] text-slate-400">
              Posted income and cash
              outflow
            </p>
          </div>

          {trends.cash_flow_trend
            .length === 0 ? (
            <ChartEmptyState />
          ) : (
            <div className="mt-5 h-[280px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={
                    trends.cash_flow_trend
                  }
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    tickFormatter={
                      shortDate
                    }
                    tick={{
                      fontSize: 10,
                    }}
                  />

                  <YAxis
                    tickFormatter={
                      shortCurrency
                    }
                    tick={{
                      fontSize: 10,
                    }}
                  />

                  <Tooltip
                    formatter={(value) =>
                      formatCurrency(
                        Number(value),
                      )
                    }
                    labelFormatter={(
                      value,
                    ) =>
                      shortDate(
                        String(value),
                      )
                    }
                  />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="income"
                    name="Income"
                    stroke="currentColor"
                    strokeWidth={2}
                    dot
                  />

                  <Line
                    type="monotone"
                    dataKey="expense"
                    name="Outflow"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-[var(--brand)]">
              <WalletCards size={19} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Student Finance
              </h2>

              <p className="text-[11px] text-slate-400">
                Fees and collections
              </p>
            </div>
          </div>

          <div className="mt-4">
            <FinanceRow
              label="Booked Fees"
              value={formatCurrency(
                finance.student_finance
                  .booked_fees,
              )}
            />

            <FinanceRow
              label="Total Collections"
              value={formatCurrency(
                finance.student_finance
                  .collections_total,
              )}
            />

            <FinanceRow
              label="Period Collections"
              value={formatCurrency(
                finance.student_finance
                  .collections_in_period,
              )}
            />

            <FinanceRow
              label="Receivable"
              value={formatCurrency(
                finance.student_finance
                  .receivable,
              )}
            />

            <FinanceRow
              label="Collection Rate"
              value={`${finance.student_finance.collection_rate.toFixed(
                1,
              )}%`}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-[var(--brand)]">
              <CircleDollarSign
                size={19}
              />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Cash Position
              </h2>

              <p className="text-[11px] text-slate-400">
                Operational cash flow
              </p>
            </div>
          </div>

          <div className="mt-4">
            <FinanceRow
              label="Income"
              value={formatCurrency(
                finance.cash_flow.income,
              )}
            />

            <FinanceRow
              label="Outflow"
              value={formatCurrency(
                finance.cash_flow
                  .outflow,
              )}
            />

            <FinanceRow
              label="Net Cash Flow"
              value={formatCurrency(
                finance.cash_flow.net,
              )}
            />

            <FinanceRow
              label="Payroll Total"
              value={formatCurrency(
                finance.payroll
                  .period_total,
              )}
            />

            <FinanceRow
              label="Payroll Outstanding"
              value={formatCurrency(
                finance.payroll
                  .period_outstanding,
              )}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle
                size={19}
              />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Obligations
              </h2>

              <p className="text-[11px] text-slate-400">
                Outstanding operational
                liabilities
              </p>
            </div>
          </div>

          <div className="mt-4">
            <FinanceRow
              label="University"
              value={formatCurrency(
                finance.obligations
                  .university_outstanding,
              )}
            />

            <FinanceRow
              label="Partner Commission"
              value={formatCurrency(
                finance.obligations
                  .partner_commission_outstanding,
              )}
            />

            <FinanceRow
              label="Operational Expenses"
              value={formatCurrency(
                finance.obligations
                  .operational_expense_outstanding,
              )}
            />

            <FinanceRow
              label="Payroll"
              value={formatCurrency(
                finance.obligations
                  .payroll_outstanding,
              )}
            />
          </div>

          <p className="mt-4 border-t border-slate-100 pt-4 text-[10px] leading-5 text-slate-400">
            {finance.note}
          </p>
        </section>
      </div>

      <div className="mt-8">
        <InstitutionPerformanceTable
          institutions={
            institutions.institutions
          }
        />
      </div>

      <div className="mt-5">
        <PartnerPerformanceTable
          partners={partners.partners}
        />
      </div>

      <div className="mt-5">
        <StaffPerformanceTable
          staff={staff.staff}
        />
      </div>

      <div className="mt-8">
        <AttentionCentre
          data={exceptions}
        />
      </div>
    </div>
  );
}