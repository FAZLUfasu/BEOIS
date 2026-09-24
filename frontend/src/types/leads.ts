export type LeadVertical =
  | "REGULAR"
  | "CREDIT_TRANSFER";

export type LeadChannel =
  | "DIRECT"
  | "PARTNER";

export type LeadStatus =
  | "NEW"
  | "ASSIGNED"
  | "CONTACTED"
  | "INTERESTED"
  | "FOLLOW_UP"
  | "QUALIFIED"
  | "CONVERTED"
  | "NOT_INTERESTED"
  | "CLOSED";

export type CallOutcome =
  | "INTERESTED"
  | "NOT_INTERESTED"
  | "CALLBACK"
  | "NO_ANSWER"
  | "BUSY"
  | "WRONG_NUMBER"
  | "SWITCHED_OFF"
  | "OTHER";

export interface UserMini {
  id: string;
  username: string;
  email: string;
}

export interface LeadActivity {
  id: string;
  activity_type: string;
  activity_type_display: string;
  description: string;
  performed_by: UserMini | null;
  created_at: string;
}

export interface CallLog {
  id: string;
  outcome: CallOutcome;
  outcome_display: string;
  notes: string;
  called_at: string;
  follow_up_at: string | null;
  duration_seconds: number | null;
  telecaller: UserMini | null;
  created_at: string;
}

export type QualificationLevel =
  | "UNSPECIFIED"
  | "SSLC"
  | "PLUS_TWO"
  | "DIPLOMA"
  | "UG"
  | "PG"
  | "OTHER";

export type RequiredProgramLevel =
  | "UG"
  | "PG"
  | "DIPLOMA"
  | "CERTIFICATE"
  | "OTHER";

export type EligibilityStatus =
  | "PENDING"
  | "ELIGIBLE"
  | "NOT_ELIGIBLE"
  | "REVIEW_REQUIRED";

export type ProgramStudyMode =
  | "DISTANCE"
  | "ONLINE"
  | "REGULAR"
  | "HYBRID"
  | "OTHER";

export interface LeadQualification {
  id: string;
  highest_qualification: QualificationLevel;
  highest_qualification_display: string;
  stream: string;
  board_or_university: string;
  year_of_passing: number | null;
  percentage_or_grade: string;
  required_level: RequiredProgramLevel;
  required_level_display: string;
  interest_area: string;
  selected_institution: string | null;
  selected_institution_name: string | null;
  selected_program: string | null;
  selected_program_name: string | null;
  selected_program_code: string;
  customer_budget: string | null;
  quoted_fee: string | null;
  eligibility_status: EligibilityStatus;
  eligibility_status_display: string;
  eligibility_notes: string;
  qualified_by: UserMini | null;
  qualified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseFeeInstallment {
  id: string;
  installment_number: number;
  label: string;
  amount: string;
  due_stage: string;
  notes: string;
}

export interface CourseFeePlan {
  id: string;
  name: string;
  student_total_fee: string | null;
  registration_fee: string | null;
  exam_fee: string | null;
  other_fee: string | null;
  notes: string;
  installments: CourseFeeInstallment[];
}

export interface LeadCourseOption {
  id: string;
  institution_id: string;
  institution_name: string;
  name: string;
  code: string;
  level: RequiredProgramLevel;
  level_display: string;
  duration_years: number | null;
  duration_semesters: number | null;
  study_mode: ProgramStudyMode;
  study_mode_display: string;
  specialization: string;
  eligibility_text: string;
  minimum_qualification: QualificationLevel;
  minimum_qualification_display: string;
  required_stream: string;
  eligibility_review_required: boolean;
  is_credit_transfer_available: boolean;
  fee_plans: CourseFeePlan[];
  eligibility_result: EligibilityStatus;
  eligibility_reason: string;
}

export type LeadAppointmentPurpose =
  | "COUNSELLING"
  | "DOCUMENTS"
  | "ADMISSION"
  | "OTHER";

export type LeadAppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "ARRIVED"
  | "COMPLETED"
  | "RESCHEDULED"
  | "CANCELLED"
  | "NO_SHOW";

export interface LeadAppointment {
  id: string;
  purpose: LeadAppointmentPurpose;
  purpose_display: string;
  scheduled_at: string;
  branch: string;
  branch_name: string;
  assigned_counsellor: UserMini | null;
  number_of_visitors: number;
  notes: string;
  status: LeadAppointmentStatus;
  status_display: string;
  created_by: UserMini | null;
  created_at: string;
  updated_at: string;
}

export interface VisitBranch {
  id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  is_head_office: boolean;
}

export interface SaveLeadQualificationPayload {
  highest_qualification: QualificationLevel;
  stream?: string;
  board_or_university?: string;
  year_of_passing?: number | null;
  percentage_or_grade?: string;
  required_level: RequiredProgramLevel;
  interest_area?: string;
  selected_program?: string | null;
  customer_budget?: string | null;
  quoted_fee?: string | null;
}

export interface LeadCourseOptionFilters {
  institution?: string;
  level?: RequiredProgramLevel;
  study_mode?: ProgramStudyMode;
  search?: string;
}

export interface ScheduleLeadAppointmentPayload {
  purpose: LeadAppointmentPurpose;
  scheduled_at: string;
  branch: string;
  number_of_visitors: number;
  notes?: string;
}

export interface UpdateLeadAppointmentStatusPayload {
  status: LeadAppointmentStatus;
  scheduled_at?: string | null;
  notes?: string;
}

export interface LeadListItem {
  id: string;
  lead_id: string;
  name: string;
  phone_number: string;
  email: string;
  city: string;
  state: string;

  vertical: LeadVertical;
  vertical_display: string;

  channel: LeadChannel;
  channel_display: string;

  partner: string | null;
  partner_name: string | null;

  source: string;
  campaign: string;
  interested_course: string;

  status: LeadStatus;
  status_display: string;

  assigned_to: UserMini | null;
  next_follow_up_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface LeadDetail {
  id: string;
  lead_id: string;
  name: string;
  phone_number: string;
  alternate_phone: string;
  email: string;
  city: string;
  state: string;

  vertical: LeadVertical;
  vertical_display: string;

  channel: LeadChannel;
  channel_display: string;

  partner: string | null;
  partner_reference_number: string;

  source: string;
  campaign: string;
  interested_course: string;
  previous_course: string;

  status: LeadStatus;
  status_display: string;

  assigned_to: UserMini | null;
  assigned_at: string | null;
  next_follow_up_at: string | null;

  notes: string;
  created_by: UserMini | null;
  converted_at: string | null;

  created_at: string;
  updated_at: string;

  qualification: LeadQualification | null;
  appointments: LeadAppointment[];
  activities: LeadActivity[];
  call_logs: CallLog[];
}

export interface LeadFormPayload {
  name: string;
  phone_number: string;
  alternate_phone?: string;
  email?: string;
  city?: string;
  state?: string;

  vertical: LeadVertical;
  channel: LeadChannel;

  partner?: string | null;
  partner_reference_number?: string;

  source?: string;
  campaign?: string;
  interested_course?: string;
  previous_course?: string;
  notes?: string;
}

export interface LeadUpdatePayload
  extends LeadFormPayload {
  next_follow_up_at?: string | null;
}

export interface LeadFilters {
  search?: string;
  status?: LeadStatus | "";
  vertical?: LeadVertical | "";
  channel?: LeadChannel | "";
  assigned_to?: string;
}

export interface RecordCallPayload {
  outcome: CallOutcome;
  notes?: string;
  follow_up_at?: string | null;
  duration_seconds?: number | null;
}

export interface RecordCallResponse {
  message: string;
  call_id: string;
  lead: LeadDetail;
}

export interface ChangeLeadStatusPayload {
  status: LeadStatus;
  notes?: string;
}

export interface AssignLeadPayload {
  user_id: string;
}
/* ============================================================
   LEAD DISTRIBUTION
============================================================ */

export interface LeadWorkloadItem {
  employee_id: string;
  employee_code: string;
  user_id: string;
  name: string;
  username: string;
  department: string | null;
  branch: string | null;
  active_leads: number;
}

export interface LeadWorkloadResponse {
  employees: LeadWorkloadItem[];
}

export interface BulkAssignLeadsPayload {
  lead_ids: string[];
  user_id: string;
}

export interface BulkAssignLeadsResponse {
  assigned_count: number;
  message?: string;
}

export interface DistributeLeadsPayload {
  lead_ids: string[];
  user_ids: string[];
}

export interface DistributeLeadsResponse {
  distributed_count: number;
  employee_count: number;
  message?: string;
}
