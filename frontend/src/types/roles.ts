export interface AdminRole {
  id: string;
  name: string;
  code: string;
  description?: string;
  is_active?: boolean;
  permissions?: number[];
  created_at?: string;
  updated_at?: string;
}

export interface CreateAdminRolePayload {
  name: string;
  code: string;
  description?: string;
  is_active?: boolean;
  permissions?: number[];
}