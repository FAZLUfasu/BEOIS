// export interface PartnerUserMini {
//   id: string;
//   username: string;
//   email: string;
// }

// export interface PartnerListItem {
//   id: string;
//   partner_id: string;
//   name: string;

//   partner_type: string;
//   partner_type_display: string;

//   status: string;
//   status_display: string;

//   contact_person: string;
//   phone_number: string;
//   email: string;

//   city: string;
//   district: string;
//   state: string;
//   territory: string;

//   organization_name: string;

//   relationship_manager: PartnerUserMini | null;

//   created_at: string;
//   updated_at: string;
// }
export type PartnerStatus =
  | "PROSPECT"
  | "ONBOARDING"
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | "TERMINATED";

export type PartnerType =
  | "EDUCATION_CENTRE"
  | "CONSULTANT"
  | "FRANCHISE"
  | "AGENT"
  | "OTHER";

export type PartnerCaseStatus =
  | "RECEIVED"
  | "UNDER_REVIEW"
  | "LEAD_CREATED"
  | "ADMISSION_CREATED"
  | "IN_PROCESS"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export type PartnerIssueStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING"
  | "RESOLVED"
  | "CLOSED";

export type PartnerIssuePriority =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "URGENT";

export type CommissionStatus =
  | "EARNED"
  | "APPROVED"
  | "PAYABLE"
  | "PAID"
  | "CANCELLED";

export interface PartnerSimpleUser {
  id: string;
  username: string;
  email: string;
}

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
  state: string;
  territory: string;

  relationship_manager:
    | PartnerSimpleUser
    | null;

  created_at: string;
  updated_at: string;
}

export interface PartnerCase {
  id: string;
  case_id: string;

  partner: string;
  partner_name: string;

  applicant_name: string;
  phone_number: string;
  email?: string;

  institution?: string | null;
  institution_name?: string;

  program?: string | null;
  program_name?: string;

  vertical: string;

  status: PartnerCaseStatus;
  status_display: string;

  assigned_to:
    | PartnerSimpleUser
    | null;

  created_at: string;
  updated_at: string;
}

export interface PartnerIssue {
  id: string;

  partner: string;
  partner_name?: string;

  partner_case: string | null;

  subject: string;
  description: string;

  priority: PartnerIssuePriority;
  priority_display: string;

  status: PartnerIssueStatus;
  status_display: string;

  assigned_to:
    | PartnerSimpleUser
    | null;

  resolved_at: string | null;

  created_at: string;
  updated_at: string;
}

export interface CommissionTransaction {
  id: string;

  partner: string;
  partner_name?: string;

  partner_case: string | null;
  admission: string | null;
  rule: string | null;

  base_amount: string;
  commission_amount: string;

  status: CommissionStatus;
  status_display: string;

  approved_by:
    | PartnerSimpleUser
    | null;

  approved_at: string | null;
  payable_at: string | null;
  paid_at: string | null;

  payment_reference: string;
  notes: string;

  created_at: string;
  updated_at: string;
}

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

export interface PartnerFilters {
  search?: string;

  status?: PartnerStatus | "";

  partner_type?: PartnerType | "";

  state?: string;
  territory?: string;
}

export type PartnerWorkspaceView =
  | "PARTNERS"
  | "ACTIVE"
  | "CASES"
  | "ISSUES"
  | "COMMISSIONS";