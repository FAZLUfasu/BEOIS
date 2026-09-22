"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Calculator,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  WalletCards,
} from "lucide-react";

import {
  getSalaryComponents,
} from "@/lib/api/payroll";

import {
  SalaryComponentDialog,
} from "@/components/hr/salary-component-dialog";

import type {
  SalaryComponent,
} from "@/types/payroll";


function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to load salary components.";
}


export function SalaryComponentsPanel() {
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

  const [
    error,
    setError,
  ] = useState("");

  const [
    dialogOpen,
    setDialogOpen,
  ] = useState(false);

  const [
    editing,
    setEditing,
  ] = useState<SalaryComponent | null>(
    null,
  );


  const load = useCallback(
    async (background = false) => {
      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const data =
          await getSalaryComponents();

        setComponents(
          [...data].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        );
      } catch (requestError) {
        setError(
          errorMessage(requestError),
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


  const metrics = useMemo(
    () => ({
      total: components.length,

      earnings: components.filter(
        (item) =>
          item.component_type ===
          "EARNING",
      ).length,

      deductions: components.filter(
        (item) =>
          item.component_type ===
          "DEDUCTION",
      ).length,

      active: components.filter(
        (item) => item.is_active,
      ).length,
    }),
    [components],
  );


  function createNew() {
    setEditing(null);
    setDialogOpen(true);
  }


  function edit(
    component: SalaryComponent,
  ) {
    setEditing(component);
    setDialogOpen(true);
  }


  return (
    <>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-950">
              Salary Components
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Configure reusable earnings
              and deductions for employee
              salary structures.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                void load(true)
              }
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
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
              onClick={createNew}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              New Component
            </button>
          </div>
        </div>


        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Components"
            value={metrics.total}
          />

          <Metric
            label="Earnings"
            value={metrics.earnings}
          />

          <Metric
            label="Deductions"
            value={metrics.deductions}
          />

          <Metric
            label="Active"
            value={metrics.active}
          />
        </div>


        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}


        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          ) : components.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
              <WalletCards className="mb-3 h-9 w-9 text-slate-300" />

              <h4 className="font-semibold text-slate-800">
                No salary components
              </h4>

              <p className="mt-1 text-sm text-slate-500">
                Create your first earning
                or deduction component.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-5 py-3">
                      Component
                    </th>
                    <th className="px-5 py-3">
                      Type
                    </th>
                    <th className="px-5 py-3">
                      Calculation
                    </th>
                    <th className="px-5 py-3">
                      Taxable
                    </th>
                    <th className="px-5 py-3">
                      Gross
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
                  {components.map(
                    (component) => (
                      <tr
                        key={
                          component.id
                        }
                        className="border-t border-slate-100"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">
                            {
                              component.name
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {
                              component.code
                            }
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <Badge
                            positive={
                              component.component_type ===
                              "EARNING"
                            }
                          >
                            {
                              component.component_type
                            }
                          </Badge>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <Calculator className="h-4 w-4 text-slate-400" />
                            {component.calculation_type ===
                            "FIXED"
                              ? "Fixed Amount"
                              : "Percentage"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {component.is_taxable
                            ? "Yes"
                            : "No"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {component.affects_gross_salary
                            ? "Included"
                            : "Excluded"}
                        </td>

                        <td className="px-5 py-4">
                          <Badge
                            positive={
                              component.is_active
                            }
                          >
                            {component.is_active
                              ? "Active"
                              : "Inactive"}
                          </Badge>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              edit(
                                component,
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
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


      <SalaryComponentDialog
        open={dialogOpen}
        component={editing}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSaved={() => {
          setDialogOpen(false);
          setEditing(null);
          void load(true);
        }}
      />
    </>
  );
}


function Metric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}


function Badge({
  children,
  positive,
}: {
  children: React.ReactNode;
  positive: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        positive
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-slate-100 text-slate-600 ring-slate-200",
      ].join(" ")}
    >
      {children}
    </span>
  );
}