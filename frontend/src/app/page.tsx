"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ExecutiveDashboard } from "@/components/dashboard/executive-dashboard";
import { TelecallingDashboard } from "@/components/dashboard/telecalling-dashboard";
import { useAuth } from "@/lib/auth/auth-context";

export default function HomePage() {
  const {
    user,
    loading,
    hasRole,
  } = useAuth();

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[360px] items-center justify-center">
          <div className="text-sm font-medium text-slate-500">
            Loading dashboard...
          </div>
        </div>
      </AppShell>
    );
  }

  const isFullAccess =
    Boolean(user?.is_superuser) ||
    hasRole("FULL_ACCESS");

  const isTelecaller =
    !isFullAccess &&
    hasRole("TELECALLER");

  return (
    <AppShell>
      {isTelecaller ? (
        <TelecallingDashboard />
      ) : (
        <ExecutiveDashboard />
      )}
    </AppShell>
  );
}
