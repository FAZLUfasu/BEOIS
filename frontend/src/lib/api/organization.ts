import { apiRequest } from "@/lib/api/client";

import type {
  Branch,
  BusinessUnit,
  Department,
  Trust,
} from "@/types/organization";


type Payload = Record<string, unknown>;


function buildQuery(
  params: Record<
    string,
    string | boolean | undefined
  >,
) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== ""
      ) {
        searchParams.set(
          key,
          String(value),
        );
      }
    },
  );

  const query = searchParams.toString();

  return query ? `?${query}` : "";
}


// ============================================================
// TRUSTS
// ============================================================

export function getTrusts(
  options: {
    active?: boolean;
    search?: string;
  } = {},
) {
  const query = buildQuery({
    active: options.active,
    search: options.search,
  });

  return apiRequest<Trust[]>(
    `/organization/trusts/${query}`,
  );
}


export function createTrust(
  payload: Payload,
) {
  return apiRequest<Trust>(
    "/organization/trusts/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export function updateTrust(
  id: string,
  payload: Payload,
) {
  return apiRequest<Trust>(
    `/organization/trusts/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}


export function deleteTrust(
  id: string,
) {
  return apiRequest<void>(
    `/organization/trusts/${id}/`,
    {
      method: "DELETE",
    },
  );
}


// ============================================================
// BUSINESS UNITS
// ============================================================

export function getBusinessUnits(
  options: {
    trust?: string;
    active?: boolean;
    search?: string;
  } = {},
) {
  const query = buildQuery({
    trust: options.trust,
    active: options.active,
    search: options.search,
  });

  return apiRequest<BusinessUnit[]>(
    `/organization/business-units/${query}`,
  );
}


export function createBusinessUnit(
  payload: Payload,
) {
  return apiRequest<BusinessUnit>(
    "/organization/business-units/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export function updateBusinessUnit(
  id: string,
  payload: Payload,
) {
  return apiRequest<BusinessUnit>(
    `/organization/business-units/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}


export function deleteBusinessUnit(
  id: string,
) {
  return apiRequest<void>(
    `/organization/business-units/${id}/`,
    {
      method: "DELETE",
    },
  );
}


// ============================================================
// BRANCHES
// ============================================================

export function getBranches(
  options: {
    business_unit?: string;
    trust?: string;
    active?: boolean;
    search?: string;
  } = {},
) {
  const query = buildQuery({
    business_unit:
      options.business_unit,
    trust: options.trust,
    active: options.active,
    search: options.search,
  });

  return apiRequest<Branch[]>(
    `/organization/branches/${query}`,
  );
}


export function createBranch(
  payload: Payload,
) {
  return apiRequest<Branch>(
    "/organization/branches/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export function updateBranch(
  id: string,
  payload: Payload,
) {
  return apiRequest<Branch>(
    `/organization/branches/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}


export function deleteBranch(
  id: string,
) {
  return apiRequest<void>(
    `/organization/branches/${id}/`,
    {
      method: "DELETE",
    },
  );
}


// ============================================================
// DEPARTMENTS
// ============================================================

export function getDepartments(
  options: {
    branch?: string;
    business_unit?: string;
    active?: boolean;
    shared?: boolean;
    search?: string;
  } = {},
) {
  const query = buildQuery({
    branch: options.branch,
    business_unit:
      options.business_unit,
    active: options.active,
    shared: options.shared,
    search: options.search,
  });

  return apiRequest<Department[]>(
    `/organization/departments/${query}`,
  );
}


export function createDepartment(
  payload: Payload,
) {
  return apiRequest<Department>(
    "/organization/departments/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export function updateDepartment(
  id: string,
  payload: Payload,
) {
  return apiRequest<Department>(
    `/organization/departments/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}


export function deleteDepartment(
  id: string,
) {
  return apiRequest<void>(
    `/organization/departments/${id}/`,
    {
      method: "DELETE",
    },
  );
}


// ============================================================
// HR COMPATIBILITY
// ============================================================

export async function getEmployeeDepartments(
  branchId: string,
) {
  const [
    branchDepartments,
    sharedDepartments,
  ] = await Promise.all([
    getDepartments({
      branch: branchId,
      active: true,
    }),

    getDepartments({
      shared: true,
      active: true,
    }),
  ]);

  const unique = new Map<
    string,
    Department
  >();

  [
    ...branchDepartments,
    ...sharedDepartments,
  ].forEach((department) => {
    unique.set(
      department.id,
      department,
    );
  });

  return Array.from(
    unique.values(),
  ).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}