import {
  apiRequest,
} from "@/lib/api/client";

import type {
  Designation,
  DesignationPayload,
  UserDirectoryItem,
} from "@/types/hr";


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


export async function getUserDirectory(
  options: {
    active?: boolean;
    unlinked?: boolean;
    search?: string;
  } = {},
) {
  return apiRequest<
    UserDirectoryItem[]
  >(
    `/auth/users/${buildQuery({
      active: options.active,
      unlinked:
        options.unlinked,
      search: options.search,
    })}`,
  );
}


export async function getUserDirectoryItem(
  userId: string,
) {
  return apiRequest<
    UserDirectoryItem
  >(
    `/auth/users/${userId}/`,
  );
}


export async function getDesignations(
  options: {
    active?: boolean;
    search?: string;
  } = {},
) {
  return apiRequest<
    Designation[]
  >(
    `/hr/designations/${buildQuery({
      active: options.active,
      search: options.search,
    })}`,
  );
}


export async function createDesignation(
  payload: DesignationPayload,
) {
  return apiRequest<
    Designation
  >(
    "/hr/designations/",
    {
      method: "POST",
      body: JSON.stringify(
        payload,
      ),
    },
  );
}


export async function updateDesignation(
  designationId: string,
  payload: Partial<
    DesignationPayload
  >,
) {
  return apiRequest<
    Designation
  >(
    `/hr/designations/${designationId}/`,
    {
      method: "PATCH",
      body: JSON.stringify(
        payload,
      ),
    },
  );
}