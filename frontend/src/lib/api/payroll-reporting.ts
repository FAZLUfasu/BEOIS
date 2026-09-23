import {
  apiRequest,
} from "@/lib/api/client";

import type {
  PayrollPeriodSummary,
} from "@/types/payroll";

import type {
  PayrollPayslip,
} from "@/types/payroll-reporting";

export async function getPayrollPayslip(
  id: string,
) {
  return apiRequest<PayrollPayslip>(
    `/hr/payrolls/${id}/payslip/`,
  );
}

export async function getPayrollSummary(
  periodId: string,
) {
  return apiRequest<PayrollPeriodSummary>(
    `/hr/payroll-periods/${periodId}/summary/`,
  );
}
