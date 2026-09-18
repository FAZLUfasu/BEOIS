import type {
  LeadChannel,
  LeadVertical,
  UserMini,
} from "@/types/leads";

export type LeadImportBatchStatus =
  | "UPLOADED"
  | "VALIDATED"
  | "IMPORTING"
  | "COMPLETED"
  | "FAILED";

export type LeadImportRowStatus =
  | "VALID"
  | "DUPLICATE"
  | "INVALID"
  | "IMPORTED";

export interface LeadImportRow {
  id: string;
  row_number: number;

  name: string;
  phone_number: string;
  email: string;
  city: string;
  state: string;
  interested_course: string;

  status: LeadImportRowStatus;
  error_message: string;

  existing_lead_id: string | null;
  imported_lead_id: string | null;

  created_at: string;
}

export interface LeadImportBatch {
  id: string;

  file_name: string;
  source: string;
  campaign: string;

  default_vertical: LeadVertical;
  vertical_display: string;

  default_channel: LeadChannel;
  channel_display: string;

  total_rows: number;
  valid_rows: number;
  duplicate_rows: number;
  invalid_rows: number;
  imported_rows: number;

  status: LeadImportBatchStatus;
  status_display: string;

  uploaded_by: UserMini | null;

  created_at: string;
  completed_at: string | null;
}

export interface LeadImportBatchDetail
  extends LeadImportBatch {
  rows: LeadImportRow[];
}

export interface LeadImportPreviewPayload {
  file: File;
  source: string;
  campaign?: string;
  default_vertical: LeadVertical;
  default_channel: LeadChannel;
}