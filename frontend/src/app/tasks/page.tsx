"use client";

import { Suspense } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { TasksWorkspace } from "@/components/tasks/tasks-workspace";

function TasksLoadingFallback() {
  return (
    <div className="flex min-h-[420px] items-center justify-center text-sm font-medium text-slate-500">
      Loading tasks...
    </div>
  );
}

export default function TasksPage() {
  return (
    <AppShell>
      <Suspense fallback={<TasksLoadingFallback />}>
        <TasksWorkspace />
      </Suspense>
    </AppShell>
  );
}
