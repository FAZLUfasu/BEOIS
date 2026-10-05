import { apiRequest } from "@/lib/api/client";
import type { AdminRole, CreateAdminRolePayload } from "@/types/roles";

export function getAdminRoles() {
  return apiRequest<AdminRole[]>("/auth/admin/roles/");
}

export function createAdminRole(payload: CreateAdminRolePayload) {
  return apiRequest<AdminRole>("/auth/admin/roles/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
