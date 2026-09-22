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
  createSalaryStructure,
} from "@/lib/api/payroll";

import type {
  EmployeeListItem,
} from "@/types/employees";

import type {
  EmployeeSalaryStructure,
} from "@/types/payroll";


interface Props {
  open: boolean;
  employees: EmployeeListItem[];
  onClose: () => void;
  onSaved: (
    structure: EmployeeSalaryStructure,
  ) => void;
}


const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";


export function SalaryStructureDialog({
  open,
  employees,
  onClose,
  onSaved,
}: Props) {
  const [employee, setEmployee] =
    useState("");

  const [name, setName] =
    useState(
      "Standard Salary Structure",
    );

  const [
    effectiveFrom,
    setEffectiveFrom,
  ] = useState("");

  const [
    effectiveTo,
    setEffectiveTo,
  ] = useState("");

  const [
    baseSalary,
    setBaseSalary,
  ] = useState("");

  const [notes, setNotes] =
    useState("");

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [error, setError] =
    useState("");


  useEffect(() => {
    if (!open) {
      return;
    }

    setEmployee("");
    setName(
      "Standard Salary Structure",
    );

    setEffectiveFrom(
      new Date()
        .toISOString()
        .slice(0, 10),
    );

    setEffectiveTo("");
    setBaseSalary("");
    setNotes("");
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

    if (
      !employee ||
      !effectiveFrom ||
      !baseSalary
    ) {
      setError(
        "Employee, effective date and base salary are required.",
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const saved =
        await createSalaryStructure({
          employee,
          name:
            name.trim() ||
            "Standard Salary Structure",
          effective_from:
            effectiveFrom,
          effective_to:
            effectiveTo || null,
          base_salary:
            baseSalary,
          notes: notes.trim(),
        });

      onSaved(saved);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create salary structure.",
      );
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center">
        <form
          onSubmit={submit}
          className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                New Salary Structure
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Define the employee&apos;s
                base salary and effective
                period.
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


          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}

            <Field label="Employee">
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

                {employees.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.employee_id} —{" "}
                      {item.employee_name ||
                        "Unnamed Employee"}
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field label="Structure Name">
              <input
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Effective From">
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(event) =>
                    setEffectiveFrom(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </Field>

              <Field label="Effective To">
                <input
                  type="date"
                  value={effectiveTo}
                  onChange={(event) =>
                    setEffectiveTo(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Base Salary">
              <input
                type="number"
                min="0"
                step="0.01"
                value={baseSalary}
                onChange={(event) =>
                  setBaseSalary(
                    event.target.value,
                  )
                }
                className={inputClass}
                placeholder="30000.00"
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
                placeholder="Optional notes..."
              />
            </Field>
          </div>


          <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
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
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}

              Create Structure
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