export type AdmissionStatus =
  | "DRAFT"
  | "DOCUMENT_PENDING"
  | "DOCUMENT_VERIFICATION"
  | "ELIGIBILITY_PENDING"
  | "ELIGIBLE"
  | "NOT_ELIGIBLE"
  | "FEE_PENDING"
  | "READY_TO_APPLY"
  | "APPLIED"
  | "ENROLLMENT_PENDING"
  | "COMPLETED"
  | "CANCELLED";

export type AdmissionVertical =
  | "REGULAR"
  | "CREDIT_TRANSFER";

export type AdmissionChannel =
  | "DIRECT"
  | "PARTNER";

export interface SimpleUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface Institution {
  id: string;
  name: string;
  short_name: string;
  code: string;
  state: string;
  city: string;
  website: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Program {
  id: string;
  institution: string;
  institution_name: string;
  name: string;
  code: string;
  level: string;
  level_display: string;
  duration_years: number | null;
  duration_semesters: number | null;
  is_credit_transfer_available: boolean;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AdmissionDocument {
  id: string;
  document_type: string;
  document_type_display: string;
  document_name: string;
  file: string | null;
  status: string;
  status_display: string;
  verified_by: SimpleUser | null;
  verified_at: string | null;
  rejection_reason: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AdmissionFee {
  id: string;
  fee_type: string;
  fee_type_display: string;
  description: string;
  amount: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdmissionPayment {
  id: string;
  amount: string;
  payment_method: string;
  payment_method_display: string;
  reference_number: string;
  receipt_number: string;
  paid_at: string;
  received_by: SimpleUser | null;
  notes: string;
  created_at: string;
}

export interface AdmissionActivity {
  id: string;
  activity_type: string;
  activity_type_display: string;
  description: string;
  performed_by: SimpleUser | null;
  created_at: string;
}

export interface AdmissionListItem {
  id: string;
  admission_id: string;

  applicant_name: string;
  phone_number: string;
  email: string;

  institution: string;
  institution_name: string;

  program: string;
  program_name: string;

  academic_session: string;

  vertical: AdmissionVertical;
  vertical_display: string;

  channel: AdmissionChannel;
  channel_display: string;

  status: AdmissionStatus;
  status_display: string;

  assigned_to: SimpleUser | null;

  created_at: string;
  updated_at: string;
}

export interface AdmissionDetail {
  id: string;
  admission_id: string;

  lead: string | null;
  lead_id: string | null;
  lead_qualification: HandoffQualification | null;

  applicant_name: string;
  date_of_birth: string | null;
  gender: string;
  phone_number: string;
  alternate_phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;

  institution: Institution;
  program: Program;
  academic_session: string;

  vertical: AdmissionVertical;
  vertical_display: string;

  channel: AdmissionChannel;
  channel_display: string;

  partner: string | null;
  partner_id: string | null;
  partner_reference: string;

  previous_institution: string;
  previous_program: string;
  previous_registration_number: string;

  completed_years: number | null;
  completed_semesters: number | null;

  credit_transfer_notes: string;

  university_application_number: string;
  enrollment_number: string;
  university_admission_number: string;

  applied_at: string | null;
  completed_at: string | null;

  status: AdmissionStatus;
  status_display: string;

  assigned_to: SimpleUser | null;
  created_by: SimpleUser | null;

  notes: string;

  documents: AdmissionDocument[];
  fees: AdmissionFee[];
  payments: AdmissionPayment[];

  created_at: string;
  updated_at: string;
}

export interface AdmissionFilters {
  search?: string;
  status?: AdmissionStatus | "";
  institution?: string;
  program?: string;
  vertical?: AdmissionVertical | "";
  channel?: AdmissionChannel | "";
  assigned_to?: string;
  partner?: string;
}

export interface AdmissionFeeSummary {
  admission_id: string;
  total_fee: string;
  total_paid: string;
  balance: string;
}

export type AdmissionQueue =
  | "ALL"
  | "PENDING"
  | "DOCUMENT_PENDING"
  | "FEE_PENDING"
  | "ENROLLMENT_PENDING";
export interface HandoffQualification {
  id: string;
  highest_qualification: string;
  highest_qualification_display: string;
  stream: string;
  board_or_university: string;
  year_of_passing: number | null;
  percentage_or_grade: string;
  required_level: string;
  required_level_display: string;
  interest_area: string;
  selected_institution: string | null;
  selected_institution_name: string | null;
  selected_program: string | null;
  selected_program_name: string | null;
  selected_program_code: string;
  customer_budget: string | null;
  quoted_fee: string | null;
  eligibility_status: string;
  eligibility_status_display: string;
  eligibility_notes: string;
  qualified_at: string | null;
}

export interface QualifiedLeadHandoff {
  id: string;
  lead_id: string;

  name: string;
  phone_number: string;
  alternate_phone: string;
  email: string;

  city: string;
  state: string;

  interested_course: string;

  vertical: AdmissionVertical;
  vertical_display: string;

  channel: AdmissionChannel;
  channel_display: string;

  source: string;
  campaign: string;

  partner: string | null;
  partner_id: string | null;
  partner_name: string | null;
  partner_reference_number: string;

  previous_course: string;

  assigned_to: SimpleUser | null;
  qualification: HandoffQualification | null;

  notes: string;

  created_at: string;
  updated_at: string;
}

export interface QualifiedLeadFilters {
  search?: string;
  vertical?: AdmissionVertical | "";
  channel?: AdmissionChannel | "";
  source?: string;
  campaign?: string;
}
export interface ConvertLeadPayload {
  lead_id: string;
  institution_id?: string | null;
  program_id?: string | null;
  assigned_to_id?: string | null;
  academic_session?: string;
}

export interface AdmissionStatusPayload {
  status: AdmissionStatus;
  notes?: string;
}

export interface AddAdmissionNotePayload {
  description: string;
}

export interface AddAdmissionFeePayload {
  fee_type: string;
  amount: string;
  description?: string;
  due_date?: string | null;
}

export interface RecordAdmissionPaymentPayload {
  amount: string;
  payment_method: string;
  reference_number?: string;
  receipt_number?: string;
  notes?: string;
}

export interface UniversityApplicationPayload {
  application_number: string;
}

export interface EnrollmentPayload {
  enrollment_number: string;
  university_admission_number?: string;
}
