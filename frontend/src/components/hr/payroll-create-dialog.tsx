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
  createPayroll,
} from "@/lib/api/payroll";

import type {
  EmployeeListItem,
} from "@/types/employees";

import type {
  Payroll,
  PayrollPeriod,
} from "@/types/payroll";

interface Props {
  open: boolean;
  employees: EmployeeListItem[];
  periods: PayrollPeriod[];
  onClose: () => void;
  onSaved: (payroll: Payroll) => void;
}

export function PayrollCreateDialog({
  open,
  employees,
  periods,
  onClose,
  onSaved,
}: Props) {
  const [employee, setEmployee] =
    useState("");

  const [period, setPeriod] =
    useState("");

  const [payableDays, setPayableDays] =
    useState("");

  const [lopDays, setLopDays] =
    useState("0");

  const [notes, setNotes] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const openPeriods = useMemo(
    () =>
      periods.filter(
        (item) =>
          item.status !== "CLOSED",
      ),
    [periods],
  );

  const selectedPeriod = useMemo(
    () =>
      openPeriods.find(
        (item) => item.id === period,
      ) ?? null,
    [openPeriods, period],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setEmployee("");
    setPeriod(
      openPeriods[0]?.id ?? "",
    );
    setPayableDays("");
    setLopDays("0");
    setNotes("");
    setError("");
  }, [open, openPeriods]);

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

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!employee || !period) {
      setError(
        "Employee and payroll period are required.",
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const saved = await createPayroll({
        employee,
        period,
        payable_days:
          payableDays.trim()
            ? payableDays
            : undefined,
        lop_days:
          lopDays.trim()
            ? lopDays
            : 0,
        notes: notes.trim(),
      });

      onSaved(saved);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create payroll.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              Payroll Processing
            </p>

            <h3 className="mt-1 text-xl font-bold text-slate-950">
              Create Employee Payroll
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Create the monthly payroll draft before calculation.
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

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Employee">
              <select
                required
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

                {employees.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {employeeLabel(item)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Payroll Period">
              <select
                required
                value={period}
                onChange={(event) =>
                  setPeriod(
                    event.target.value,
                  )
                }
                className={inputClass}
              >
                <option value="">
                  Select period
                </option>

                {openPeriods.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {formatPeriod(item)}
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field label="Payable Days">
              <input
                type="number"
                min="0"
                step="0.5"
                value={payableDays}
                onChange={(event) =>
                  setPayableDays(
                    event.target.value,
                  )
                }
                placeholder={
                  selectedPeriod
                    ? "Automatic if blank"
                    : "Payable days"
                }
                className={inputClass}
              />

              <p className="mt-1 text-xs text-slate-400">
                Leave blank to let the backend use calendar days minus LOP.
              </p>
            </Field>

            <Field label="LOP Days">
              <input
                type="number"
                min="0"
                step="0.5"
                value={lopDays}
                onChange={(event) =>
                  setLopDays(
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              rows={3}
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value,
                )
              }
              placeholder="Optional payroll notes"
              className={inputClass}
            />
          </Field>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
            Payroll is initially created as a draft. Salary components and LOP deductions are generated when you calculate it.
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
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}

              Create Payroll
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

function employeeLabel(
  employee: EmployeeListItem,
) {
  const record =
    employee as EmployeeListItem & {
      employee_name?: string;
      name?: string;
      employee_id?: string;
    };

  const name =
    record.employee_name ||
    record.name ||
    "Unnamed employee";

  return record.employee_id
    ? `${record.employee_id} — ${name}`
    : name;
}

function formatPeriod(
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

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";