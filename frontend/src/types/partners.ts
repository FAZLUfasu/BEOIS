export type PartnerStatus =
  | "PROSPECT"
  | "ONBOARDING"
  | "ACTIVE"
  | "ON_HOLD"
  | "SUSPENDED"
  | "INACTIVE"
  | "TERMINATED";

export type PartnerType =
  | "EDUCATION_CENTRE"
  | "CONSULTANT"
  | "INDIVIDUAL"
  | "INSTITUTION"
  | "OTHER";

export type PartnerDocumentType =
  | "AADHAAR"
  | "PAN"
  | "GST"
  | "BUSINESS_PROOF"
  | "ADDRESS_PROOF"
  | "BANK_PROOF"
  | "AGREEMENT"
  | "PHOTO"
  | "OTHER";

export type PartnerDocumentStatus =
  | "PENDING"
  | "RECEIVED"
  | "VERIFIED"
  | "REJECTED";

export type PartnerCaseStatus =
  | "RECEIVED"
  | "UNDER_REVIEW"
  | "ADMISSION_CREATED"
  | "ENROLLED"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export type PartnerIssuePriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "URGENT";

export type PartnerIssueStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING"
  | "RESOLVED"
  | "CLOSED";

export type CommissionType =
  | "FIXED"
  | "PERCENTAGE";

export type CommissionStatus =
  | "EARNED"
  | "APPROVED"
  | "PAYABLE"
  | "PAID"
  | "CANCELLED";

export type PartnerVertical =
  | "REGULAR"
  | "CREDIT_TRANSFER";

export interface PartnerSimpleUser {
  id: string;
  username: string;
  email: string;
}

// ============================================================
// PARTNER MASTER
// ============================================================

export interface PartnerListItem {
  id: string;
  partner_id: string;

  name: string;

  partner_type: PartnerType;
  partner_type_display: string;

  status: PartnerStatus;
  status_display: string;

  contact_person: string;
  phone_number: string;
  email: string;

  city: string;
  district: string;
  state: string;
  territory: string;

  organization_name: string;

  relationship_manager:
    | PartnerSimpleUser
    | null;

  created_at: string;
  updated_at: string;
}

export interface PartnerDetail {
  id: string;
  partner_id: string;

  name: string;

  partner_type: PartnerType;
  partner_type_display: string;

  status: PartnerStatus;
  status_display: string;

  contact_person: string;
  phone_number: string;
  alternate_phone: string;
  email: string;

  address: string;
  city: string;
  district: string;
  state: string;
  postal_code: string;
  territory: string;

  organization_name: string;

  agreement_start_date:
    | string
    | null;

  agreement_end_date:
    | string
    | null;

  relationship_manager:
    | PartnerSimpleUser
    | null;

  created_by:
    | PartnerSimpleUser
    | null;

  notes: string;

  created_at: string;
  updated_at: string;
}

// ============================================================
// DOCUMENTS
// ============================================================

export interface PartnerDocument {
  id: string;

  document_type:
    PartnerDocumentType;

  document_type_display: string;

  title: string;

  file: string | null;

  status:
    PartnerDocumentStatus;

  status_display: string;

  verified_by:
    | PartnerSimpleUser
    | null;

  verified_at: string | null;

  rejection_reason: string;

  notes: string;

  created_at: string;
  updated_at: string;
}

// ============================================================
// PROGRAM ACCESS
// ============================================================

export interface PartnerProgramAccess {
  id: string;

  institution: string;
  institution_name: string;

  program: string;
  program_name: string;

  is_active: boolean;

  effective_from:
    | string
    | null;

  effective_to:
    | string
    | null;

  notes: string;

  created_at: string;
  updated_at: string;
}

// ============================================================
// CASES
// ============================================================

export interface PartnerCase {
  id: string;
  case_id: string;

  partner: string;

  admission: string | null;

  applicant_name: string;
  phone_number: string;

  institution:
    | string
    | null;

  institution_name: string | null;

  program:
    | string
    | null;

  program_name: string | null;

  vertical: PartnerVertical;

  partner_reference_number: string;

  status: PartnerCaseStatus;
  status_display: string;

  assigned_to:
    | PartnerSimpleUser
    | null;

  notes: string;

  created_at: string;
  updated_at: string;
}

// ============================================================
// COMMISSION RULES
// ============================================================

export interface CommissionRule {
  id: string;

  institution:
    | string
    | null;

  institution_name:
    | string
    | null;

  program:
    | string
    | null;

  program_name:
    | string
    | null;

  vertical: string;

  commission_type:
    CommissionType;

  commission_type_display:
    string;

  value: string;

  effective_from:
    | string
    | null;

  effective_to:
    | string
    | null;

  is_active: boolean;

  notes: string;

  created_at: string;
  updated_at: string;
}

// ============================================================
// COMMISSION TRANSACTIONS
// ============================================================

export interface CommissionTransaction {
  id: string;

  partner: string;

  partner_case:
    | string
    | null;

  admission:
    | string
    | null;

  rule:
    | string
    | null;

  base_amount: string;
  commission_amount: string;

  status: CommissionStatus;
  status_display: string;

  approved_by:
    | PartnerSimpleUser
    | null;

  approved_at:
    | string
    | null;

  paid_at:
    | string
    | null;

  payment_reference: string;
  notes: string;

  created_at: string;
  updated_at: string;
}

// ============================================================
// ISSUES
// ============================================================

export interface PartnerIssue {
  id: string;

  partner_case:
    | string
    | null;

  subject: string;
  description: string;

  priority:
    PartnerIssuePriority;

  priority_display: string;

  status:
    PartnerIssueStatus;

  status_display: string;

  assigned_to:
    | PartnerSimpleUser
    | null;

  resolved_at:
    | string
    | null;

  created_at: string;
  updated_at: string;
}

// ============================================================
// ACTIVITY
// ============================================================

export interface PartnerActivity {
  id: string;

  activity_type: string;

  activity_type_display:
    string;

  description: string;

  performed_by:
    | PartnerSimpleUser
    | null;

  created_at: string;
}

// ============================================================
// SUMMARY
// ============================================================

export interface PartnerSummary {
  partners: {
    total: number;
    active: number;
    prospects: number;
    onboarding: number;

    status_counts:
      Record<string, number>;
  };

  cases: {
    total: number;
    open: number;

    status_counts:
      Record<string, number>;
  };

  issues: {
    total: number;
    open: number;
    urgent_open: number;
  };

  commissions: {
    total: number;
    pending: number;
    paid: number;

    pending_amount: string;
    paid_amount: string;

    status_counts:
      Record<string, number>;
  };
}

// ============================================================
// FILTERS
// ============================================================

export interface PartnerFilters {
  search?: string;

  status?:
    | PartnerStatus
    | "";

  partner_type?:
    | PartnerType
    | "";

  state?: string;
  territory?: string;

  manager?: string;
}

// ============================================================
// INPUT PAYLOADS
// ============================================================

export interface CreatePartnerPayload {
  name: string;
  phone_number: string;

  partner_type?: PartnerType;

  contact_person?: string;
  email?: string;

  city?: string;
  district?: string;
  state?: string;
  territory?: string;

  organization_name?: string;

  relationship_manager_id?:
    | string
    | null;

  notes?: string;
}

export interface PartnerStatusPayload {
  status: PartnerStatus;
  notes?: string;
}

export interface AddPartnerNotePayload {
  description: string;
}

export interface GrantProgramAccessPayload {
  institution_id: string;
  program_id: string;

  effective_from?:
    | string
    | null;

  effective_to?:
    | string
    | null;

  notes?: string;
}

export interface ProgramAccessStatusPayload {
  is_active: boolean;
  notes?: string;
}

export interface CreatePartnerCasePayload {
  applicant_name: string;
  phone_number: string;

  institution_id?:
    | string
    | null;

  program_id?:
    | string
    | null;

  vertical?: PartnerVertical;

  partner_reference_number?: string;

  assigned_to_id?:
    | string
    | null;

  notes?: string;
}

export interface PartnerCaseStatusPayload {
  status: PartnerCaseStatus;
  notes?: string;
}

export interface LinkAdmissionPayload {
  admission_id: string;
}

export interface CreatePartnerIssuePayload {
  subject: string;
  description: string;

  priority?:
    PartnerIssuePriority;

  partner_case_id?:
    | string
    | null;

  assigned_to_id?:
    | string
    | null;
}

export interface PartnerIssueStatusPayload {
  status: PartnerIssueStatus;
  notes?: string;
}

export interface CreateCommissionRulePayload {
  commission_type:
    CommissionType;

  value: string;

  institution_id?:
    | string
    | null;

  program_id?:
    | string
    | null;

  vertical?: string;

  effective_from?:
    | string
    | null;

  effective_to?:
    | string
    | null;

  notes?: string;
}

export interface CreateCommissionTransactionPayload {
  rule_id: string;
  base_amount: string;

  partner_case_id?:
    | string
    | null;

  admission_id?:
    | string
    | null;

  notes?: string;
}

export interface CommissionActionPayload {
  notes?: string;
}

export interface MarkCommissionPaidPayload {
  payment_reference: string;
}

// ============================================================
// WORKSPACE
// ============================================================

export type PartnerWorkspaceView =
  | "PARTNERS"
  | "ACTIVE"
  | "CASES"
  | "ISSUES"
  | "COMMISSIONS";