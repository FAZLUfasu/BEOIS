import type {
  LucideIcon,
} from "lucide-react";
import {
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";

import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  detail: string;
  change?: number;
  icon: LucideIcon;
}

export function StatCard({
  title,
  value,
  detail,
  change,
  icon: Icon,
}: StatCardProps) {
  const positive =
    change !== undefined && change >= 0;

  return (
    <div className="beois-card p-5">
      <div className="mb-5 flex items-start justify-between">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
          <Icon size={20} />
        </div>

        {change !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold",
              positive
                ? "bg-[var(--success-soft)] text-[var(--success)]"
                : "bg-[var(--danger-soft)] text-[var(--danger)]",
            )}
          >
            {positive ? (
              <ArrowUpRight size={13} />
            ) : (
              <ArrowDownRight size={13} />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>

      <div className="text-[12px] font-medium text-slate-500">
        {title}
      </div>

      <div className="mt-1.5 text-[27px] font-bold tracking-tight text-slate-900">
        {value}
      </div>

      <div className="mt-1 text-[11px] text-slate-400">
        {detail}
      </div>
    </div>
  );
}