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