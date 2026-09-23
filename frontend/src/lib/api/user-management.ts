import { apiRequest } from "@/lib/api/client";

import type {
  AdminRole,
  AdminUser,
  AdminUserRole,
  CreateAdminUserPayload,
  ResetPasswordPayload,
  UpdateAdminUserPayload,
  UserRolePayload,
} from "@/types/user-management";

export function getAdminUsers() {
  return apiRequest<AdminUser[]>(
    "/auth/admin/users/",
  );
}

export function getAdminUser(
  userId: string,
) {
  return apiRequest<AdminUser>(
    `/auth/admin/users/${userId}/`,
  );
}

export function createAdminUser(
  payload: CreateAdminUserPayload,
) {
  return apiRequest<AdminUser>(
    "/auth/admin/users/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateAdminUser(
  userId: string,
  payload: UpdateAdminUserPayload,
) {
  return apiRequest<AdminUser>(
    `/auth/admin/users/${userId}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function resetAdminUserPassword(
  userId: string,
  payload: ResetPasswordPayload,
) {
  return apiRequest<{
    detail: string;
  }>(
    `/auth/admin/users/${userId}/reset-password/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function getAdminRoles() {
  return apiRequest<AdminRole[]>(
    "/auth/admin/roles/",
  );
}

export function getAdminUserRoles(
  userId: string,
) {
  return apiRequest<AdminUserRole[]>(
    `/auth/admin/users/${userId}/roles/`,
  );
}

export function createAdminUserRole(
  userId: string,
  payload: UserRolePayload,
) {
  return apiRequest<AdminUserRole>(
    `/auth/admin/users/${userId}/roles/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateAdminUserRole(
  userId: string,
  assignmentId: string,
  payload: Partial<UserRolePayload>,
) {
  return apiRequest<AdminUserRole>(
    `/auth/admin/users/${userId}/roles/${assignmentId}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function deleteAdminUserRole(
  userId: string,
  assignmentId: string,
) {
  return apiRequest<void>(
    `/auth/admin/users/${userId}/roles/${assignmentId}/`,
    {
      method: "DELETE",
    },
  );
}

export function uploadMyProfilePicture(
  file: File,
) {
  const formData = new FormData();

  formData.append(
    "profile_picture",
    file,
  );

  return apiRequest<{
    profile_picture: string | null;
  }>(
    "/auth/me/profile-picture/",
    {
      method: "POST",
      body: formData,
    },
  );
}

export function removeMyProfilePicture() {
  return apiRequest<void>(
    "/auth/me/profile-picture/",
    {
      method: "DELETE",
    },
  );
}

export function uploadAdminProfilePicture(
  userId: string,
  file: File,
) {
  const formData = new FormData();

  formData.append(
    "profile_picture",
    file,
  );

  return apiRequest<{
    profile_picture: string | null;
  }>(
    `/auth/admin/users/${userId}/profile-picture/`,
    {
      method: "POST",
      body: formData,
    },
  );
}

export function removeAdminProfilePicture(
  userId: string,
) {
  return apiRequest<void>(
    `/auth/admin/users/${userId}/profile-picture/`,
    {
      method: "DELETE",
    },
  );
}