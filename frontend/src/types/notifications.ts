export type NotificationType =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "REMINDER"
  | "TASK"
  | "SYSTEM";

export type NotificationSourceModule =
  | "GENERAL"
  | "LEADS"
  | "ADMISSIONS"
  | "STUDENTS"
  | "PARTNERS"
  | "FINANCE"
  | "HR"
  | "EDUCATION";

export interface BeoisNotification {
  id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  task: string | null;
  task_title: string | null;
  source_module: NotificationSourceModule;
  source_object_id: string;
  action_url: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationUnreadCount {
  unread_count: number;
}

export interface MarkAllReadResponse {
  updated: number;
}