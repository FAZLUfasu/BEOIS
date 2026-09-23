"use client";

import { AppShell } from "@/components/layout/app-shell";
import { UserManagementWorkspace } from "@/components/settings/user-management-workspace";
import { useAuth } from "@/lib/auth/auth-context";

export default function UserManagementPage() {
  const {
    user,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[420px] items-center justify-center">
          <div className="text-sm text-slate-500">
            Loading user management...
          </div>
        </div>
      </AppShell>
    );
  }

  if (!user?.is_superuser) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="font-bold text-red-800">
            Access denied
          </div>

          <p className="mt-2 text-sm leading-6 text-red-700">
            User Management is restricted to the
            BEOIS Super Administrator.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <UserManagementWorkspace />
    </AppShell>
  );
}