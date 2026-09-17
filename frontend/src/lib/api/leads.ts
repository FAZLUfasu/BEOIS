import { apiRequest } from "@/lib/api/client";

import type {
  AssignLeadPayload,
  ChangeLeadStatusPayload,
  LeadActivity,
  LeadDetail,
  LeadFilters,
  LeadFormPayload,
  LeadListItem,
  LeadUpdatePayload,
  RecordCallPayload,
  RecordCallResponse,
} from "@/types/leads";

function buildQuery(filters: LeadFilters = {}) {
  const params = new URLSearchParams();

  if (filters.search) {
    params.set("search", filters.search);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.vertical) {
    params.set("vertical", filters.vertical);
  }

  if (filters.channel) {
    params.set("channel", filters.channel);
  }

  if (filters.assigned_to) {
    params.set("assigned_to", filters.assigned_to);
  }

  const query = params.toString();

  return query ? `?${query}` : "";
}

export function getLeads(
  filters: LeadFilters = {},
) {
  return apiRequest<LeadListItem[]>(
    `/leads/${buildQuery(filters)}`,
  );
}

export function getLead(id: string) {
  return apiRequest<LeadDetail>(
    `/leads/${id}/`,
  );
}

export function createLead(
  payload: LeadFormPayload,
) {
  return apiRequest<LeadDetail>(
    "/leads/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateLead(
  id: string,
  payload: Partial<LeadUpdatePayload>,
) {
  return apiRequest<LeadDetail>(
    `/leads/${id}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function assignLead(
  id: string,
  payload: AssignLeadPayload,
) {
  return apiRequest<LeadDetail>(
    `/leads/${id}/assign/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function recordLeadCall(
  id: string,
  payload: RecordCallPayload,
) {
  return apiRequest<RecordCallResponse>(
    `/leads/${id}/call/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function changeLeadStatus(
  id: string,
  payload: ChangeLeadStatusPayload,
) {
  return apiRequest<LeadDetail>(
    `/leads/${id}/status/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function addLeadNote(
  id: string,
  description: string,
) {
  return apiRequest<LeadActivity>(
    `/leads/${id}/note/`,
    {
      method: "POST",
      body: JSON.stringify({
        description,
      }),
    },
  );
}

export function getLeadActivities(
  id: string,
) {
  return apiRequest<LeadActivity[]>(
    `/leads/${id}/activities/`,
  );
}

export function getFollowUps() {
  return apiRequest<LeadListItem[]>(
    "/leads/follow-ups/",
  );
}

export function getOverdueLeads() {
  return apiRequest<LeadListItem[]>(
    "/leads/overdue/",
  );
}