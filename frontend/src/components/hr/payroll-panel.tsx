"use client";

import {
  useState,
} from "react";

import {
  Banknote,
  CalendarDays,
  Calculator,
  SlidersHorizontal,
  WalletCards,
} from "lucide-react";

import {
  PayrollPeriodsPanel,
} from "@/components/hr/payroll-periods-panel";

import {
  PayrollProcessingPanel,
} from "@/components/hr/payroll-processing-panel";

import {
  SalaryAdvancesPanel,
} from "@/components/hr/salary-advances-panel";

import {
  SalaryComponentsPanel,
} from "@/components/hr/salary-components-panel";

import {
  SalaryStructuresPanel,
} from "@/components/hr/salary-structures-panel";

type PayrollView =
  | "PROCESSING"
  | "STRUCTURES"
  | "COMPONENTS"
  | "ADVANCES"
  | "PERIODS";

const tabs: Array<{
  value: PayrollView;
  label: string;
  icon: React.ElementType;
}> = [
  {
    value: "PROCESSING",
    label: "Payroll Processing",
    icon: Calculator,
  },
  {
    value: "STRUCTURES",
    label: "Salary Structures",
    icon: WalletCards,
  },
  {
    value: "COMPONENTS",
    label: "Salary Components",
    icon: SlidersHorizontal,
  },
  {
    value: "ADVANCES",
    label: "Salary Advances",
    icon: Banknote,
  },
  {
    value: "PERIODS",
    label: "Payroll Periods",
    icon: CalendarDays,
  },
];

export function PayrollPanel() {
  const [view, setView] =
    useState<PayrollView>(
      "PROCESSING",
    );

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
          HR & Payroll
        </p>

        <h2 className="mt-1 text-xl font-bold text-slate-950">
          Salary & Payroll
        </h2>

        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Process monthly payroll, configure salary structures, manage salary components, employee advances and payroll periods.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl bg-slate-100 p-1.5">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active =
              view === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() =>
                  setView(tab.value)
                }
                className={[
                  "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition",
                  active
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-950",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {view === "PROCESSING" ? (
        <PayrollProcessingPanel />
      ) : null}

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