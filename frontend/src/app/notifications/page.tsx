"use client";

import { AppShell } from "@/components/layout/app-shell";
import { NotificationsWorkspace } from "@/components/notifications/notifications-workspace";


export default function NotificationsPage() {
  return (
    <AppShell>
      <NotificationsWorkspace />
    </AppShell>
  );
}