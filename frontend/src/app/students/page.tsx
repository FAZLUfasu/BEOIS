import {
  StudentsWorkspace,
} from "@/components/students/students-workspace";

import {
  AppShell,
} from "@/components/layout/app-shell";

export default function StudentsPage() {
  return (
    <AppShell>
      <StudentsWorkspace />
    </AppShell>
  );
}