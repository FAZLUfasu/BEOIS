export type TaskPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type TaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type TaskSourceModule =
  | "GENERAL"
  | "LEADS"
  | "ADMISSIONS"
  | "STUDENTS"
  | "PARTNERS"
  | "FINANCE"
  | "HR"
  | "EDUCATION";

export interface TaskUserSummary {
  id: string;
  username: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
}

export interface BeoisTask {
  id: string;

  title: string;
  description: string;

  assigned_to: string;
  assigned_to_name?: string;
  assigned_to_username?: string;

  assigned_by: string | null;
  assigned_by_name?: string | null;
  assigned_by_username?: string | null;

  priority: TaskPriority;
  status: TaskStatus;

  due_at: string | null;
  reminder_at: string | null;

  source_module: TaskSourceModule;
  source_object_id: string;
  source_label: string;

  completed_at: string | null;

  is_overdue?: boolean;

  created_at: string;
  updated_at: string;
}

export interface TaskAssignee {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  profile_picture: string | null;
  is_active: boolean;
  primary_role: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;

  assigned_to: string;

  priority: TaskPriority;
  status?: TaskStatus;

  due_at?: string | null;
  reminder_at?: string | null;

  source_module: TaskSourceModule;
  source_object_id?: string;
  source_label?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;

  assigned_to?: string;

  priority?: TaskPriority;
  status?: TaskStatus;

  due_at?: string | null;
  reminder_at?: string | null;

  source_module?: TaskSourceModule;
  source_object_id?: string;
  source_label?: string;
}

export interface MyTaskStatusPayload {
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
}