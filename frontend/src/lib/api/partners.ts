// import { apiRequest } from "@/lib/api/client";

// import type {
//   PartnerListItem,
// } from "@/types/partners";

// export function getActivePartners() {
//   return apiRequest<PartnerListItem[]>(
//     "/partners/active/",
//   );
// }

import {
  apiRequest,
} from "@/lib/api/client";

import type {
  CommissionTransaction,
  PartnerCase,
  PartnerFilters,
  PartnerIssue,
  PartnerListItem,
  PartnerSummary,
} from "@/types/partners";

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

  const query =
    params.toString();

  return query
    ? `?${query}`
    : "";
}

// ============================================================
// PARTNER MASTER
// ============================================================

export function getPartners(
  filters: PartnerFilters = {},
) {
  const query = buildQuery({
    search: filters.search,
    status: filters.status,
    partner_type:
      filters.partner_type,
    state: filters.state,
    territory:
      filters.territory,
  });

  return apiRequest<
    PartnerListItem[]
  >(
    `/partners/${query}`,
  );
}

export function getActivePartners() {
  return apiRequest<
    PartnerListItem[]
  >(
    "/partners/active/",
  );
}

// ============================================================
// OPERATIONAL SUMMARY
// ============================================================

export function getPartnerSummary() {
  return apiRequest<PartnerSummary>(
    "/partners/summary/",
  );
}

// ============================================================
// CASES
// ============================================================

export function getOpenPartnerCases() {
  return apiRequest<
    PartnerCase[]
  >(
    "/partners/open-cases/",
  );
}

// ============================================================
// ISSUES
// ============================================================

export function getOpenPartnerIssues() {
  return apiRequest<
    PartnerIssue[]
  >(
    "/partners/open-issues/",
  );
}

// ============================================================
// COMMISSIONS
// ============================================================

export function getPartnerCommissionQueue(
  status?: string,
) {
  const query = buildQuery({
    status,
  });

  return apiRequest<
    CommissionTransaction[]
  >(
    `/partners/commission-queue/${query}`,
  );
}