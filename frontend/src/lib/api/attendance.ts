import {
  apiRequest,
} from "@/lib/api/client";

import type {
  EmployeeListItem,
} from "@/types/employees";

import type {
  AdjustAttendancePayload,
  Attendance,
  AttendanceFilters,
  AttendanceSummary,
  CheckInPayload,
  CheckOutPayload,
  MarkAttendancePayload,
} from "@/types/attendance";


function buildQuery(
  params: Record<
    string,
    string | undefined
  >,
) {
  const searchParams =
    new URLSearchParams();

  Object.entries(
    params,
  ).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== ""
      ) {
        searchParams.set(
          key,
          value,
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


export async function getAttendance(
  filters: AttendanceFilters = {},
) {
  return apiRequest<
    Attendance[]
  >(
    `/hr/attendance/${buildQuery({
      employee:
        filters.employee,

      date:
        filters.date,

      start_date:
        filters.start_date,

      end_date:
        filters.end_date,

      status:
        filters.status,
    })}`,
  );
}


export async function getAttendanceRecord(
  attendanceId: string,
) {
  return apiRequest<Attendance>(
    `/hr/attendance/${attendanceId}/`,
  );
}


export async function getDailyAttendance(
  date: string,
) {
  return apiRequest<
    Attendance[]
  >(
    `/hr/attendance/daily/${buildQuery({
      date,
    })}`,
  );
}


export async function getAttendanceSummary(
  date: string,
) {
  return apiRequest<
    AttendanceSummary
  >(
    `/hr/attendance/summary/${buildQuery({
      date,
    })}`,
  );
}


export async function getMissingAttendance(
  date: string,
) {
  return apiRequest<
    EmployeeListItem[]
  >(
    `/hr/attendance/missing/${buildQuery({
      date,
    })}`,
  );
}


export async function markAttendance(
  payload: MarkAttendancePayload,
) {
  return apiRequest<Attendance>(
    "/hr/attendance/mark/",
    {
      method: "POST",

      body:
        JSON.stringify(
          payload,
        ),
    },
  );
}


export async function checkIn(
  payload: CheckInPayload = {},
) {
  return apiRequest<Attendance>(
    "/hr/attendance/check-in/",
    {
      method: "POST",

      body:
        JSON.stringify(
          payload,
        ),
    },
  );
}


export async function checkOut(
  payload: CheckOutPayload = {},
) {
  return apiRequest<Attendance>(
    "/hr/attendance/check-out/",
    {
      method: "POST",

      body:
        JSON.stringify(
          payload,
        ),
    },
  );
}


export async function adjustAttendance(
  attendanceId: string,

  payload: AdjustAttendancePayload,
) {
  return apiRequest<Attendance>(
    `/hr/attendance/${attendanceId}/adjust/`,
    {
      method: "POST",

      body:
        JSON.stringify(
          payload,
        ),
    },
  );
}