import {
  apiRequest,
} from "@/lib/api/client";

import type {
  AddStudentNotePayload,
  CompletedAdmissionFilters,
  CompletedAdmissionHandoff,
  CreateStudentFromAdmissionPayload,
  CreateStudentProcessPayload,
  StudentActivity,
  StudentDetail,
  StudentDocument,
  StudentFilters,
  StudentListItem,
  StudentProcess,
  StudentProcessFilters,
  StudentProcessStatusPayload,
  StudentProgressPayload,
} from "@/types/students";

function buildQuery(
  filters: Record<
    string,
    string | undefined
  >,
) {
  const params =
    new URLSearchParams();

  Object.entries(filters).forEach(
    ([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    },
  );

  const query =
    params.toString();

  return query
    ? `?${query}`
    : "";
}

// ============================================================
// STUDENT MASTER
// ============================================================

export function getStudents(
  filters: StudentFilters = {},
) {
  const query = buildQuery({
    search: filters.search,
    status: filters.status,
    institution:
      filters.institution,
    program: filters.program,
    vertical: filters.vertical,
    channel: filters.channel,
    assigned_coordinator:
      filters.assigned_coordinator,
  });

  return apiRequest<
    StudentListItem[]
  >(
    `/students/${query}`,
  );
}

export function getStudent(
  studentId: string,
) {
  return apiRequest<StudentDetail>(
    `/students/${studentId}/`,
  );
}

export function getActiveStudents() {
  return apiRequest<
    StudentListItem[]
  >(
    "/students/active/",
  );
}

// ============================================================
// COMPLETED ADMISSION → STUDENT HANDOFF
// ============================================================

export function getCompletedAdmissionHandoffs(
  filters:
    CompletedAdmissionFilters = {},
) {
  const query = buildQuery({
    search: filters.search,
    institution:
      filters.institution,
    program: filters.program,
    vertical: filters.vertical,
    channel: filters.channel,
  });

  return apiRequest<
    CompletedAdmissionHandoff[]
  >(
    `/students/completed-admissions/${query}`,
  );
}

export function createStudentFromAdmission(
  payload:
    CreateStudentFromAdmissionPayload,
) {
  return apiRequest<StudentDetail>(
    "/students/create-from-admission/",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

// ============================================================
// EDUCATION PROCESS QUEUES
// ============================================================

export function getStudentProcessQueue(
  filters:
    StudentProcessFilters = {},
) {
  const query = buildQuery({
    process_type:
      filters.process_type,
    status: filters.status,
    search: filters.search,
    overdue:
      filters.overdue
        ? "true"
        : undefined,
  });

  return apiRequest<
    StudentProcess[]
  >(
    `/students/process-queue/${query}`,
  );
}

export function getPendingStudentProcesses() {
  return apiRequest<
    StudentProcess[]
  >(
    "/students/pending-processes/",
  );
}

export function getOverdueStudentProcesses() {
  return apiRequest<
    StudentProcess[]
  >(
    "/students/overdue-processes/",
  );
}

// ============================================================
// STUDENT PROCESSES
// ============================================================

export function getStudentProcesses(
  studentId: string,
) {
  return apiRequest<
    StudentProcess[]
  >(
    `/students/${studentId}/processes/`,
  );
}

export function createStudentProcess(
  studentId: string,
  payload:
    CreateStudentProcessPayload,
) {
  return apiRequest<StudentProcess>(
    `/students/${studentId}/processes/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function initializeStudentProcesses(
  studentId: string,
) {
  return apiRequest<{
    created_count: number;
    processes: StudentProcess[];
  }>(
    `/students/${studentId}/initialize-processes/`,
    {
      method: "POST",
    },
  );
}

export function changeStudentProcessStatus(
  studentId: string,
  processId: string,
  payload:
    StudentProcessStatusPayload,
) {
  return apiRequest<StudentProcess>(
    `/students/${studentId}/processes/${processId}/status/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

// ============================================================
// DOCUMENTS
// ============================================================

export function getStudentDocuments(
  studentId: string,
) {
  return apiRequest<
    StudentDocument[]
  >(
    `/students/${studentId}/documents/`,
  );
}

export function addStudentDocument(
  studentId: string,
  formData: FormData,
) {
  return apiRequest<StudentDocument>(
    `/students/${studentId}/documents/`,
    {
      method: "POST",
      body: formData,
    },
  );
}

export function verifyStudentDocument(
  studentId: string,
  documentId: string,
  notes = "",
) {
  return apiRequest<StudentDocument>(
    `/students/${studentId}/documents/${documentId}/verify/`,
    {
      method: "POST",
      body: JSON.stringify({
        notes,
      }),
    },
  );
}

// ============================================================
// ACADEMIC PROGRESS
// ============================================================

export function updateStudentProgress(
  studentId: string,
  payload: StudentProgressPayload,
) {
  return apiRequest<StudentDetail>(
    `/students/${studentId}/progress/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

// ============================================================
// NOTES / ACTIVITY
// ============================================================

export function addStudentNote(
  studentId: string,
  payload:
    AddStudentNotePayload,
) {
  return apiRequest<StudentActivity>(
    `/students/${studentId}/note/`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function getStudentActivities(
  studentId: string,
) {
  return apiRequest<
    StudentActivity[]
  >(
    `/students/${studentId}/activities/`,
  );
}

// ============================================================
// COURSE COMPLETION
// ============================================================

export function completeStudentCourse(
  studentId: string,
  notes = "",
) {
  return apiRequest<StudentDetail>(
    `/students/${studentId}/complete-course/`,
    {
      method: "POST",
      body: JSON.stringify({
        notes,
      }),
    },
  );
}