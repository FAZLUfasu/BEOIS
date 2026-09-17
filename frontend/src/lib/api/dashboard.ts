import { apiRequest } from "@/lib/api/client";

import type {
  ExceptionIntelligence,
  FinancialIntelligence,
  InstitutionIntelligence,
  IntelligenceOverview,
  IntelligenceTrends,
  PartnerIntelligence,
  StaffIntelligence,
} from "@/types/dashboard";

export interface DashboardPeriod {
  startDate?: string;
  endDate?: string;
}

function createPeriodQuery(
  period?: DashboardPeriod,
) {
  const params = new URLSearchParams();

  if (period?.startDate) {
    params.set(
      "start_date",
      period.startDate,
    );
  }

  if (period?.endDate) {
    params.set(
      "end_date",
      period.endDate,
    );
  }

  const query = params.toString();

  return query ? `?${query}` : "";
}

export function getIntelligenceOverview(
  period?: DashboardPeriod,
) {
  return apiRequest<IntelligenceOverview>(
    `/dashboard/intelligence/overview/${createPeriodQuery(
      period,
    )}`,
  );
}

export function getIntelligenceTrends(
  period?: DashboardPeriod,
) {
  return apiRequest<IntelligenceTrends>(
    `/dashboard/intelligence/trends/${createPeriodQuery(
      period,
    )}`,
  );
}

export function getFinancialIntelligence(
  period?: DashboardPeriod,
) {
  return apiRequest<FinancialIntelligence>(
    `/dashboard/intelligence/finance/${createPeriodQuery(
      period,
    )}`,
  );
}
export function getInstitutionIntelligence(
  period?: DashboardPeriod,
) {
  return apiRequest<InstitutionIntelligence>(
    `/dashboard/intelligence/institutions/${createPeriodQuery(
      period,
    )}`,
  );
}

export function getPartnerIntelligence(
  period?: DashboardPeriod,
) {
  return apiRequest<PartnerIntelligence>(
    `/dashboard/intelligence/partners/${createPeriodQuery(
      period,
    )}`,
  );
}

export function getStaffIntelligence(
  period?: DashboardPeriod,
) {
  return apiRequest<StaffIntelligence>(
    `/dashboard/intelligence/staff/${createPeriodQuery(
      period,
    )}`,
  );
}
export function getExceptionIntelligence(
  period?: DashboardPeriod,
) {
  return apiRequest<ExceptionIntelligence>(
    `/dashboard/intelligence/exceptions/${createPeriodQuery(
      period,
    )}`,
  );
}