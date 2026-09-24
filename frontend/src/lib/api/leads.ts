import { apiRequest } from "@/lib/api/client";

import type {
  AssignLeadPayload,
  BulkAssignLeadsPayload,
  BulkAssignLeadsResponse,
  ChangeLeadStatusPayload,
  DistributeLeadsPayload,
  DistributeLeadsResponse,
  LeadActivity,
  LeadAppointment,
  LeadCourseOption,
  LeadCourseOptionFilters,
  LeadDetail,
  LeadFilters,
  LeadFormPayload,
  LeadListItem,
  LeadQualification,
  LeadUpdatePayload,
  LeadWorkloadResponse,
  RecordCallPayload,
  RecordCallResponse,
  SaveLeadQualificationPayload,
  ScheduleLeadAppointmentPayload,
  UpdateLeadAppointmentStatusPayload,
  VisitBranch,
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

/* ============================================================
   COUNSELLING / QUALIFICATION
============================================================ */

export function saveLeadQualification(
  id: string,
  payload: SaveLeadQualificationPayload,
) {
  return apiRequest<LeadQualification>(
    `/leads/${id}/qualification/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function getLeadCourseOptions(
  id: string,
  filters: LeadCourseOptionFilters = {},
) {
  const params = new URLSearchParams();

  if (filters.institution) {
    params.set(
      "institution",
      filters.institution,
    );
  }

  if (filters.level) {
    params.set(
      "level",
      filters.level,
    );
  }

  if (filters.study_mode) {
    params.set(
      "study_mode",
      filters.study_mode,
    );
  }

  if (filters.search) {
    params.set(
      "search",
      filters.search,
    );
  }

  const query = params.toString();

  return apiRequest<LeadCourseOption[]>(
    `/leads/${id}/course-options/${
      query ? `?${query}` : ""
    }`,
  );
}

export function qualifyLead(
  id: string,
) {
  return apiRequest<LeadDetail>(
    `/leads/${id}/qualify/`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export function getVisitBranches() {
  return apiRequest<VisitBranch[]>(
    "/leads/visit-branches/",
  );
}

export function getLeadAppointments(
  id: string,
) {
  return apiRequest<LeadAppointment[]>(
    `/leads/${id}/appointments/`,
  );
}

export function scheduleLeadAppointment(
  id: string,
  payload: ScheduleLeadAppointmentPayload,
) {
  return apiRequest<LeadAppointment>(
    `/leads/${id}/appointments/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateLeadAppointmentStatus(
  id: string,
  appointmentId: string,
  payload: UpdateLeadAppointmentStatusPayload,
) {
  return apiRequest<LeadAppointment>(
    `/leads/${id}/appointments/${appointmentId}/status/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
/* ============================================================
   LEAD DISTRIBUTION
============================================================ */

export function getUnassignedLeads(
  filters: Omit<
    LeadFilters,
    "assigned_to"
  > = {},
) {
  return getLeads({
    ...filters,
    assigned_to: "unassigned",
  });
}

export function getLeadWorkload() {
  return apiRequest<LeadWorkloadResponse>(
    "/leads/workload/",
  );
}

export function bulkAssignLeads(
  payload: BulkAssignLeadsPayload,
) {
  return apiRequest<BulkAssignLeadsResponse>(
    "/leads/bulk-assign/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function distributeLeads(
  payload: DistributeLeadsPayload,
) {
  return apiRequest<DistributeLeadsResponse>(
    "/leads/distribute/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
