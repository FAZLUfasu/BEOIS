import { apiRequest } from "@/lib/api/client";

import type {
  LeadImportBatch,
  LeadImportBatchDetail,
  LeadImportPreviewPayload,
} from "@/types/lead-imports";

export function getLeadImportBatches() {
  return apiRequest<LeadImportBatch[]>(
    "/leads/imports/",
  );
}

export function getLeadImportBatch(
  id: string,
) {
  return apiRequest<LeadImportBatchDetail>(
    `/leads/imports/${id}/`,
  );
}

export function previewLeadImport(
  payload: LeadImportPreviewPayload,
) {
  const formData = new FormData();

  formData.append(
    "file",
    payload.file,
  );

  formData.append(
    "source",
    payload.source,
  );

  formData.append(
    "campaign",
    payload.campaign ?? "",
  );

  formData.append(
    "default_vertical",
    payload.default_vertical,
  );

  formData.append(
    "default_channel",
    payload.default_channel,
  );

  return apiRequest<LeadImportBatchDetail>(
    "/leads/imports/preview/",
    {
      method: "POST",
      body: formData,
    },
  );
}

export function confirmLeadImport(
  id: string,
) {
  return apiRequest<LeadImportBatchDetail>(
    `/leads/imports/${id}/confirm/`,
    {
      method: "POST",
    },
  );
}
