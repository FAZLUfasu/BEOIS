"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CircleDollarSign,
  GraduationCap,
  LoaderCircle,
  Network,
  PhoneCall,
  RefreshCw,
  UsersRound,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { DashboardWelcome } from "@/components/dashboard/dashboard-welcome";
import {
  getExceptionIntelligence,
  getIntelligenceOverview,
} from "@/lib/api/dashboard";

import type {
  ExceptionIntelligence,
  IntelligenceOverview,
} from "@/types/dashboard";

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

function formatDate(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  ).format(
    new Date(`${value}T00:00:00`),
  );
}

interface ChangeBadgeProps {
  value: number | null;
}

function ChangeBadge({
  value,
}: ChangeBadgeProps) {
  if (value === null) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
        New
      </span>
    );
  }

  const positive = value >= 0;

  return (
    <span
      className={
        positive
          ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700"
          : "inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600"
      }
    >
      {positive ? (
        <ArrowUpRight size={13} />
      ) : (
        <ArrowDownRight size={13} />
      )}

      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

interface LiveStatCardProps {
  title: string;
  value: string;
  subtitle: string;
  change?: number | null;
  icon: React.ReactNode;
}

function LiveStatCard({
  title,
  value,
  subtitle,
  change,
  icon,
}: LiveStatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-[var(--brand)]">
          {icon}
        </div>

        {change !== undefined && (
          <ChangeBadge value={change} />
        )}
      </div>

      <div className="mt-5 text-[13px] font-medium text-slate-500">
        {title}
      </div>

      <div className="mt-2 text-[29px] font-bold tracking-tight text-slate-950">
        {value}
      </div>

      <div className="mt-2 text-[11px] text-slate-400">
        {subtitle}
      </div>
    </div>
  );
}

interface AttentionRowProps {
  title: string;
  subtitle: string;
  value: number;
}

function AttentionRow({
  title,
  subtitle,
  value,
}: AttentionRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-slate-100 px-5 py-4 first:border-t-0">
      <div>
        <div className="text-[13px] font-semibold text-slate-800">
          {title}
        </div>

        <div className="mt-1 text-[11px] text-slate-400">
          {subtitle}
        </div>
      </div>

      <div
        className={
          value > 0
            ? "flex min-w-10 items-center justify-center rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-600"
            : "flex min-w-10 items-center justify-center rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-600"
        }
      >
        {value}
      </div>
    </div>
  );
}

export function ExecutiveDashboard() {
  const [
    overview,
    setOverview,
  ] = useState<IntelligenceOverview | null>(
    null,
  );

  const [
    exceptions,
    setExceptions,
  ] =
    useState<ExceptionIntelligence | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const loadDashboard =
    useCallback(
      async (manual = false) => {
        if (manual) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        try {
          const [
            overviewResponse,
            exceptionResponse,
          ] = await Promise.all([
            getIntelligenceOverview(),
            getExceptionIntelligence(),
          ]);

          setOverview(
            overviewResponse,
          );

          setExceptions(
            exceptionResponse,
          );
        } catch {
          setError(
            "Unable to load the live dashboard data.",
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div>
        <DashboardWelcome />

        <div className="mt-8 flex min-h-[360px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="text-center">
            <LoaderCircle
              size={28}
              className="mx-auto animate-spin text-[var(--brand)]"
            />

            <div className="mt-3 text-sm font-medium text-slate-500">
              Loading live BEOIS data...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (
    error ||
    !overview ||
    !exceptions
  ) {
    return (
      <div>
        <DashboardWelcome />

        <div className="mt-8 rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <AlertTriangle
            size={30}
            className="mx-auto text-red-500"
          />

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            Dashboard data unavailable
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
            {error ||
              "BEOIS could not retrieve the dashboard information."}
          </p>

          <button
            type="button"
            onClick={() =>
              void loadDashboard(true)
            }
            className="mx-auto mt-5 flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white"
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      </div>
    );
  }

  const period =
    overview.period;

  const exceptionSummary =
    exceptions.summary;

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <DashboardWelcome />

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-600">
            {formatDate(
              period.start_date,
            )}
            {" — "}
            {formatDate(
              period.end_date,
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              void loadDashboard(true)
            }
            disabled={refreshing}
            className="flex h-[42px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              size={15}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

          <a
            href="/intelligence"
            className="flex h-[42px] items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white shadow-sm"
          >
            View Intelligence
            <ArrowRight size={15} />
          </a>
        </div>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <LiveStatCard
          title="New Leads"
          value={formatNumber(
            overview.kpis.leads.current,
          )}
          subtitle="Created in current reporting period"
          change={
            overview.kpis.leads
              .change_percentage
          }
          icon={
            <UsersRound size={21} />
          }
        />

        <LiveStatCard
          title="Admissions"
          value={formatNumber(
            overview.kpis.admissions
              .current,
          )}
          subtitle="Admissions created in period"
          change={
            overview.kpis.admissions
              .change_percentage
          }
          icon={
            <GraduationCap
              size={21}
            />
          }
        />

        <LiveStatCard
          title="Collections"
          value={formatCurrency(
            overview.kpis.collections
              .current,
          )}
          subtitle="Student fee collections in period"
          change={
            overview.kpis.collections
              .change_percentage
          }
          icon={
            <CircleDollarSign
              size={21}
            />
          }
        />

        <LiveStatCard
          title="Active Partners"
          value={formatNumber(
            overview.organization
              .active_partners,
          )}
          subtitle="Current active partner network"
          icon={
            <Network size={21} />
          }
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_0.85fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">
                Operational Performance
              </h2>

              <p className="mt-1 text-[11px] text-slate-400">
                Live organizational indicators
              </p>
            </div>

            <div className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
              Live
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4">
            <div className="border-b border-slate-100 p-5 sm:border-r lg:border-b-0">
              <PhoneCall
                size={19}
                className="text-[var(--brand)]"
              />

              <div className="mt-4 text-2xl font-bold text-slate-900">
                {formatNumber(
                  overview.kpis.leads
                    .current,
                )}
              </div>

              <div className="mt-1 text-xs font-medium text-slate-600">
                Leads
              </div>
            </div>

            <div className="border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
              <GraduationCap
                size={19}
                className="text-[var(--brand)]"
              />

              <div className="mt-4 text-2xl font-bold text-slate-900">
                {formatNumber(
                  overview.organization
                    .active_students,
                )}
              </div>

              <div className="mt-1 text-xs font-medium text-slate-600">
                Active Students
              </div>
            </div>

            <div className="border-b border-slate-100 p-5 sm:border-r sm:border-b-0">
              <Building2
                size={19}
                className="text-[var(--brand)]"
              />

              <div className="mt-4 text-2xl font-bold text-slate-900">
                {formatNumber(
                  overview.organization
                    .active_employees,
                )}
              </div>

              <div className="mt-1 text-xs font-medium text-slate-600">
                Active Employees
              </div>
            </div>

            <div className="p-5">
              <Network
                size={19}
                className="text-[var(--brand)]"
              />

              <div className="mt-4 text-2xl font-bold text-slate-900">
                {formatNumber(
                  overview.organization
                    .active_partners,
                )}
              </div>

              <div className="mt-1 text-xs font-medium text-slate-600">
                Active Partners
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-slate-700">
                  Lead conversion rate
                </div>

                <div className="mt-1 text-[11px] text-slate-400">
                  Converted leads during the current reporting period
                </div>
              </div>

              <div className="text-2xl font-bold text-[var(--brand)]">
                {overview.kpis
                  .lead_conversion_rate
                  .current.toFixed(1)}
                %
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">
                Needs Attention
              </h2>

              <p className="mt-1 text-[11px] text-slate-400">
                Current operational exceptions
              </p>
            </div>

            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle
                size={19}
              />
            </div>
          </div>

          <AttentionRow
            title="Overdue follow-ups"
            subtitle="Leads & Telecalling"
            value={
              exceptionSummary
                .overdue_followups
            }
          />

          <AttentionRow
            title="Education deadlines"
            subtitle="Student process"
            value={
              exceptionSummary
                .overdue_education_processes
            }
          />

          <AttentionRow
            title="Urgent partner issues"
            subtitle="Partner Network"
            value={
              exceptionSummary
                .urgent_partner_issues
            }
          />

          <AttentionRow
            title="University payables"
            subtitle={
              formatCurrency(
                exceptionSummary
                  .university_outstanding,
              ) + " outstanding"
            }
            value={
              exceptionSummary
                .university_payables
            }
          />

          <AttentionRow
            title="Operational expenses"
            subtitle={
              formatCurrency(
                exceptionSummary
                  .operational_expense_outstanding,
              ) + " outstanding"
            }
            value={
              exceptionSummary
                .operational_expenses
            }
          />
        </section>
      </div>
    </div>
  );
}
