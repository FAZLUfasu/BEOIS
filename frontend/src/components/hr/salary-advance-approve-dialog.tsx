"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";

import {
  approveSalaryAdvance,
} from "@/lib/api/payroll";

import type {
  SalaryAdvance,
} from "@/types/payroll";


interface Props {
  open: boolean;
  advance: SalaryAdvance | null;
  onClose: () => void;
  onSaved: (
    advance: SalaryAdvance,
  ) => void;
}


const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";


export function SalaryAdvanceApproveDialog({
  open,
  advance,
  onClose,
  onSaved,
}: Props) {
  const [
    approvedAmount,
    setApprovedAmount,
  ] = useState("");

  const [
    monthlyRecovery,
    setMonthlyRecovery,
  ] = useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");


  useEffect(() => {
    if (!open || !advance) {
      return;
    }

    setApprovedAmount(
      advance.requested_amount,
    );

    setMonthlyRecovery("");
    setError("");
  }, [open, advance]);


  if (!open || !advance) {
    return null;
  }


  const activeAdvance = advance;


  async function submit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    const approved =
      Number(approvedAmount);

    const recovery =
      Number(monthlyRecovery);

    if (
      !approvedAmount ||
      Number.isNaN(approved) ||
      approved <= 0
    ) {
      setError(
        "Enter a valid approved amount.",
      );
      return;
    }

    if (
      !monthlyRecovery ||
      Number.isNaN(recovery) ||
      recovery <= 0
    ) {
      setError(
        "Enter a valid monthly recovery amount.",
      );
      return;
    }

    if (
      approved >
      Number(
        activeAdvance.requested_amount,
      )
    ) {
      setError(
        "Approved amount cannot exceed the requested amount.",
      );
      return;
    }

    if (recovery > approved) {
      setError(
        "Monthly recovery cannot exceed the approved amount.",
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const saved =
        await approveSalaryAdvance(
          activeAdvance.id,
          {
            approved_amount:
              approvedAmount,
            monthly_recovery_amount:
              monthlyRecovery,
          },
        );

      onSaved(saved);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to approve salary advance.",
      );
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/50 p-4">
      <div className="flex min-h-full items-center justify-center">
        <form
          onSubmit={submit}
          className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />

                <h2 className="text-lg font-bold text-slate-950">
                  Approve Salary Advance
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                {activeAdvance.employee_id} —{" "}
                {activeAdvance.employee_name}
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


          <div className="space-y-5 px-6 py-5">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}


            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Requested Amount
              </p>

              <p className="mt-1 text-xl font-bold text-slate-950">
                ₹
                {formatMoney(
                  activeAdvance.requested_amount,
                )}
              </p>
            </div>


            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Approved Amount *
              </span>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={approvedAmount}
                onChange={(event) =>
                  setApprovedAmount(
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </label>


            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Monthly Recovery Amount *
              </span>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={monthlyRecovery}
                onChange={(event) =>
                  setMonthlyRecovery(
                    event.target.value,
                  )
                }
                placeholder="Example: 2000"
                className={inputClass}
              />

              <span className="mt-1.5 block text-xs text-slate-500">
                Amount intended to be recovered during each payroll cycle.
              </span>
            </label>
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
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}

              Approve Advance
            </button>
          </div>
        </form>
      </div>
    </div>
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