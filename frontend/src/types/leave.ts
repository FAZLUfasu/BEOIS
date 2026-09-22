export type LeaveRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type LeaveDayType =
  | "FULL_DAY"
  | "FIRST_HALF"
  | "SECOND_HALF";


export interface LeaveType {
  id: string;
  name: string;
  code: string;
  description: string;
  default_days_per_year: string;
  is_paid: boolean;
  carry_forward_allowed: boolean;
  maximum_carry_forward: string;
  requires_approval: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}


export interface LeaveTypePayload {
  name: string;
  code: string;
  description: string;
  default_days_per_year: string | number;
  is_paid: boolean;
  carry_forward_allowed: boolean;
  maximum_carry_forward: string | number;
  requires_approval: boolean;
  is_active: boolean;
}


export interface EmployeeLeaveBalance {
  id: string;

  employee: string;
  employee_id: string;
  employee_name: string;

  leave_type: string;
  leave_type_name: string;
  leave_type_code: string;

  year: number;

  opening_balance: string;
  allocated_days: string;
  used_days: string;
  adjusted_days: string;
  available_days: string;

  created_at: string;
  updated_at: string;
}


export interface LeaveRequest {
  id: string;

  employee: string;
  employee_id: string;
  employee_name: string;

  leave_type: string;
  leave_type_name: string;

  start_date: string;
  end_date: string;

  day_type: LeaveDayType;

  requested_days: string;

  reason: string;

  status: LeaveRequestStatus;
  status_display: string;

  applied_by: string | null;
  approved_by: string | null;
  approved_at: string | null;

  rejection_reason: string;

  cancelled_at: string | null;

  created_at: string;
  updated_at: string;
}


export interface LeaveRequestFilters {
  status?: LeaveRequestStatus;
  employee?: string;
}


export interface LeaveBalanceFilters {
  employee?: string;
  year?: number;
}


export interface ApplyLeavePayload {
  employee?: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  day_type?: LeaveDayType;
  reason: string;
}


export interface InitializeLeaveBalancePayload {
  employee: string;
  leave_type?: string;
  year?: number;
  opening_balance?: string | number;
  allocated_days?: string | number;
}


export interface AdjustLeaveBalancePayload {
  employee: string;
  leave_type: string;
  adjustment: string | number;
  year?: number;
  reason?: string;
}


export interface ApproveLeavePayload {
  notes?: string;
}


export interface RejectLeavePayload {
  reason: string;
}


export interface CancelLeavePayload {
  reason?: string;
}