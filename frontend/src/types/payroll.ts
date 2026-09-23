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
// ================================================================
// SALARY ADVANCES
// ================================================================

export type SalaryAdvanceStatus =
  | "REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "DISBURSED"
  | "PARTIALLY_RECOVERED"
  | "RECOVERED"
  | "CANCELLED";

export interface SalaryAdvance {
  id: string;

  employee: string;
  employee_id: string;
  employee_name: string;

  requested_amount: string;
  approved_amount: string;
  recovered_amount: string;
  monthly_recovery_amount: string;
  outstanding_amount: string;

  reason: string;
  status: SalaryAdvanceStatus;

  requested_by: string | null;
  approved_by: string | null;

  approved_at: string | null;
  disbursed_at: string | null;

  payment_reference: string;

  created_at: string;
  updated_at: string;
}

export interface RequestSalaryAdvancePayload {
  employee?: string;
  amount: string | number;
  reason?: string;
}

export interface ApproveSalaryAdvancePayload {
  approved_amount: string | number;
  monthly_recovery_amount: string | number;
}

export interface DisburseSalaryAdvancePayload {
  payment_reference?: string;
}
// ================================================================
// PAYROLL PERIODS
// ================================================================

export type PayrollPeriodStatus =
  | "OPEN"
  | "PROCESSING"
  | "CLOSED";

export interface PayrollPeriod {
  id: string;
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  status: PayrollPeriodStatus;
  notes: string;

  created_by: string | null;
  closed_by: string | null;
  closed_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface CreatePayrollPeriodPayload {
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  notes?: string;
}

export interface PayrollPeriodSummary {
  period: string;
  employees: number;

  gross_earnings: string;
  total_deductions: string;
  net_payroll: string;

  draft: number;
  calculated: number;
  approved: number;
  paid: number;
}
// ================================================================
// PAYROLL PROCESSING
// ================================================================

export type PayrollStatus =
  | "DRAFT"
  | "CALCULATED"
  | "APPROVED"
  | "PAID"
  | "CANCELLED";

export type PayrollComponentType =
  | "EARNING"
  | "DEDUCTION";

export type PayrollComponentSourceType =
  | "SALARY_STRUCTURE"
  | "INCENTIVE"
  | "BONUS"
  | "MANUAL"
  | "LOP"
  | "ADVANCE";

export interface PayrollComponent {
  id: string;
  payroll: string;
  salary_component: string | null;

  code: string;
  name: string;

  component_type: PayrollComponentType;
  source_type: PayrollComponentSourceType;

  amount: string;
  notes: string;

  created_at: string;
}

export interface PayrollActivity {
  id: string;
  payroll: string;
  activity_type:
    | "CREATED"
    | "CALCULATED"
    | "RECALCULATED"
    | "COMPONENT_ADDED"
    | "APPROVED"
    | "PAID"
    | "CANCELLED"
    | "ADVANCE_RECOVERY"
    | "NOTE";

  description: string;
  performed_by: string | null;
  created_at: string;
}

export interface Payroll {
  id: string;

  period: string;
  period_display: string;

  employee: string;
  employee_id: string;
  employee_name: string;

  salary_structure: string;

  status: PayrollStatus;

  calendar_days: string;
  payable_days: string;
  present_days: string;
  paid_leave_days: string;
  unpaid_leave_days: string;
  lop_days: string;

  base_salary: string;
  gross_earnings: string;
  total_deductions: string;
  lop_deduction: string;
  advance_recovery: string;
  net_salary: string;

  calculated_by: string | null;
  calculated_at: string | null;

  approved_by: string | null;
  approved_at: string | null;

  paid_by: string | null;
  paid_at: string | null;

  payment_method: string;
  payment_reference: string;

  notes: string;

  components: PayrollComponent[];
  activities: PayrollActivity[];

  created_at: string;
  updated_at: string;
}

export interface CreatePayrollPayload {
  employee: string;
  period: string;
  payable_days?: string | number;
  lop_days?: string | number;
  notes?: string;
}

export interface PayrollAdjustmentPayload {
  amount: string | number;
  name?: string;
  notes?: string;
}

export interface PayrollAdvanceRecoveryPayload {
  advance: string;
  amount?: string | number;
}
// ================================================================
// PAYROLL APPROVAL & PAYMENT
// ================================================================

export interface PayPayrollPayload {
  payment_method: string;
  payment_reference: string;
}