"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  CreditCard,
  Loader2,
  X,
} from "lucide-react";

import {
  payPayroll,
} from "@/lib/api/payroll";

import type {
  Payroll,
} from "@/types/payroll";

interface Props {
  payroll: Payroll | null;
  onClose: () => void;
  onSaved: (payroll: Payroll) => void;
}

const paymentMethods = [
  "BANK_TRANSFER",
  "NEFT",
  "RTGS",
  "IMPS",
  "UPI",
  "CHEQUE",
  "CASH",
  "OTHER",
];

export function PayrollPaymentDialog({
  payroll,
  onClose,
  onSaved,
}: Props) {
  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState("BANK_TRANSFER");

  const [
    paymentReference,
    setPaymentReference,
  ] = useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!payroll) {
      return;
    }

    setPaymentMethod(
      "BANK_TRANSFER",
    );
    setPaymentReference("");
    setError("");
  }, [payroll?.id]);

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

  const activePayroll = payroll;

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!paymentMethod.trim()) {
      setError(
        "Payment method is required.",
      );
      return;
    }

    if (!paymentReference.trim()) {
      setError(
        "Payment reference is required.",
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const saved =
        await payPayroll(
          activePayroll.id,
          {
            payment_method:
              paymentMethod.trim(),
            payment_reference:
              paymentReference.trim(),
          },
        );

      onSaved(saved);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to mark payroll as paid.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/50 p-4">
      <button
        type="button"
        aria-label="Close payment dialog"
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              Payroll Payment
            </p>

            <h3 className="mt-1 text-xl font-bold text-slate-950">
              Record Salary Payment
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {activePayroll.employee_name ||
                activePayroll.employee_id}
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

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-6"
        >
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="rounded-2xl bg-slate-950 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Net Salary Payable
            </p>

            <p className="mt-2 text-3xl font-bold">
              ₹
              {formatMoney(
                activePayroll.net_salary,
              )}
            </p>

            <p className="mt-2 text-sm text-slate-400">
              {activePayroll.period_display}
            </p>
          </div>

          <Field label="Payment Method">
            <select
              required
              value={paymentMethod}
              onChange={(event) =>
                setPaymentMethod(
                  event.target.value,
                )
              }
              className={inputClass}
            >
              {paymentMethods.map(
                (method) => (
                  <option
                    key={method}
                    value={method}
                  >
                    {formatMethod(method)}
                  </option>
                ),
              )}
            </select>
          </Field>

          <Field label="Payment Reference">
            <input
              required
              value={paymentReference}
              onChange={(event) =>
                setPaymentReference(
                  event.target.value,
                )
              }
              placeholder="Bank transaction / UTR / cheque / voucher reference"
              className={inputClass}
            />
          </Field>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Confirm the actual salary payment before submitting. This action moves the payroll to Paid status.
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}

              Confirm Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      {children}
    </label>
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

function formatMethod(
  method: string,
) {
  return method
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (value) =>
        value.toUpperCase(),
    );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";