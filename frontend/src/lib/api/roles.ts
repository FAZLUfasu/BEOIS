import { apiRequest } from "@/lib/api/client";
import type {
  AdminPermission,
  AdminRole,
  CreateAdminRolePayload,
  UpdateAdminRolePayload,
} from "@/types/roles";

export function getAdminRoles() {
  return apiRequest<AdminRole[]>("/auth/admin/roles/");
}

export function getAdminRole(roleId: string) {
  return apiRequest<AdminRole>(`/auth/admin/roles/${roleId}/`);
}

export function createAdminRole(payload: CreateAdminRolePayload) {
  return apiRequest<AdminRole>("/auth/admin/roles/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateAdminRole(
  roleId: string,
  payload: UpdateAdminRolePayload,
) {
  return apiRequest<AdminRole>(`/auth/admin/roles/${roleId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteAdminRole(roleId: string) {
  return apiRequest<void>(`/auth/admin/roles/${roleId}/`, {
    method: "DELETE",
  });
}

export function getAdminPermissions() {
  return apiRequest<AdminPermission[]>("/auth/admin/permissions/");
}