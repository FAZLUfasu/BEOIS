export interface ScopeReference {
  id: string;
  name: string;
}

export interface UserRole {
  id: string;
  code: string;
  name: string;
  scope_type: string;
  scope_display: string;
  business_unit: ScopeReference | null;
  branch: ScopeReference | null;
  department: ScopeReference | null;
}

export interface CurrentUser {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string;
  profile_picture: string | null;
  is_superuser: boolean;
  roles: UserRole[];
  permissions: string[];
}

export interface TokenPair {
  access: string;
  refresh: string;
}