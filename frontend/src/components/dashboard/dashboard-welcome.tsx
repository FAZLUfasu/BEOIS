"use client";

import { useAuth } from "@/lib/auth/auth-context";

function getGreeting() {
  const hour =
    new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

export function DashboardWelcome() {
  const {
    user,
  } = useAuth();

  const displayName =
    user?.first_name ||
    user?.full_name ||
    user?.username ||
    "User";

  return (
    <div>
      <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--brand)]">
        Management Dashboard
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
        {getGreeting()}, {displayName}
      </h1>

      <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
        Here&apos;s the operational view of
        BEST College across admissions,
        students, partners and finance.
      </p>
    </div>
  );
}