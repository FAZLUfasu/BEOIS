"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  PhoneCall,
  RefreshCw,
  Target,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { DashboardWelcome } from "@/components/dashboard/dashboard-welcome";
import {
  getTelecallingDashboard,
} from "@/lib/api/dashboard";

import type {
  TelecallingDashboard as TelecallingDashboardData,
} from "@/lib/api/dashboard";

function formatNumber(
  value: number | null | undefined,
) {
  return new Intl.NumberFormat(
    "en-IN",
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

interface StatCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  urgent?: boolean;
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  urgent = false,
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex size-11 items-center justify-center rounded-xl ${
            urgent
              ? "bg-red-50 text-red-600"
              : "bg-blue-50 text-[var(--brand)]"
          }`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-5 text-[13px] font-medium text-slate-500">
        {title}
      </div>

      <div className="mt-2 text-[29px] font-bold tracking-tight text-slate-950">
        {formatNumber(value)}
      </div>

      <div className="mt-2 text-[11px] text-slate-400">
        {subtitle}
      </div>
    </div>
  );
}

export function TelecallingDashboard() {
  const [
    dashboard,
    setDashboard,
  ] = useState<TelecallingDashboardData | null>(
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
          const response =
            await getTelecallingDashboard();

          setDashboard(response);
        } catch {
          setError(
            "Unable to load the telecalling dashboard.",
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
              Loading telecalling dashboard...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div>
        <DashboardWelcome />

        <div className="mt-8 rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <AlertTriangle
            size={30}
            className="mx-auto text-red-500"
          />

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            Telecalling dashboard unavailable
          </h2>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
            {error ||
              "BEOIS could not retrieve the telecalling dashboard information."}
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

  const outcomes =
    Object.entries(
      dashboard.call_outcomes ?? {},
    ).sort(
      ([, a], [, b]) => b - a,
    );

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <DashboardWelcome />

          <div className="mt-2 text-sm text-slate-500">
            Telecalling operations and follow-up performance
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-600">
            {formatDate(
              dashboard.period.start_date,
            )}
            {" — "}
            {formatDate(
              dashboard.period.end_date,
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
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Calls"
          value={dashboard.total_calls}
          subtitle="Calls during the selected period"
          icon={<PhoneCall size={21} />}
        />

        <StatCard
          title="Active Leads"
          value={dashboard.active_leads}
          subtitle="Leads still requiring action"
          icon={<UsersRound size={21} />}
        />

        <StatCard
          title="Follow-ups Today"
          value={dashboard.follow_up_due_today}
          subtitle="Follow-ups due today"
          icon={<Clock3 size={21} />}
          urgent={
            dashboard.follow_up_due_today > 0
          }
        />

        <StatCard
          title="Overdue Follow-ups"
          value={dashboard.overdue_follow_up}
          subtitle="Follow-ups requiring attention"
          icon={<AlertTriangle size={21} />}
          urgent={
            dashboard.overdue_follow_up > 0
          }
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Qualified Leads"
          value={dashboard.qualified_leads}
          subtitle="Leads marked qualified"
          icon={<Target size={21} />}
        />

        <StatCard
          title="Converted Leads"
          value={dashboard.converted_leads}
          subtitle="Successfully converted leads"
          icon={<CheckCircle2 size={21} />}
        />

        <StatCard
          title="Unassigned Leads"
          value={dashboard.unassigned_leads}
          subtitle="Active leads without an assignee"
          icon={<UserRound size={21} />}
          urgent={
            dashboard.unassigned_leads > 0
          }
        />

        <StatCard
          title="Calling Activity"
          value={Object.values(
            dashboard.call_outcomes ?? {},
          ).reduce(
            (sum, value) => sum + value,
            0,
          )}
          subtitle="Recorded call outcomes"
          icon={<PhoneCall size={21} />}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">
              Call Outcomes
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Breakdown of recorded calls during the selected period.
            </p>
          </div>

          {outcomes.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              No call outcomes recorded for this period.
            </div>
          ) : (
            <div>
              {outcomes.map(
                ([outcome, count]) => (
                  <div
                    key={outcome}
                    className="flex items-center justify-between gap-4 border-t border-slate-100 px-5 py-4 first:border-t-0"
                  >
                    <div className="text-sm font-medium text-slate-700">
                      {outcome
                        .replace(
                          /_/g,
                          " ",
                        )
                        .toLowerCase()
                        .replace(
                          /\b\w/g,
                          (character) =>
                            character.toUpperCase(),
                        )}
                    </div>

                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800">
                      {formatNumber(
                        count,
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">
              Follow-up Attention
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Leads requiring immediate calling attention.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="flex items-center justify-between px-5 py-5">
              <div>
                <div className="text-sm font-semibold text-slate-800">
                  Due Today
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Follow-ups scheduled for today
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 px-4 py-2 text-lg font-bold text-amber-700">
                {formatNumber(
                  dashboard.follow_up_due_today,
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-5">
              <div>
                <div className="text-sm font-semibold text-slate-800">
                  Overdue
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Follow-ups that have passed their due time
                </div>
              </div>

              <div className="rounded-xl bg-red-50 px-4 py-2 text-lg font-bold text-red-600">
                {formatNumber(
                  dashboard.overdue_follow_up,
                )}
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-5">
              <div>
                <div className="text-sm font-semibold text-slate-800">
                  Unassigned
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Active leads without an assignee
                </div>
              </div>

              <div className="rounded-xl bg-blue-50 px-4 py-2 text-lg font-bold text-blue-700">
                {formatNumber(
                  dashboard.unassigned_leads,
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
