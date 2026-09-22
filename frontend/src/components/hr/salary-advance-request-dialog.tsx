"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Banknote,
  Loader2,
  X,
} from "lucide-react";

import {
  requestSalaryAdvance,
} from "@/lib/api/payroll";

import type {
  EmployeeListItem,
} from "@/types/employees";

import type {
  SalaryAdvance,
} from "@/types/payroll";


interface Props {
  open: boolean;
  employees: EmployeeListItem[];
  onClose: () => void;
  onSaved: (
    advance: SalaryAdvance,
  ) => void;
}


const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";


export function SalaryAdvanceRequestDialog({
  open,
  employees,
  onClose,
  onSaved,
}: Props) {
  const [employee, setEmployee] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [reason, setReason] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");


  useEffect(() => {
    if (!open) {
      return;
    }

    setEmployee("");
    setAmount("");
    setReason("");
    setError("");
  }, [open]);


  useEffect(() => {
    if (!open) {
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
  }, [open]);


  if (!open) {
    return null;
  }


  async function submit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!employee) {
      setError(
        "Select an employee.",
      );
      return;
    }

    const numericAmount =
      Number(amount);

    if (
      !amount ||
      Number.isNaN(numericAmount) ||
      numericAmount <= 0
    ) {
      setError(
        "Enter a valid advance amount.",
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const saved =
        await requestSalaryAdvance({
          employee,
          amount,
          reason: reason.trim(),
        });

      onSaved(saved);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to request salary advance.",
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
          className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-blue-600" />

                <h2 className="text-lg font-bold text-slate-950">
                  New Salary Advance
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Record a new employee salary advance request.
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


            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Employee *
              </span>

              <select
                value={employee}
                onChange={(event) =>
                  setEmployee(
                    event.target.value,
                  )
                }
                className={inputClass}
              >
                <option value="">
                  Select employee
                </option>

                {employees
                  .filter(
                    (item) =>
                      item.employment_status ===
                      "ACTIVE",
                  )
                  .map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.employee_id} —{" "}
                      {item.employee_name ||
                        "Unnamed employee"}
                    </option>
                  ))}
              </select>
            </label>


            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Requested Amount *
              </span>

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
                placeholder="Example: 10000"
                className={inputClass}
              />
            </label>


            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Reason
              </span>

              <textarea
                value={reason}
                onChange={(event) =>
                  setReason(
                    event.target.value,
                  )
                }
                rows={4}
                placeholder="Reason for salary advance"
                className={inputClass}
              />
            </label>
          </div>


          <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}

              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}