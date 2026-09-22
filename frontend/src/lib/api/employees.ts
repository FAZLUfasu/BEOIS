import { apiRequest } from "@/lib/api/client";

import type {
  EmployeeListItem,
  EmployeePayload,
} from "@/types/employees";

import type {
  EmployeeFilters,
} from "@/types/hr";


function queryString(
  params: Record<
    string,
    string | undefined
  >,
) {
  const searchParams =
    new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      if (value) {
        searchParams.set(
          key,
          value,
        );
      }
    },
  );

  const query =
    searchParams.toString();

  return query
    ? `?${query}`
    : "";
}


export async function getEmployees(
  filters: EmployeeFilters = {},
) {
  return apiRequest<
    EmployeeListItem[]
  >(
    `/hr/employees/${queryString({
      search: filters.search,
      branch: filters.branch,
      department:
        filters.department,
      employment_type:
        filters.employment_type,
      employment_status:
        filters.employment_status,
    })}`,
  );
}


export async function getEmployee(
  employeeId: string,
) {
  return apiRequest<
    EmployeeListItem
  >(
    `/hr/employees/${employeeId}/`,
  );
}


export async function createEmployee(
  payload: EmployeePayload,
) {
  return apiRequest<
    EmployeeListItem
  >(
    "/hr/employees/",
    {
      method: "POST",
      body: JSON.stringify(
        payload,
      ),
    },
  );
}


export async function updateEmployee(
  employeeId: string,
  payload: Partial<EmployeePayload>,
) {
  return apiRequest<
    EmployeeListItem
  >(
    `/hr/employees/${employeeId}/`,
    {
      method: "PATCH",
      body: JSON.stringify(
        payload,
      ),
    },
  );
}


/*
 * Used by Partner Network and other
 * operational modules.
 *
 * Keep this function compatible with
 * existing callers.
 */
export async function getAssignableEmployees() {
  const employees =
    await apiRequest<
      EmployeeListItem[]
    >(
      "/hr/employees/",
    );

  return employees
    .filter(
      (employee) =>
        employee.employment_status ===
          "ACTIVE" &&
        Boolean(employee.user),
    )
    .sort((a, b) =>
      a.employee_name.localeCompare(
        b.employee_name,
      ),
    );
}