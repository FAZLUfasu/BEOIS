export type SalaryComponentType =
  | "EARNING"
  | "DEDUCTION";

export type SalaryCalculationType =
  | "FIXED"
  | "PERCENTAGE";

export interface SalaryComponent {
  id: string;
  name: string;
  code: string;
  component_type: SalaryComponentType;
  calculation_type: SalaryCalculationType;
  is_taxable: boolean;
  affects_gross_salary: boolean;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SalaryComponentPayload {
  name: string;
  code: string;
  component_type: SalaryComponentType;
  calculation_type: SalaryCalculationType;
  is_taxable: boolean;
  affects_gross_salary: boolean;
  description: string;
  is_active?: boolean;
}

export interface EmployeeSalaryComponent {
  id: string;
  salary_structure: string;
  component: string;
  component_name: string;
  component_code: string;
  component_type: SalaryComponentType;
  calculation_type: SalaryCalculationType;
  amount: string;
  percentage: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeSalaryStructure {
  id: string;
  employee: string;
  employee_id: string;
  employee_name: string;
  name: string;
  effective_from: string;
  effective_to: string | null;
  base_salary: string;
  is_active: boolean;
  notes: string;
  created_by: string | null;
  components: EmployeeSalaryComponent[];
  created_at: string;
  updated_at: string;
}

export interface SalaryStructurePayload {
  employee: string;
  name: string;
  effective_from: string;
  effective_to?: string | null;
  base_salary: string | number;
  is_active?: boolean;
  notes?: string;
}

export interface AddSalaryStructureComponentPayload {
  component: string;
  amount?: string | number;
  percentage?: string | number;
}