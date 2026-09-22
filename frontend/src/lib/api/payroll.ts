import { apiRequest } from "@/lib/api/client";

import type {
  AddSalaryStructureComponentPayload,
  EmployeeSalaryStructure,
  SalaryComponent,
  SalaryComponentPayload,
  SalaryStructurePayload,
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