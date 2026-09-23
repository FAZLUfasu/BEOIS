export interface AdminRole {
  id: string;
  name: string;
  code: string;
  description?: string;
  is_active?: boolean;
}

export interface AdminScopeReference {
  id: string;
  name: string;
}

export interface AdminUserRole {
  id: string;
  role: string;
  role_name: string;
  role_code: string;
  scope_type: string;
  scope_display: string;
  business_unit: string | null;
  business_unit_name: string | null;
  branch: string | null;
  branch_name: string | null;
  department: string | null;
  department_name: string | null;
  is_active: boolean;
  notes: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string;
  profile_picture: string | null;
  is_active: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string | null;
  roles: AdminUserRole[];
}

export interface CreateAdminUserPayload {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  is_active: boolean;
  password: string;
  confirm_password: string;
}

export interface UpdateAdminUserPayload {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  is_active?: boolean;
}

export interface ResetPasswordPayload {
  new_password: string;
  confirm_password: string;
}

export interface UserRolePayload {
  role: string;
  scope_type: string;
  business_unit?: string | null;
  branch?: string | null;
  department?: string | null;
  is_active?: boolean;
  notes?: string;
}