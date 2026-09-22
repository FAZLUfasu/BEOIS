"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Loader2,
  X,
} from "lucide-react";

import {
  addPayrollBonus,
  addPayrollDeduction,
  addPayrollIncentive,
} from "@/lib/api/payroll";

import type {
  Payroll,
} from "@/types/payroll";

export type PayrollAdjustmentKind =
  | "INCENTIVE"
  | "BONUS"
  | "DEDUCTION";

interface Props {
  payroll: Payroll | null;
  kind: PayrollAdjustmentKind | null;
  onClose: () => void;
  onSaved: (payroll: Payroll) => void;
}

const configuration = {
  INCENTIVE: {
    title: "Add Incentive",
    defaultName: "Performance Incentive",
  },
  BONUS: {
    title: "Add Bonus",
    defaultName: "Bonus",
  },
  DEDUCTION: {
    title: "Add Manual Deduction",
    defaultName: "Other Deduction",
  },
} satisfies Record<
  PayrollAdjustmentKind,
  {
    title: string;
    defaultName: string;
  }
>;

export function PayrollAdjustmentDialog({
  payroll,
  kind,
  onClose,
  onSaved,
}: Props) {
  const [name, setName] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const open =
    payroll !== null &&
    kind !== null;

  useEffect(() => {
    if (!kind) {
      return;
    }

    setName(
      configuration[kind].defaultName,
    );
    setAmount("");
    setNotes("");
    setError("");
  }, [kind, payroll?.id]);
  if (!open || !payroll || !kind) {
    return null;
  }

  const activePayroll = payroll;
  const activeKind = kind;
  const config = configuration[activeKind];

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (Number(amount) <= 0) {
      setError(
        "Amount must be greater than zero.",
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        amount,
        name: name.trim(),
        notes: notes.trim(),
      };

            let saved: Payroll;

      if (activeKind === "INCENTIVE") {
        saved =
          await addPayrollIncentive(
            activePayroll.id,
            payload,
          );
      } else if (
        activeKind === "BONUS"
      ) {
        saved =
          await addPayrollBonus(
            activePayroll.id,
            payload,
          );
      } else {
        saved =
          await addPayrollDeduction(
            activePayroll.id,
            payload,
          );
      }
      onSaved(saved);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to add payroll adjustment.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              Payroll Adjustment
            </p>

            <h3 className="mt-1 text-xl font-bold text-slate-950">
              {config.title}
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
          className="space-y-4 p-6"
        >
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <Field label="Name">
            <input
              required
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              className={inputClass}
            />
          </Field>

          <Field label="Amount">
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) =>
                setAmount(
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </Field>

          <Field label="Notes">
            <textarea
              rows={3}
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value,
                )
              }
              className={inputClass}
            />
          </Field>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}

              Save Adjustment
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

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";