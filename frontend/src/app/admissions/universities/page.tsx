import {
  AppShell,
} from "@/components/layout/app-shell";

import {
  UniversitiesWorkspace,
} from "@/components/admissions/universities-workspace";

export default function UniversitiesPage() {
  return (
    <AppShell>
      <UniversitiesWorkspace />
    </AppShell>
  );
}
