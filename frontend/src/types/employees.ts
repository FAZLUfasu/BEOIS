export type EmploymentType =
  | "FULL_TIME"
  | "PART_TIME"
  | "CONTRACT"
  | "INTERN";

export type EmploymentStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "RESIGNED"
  | "TERMINATED"
  | "ON_LEAVE";

export interface EmployeeListItem {
  id: string;
  employee_id: string;

  user: string | null;
  employee_name: string;

  branch: string | null;
  branch_name: string | null;

  department: string | null;
  department_name: string | null;

  designation: string;

  designation_master: string | null;
  designation_master_name: string | null;

  current_designation: string;

  reporting_manager: string | null;
  reporting_manager_employee_id: string | null;

  employment_type: EmploymentType;
  employment_status: EmploymentStatus;

  date_of_joining: string | null;
  date_of_exit: string | null;

  phone_number: string;
  alternate_phone_number: string;
  personal_email: string;

  address: string;

  emergency_contact_name: string;
  emergency_contact_number: string;

  notes: string;

  created_at: string;
  updated_at: string;
}

export interface EmployeePayload {
  user: string | null;

  branch: string;
  department: string;

  designation: string;
  designation_master: string | null;

  reporting_manager: string | null;

  employment_type: EmploymentType;
  employment_status: EmploymentStatus;

  date_of_joining: string | null;
  date_of_exit: string | null;

  phone_number: string;
  alternate_phone_number: string;
  personal_email: string;

  address: string;

  emergency_contact_name: string;
  emergency_contact_number: string;

  notes: string;
}