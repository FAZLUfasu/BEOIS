export interface Trust {
  id: string;
  name: string;
  short_name: string;
  registration_number: string;
  phone_number: string;
  email: string;
  address: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessUnit {
  id: string;
  trust: string;
  trust_name: string;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Branch {
  id: string;
  business_unit: string;
  business_unit_name: string;

  trust: string;
  trust_name: string;

  name: string;
  code: string;

  phone_number: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;

  is_head_office: boolean;
  is_active: boolean;

  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;

  branch: string | null;
  branch_name: string | null;

  business_unit: string | null;
  business_unit_name: string | null;

  name: string;
  code: string;
  description: string;

  is_active: boolean;

  created_at: string;
  updated_at: string;
}

/*
 * Backward-compatible names used by the existing
 * HR employee forms.
 */
export type OrganizationBranch = Branch;
export type OrganizationDepartment = Department;

export type OrganizationTab =
  | "overview"
  | "trusts"
  | "units"
  | "branches"
  | "departments";