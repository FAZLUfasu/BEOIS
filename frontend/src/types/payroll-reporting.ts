import type {
  PayrollStatus,
} from "@/types/payroll";

export interface PayrollPayslipLine {
  code: string;
  name: string;
  amount: string;
}

export interface PayrollPayslip {
  employee: {
    employee_id: string;
    name: string;
    designation: string;
    branch: string;
    department: string;
  };
  period: {
    year: number;
    month: number;
    start_date: string;
    end_date: string;
  };
  attendance: {
    calendar_days: string;
    payable_days: string;
    present_days: string;
    paid_leave_days: string;
    unpaid_leave_days: string;
    lop_days: string;
  };
  earnings: PayrollPayslipLine[];
  deductions: PayrollPayslipLine[];
  summary: {
    gross_earnings: string;
    total_deductions: string;
    lop_deduction: string;
    advance_recovery: string;
    net_salary: string;
  };
  payment: {
    status: PayrollStatus;
    paid_at: string | null;
    payment_method: string;
    payment_reference: string;
  };
}
