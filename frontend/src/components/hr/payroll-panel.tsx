"use client";

import {
  useState,
} from "react";

import {
  PayrollPeriodsPanel,
} from "@/components/hr/payroll-periods-panel";

import {
  SalaryAdvancesPanel,
} from "@/components/hr/salary-advances-panel";

import {
  SlidersHorizontal,
  WalletCards,
} from "lucide-react";

import {
  SalaryComponentsPanel,
} from "@/components/hr/salary-components-panel";

import {
  SalaryStructuresPanel,
} from "@/components/hr/salary-structures-panel";


type PayrollView =
  | "STRUCTURES"
  | "COMPONENTS"
  | "ADVANCES"
  | "PERIODS";


export function PayrollPanel() {
  const [
    view,
    setView,
  ] = useState<PayrollView>(
    "STRUCTURES",
  );

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
          Payroll Configuration
        </p>

        <h2 className="mt-1 text-xl font-bold text-slate-950">
          Salary & Payroll
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Configure employee salary
          structures and reusable payroll
          components.
        </p>
      </div>


      <div className="overflow-x-auto rounded-xl bg-slate-100 p-1.5">
        <div className="flex min-w-max gap-1">
          <button
            type="button"
            onClick={() =>
              setView("STRUCTURES")
            }
            className={[
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition",
              view === "STRUCTURES"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600 hover:text-slate-950",
            ].join(" ")}
          >
            <WalletCards className="h-4 w-4" />
            Salary Structures
          </button>
            <button
                type="button"
                onClick={() =>
                    setView("ADVANCES")
                }
                className={[
                    "rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                    view === "ADVANCES"
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                ].join(" ")}
                >
                Salary Advances
            </button>
                <button
                    type="button"
                    onClick={() =>
                        setView("PERIODS")
                    }
                    className={[
                        "rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                        view === "PERIODS"
                        ? "bg-slate-950 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                    ].join(" ")}
                    >
                    Payroll Periods
                </button>

            <button
                type="button"
                onClick={() =>
                setView("COMPONENTS")
                }
                className={[
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition",
                view === "COMPONENTS"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:text-slate-950",
                ].join(" ")}
            >
                <SlidersHorizontal className="h-4 w-4" />
                Salary Components
            </button>
            </div>
        </div>


        {view === "STRUCTURES" ? (
                <SalaryStructuresPanel />
                ) : null}

                {view === "COMPONENTS" ? (
                <SalaryComponentsPanel />
                ) : null}

                {view === "ADVANCES" ? (
                <SalaryAdvancesPanel />
                ) : null}

                {view === "PERIODS" ? (
                <PayrollPeriodsPanel />
                ) : null}
        </section>
    );
    }