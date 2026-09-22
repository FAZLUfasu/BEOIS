"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Wallet,
} from "lucide-react";

import {
  getEmployees,
} from "@/lib/api/employees";

import {
  getSalaryComponents,
  getSalaryStructures,
} from "@/lib/api/payroll";

import {
  SalaryStructureDialog,
} from "@/components/hr/salary-structure-dialog";

import {
  SalaryStructureComponentDialog,
} from "@/components/hr/salary-structure-component-dialog";

import type {
  EmployeeListItem,
} from "@/types/employees";

import type {
  EmployeeSalaryStructure,
  SalaryComponent,
} from "@/types/payroll";


function money(value: string) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return value;
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    },
  ).format(number);
}


export function SalaryStructuresPanel() {
  const [
    structures,
    setStructures,
  ] = useState<
    EmployeeSalaryStructure[]
  >([]);

  const [
    employees,
    setEmployees,
  ] = useState<EmployeeListItem[]>([]);

  const [
    components,
    setComponents,
  ] = useState<SalaryComponent[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    createOpen,
    setCreateOpen,
  ] = useState(false);

  const [
    selected,
    setSelected,
  ] = useState<
    EmployeeSalaryStructure | null
  >(null);

  const [
    addComponentOpen,
    setAddComponentOpen,
  ] = useState(false);


  const load = useCallback(
    async (background = false) => {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const [
          structureData,
          employeeData,
          componentData,
        ] = await Promise.all([
          getSalaryStructures(),
          getEmployees(),
          getSalaryComponents(),
        ]);

        setStructures(
          structureData,
        );

        setEmployees(
          [...employeeData].sort(
            (a, b) =>
              a.employee_id.localeCompare(
                b.employee_id,
              ),
          ),
        );

        setComponents(
          componentData,
        );
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load salary structures.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );


  useEffect(() => {
    void load();
  }, [load]);


  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-950">
              Employee Salary Structures
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Configure effective salary
              structures and attach earning
              or deduction components.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                void load(true)
              }
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={() =>
                setCreateOpen(true)
              }
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              New Structure
            </button>
          </div>
        </div>


        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}


        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          ) : structures.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
              <Wallet className="mb-3 h-10 w-10 text-slate-300" />

              <h4 className="font-semibold text-slate-800">
                No salary structures
              </h4>

              <p className="mt-1 text-sm text-slate-500">
                Create the first employee
                salary structure.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3">
                      Employee
                    </th>
                    <th className="px-5 py-3">
                      Structure
                    </th>
                    <th className="px-5 py-3">
                      Base Salary
                    </th>
                    <th className="px-5 py-3">
                      Effective
                    </th>
                    <th className="px-5 py-3">
                      Components
                    </th>
                    <th className="px-5 py-3">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {structures.map(
                    (structure) => (
                      <tr
                        key={
                          structure.id
                        }
                        className="border-t border-slate-100"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {structure.employee_name ||
                              "Unnamed Employee"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {
                              structure.employee_id
                            }
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {structure.name}
                        </td>

                        <td className="px-5 py-4 font-semibold text-slate-900">
                          {money(
                            structure.base_salary,
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {structure.effective_from}

                          {structure.effective_to
                            ? ` → ${structure.effective_to}`
                            : " → Current"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {
                            structure
                              .components
                              .length
                          }
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={[
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                              structure.is_active
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : "bg-slate-100 text-slate-600 ring-slate-200",
                            ].join(" ")}
                          >
                            {structure.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setSelected(
                                structure,
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>


      <SalaryStructureDialog
        open={createOpen}
        employees={employees}
        onClose={() =>
          setCreateOpen(false)
        }
        onSaved={() => {
          setCreateOpen(false);
          void load(true);
        }}
      />


      {selected ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center">
            <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-200 p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    {
                      selected.employee_id
                    }
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-950">
                    {selected.employee_name ||
                      "Unnamed Employee"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {selected.name} · Base{" "}
                    {money(
                      selected.base_salary,
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSelected(null)
                  }
                  className="text-sm font-semibold text-slate-500"
                >
                  Close
                </button>
              </div>

              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Salary Components
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Earnings and
                      deductions attached
                      to this structure.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setAddComponentOpen(
                        true,
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2.5 text-sm font-semibold text-white"
                  >
                    <Plus className="h-4 w-4" />
                    Add Component
                  </button>
                </div>

                {selected.components
                  .length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                    No components have been
                    added yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selected.components.map(
                      (item) => (
                        <div
                          key={item.id}
                          className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">
                              {
                                item.component_name
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {
                                item.component_code
                              }{" "}
                              ·{" "}
                              {
                                item.component_type
                              }{" "}
                              ·{" "}
                              {
                                item.calculation_type
                              }
                            </p>
                          </div>

                          <p className="font-bold text-slate-900">
                            {item.calculation_type ===
                            "PERCENTAGE"
                              ? `${item.percentage}%`
                              : money(
                                  item.amount,
                                )}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}


      <SalaryStructureComponentDialog
        open={addComponentOpen}
        structure={selected}
        salaryComponents={components}
        onClose={() =>
          setAddComponentOpen(false)
        }
        onSaved={(saved) => {
          setAddComponentOpen(false);
          setSelected(saved);

          setStructures(
            (current) =>
              current.map(
                (item) =>
                  item.id === saved.id
                    ? saved
                    : item,
              ),
          );
        }}
      />
    </>
  );
}