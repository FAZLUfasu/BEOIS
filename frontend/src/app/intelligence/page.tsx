"use client";

import { AppShell } from "@/components/layout/app-shell";
import { IntelligenceDashboard } from "@/components/dashboard/intelligence-dashboard";
import { useAuth } from "@/lib/auth/auth-context";

const MANAGEMENT_ROLES = [
  "SUPER_ADMIN",
  "FULL_ACCESS",
  "CHAIRMAN",
  "GENERAL_MANAGER",
];

export default function IntelligencePage() {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[420px] items-center justify-center">
          <div className="text-sm text-slate-500">
            Checking intelligence access...
          </div>
        </div>
      </AppShell>
    );
  }

  const allowed =
    Boolean(user?.is_superuser) ||
    hasRole(...MANAGEMENT_ROLES);

  if (!allowed) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="font-bold text-red-800">
            Access denied
          </div>
          <p className="mt-2 text-sm leading-6 text-red-700">
            Reporting &amp; Intelligence is restricted to authorized management users.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <IntelligenceDashboard />
    </AppShell>
  );
}
