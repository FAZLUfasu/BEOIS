export interface SystemSettings {
  id: string;

  system_name: string;
  system_short_name: string;
  timezone: string;
  currency_code: string;
  currency_symbol: string;
  date_format: string;

  financial_year_start_month: number;

  lead_prefix: string;
  credit_transfer_prefix: string;
  admission_prefix: string;
  student_prefix: string;
  partner_prefix: string;
  partner_case_prefix: string;
  employee_prefix: string;
  identifier_padding: number;

  default_callback_minutes: number;
  default_followup_days: number;

  default_academic_session: string;
  admission_document_reminder_days: number;
  admission_fee_reminder_days: number;

  standard_working_minutes: number;
  attendance_grace_minutes: number;
  payroll_default_payment_method: string;

  max_upload_size_mb: number;
  document_retention_days: number;

  notifications_enabled: boolean;
  reminder_notification_days: number;

  session_timeout_minutes: number;
  require_mfa_for_management: boolean;

  updated_at: string;
  updated_by?: string | null;
}

export type SystemSettingsUpdate =
  Partial<Omit<SystemSettings, "id" | "updated_at" | "updated_by">>;

export interface SystemSettingsAudit {
  id: string;
  changed_fields: Record<
    string,
    {
      old?: unknown;
      new?: unknown;
    } | unknown
  >;
  changed_by?: string | null;
  changed_by_name?: string | null;
  created_at: string;
}