export type StudentStatus =
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "DISCONTINUED"
  | "CANCELLED";

export type StudentVertical =
  | "REGULAR"
  | "CREDIT_TRANSFER";

export type StudentChannel =
  | "DIRECT"
  | "PARTNER";

export type StudentProcessType =
  | "EXAM"
  | "SEMINAR"
  | "PROJECT"
  | "RESULT"
  | "MARK_SHEET"
  | "CERTIFICATE";

export type StudentProcessStatus =
  | "NOT_STARTED"
  | "PENDING"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "COMPLETED"
  | "NOT_APPLICABLE"
  | "CANCELLED";

export type StudentDocumentType =
  | "EXAM_APPLICATION"
  | "HALL_TICKET"
  | "SEMINAR"
  | "PROJECT"
  | "RESULT"
  | "MARK_SHEET"
  | "PROVISIONAL"
  | "DEGREE_CERTIFICATE"
  | "TRANSFER_CERTIFICATE"
  | "OTHER";

export interface StudentSimpleUser {
  id: string;
  username: string;
  email: string;
}

export interface StudentProcess {
  id: string;
  
  student: string;
  student_id: string;
  student_name: string;

  process_type: StudentProcessType;
  process_type_display: string;

  title: string;

  academic_year: number | null;
  semester: number | null;

  status: StudentProcessStatus;
  status_display: string;

  due_date: string | null;
  submitted_at: string | null;
  completed_at: string | null;

  assigned_to: StudentSimpleUser | null;

  reference_number: string;
  notes: string;

  created_at: string;
  updated_at: string;
}

export interface StudentDocument {
  id: string;

  process: string | null;

  document_type: StudentDocumentType;
  document_type_display: string;

  title: string;

  file: string | null;

  reference_number: string;

  issued_date: string | null;
  received_date: string | null;

  verified: boolean;

  verified_by: StudentSimpleUser | null;

  notes: string;

  created_at: string;
  updated_at: string;
}

export interface StudentActivity {
  id: string;

  activity_type: string;
  activity_type_display: string;

  description: string;

  performed_by: StudentSimpleUser | null;

  created_at: string;
}

export interface StudentListItem {
  id: string;
  student_id: string;

  name: string;
  phone_number: string;
  email: string;

  institution: string;
  institution_name: string;

  program: string;
  program_name: string;

  academic_session: string;
  enrollment_number: string;

  vertical: StudentVertical;
  channel: StudentChannel;

  current_year: number;
  current_semester: number;

  status: StudentStatus;
  status_display: string;

  assigned_coordinator:
    | StudentSimpleUser
    | null;

  created_at: string;
  updated_at: string;
}

export interface StudentDetail {
  id: string;
  student_id: string;

  admission: string;

  name: string;

  date_of_birth: string | null;
  gender: string;

  phone_number: string;
  alternate_phone: string;
  email: string;

  address: string;
  city: string;
  state: string;
  postal_code: string;

  institution: string;
  institution_name: string;

  program: string;
  program_name: string;

  academic_session: string;

  enrollment_number: string;
  university_admission_number: string;

  vertical: StudentVertical;
  channel: StudentChannel;

  current_year: number;
  current_semester: number;

  status: StudentStatus;
  status_display: string;

  course_started_at: string | null;
  course_completed_at: string | null;

  assigned_coordinator:
    | StudentSimpleUser
    | null;

  created_by:
    | StudentSimpleUser
    | null;

  notes: string;

  processes: StudentProcess[];
  documents: StudentDocument[];
  activities: StudentActivity[];

  created_at: string;
  updated_at: string;
}

export interface CompletedAdmissionHandoff {
  id: string;
  admission_id: string;

  applicant_name: string;

  phone_number: string;
  alternate_phone: string;
  email: string;

  city: string;
  state: string;

  institution: string;
  institution_name: string;

  program: string;
  program_name: string;

  academic_session: string;

  vertical: StudentVertical;
  vertical_display: string;

  channel: StudentChannel;
  channel_display: string;

  enrollment_number: string;
  university_admission_number: string;

  assigned_to:
    | StudentSimpleUser
    | null;

  completed_at: string | null;

  notes: string;

  created_at: string;
  updated_at: string;
}

export interface StudentFilters {
  search?: string;

  status?: StudentStatus | "";

  institution?: string;
  program?: string;

  vertical?: StudentVertical | "";
  channel?: StudentChannel | "";

  assigned_coordinator?: string;
}

export interface CompletedAdmissionFilters {
  search?: string;

  institution?: string;
  program?: string;

  vertical?: StudentVertical | "";
  channel?: StudentChannel | "";
}

export interface StudentProcessFilters {
  process_type?: StudentProcessType | "";

  status?: StudentProcessStatus | "";

  search?: string;

  overdue?: boolean;
}

export interface CreateStudentFromAdmissionPayload {
  admission_id: string;

  assigned_coordinator_id?: string | null;

  initialize_processes?: boolean;
}

export interface CreateStudentProcessPayload {
  process_type: StudentProcessType;

  title?: string;

  academic_year?: number | null;
  semester?: number | null;

  due_date?: string | null;

  assigned_to_id?: string | null;

  notes?: string;
}

export interface StudentProcessStatusPayload {
  status: StudentProcessStatus;
  notes?: string;
}

export interface StudentProgressPayload {
  current_year?: number | null;
  current_semester?: number | null;
  notes?: string;
}

export interface AddStudentNotePayload {
  description: string;
}

export type EducationWorkspaceView =
  | "STUDENTS"
  | "HANDOFF"
  | "EXAM"
  | "SEMINAR"
  | "PROJECT"
  | "RESULT"
  | "MARK_SHEET"
  | "CERTIFICATE"
  | "PENDING"
  | "OVERDUE";