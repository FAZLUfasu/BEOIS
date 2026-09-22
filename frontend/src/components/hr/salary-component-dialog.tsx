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
  createSalaryComponent,
  updateSalaryComponent,
} from "@/lib/api/payroll";

import type {
  SalaryCalculationType,
  SalaryComponent,
  SalaryComponentPayload,
  SalaryComponentType,
} from "@/types/payroll";


interface Props {
  open: boolean;
  component: SalaryComponent | null;
  onClose: () => void;
  onSaved: (component: SalaryComponent) => void;
}


const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";


function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to save salary component.";
}


export function SalaryComponentDialog({
  open,
  component,
  onClose,
  onSaved,
}: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const [
    componentType,
    setComponentType,
  ] = useState<SalaryComponentType>(
    "EARNING",
  );

  const [
    calculationType,
    setCalculationType,
  ] = useState<SalaryCalculationType>(
    "FIXED",
  );

  const [
    isTaxable,
    setIsTaxable,
  ] = useState(false);

  const [
    affectsGrossSalary,
    setAffectsGrossSalary,
  ] = useState(true);

  const [
    isActive,
    setIsActive,
  ] = useState(true);

  const [
    description,
    setDescription,
  ] = useState("");

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

    setName(component?.name ?? "");
    setCode(component?.code ?? "");

    setComponentType(
      component?.component_type ??
        "EARNING",
    );

    setCalculationType(
      component?.calculation_type ??
        "FIXED",
    );

    setIsTaxable(
      component?.is_taxable ?? false,
    );

    setAffectsGrossSalary(
      component?.affects_gross_salary ??
        true,
    );

    setIsActive(
      component?.is_active ?? true,
    );

    setDescription(
      component?.description ?? "",
    );

    setError("");
  }, [open, component]);


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
      !name.trim() ||
      !code.trim()
    ) {
      setError(
        "Name and code are required.",
      );
      return;
    }

    setSaving(true);
    setError("");

    const payload: SalaryComponentPayload =
      {
        name: name.trim(),
        code: code
          .trim()
          .toUpperCase(),
        component_type:
          componentType,
        calculation_type:
          calculationType,
        is_taxable: isTaxable,
        affects_gross_salary:
          affectsGrossSalary,
        description:
          description.trim(),
        is_active: isActive,
      };

    try {
      const saved = component
        ? await updateSalaryComponent(
            component.id,
            payload,
          )
        : await createSalaryComponent(
            payload,
          );

      onSaved(saved);
    } catch (requestError) {
      setError(
        getErrorMessage(requestError),
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
                {component
                  ? "Edit Salary Component"
                  : "New Salary Component"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Configure an earning or
                deduction used in employee
                salary structures.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>


          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}


            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Component Name">
                <input
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="Basic Salary"
                />
              </Field>

              <Field label="Code">
                <input
                  value={code}
                  onChange={(event) =>
                    setCode(
                      event.target.value
                        .toUpperCase(),
                    )
                  }
                  className={inputClass}
                  placeholder="BASIC"
                />
              </Field>

              <Field label="Component Type">
                <select
                  value={componentType}
                  onChange={(event) =>
                    setComponentType(
                      event.target
                        .value as SalaryComponentType,
                    )
                  }
                  className={inputClass}
                >
                  <option value="EARNING">
                    Earning
                  </option>
                  <option value="DEDUCTION">
                    Deduction
                  </option>
                </select>
              </Field>

              <Field label="Calculation Type">
                <select
                  value={calculationType}
                  onChange={(event) =>
                    setCalculationType(
                      event.target
                        .value as SalaryCalculationType,
                    )
                  }
                  className={inputClass}
                >
                  <option value="FIXED">
                    Fixed Amount
                  </option>
                  <option value="PERCENTAGE">
                    Percentage
                  </option>
                </select>
              </Field>
            </div>


            <Field label="Description">
              <textarea
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value,
                  )
                }
                rows={3}
                className={inputClass}
                placeholder="Optional description..."
              />
            </Field>


            <div className="grid gap-3 md:grid-cols-3">
              <Toggle
                label="Taxable"
                checked={isTaxable}
                onChange={setIsTaxable}
              />

              <Toggle
                label="Affects Gross Salary"
                checked={
                  affectsGrossSalary
                }
                onChange={
                  setAffectsGrossSalary
                }
              />

              <Toggle
                label="Active"
                checked={isActive}
                onChange={setIsActive}
              />
            </div>
          </div>


          <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}

              {component
                ? "Save Changes"
                : "Create Component"}
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


function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm font-semibold text-slate-700">
        {label}
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked,
          )
        }
        className="h-4 w-4 rounded border-slate-300"
      />
    </label>
  );
}