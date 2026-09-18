import {
  AdmissionsWorkspace,
} from "@/components/admissions/admissions-workspace";
import {
  AppShell,
} from "@/components/layout/app-shell";

export default function AdmissionsPage() {
  return (
    <AppShell>
      <AdmissionsWorkspace />
    </AppShell>
  );
}