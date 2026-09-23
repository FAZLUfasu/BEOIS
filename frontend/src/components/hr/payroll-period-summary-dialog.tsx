"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  BarChart3,
  Loader2,
  X,
} from "lucide-react";

import {
  getPayrollSummary,
} from "@/lib/api/payroll-reporting";

import type {
  PayrollPeriod,
  PayrollPeriodSummary,
} from "@/types/payroll";

export function PayrollPeriodSummaryDialog({
  period,
  onClose,
}: {
  period: PayrollPeriod | null;
  onClose: () => void;
}) {
  const [summary, setSummary] =
    useState<PayrollPeriodSummary | null>(null);
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
    const activePeriod = period;

    async function loadSummary() {
      setLoading(true);
      setError("");

      try {
        const result =
          await getPayrollSummary(
            activePeriod.id,
          );

        if (active) {
          setSummary(result);
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
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4">
      <button
        type="button"
        aria-label="Close payroll summary"
        onClick={onClose}
        className="absolute inset-0"
      />

      <div className="relative z-10 w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <div className="flex items-center gap-2 text-blue-600">
              <BarChart3 className="h-4 w-4" />
              <p className="text-xs font-bold uppercase tracking-[0.18em]">
                Payroll Summary
              </p>
            </div>

            <h3 className="mt-2 text-xl font-bold text-slate-950">
              {formatPeriod(period)}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {formatDate(period.start_date)} –{" "}
              {formatDate(period.end_date)}
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

        {error ? (
          <div className="m-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : summary ? (
          <div className="space-y-6 p-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="Employees"
                value={String(summary.employees)}
              />
              <Metric
                label="Gross Earnings"
                value={`₹${formatMoney(
                  summary.gross_earnings,
                )}`}
              />
              <Metric
                label="Deductions"
                value={`₹${formatMoney(
                  summary.total_deductions,
                )}`}
              />
              <Metric
                label="Net Payroll"
                value={`₹${formatMoney(
                  summary.net_payroll,
                )}`}
                strong
              />
            </div>

            <section className="rounded-2xl border border-slate-200">
              <div className="border-b border-slate-200 p-4">
                <h4 className="font-bold text-slate-950">
                  Processing Status
                </h4>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
                <StatusMetric
                  label="Draft"
                  value={summary.draft}
                />
                <StatusMetric
                  label="Calculated"
                  value={summary.calculated}
                />
                <StatusMetric
                  label="Approved"
                  value={summary.approved}
                />
                <StatusMetric
                  label="Paid"
                  value={summary.paid}
                />
              </div>
            </section>

            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              Period status:{" "}
              <span className="font-bold text-slate-900">
                {period.status}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Metric({
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
            : "text-slate-400",
        ].join(" ")}
      >
        {label}
      </p>
      <p className="mt-2 text-lg font-bold">
        {value}
      </p>
    </div>
  );
}

function StatusMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 text-center">
      <p className="text-2xl font-bold text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  );
}

function formatMoney(value: string | number) {
  return Number(value || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}

function formatPeriod(period: PayrollPeriod) {
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

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN");
}
