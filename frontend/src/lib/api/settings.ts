import { apiRequest } from "@/lib/api/client";

import type {
  SystemSettings,
  SystemSettingsAudit,
  SystemSettingsUpdate,
} from "@/types/settings";

export function getSystemSettings() {
  return apiRequest<SystemSettings>(
    "/settings/",
  );
}

export function updateSystemSettings(
  payload: SystemSettingsUpdate,
) {
  return apiRequest<SystemSettings>(
    "/settings/",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function getSystemSettingsAudit() {
  return apiRequest<SystemSettingsAudit[]>(
    "/settings/audit/",
  );
}