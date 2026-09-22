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
