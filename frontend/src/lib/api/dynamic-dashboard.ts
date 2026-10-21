import { apiRequest } from "@/lib/api/client";
export interface DynamicWidget { key: string; title: string; permission: string; module: string; value: number; }
export interface DashboardWidgetConfig { key: string; position: number; enabled: boolean; }
export interface DashboardConfig { role_id: string; catalog: Omit<DynamicWidget,"value">[]; widgets: DashboardWidgetConfig[]; }
export const getDynamicDashboard = () => apiRequest<{widgets: DynamicWidget[]}>("/dashboard/dynamic/me/");
export const getRoleDashboardConfig = (roleId: string) => apiRequest<DashboardConfig>(`/dashboard/dynamic/roles/${roleId}/`);
export const saveRoleDashboardConfig = (roleId: string, widgets: {key:string;enabled:boolean}[]) => apiRequest(`/dashboard/dynamic/roles/${roleId}/`, {method:"PUT", body:JSON.stringify({widgets})});
