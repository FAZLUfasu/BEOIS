export type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "HALF_DAY"
  | "LATE"
  | "WORK_FROM_HOME"
  | "ON_LEAVE"
  | "HOLIDAY"
  | "WEEK_OFF";


export interface Attendance {
  id: string;

  employee: string;
  employee_id: string;
  employee_name: string;

  date: string;

  status: AttendanceStatus;

  check_in: string | null;
  check_out: string | null;

  working_minutes: number;
  late_minutes: number;
  overtime_minutes: number;

  remarks: string;

  is_manual_adjustment: boolean;
  adjusted_by: string | null;
  adjusted_by_name: string | null;
  adjustment_reason: string;

  created_at: string;
  updated_at: string;
}


export interface AttendanceFilters {
  employee?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  status?: AttendanceStatus;
}


export interface AttendanceSummary {
  date: string;

  present: number;
  absent: number;
  half_day: number;
  late: number;
  work_from_home: number;
  on_leave: number;
  holiday: number;
  week_off: number;
}


export interface MarkAttendancePayload {
  employee: string;

  date?: string;

  status?: AttendanceStatus;

  check_in?: string | null;
  check_out?: string | null;

  remarks?: string;
}


export interface CheckInPayload {
  employee?: string;

  check_in_time?: string;

  remarks?: string;
}


export interface CheckOutPayload {
  employee?: string;

  check_out_time?: string;

  remarks?: string;
}


export interface AdjustAttendancePayload {
  status?: AttendanceStatus;

  check_in?: string | null;
  check_out?: string | null;

  remarks?: string;
}


/*
 * The missing-attendance endpoint returns
 * employees who do not yet have attendance
 * for the requested date.
 *
 * It uses the employee serializer shape, so
 * EmployeeListItem is used by the API layer.
 */