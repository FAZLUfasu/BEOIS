import type {
  EmploymentStatus,
  EmploymentType,
} from "@/types/employees";

export interface UserDirectoryItem {
  id: string;
  username: string;
  email: string;

  first_name: string;
  last_name: string;
  full_name: string;

  phone_number: string;
  is_active: boolean;

  employee_id: string | null;
  has_employee_profile: boolean;
}

export interface Designation {
  id: string;

  name: string;
  code: string;
  description: string;

  is_active: boolean;

  created_at: string;
  updated_at: string;
}

export interface DesignationPayload {
  name: string;
  code: string;
  description: string;
  is_active: boolean;
}

export interface EmployeeFilters {
  search?: string;
  branch?: string;
  department?: string;

  employment_type?: EmploymentType;
  employment_status?: EmploymentStatus;
}