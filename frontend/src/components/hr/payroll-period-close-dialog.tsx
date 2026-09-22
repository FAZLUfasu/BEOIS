"use client";

import {
  useState,
} from "react";

import {
  LockKeyhole,
  Loader2,
  X,
} from "lucide-react";

import {
  closePayrollPeriod,
} from "@/lib/api/payroll";

import type {
  PayrollPeriod,
} from "@/types/payroll";


interface Props {
  open: boolean;
  period: PayrollPeriod | null;

  onClose: () => void;

  onSaved: (
    period: PayrollPeriod,
  ) => void;
}


export function PayrollPeriodCloseDialog({
  open,
  period,
  onClose,
  onSaved,
}: Props) {
  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");


  if (!open || !period) {
    return null;
  }

  const activePeriod = period;


  async function closePeriod() {
    setSaving(true);
    setError("");

    try {
      const saved =
        await closePayrollPeriod(
          activePeriod.id,
        );

      onSaved(saved);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to close payroll period.",
      );
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/50 p-4">
      <div className="flex min-h-full items-center justify-center">
        <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <div className="flex items-center gap-2">
                <LockKeyhole className="h-5 w-5 text-amber-600" />

                <h2 className="text-lg font-bold text-slate-950">
                  Close Payroll Period
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                {getPeriodName(
                  activePeriod,
                )}
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


          <div className="space-y-4 px-6 py-5">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-semibold text-amber-900">
                Confirm period closing
              </p>

              <p className="mt-2 text-sm leading-6 text-amber-800">
                The backend will only close this period when every payroll record is either Paid or Cancelled. If unfinished payrolls exist, the request will be rejected.
              </p>
            </div>

            <p className="text-sm leading-6 text-slate-600">
              Closing marks the payroll cycle as completed. Verify payroll calculations, approvals and payments before continuing.
            </p>
          </div>


          <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() =>
                void closePeriod()
              }
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LockKeyhole className="h-4 w-4" />
              )}

              Close Period
            </button>
          </div>
        </div>
      </div>
    </div>
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