import { IntelligenceDashboard } from "@/components/dashboard/intelligence-dashboard";
import { AppShell } from "@/components/layout/app-shell";

export default function IntelligencePage() {
  return (
    <AppShell>
      <IntelligenceDashboard />
    </AppShell>
  );
}