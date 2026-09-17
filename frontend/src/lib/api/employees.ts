import { apiRequest } from "@/lib/api/client";

import type {
  EmployeeListItem,
} from "@/types/employees";

export async function getAssignableEmployees() {
  const employees =
    await apiRequest<EmployeeListItem[]>(
      "/hr/employees/",
    );

  return employees
    .filter(
      (employee) =>
        employee.employment_status === "ACTIVE" &&
        Boolean(employee.user),
    )
    .sort((a, b) =>
      a.employee_name.localeCompare(
        b.employee_name,
      ),
    );
}