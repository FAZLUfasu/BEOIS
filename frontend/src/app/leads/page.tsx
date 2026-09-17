import { AppShell } from "@/components/layout/app-shell";
import { LeadsWorkspace } from "@/components/leads/leads-workspace";

export default function LeadsPage() {
  return (
    <AppShell>
      <LeadsWorkspace />
    </AppShell>
  );
}