import {
  apiRequest,
} from "@/lib/api/client";

import type {
  OrganizationBranch,
  OrganizationDepartment,
} from "@/types/organization";


function buildQuery(
  params: Record<
    string,
    string | boolean | undefined
  >,
) {
  const searchParams =
    new URLSearchParams();

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

  const query =
    searchParams.toString();

  return query
    ? `?${query}`
    : "";
}


export async function getBranches(
  options: {
    active?: boolean;
    search?: string;
  } = {},
) {
  return apiRequest<
    OrganizationBranch[]
  >(
    `/organization/branches/${buildQuery(
      {
        active:
          options.active,
        search:
          options.search,
      },
    )}`,
  );
}


export async function getDepartments(
  options: {
    branch?: string;
    active?: boolean;
    shared?: boolean;
    search?: string;
  } = {},
) {
  return apiRequest<
    OrganizationDepartment[]
  >(
    `/organization/departments/${buildQuery(
      {
        branch:
          options.branch,
        active:
          options.active,
        shared:
          options.shared,
        search:
          options.search,
      },
    )}`,
  );
}


/*
 * Employee forms can use departments
 * belonging to the selected branch plus
 * shared departments where branch=null.
 */
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

  const unique =
    new Map<
      string,
      OrganizationDepartment
    >();

  [
    ...branchDepartments,
    ...sharedDepartments,
  ].forEach(
    (department) => {
      unique.set(
        department.id,
        department,
      );
    },
  );

  return Array.from(
    unique.values(),
  ).sort((a, b) =>
    a.name.localeCompare(
      b.name,
    ),
  );
}