import { apiRequest } from "@/lib/api/client";

import type {
  AddSalaryStructureComponentPayload,
  EmployeeSalaryStructure,
  SalaryComponent,
  SalaryComponentPayload,
  SalaryStructurePayload,
  SalaryAdvance,
  RequestSalaryAdvancePayload,
  ApproveSalaryAdvancePayload,
  DisburseSalaryAdvancePayload,
  PayrollPeriod,
  PayrollPeriodSummary,
  CreatePayrollPeriodPayload,
  Payroll,
  CreatePayrollPayload,
  PayrollAdjustmentPayload,
  PayrollAdvanceRecoveryPayload,
  PayPayrollPayload,
} from "@/types/payroll";


export async function getSalaryComponents() {
  return apiRequest<SalaryComponent[]>(
    "/hr/salary-components/",
  );
}


export async function createSalaryComponent(
  payload: SalaryComponentPayload,
) {
  return apiRequest<SalaryComponent>(
    "/hr/salary-components/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export async function updateSalaryComponent(
  componentId: string,
  payload: Partial<SalaryComponentPayload>,
) {
  return apiRequest<SalaryComponent>(
    `/hr/salary-components/${componentId}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}


export async function getSalaryStructures() {
  return apiRequest<EmployeeSalaryStructure[]>(
    "/hr/salary-structures/",
  );
}


export async function getSalaryStructure(
  structureId: string,
) {
  return apiRequest<EmployeeSalaryStructure>(
    `/hr/salary-structures/${structureId}/`,
  );
}


export async function createSalaryStructure(
  payload: SalaryStructurePayload,
) {
  return apiRequest<EmployeeSalaryStructure>(
    "/hr/salary-structures/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export async function addSalaryStructureComponent(
  structureId: string,
  payload: AddSalaryStructureComponentPayload,
) {
  return apiRequest<EmployeeSalaryStructure>(
    `/hr/salary-structures/${structureId}/components/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
// ================================================================
// SALARY ADVANCES
// ================================================================

export async function getSalaryAdvances() {
  return apiRequest<SalaryAdvance[]>(
    "/hr/salary-advances/",
  );
}


export async function requestSalaryAdvance(
  payload: RequestSalaryAdvancePayload,
) {
  return apiRequest<SalaryAdvance>(
    "/hr/salary-advances/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export async function approveSalaryAdvance(
  id: string,
  payload: ApproveSalaryAdvancePayload,
) {
  return apiRequest<SalaryAdvance>(
    `/hr/salary-advances/${id}/approve/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export async function disburseSalaryAdvance(
  id: string,
  payload: DisburseSalaryAdvancePayload,
) {
  return apiRequest<SalaryAdvance>(
    `/hr/salary-advances/${id}/disburse/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
// ================================================================
// PAYROLL PERIODS
// ================================================================

export async function getPayrollPeriods() {
  return apiRequest<PayrollPeriod[]>(
    "/hr/payroll-periods/",
  );
}


export async function getPayrollPeriod(
  id: string,
) {
  return apiRequest<PayrollPeriod>(
    `/hr/payroll-periods/${id}/`,
  );
}


export async function createPayrollPeriod(
  payload: CreatePayrollPeriodPayload,
) {
  return apiRequest<PayrollPeriod>(
    "/hr/payroll-periods/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export async function getPayrollPeriodSummary(
  id: string,
) {
  return apiRequest<PayrollPeriodSummary>(
    `/hr/payroll-periods/${id}/summary/`,
  );
}


export async function closePayrollPeriod(
  id: string,
) {
  return apiRequest<PayrollPeriod>(
    `/hr/payroll-periods/${id}/close/`,
    {
      method: "POST",
    },
  );
}
// ================================================================
// PAYROLL PROCESSING
// ================================================================

export interface PayrollFilters {
  employee?: string;
  period?: string;
  status?: string;
}

export async function getPayrolls(
  filters: PayrollFilters = {},
) {
  const params = new URLSearchParams();

  if (filters.employee) {
    params.set("employee", filters.employee);
  }

  if (filters.period) {
    params.set("period", filters.period);
  }

  if (filters.status) {
    params.set("status", filters.status);
  }

  const query = params.toString();

  return apiRequest<Payroll[]>(
    query
      ? `/hr/payrolls/?${query}`
      : "/hr/payrolls/",
  );
}

export async function getPayroll(
  id: string,
) {
  return apiRequest<Payroll>(
    `/hr/payrolls/${id}/`,
  );
}

export async function createPayroll(
  payload: CreatePayrollPayload,
) {
  return apiRequest<Payroll>(
    "/hr/payrolls/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function calculatePayroll(
  id: string,
) {
  return apiRequest<Payroll>(
    `/hr/payrolls/${id}/calculate/`,
    {
      method: "POST",
    },
  );
}

export async function addPayrollIncentive(
  id: string,
  payload: PayrollAdjustmentPayload,
) {
  return apiRequest<Payroll>(
    `/hr/payrolls/${id}/incentive/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function addPayrollBonus(
  id: string,
  payload: PayrollAdjustmentPayload,
) {
  return apiRequest<Payroll>(
    `/hr/payrolls/${id}/bonus/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function addPayrollDeduction(
  id: string,
  payload: PayrollAdjustmentPayload,
) {
  return apiRequest<Payroll>(
    `/hr/payrolls/${id}/deduction/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function addPayrollAdvanceRecovery(
  id: string,
  payload: PayrollAdvanceRecoveryPayload,
) {
  return apiRequest<Payroll>(
    `/hr/payrolls/${id}/advance-recovery/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
// ================================================================
// PAYROLL APPROVAL & PAYMENT
// ================================================================

export async function approvePayroll(
  id: string,
) {
  return apiRequest<Payroll>(
    `/hr/payrolls/${id}/approve/`,
    {
      method: "POST",
    },
  );
}

export async function payPayroll(
  id: string,
  payload: PayPayrollPayload,
) {
  return apiRequest<Payroll>(
    `/hr/payrolls/${id}/pay/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}