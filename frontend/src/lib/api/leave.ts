import { apiRequest } from "@/lib/api/client";

import type {
  AdjustLeaveBalancePayload,
  ApplyLeavePayload,
  ApproveLeavePayload,
  CancelLeavePayload,
  EmployeeLeaveBalance,
  InitializeLeaveBalancePayload,
  LeaveBalanceFilters,
  LeaveRequest,
  LeaveRequestFilters,
  LeaveType,
  LeaveTypePayload,
  RejectLeavePayload,
} from "@/types/leave";


function buildQuery(
  params: Record<
    string,
    string | number | boolean | undefined
  >,
) {
  const searchParams =
    new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== ""
      ) {
        searchParams.set(
          key,
          String(value),
        );
      }
    },
  );

  const query =
    searchParams.toString();

  return query
    ? `?${query}`
    : "";
}


// ============================================================
// LEAVE TYPES
// ============================================================

export async function getLeaveTypes() {
  return apiRequest<LeaveType[]>(
    "/hr/leave-types/",
  );
}


export async function createLeaveType(
  payload: LeaveTypePayload,
) {
  return apiRequest<LeaveType>(
    "/hr/leave-types/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export async function updateLeaveType(
  leaveTypeId: string,
  payload: Partial<LeaveTypePayload>,
) {
  return apiRequest<LeaveType>(
    `/hr/leave-types/${leaveTypeId}/`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}


// ============================================================
// LEAVE BALANCES
// ============================================================

export async function getLeaveBalances(
  filters: LeaveBalanceFilters = {},
) {
  return apiRequest<
    EmployeeLeaveBalance[]
  >(
    `/hr/leave-balances/${buildQuery({
      employee: filters.employee,
      year: filters.year,
    })}`,
  );
}


export async function initializeLeaveBalance(
  payload: InitializeLeaveBalancePayload,
) {
  /*
   * The backend can return either:
   *
   * 1. one balance when leave_type is supplied
   * 2. multiple balances when all active leave types
   *    are initialized for an employee
   */
  return apiRequest<
    | EmployeeLeaveBalance
    | EmployeeLeaveBalance[]
  >(
    "/hr/leave-balances/initialize/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export async function adjustLeaveBalance(
  payload: AdjustLeaveBalancePayload,
) {
  return apiRequest<EmployeeLeaveBalance>(
    "/hr/leave-balances/adjust/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


// ============================================================
// LEAVE REQUESTS
// ============================================================

export async function getLeaveRequests(
  filters: LeaveRequestFilters = {},
) {
  return apiRequest<LeaveRequest[]>(
    `/hr/leave-requests/${buildQuery({
      status: filters.status,
      employee: filters.employee,
    })}`,
  );
}


export async function getPendingLeaveRequests() {
  return apiRequest<LeaveRequest[]>(
    "/hr/leave-requests/pending/",
  );
}


export async function applyLeave(
  payload: ApplyLeavePayload,
) {
  return apiRequest<LeaveRequest>(
    "/hr/leave-requests/apply/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export async function approveLeave(
  leaveRequestId: string,
  payload: ApproveLeavePayload = {},
) {
  return apiRequest<LeaveRequest>(
    `/hr/leave-requests/${leaveRequestId}/approve/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export async function rejectLeave(
  leaveRequestId: string,
  payload: RejectLeavePayload,
) {
  return apiRequest<LeaveRequest>(
    `/hr/leave-requests/${leaveRequestId}/reject/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}


export async function cancelLeave(
  leaveRequestId: string,
  payload: CancelLeavePayload = {},
) {
  return apiRequest<LeaveRequest>(
    `/hr/leave-requests/${leaveRequestId}/cancel/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}