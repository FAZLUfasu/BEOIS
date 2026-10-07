import {
  apiRequest,
} from "@/lib/api/client";

import type {
  AddAdmissionFeePayload,
  AddAdmissionNotePayload,
  AdmissionActivity,
  AdmissionDetail,
  AdmissionDocument,
  AdmissionFee,
  AdmissionFeeSummary,
  AdmissionFilters,
  AdmissionListItem,
  AdmissionPayment,
  AdmissionStatusPayload,
  ConvertLeadPayload,
  EnrollmentPayload,
  Institution,
  InstitutionManagementPayload,
  Program,
  ProgramFeePlan,
  QualifiedLeadFilters,
  QualifiedLeadHandoff,
  RecordAdmissionPaymentPayload,
  UniversityApplicationPayload,
} from "@/types/admissions";

function buildQuery(
  filters: Record<
    string,
    string | undefined
  >,
) {
  const params =
    new URLSearchParams();

  Object.entries(filters).forEach(
    ([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    },
  );

  const query = params.toString();

  return query
    ? `?${query}`
    : "";
}

/* ================================================================
   ADMISSIONS
   ================================================================ */

export function getAdmissions(
  filters: AdmissionFilters = {},
) {
  return apiRequest<AdmissionListItem[]>(
    `/admissions/${buildQuery({
      search: filters.search,
      status: filters.status,
      institution: filters.institution,
      program: filters.program,
      vertical: filters.vertical,
      channel: filters.channel,
      assigned_to: filters.assigned_to,
      partner: filters.partner,
    })}`,
  );
}

export function getAdmission(
  id: string,
) {
  return apiRequest<AdmissionDetail>(
    `/admissions/${id}/`,
  );
}

export function getPendingAdmissions() {
  return apiRequest<AdmissionListItem[]>(
    "/admissions/pending/",
  );
}

export function getDocumentPendingAdmissions() {
  return apiRequest<AdmissionListItem[]>(
    "/admissions/document-pending/",
  );
}

export function getFeePendingAdmissions() {
  return apiRequest<AdmissionListItem[]>(
    "/admissions/fee-pending/",
  );
}

export function getEnrollmentPendingAdmissions() {
  return apiRequest<AdmissionListItem[]>(
    "/admissions/enrollment-pending/",
  );
}

/* ================================================================
   ACADEMIC MASTER DATA
   ================================================================ */

export function getInstitutions(
  active = true,
) {
  return apiRequest<Institution[]>(
    `/admissions/institutions/?active=${
      active ? "true" : "false"
    }`,
  );
}

export function getManagedInstitutions(
  options: InstitutionSearchOptions = {},
) {
  const query = buildQuery({
    active:
      options.active === undefined
        ? undefined
        : options.active
          ? "true"
          : "false",
    search: options.search,
  });

  return apiRequest<Institution[]>(
    `/admissions/institutions/${query}`,
  );
}

export function getPrograms(
  institution?: string,
  options: {
    active?: boolean;
    creditTransfer?: boolean;
    search?: string;
  } = {},
) {
  const query = buildQuery({
    institution,
    active:
      options.active === undefined
        ? "true"
        : options.active
          ? "true"
          : "false",
    credit_transfer:
      options.creditTransfer === undefined
        ? undefined
        : options.creditTransfer
          ? "true"
          : "false",
    search: options.search,
  });

  return apiRequest<Program[]>(
    `/admissions/programs/${query}`,
  );
}

export function getFeePlans(
  options: {
    program?: string;
    institution?: string;
    active?: boolean;
    search?: string;
  } = {},
) {
  const query = buildQuery({
    program: options.program,
    institution: options.institution,
    active:
      options.active === undefined
        ? "true"
        : options.active
          ? "true"
          : "false",
    search: options.search,
  });

  return apiRequest<ProgramFeePlan[]>(
    `/admissions/fee-plans/${query}`,
  );
}

export interface InstitutionSearchOptions {
  active?: boolean;
  search?: string;
}

export function createInstitution(
  payload: InstitutionManagementPayload,
) {
  return apiRequest<Institution>(
    "/admissions/institutions/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateInstitution(
  institutionId: string,
  payload: Partial<InstitutionManagementPayload>,
) {
  return apiRequest<Institution>(
    `/admissions/institutions/${institutionId}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

/* ================================================================
   QUALIFIED LEADS
   ================================================================ */

export function getQualifiedLeadHandoffs(
  filters: QualifiedLeadFilters = {},
) {
  const query = buildQuery({
    search: filters.search,
    vertical: filters.vertical,
    channel: filters.channel,
    source: filters.source,
    campaign: filters.campaign,
  });

  return apiRequest<QualifiedLeadHandoff[]>(
    `/admissions/qualified-leads/${query}`,
  );
}

export function convertLeadToAdmission(
  payload: ConvertLeadPayload,
) {
  return apiRequest<AdmissionDetail>(
    "/admissions/convert-from-lead/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

/* ================================================================
   ADMISSION WORKFLOW
   ================================================================ */

export function changeAdmissionStatus(
  admissionId: string,
  payload: AdmissionStatusPayload,
) {
  return apiRequest<AdmissionDetail>(
    `/admissions/${admissionId}/status/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function addAdmissionNote(
  admissionId: string,
  payload: AddAdmissionNotePayload,
) {
  return apiRequest<AdmissionActivity>(
    `/admissions/${admissionId}/note/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function getAdmissionActivities(
  admissionId: string,
) {
  return apiRequest<AdmissionActivity[]>(
    `/admissions/${admissionId}/activities/`,
  );
}

export function getAdmissionDocuments(
  admissionId: string,
) {
  return apiRequest<AdmissionDocument[]>(
    `/admissions/${admissionId}/documents/`,
  );
}

export function addAdmissionDocument(
  admissionId: string,
  formData: FormData,
) {
  return apiRequest<AdmissionDocument>(
    `/admissions/${admissionId}/documents/`,
    {
      method: "POST",
      body: formData,
    },
  );
}

export function verifyAdmissionDocument(
  admissionId: string,
  documentId: string,
  notes = "",
) {
  return apiRequest<AdmissionDocument>(
    `/admissions/${admissionId}/documents/${documentId}/verify/`,
    {
      method: "POST",
      body: JSON.stringify({
        notes,
      }),
    },
  );
}

export function rejectAdmissionDocument(
  admissionId: string,
  documentId: string,
  reason: string,
) {
  return apiRequest<AdmissionDocument>(
    `/admissions/${admissionId}/documents/${documentId}/reject/`,
    {
      method: "POST",
      body: JSON.stringify({
        reason,
      }),
    },
  );
}

export function markAdmissionEligible(
  admissionId: string,
  notes = "",
) {
  return apiRequest<AdmissionDetail>(
    `/admissions/${admissionId}/eligible/`,
    {
      method: "POST",
      body: JSON.stringify({
        notes,
      }),
    },
  );
}

export function markAdmissionNotEligible(
  admissionId: string,
  reason: string,
) {
  return apiRequest<AdmissionDetail>(
    `/admissions/${admissionId}/not-eligible/`,
    {
      method: "POST",
      body: JSON.stringify({
        reason,
      }),
    },
  );
}

/* ================================================================
   FEES / PAYMENTS
   ================================================================ */

export function getAdmissionFees(
  admissionId: string,
) {
  return apiRequest<AdmissionFee[]>(
    `/admissions/${admissionId}/fees/`,
  );
}

export function addAdmissionFee(
  admissionId: string,
  payload: AddAdmissionFeePayload,
) {
  return apiRequest<AdmissionFee>(
    `/admissions/${admissionId}/fees/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function getAdmissionPayments(
  admissionId: string,
) {
  return apiRequest<AdmissionPayment[]>(
    `/admissions/${admissionId}/payments/`,
  );
}

export function recordAdmissionPayment(
  admissionId: string,
  payload: RecordAdmissionPaymentPayload,
) {
  return apiRequest<AdmissionPayment>(
    `/admissions/${admissionId}/payments/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function getAdmissionFeeSummary(
  admissionId: string,
) {
  return apiRequest<AdmissionFeeSummary>(
    `/admissions/${admissionId}/fee-summary/`,
  );
}

/* ================================================================
   UNIVERSITY APPLICATION / ENROLLMENT
   ================================================================ */

export function submitUniversityApplication(
  admissionId: string,
  payload: UniversityApplicationPayload,
) {
  return apiRequest<AdmissionDetail>(
    `/admissions/${admissionId}/university-application/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function recordAdmissionEnrollment(
  admissionId: string,
  payload: EnrollmentPayload,
) {
  return apiRequest<AdmissionDetail>(
    `/admissions/${admissionId}/enrollment/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function completeAdmission(
  admissionId: string,
  notes = "",
) {
  return apiRequest<AdmissionDetail>(
    `/admissions/${admissionId}/complete/`,
    {
      method: "POST",
      body: JSON.stringify({
        notes,
      }),
    },
  );
}