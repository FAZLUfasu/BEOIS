import { ExecutiveDashboard } from "@/components/dashboard/executive-dashboard";
import { AppShell } from "@/components/layout/app-shell";

export default function HomePage() {
  return (
    <AppShell>
      <ExecutiveDashboard />
    </AppShell>
  );
}