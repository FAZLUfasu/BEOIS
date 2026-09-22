export interface OrganizationBranch {
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

export interface OrganizationDepartment {
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