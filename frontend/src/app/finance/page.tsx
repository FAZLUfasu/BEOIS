import { AppShell } from "@/components/layout/app-shell";
import { FinanceWorkspace } from "@/components/finance/finance-workspace";

export default function FinancePage() {
  return (
    <AppShell>
      <FinanceWorkspace />
    </AppShell>
  );
}
