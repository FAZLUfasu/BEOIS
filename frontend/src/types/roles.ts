export interface AdminPermission {
  id: number;
  app_label: string;
  model: string;
  codename: string;
  name: string;
}

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

export interface UpdateAdminRolePayload {
  name?: string;
  code?: string;
  description?: string;
  is_active?: boolean;
  permissions?: number[];
}