"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Loader2,
  X,
} from "lucide-react";

import {
  addPayrollAdvanceRecovery,
} from "@/lib/api/payroll";

import type {
  Payroll,
  SalaryAdvance,
} from "@/types/payroll";

interface Props {
  payroll: Payroll | null;
  advances: SalaryAdvance[];
  onClose: () => void;
  onSaved: (payroll: Payroll) => void;
}

export function PayrollAdvanceRecoveryDialog({
  payroll,
  advances,
  onClose,
  onSaved,
}: Props) {
  const [advanceId, setAdvanceId] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const availableAdvances =
    useMemo(() => {
      if (!payroll) {
        return [];
      }

      return advances.filter(
        (advance) =>
          advance.employee ===
            payroll.employee &&
          (
            advance.status ===
              "DISBURSED" ||
            advance.status ===
              "PARTIALLY_RECOVERED"
          ) &&
          Number(
            advance.outstanding_amount,
          ) > 0,
      );
    }, [advances, payroll]);

  const selectedAdvance =
    useMemo(
      () =>
        availableAdvances.find(
          (item) =>
            item.id === advanceId,
        ) ?? null,
      [
        advanceId,
        availableAdvances,
      ],
    );

  useEffect(() => {
    if (!payroll) {
      return;
    }

    setAdvanceId("");
    setAmount("");
    setError("");
  }, [payroll?.id]);

  useEffect(() => {
    if (!selectedAdvance) {
      return;
    }

    setAmount(
      selectedAdvance
        .monthly_recovery_amount || "",
    );
  }, [selectedAdvance]);

  if (!payroll) {
    return null;
  }

  const activePayroll = payroll;

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!advanceId) {
      setError(
        "Select a salary advance.",
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
            const saved =
        await addPayrollAdvanceRecovery(
          activePayroll.id,
          {
            advance: advanceId,
            amount:
              amount.trim()
                ? amount
                : undefined,
          },
        );

      onSaved(saved);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to add advance recovery.",
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
              Salary Advance
            </p>

            <h3 className="mt-1 text-xl font-bold text-slate-950">
              Add Advance Recovery
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

          {availableAdvances.length ===
          0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              This employee has no disbursed salary advance available for recovery.
            </div>
          ) : (
            <>
              <Field label="Salary Advance">
                <select
                  required
                  value={advanceId}
                  onChange={(event) =>
                    setAdvanceId(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                >
                  <option value="">
                    Select advance
                  </option>

                  {availableAdvances.map(
                    (advance) => (
                      <option
                        key={advance.id}
                        value={advance.id}
                      >
                        Outstanding ₹
                        {formatMoney(
                          advance.outstanding_amount,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field label="Recovery Amount">
                <input
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

              {selectedAdvance ? (
                <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                  Outstanding:{" "}
                  <strong>
                    ₹
                    {formatMoney(
                      selectedAdvance
                        .outstanding_amount,
                    )}
                  </strong>
                  <br />
                  Monthly recovery:{" "}
                  <strong>
                    ₹
                    {formatMoney(
                      selectedAdvance
                        .monthly_recovery_amount,
                    )}
                  </strong>
                </div>
              ) : null}
            </>
          )}

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
              disabled={
                saving ||
                availableAdvances.length ===
                  0
              }
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}

              Add Recovery
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

const inputClass =
  "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";