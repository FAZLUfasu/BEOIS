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
  addSalaryStructureComponent,
} from "@/lib/api/payroll";

import type {
  EmployeeSalaryStructure,
  SalaryComponent,
} from "@/types/payroll";


interface Props {
  open: boolean;
  structure: EmployeeSalaryStructure | null;
  salaryComponents: SalaryComponent[];
  onClose: () => void;
  onSaved: (
    structure: EmployeeSalaryStructure,
  ) => void;
}


const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";


export function SalaryStructureComponentDialog({
  open,
  structure,
  salaryComponents,
  onClose,
  onSaved,
}: Props) {
  const [component, setComponent] =
    useState("");

  const [amount, setAmount] =
    useState("0");

  const [
    percentage,
    setPercentage,
  ] = useState("0");

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [error, setError] =
    useState("");


  const available = useMemo(() => {
    const existing =
      new Set(
        structure?.components.map(
          (item) => item.component,
        ) ?? [],
      );

    return salaryComponents.filter(
      (item) =>
        item.is_active &&
        !existing.has(item.id),
    );
  }, [
    structure,
    salaryComponents,
  ]);


  const selected =
    available.find(
      (item) =>
        item.id === component,
    ) ?? null;


  useEffect(() => {
    if (!open) {
      return;
    }

    setComponent("");
    setAmount("0");
    setPercentage("0");
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


  if (!open || !structure) {
    return null;
  }


  const activeStructure = structure;


  async function submit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!component) {
      setError(
        "Select a salary component.",
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const saved =
        await addSalaryStructureComponent(
          activeStructure.id,
          {
            component,
            amount:
              selected?.calculation_type ===
              "FIXED"
                ? amount
                : 0,
            percentage:
              selected?.calculation_type ===
              "PERCENTAGE"
                ? percentage
                : 0,
          },
        );

      onSaved(saved);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to add component.",
      );
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/50 p-4">
      <div className="flex min-h-full items-center justify-center">
        <form
          onSubmit={submit}
          className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Add Salary Component
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {activeStructure.employee_id} —{" "}
                {activeStructure.employee_name}
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

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Component
              </span>

              <select
                value={component}
                onChange={(event) =>
                  setComponent(
                    event.target.value,
                  )
                }
                className={inputClass}
              >
                <option value="">
                  Select component
                </option>

                {available.map(
                  (item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name} (
                      {item.code})
                    </option>
                  ),
                )}
              </select>
            </label>


            {selected?.calculation_type ===
            "PERCENTAGE" ? (
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Percentage
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={percentage}
                  onChange={(event) =>
                    setPercentage(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </label>
            ) : (
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Amount
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) =>
                    setAmount(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </label>
            )}
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
              disabled={
                saving ||
                !component
              }
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}

              Add Component
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}