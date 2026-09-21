import { apiRequest } from "@/lib/api/client";

import type {
  AddPartnerNotePayload,
  CommissionTransaction,
  CreatePartnerPayload,
  PartnerActivity,
  PartnerCase,
  PartnerDetail,
  PartnerDocument,
  PartnerFilters,
  PartnerIssue,
  PartnerListItem,
  PartnerStatusPayload,
  PartnerSummary,
} from "@/types/partners";

function buildQuery(
  params: Record<
    string,
    string | number | boolean | null | undefined
  >,
): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
}

// ============================================================
// PARTNER LIST / DASHBOARD
// ============================================================

export async function getPartners(
  filters: PartnerFilters = {},
): Promise<PartnerListItem[]> {
  const query = buildQuery({
    search: filters.search,
    status: filters.status,
    partner_type: filters.partner_type,
    state: filters.state,
    territory: filters.territory,
    relationship_manager: filters.manager,
  });

  return apiRequest<PartnerListItem[]>(
    `/partners/${query}`,
  );
}

export async function getActivePartners(): Promise<
  PartnerListItem[]
> {
  return apiRequest<PartnerListItem[]>(
    "/partners/active/",
  );
}

export async function getPartnerSummary(): Promise<
  PartnerSummary
> {
  return apiRequest<PartnerSummary>(
    "/partners/summary/",
  );
}

export async function getOpenPartnerCases(): Promise<
  PartnerCase[]
> {
  return apiRequest<PartnerCase[]>(
    "/partners/open-cases/",
  );
}

export async function getOpenPartnerIssues(): Promise<
  PartnerIssue[]
> {
  return apiRequest<PartnerIssue[]>(
    "/partners/open-issues/",
  );
}

export async function getCommissionQueue(): Promise<
  CommissionTransaction[]
> {
  return apiRequest<CommissionTransaction[]>(
    "/partners/commission-queue/",
  );
}

// ============================================================
// PARTNER MASTER
// ============================================================

export async function getPartner(
  partnerId: string,
): Promise<PartnerDetail> {
  return apiRequest<PartnerDetail>(
    `/partners/${partnerId}/`,
  );
}

export async function createPartner(
  payload: CreatePartnerPayload,
): Promise<PartnerDetail> {
  return apiRequest<PartnerDetail>(
    "/partners/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function changePartnerStatus(
  partnerId: string,
  payload: PartnerStatusPayload,
): Promise<PartnerDetail> {
  return apiRequest<PartnerDetail>(
    `/partners/${partnerId}/status/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

// ============================================================
// NOTES / ACTIVITY
// ============================================================

export async function addPartnerNote(
  partnerId: string,
  payload: AddPartnerNotePayload,
): Promise<PartnerActivity> {
  return apiRequest<PartnerActivity>(
    `/partners/${partnerId}/note/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function getPartnerActivities(
  partnerId: string,
): Promise<PartnerActivity[]> {
  return apiRequest<PartnerActivity[]>(
    `/partners/${partnerId}/activities/`,
  );
}

// ============================================================
// DOCUMENTS
// ============================================================

export async function getPartnerDocuments(
  partnerId: string,
): Promise<PartnerDocument[]> {
  return apiRequest<PartnerDocument[]>(
    `/partners/${partnerId}/documents/`,
  );
}

export async function addPartnerDocument(
  partnerId: string,
  payload: {
    document_type: string;
    title?: string;
    file?: File | null;
    notes?: string;
  },
): Promise<PartnerDocument> {
  const formData = new FormData();

  formData.append(
    "document_type",
    payload.document_type,
  );

  if (payload.title) {
    formData.append("title", payload.title);
  }

  if (payload.file) {
    formData.append("file", payload.file);
  }

  if (payload.notes) {
    formData.append("notes", payload.notes);
  }

  return apiRequest<PartnerDocument>(
    `/partners/${partnerId}/documents/`,
    {
      method: "POST",
      body: formData,
    },
  );
}

export async function verifyPartnerDocument(
  partnerId: string,
  documentId: string,
  notes = "",
): Promise<PartnerDocument> {
  return apiRequest<PartnerDocument>(
    `/partners/${partnerId}/documents/${documentId}/verify/`,
    {
      method: "POST",
      body: JSON.stringify({ notes }),
    },
  );
}

export async function rejectPartnerDocument(
  partnerId: string,
  documentId: string,
  reason: string,
): Promise<PartnerDocument> {
  return apiRequest<PartnerDocument>(
    `/partners/${partnerId}/documents/${documentId}/reject/`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    },
  );
}