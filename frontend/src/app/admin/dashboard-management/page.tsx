"use client";

import { AppShell } from "@/components/layout/app-shell";
import { DashboardManagementWorkspace } from "@/components/dashboard/dashboard-management-workspace";
import { useAuth } from "@/lib/auth/auth-context";

export default function DashboardManagementPage() {
  const { user, loading } = useAuth();
  return (
    <AppShell>
      {loading ? (
        <div className="p-8 text-sm text-slate-500">Checking access...</div>
      ) : !user?.is_superuser ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800" role="alert">
          Dashboard Management is restricted to Django superusers.
        </div>
      ) : (
        <DashboardManagementWorkspace />
      )}
    </AppShell>
  );
}
