"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  CircleDollarSign,
  Loader2,
  X,
} from "lucide-react";

import {
  disburseSalaryAdvance,
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


export function SalaryAdvanceDisburseDialog({
  open,
  advance,
  onClose,
  onSaved,
}: Props) {
  const [
    paymentReference,
    setPaymentReference,
  ] = useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");


  useEffect(() => {
    if (!open) {
      return;
    }

    setPaymentReference("");
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

    setSaving(true);
    setError("");

    try {
      const saved =
        await disburseSalaryAdvance(
          activeAdvance.id,
          {
            payment_reference:
              paymentReference.trim(),
          },
        );

      onSaved(saved);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to disburse salary advance.",
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
                <CircleDollarSign className="h-5 w-5 text-blue-600" />

                <h2 className="text-lg font-bold text-slate-950">
                  Disburse Salary Advance
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


            <div className="grid gap-3 sm:grid-cols-2">
              <AmountBox
                label="Approved"
                value={
                  activeAdvance.approved_amount
                }
              />

              <AmountBox
                label="Monthly Recovery"
                value={
                  activeAdvance.monthly_recovery_amount
                }
              />
            </div>


            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Payment Reference
              </span>

              <input
                type="text"
                value={paymentReference}
                onChange={(event) =>
                  setPaymentReference(
                    event.target.value,
                  )
                }
                placeholder="Bank transfer / voucher / transaction reference"
                className={inputClass}
              />
            </label>


            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Confirm that the advance has actually been paid before recording the disbursement.
            </div>
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
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CircleDollarSign className="h-4 w-4" />
              )}

              Confirm Disbursement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function AmountBox({
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
        ₹
        {Number(
          value || 0,
        ).toLocaleString(
          "en-IN",
          {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          },
        )}
      </p>
    </div>
  );
}