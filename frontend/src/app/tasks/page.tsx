"use client";

import { AppShell } from "@/components/layout/app-shell";
import { TasksWorkspace } from "@/components/tasks/tasks-workspace";

export default function TasksPage() {
  return (
    <AppShell>
      <TasksWorkspace />
    </AppShell>
  );
}