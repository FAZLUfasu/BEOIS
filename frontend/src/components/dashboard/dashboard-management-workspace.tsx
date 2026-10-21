"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Check, LayoutDashboard, RefreshCw, Save, ShieldAlert } from "lucide-react";
import { getAdminPermissions, getAdminRoles } from "@/lib/api/roles";
import { getRoleDashboardConfig, saveRoleDashboardConfig } from "@/lib/api/dynamic-dashboard";
import type { DashboardConfig } from "@/lib/api/dynamic-dashboard";
import type { AdminPermission, AdminRole } from "@/types/roles";

type Row = { key: string; title: string; module: string; permission: string; enabled: boolean };

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

export function DashboardManagementWorkspace() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [roleId, setRoleId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dirty, setDirty] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadRoles = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const [roleData, permissionData] = await Promise.all([getAdminRoles(), getAdminPermissions()]);
      setRoles(roleData);
      setPermissions(permissionData);
      setRoleId((current) => roleData.some((r) => r.id === current) ? current : (roleData[0]?.id ?? ""));
    } catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { void loadRoles(); }, [loadRoles]);

  useEffect(() => {
    if (!roleId) { setRows([]); setLoaded(false); return; }
    let cancelled = false;
    setBusy(true);
    setLoaded(false);
    setError("");
    setSuccess("");
    getRoleDashboardConfig(roleId).then((config: DashboardConfig) => {
      if (cancelled) return;
      const byKey = new Map(config.widgets.map((w) => [w.key, w]));
      const ordered = config.catalog.map((widget) => ({
        key: widget.key, title: widget.title, module: widget.module,
        permission: widget.permission,
        enabled: byKey.get(widget.key)?.enabled ?? (config.widgets.length === 0),
        position: byKey.get(widget.key)?.position ?? Number.MAX_SAFE_INTEGER,
      })).sort((a, b) => a.position - b.position || a.title.localeCompare(b.title));
      setRows(ordered.map(({ position: _position, ...row }) => row));
      setDirty(false);
      setLoaded(true);
    }).catch((e: unknown) => { if (!cancelled) setError(errorText(e)); })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [roleId]);

  const role = roles.find((r) => r.id === roleId);
  const permissionNames = useMemo(() => {
    const ids = new Set(role?.permissions ?? []);
    return new Set(permissions.filter((p) => ids.has(p.id)).map((p) => `${p.app_label}.${p.codename}`));
  }, [role, permissions]);

  const move = (index: number, offset: number) => {
    const next = index + offset;
    if (next < 0 || next >= rows.length) return;
    setRows((previous) => {
      const copy = [...previous];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
    setDirty(true); setSuccess("");
  };

  const save = async () => {
    if (!roleId || !loaded || saving) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      await saveRoleDashboardConfig(roleId, rows.map((row) => ({ key: row.key, enabled: row.enabled })));
      setDirty(false);
      setSuccess(`Dashboard configuration saved for ${role?.name ?? "the selected role"}.`);
    } catch (e) { setError(errorText(e)); }
    finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-700"><LayoutDashboard size={18} /> ADMINISTRATION</div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Dashboard Management</h1>
          <p className="mt-2 text-sm text-slate-600">Configure widgets for any role, including roles created later.</p>
        </div>
        <button type="button" onClick={() => void loadRoles()} disabled={busy || saving || dirty} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} /> Refresh roles</button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label htmlFor="dashboard-role" className="mb-2 block text-sm font-semibold text-slate-800">Select role</label>
        <select id="dashboard-role" value={roleId} disabled={busy || saving || dirty} onChange={(e) => setRoleId(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 md:max-w-lg">
          {roles.length === 0 && <option value="">No roles available</option>}
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.code}){r.is_active === false ? " — inactive" : ""}</option>)}
        </select>
        <p className="mt-2 text-xs text-slate-500">Unsaved changes must be saved before switching roles. Create roles in <Link href="/settings/roles" className="font-medium text-blue-700 underline">Roles &amp; Permissions</Link>.</p>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {success && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><Check size={18} />{success}</div>}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Widget layout</h2>
          <p className="mt-1 text-sm text-slate-500">Enable widgets and change their display order using the arrows. Widgets without the required role permission are unavailable.</p>
        </div>
        {busy ? <div className="p-8 text-sm text-slate-500">Loading configuration...</div> : !loaded ? <div className="p-8 text-sm text-slate-500">Choose a role to load its configuration.</div> : rows.length === 0 ? <div className="p-8 text-sm text-slate-500">No widgets are registered yet.</div> : (
          <div className="divide-y divide-slate-100">
            {rows.map((row, index) => {
              const permitted = permissionNames.has(row.permission);
              return (
                <div key={row.key} className="flex flex-wrap items-center gap-3 p-4 md:p-5">
                  <input type="checkbox" id={`widget-${row.key}`} checked={row.enabled && permitted} disabled={!permitted || saving} onChange={(e) => { setRows((previous) => previous.map((item) => item.key === row.key ? { ...item, enabled: e.target.checked } : item)); setDirty(true); setSuccess(""); }} className="h-5 w-5 accent-blue-700" />
                  <div className="min-w-0 flex-1">
                    <label htmlFor={`widget-${row.key}`} className="text-sm font-semibold text-slate-900">{row.title}</label>
                    <p className="mt-1 text-xs text-slate-500">{row.module} · {row.permission}</p>
                    {!permitted && <p className="mt-1 flex items-center gap-1 text-xs text-amber-700"><ShieldAlert size={13} /> Permission not assigned to this role</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label={`Move ${row.title} up`} disabled={index === 0 || saving} onClick={() => move(index, -1)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-30"><ArrowUp size={17} /></button>
                    <button type="button" aria-label={`Move ${row.title} down`} disabled={index === rows.length - 1 || saving} onClick={() => move(index, 1)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-30"><ArrowDown size={17} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-5">
          <p className="text-xs text-slate-500">{dirty ? "Unsaved changes" : "Configuration is up to date"}</p>
          <button type="button" onClick={() => void save()} disabled={!dirty || saving || busy || !loaded} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"><Save size={16} /> {saving ? "Saving..." : "Save configuration"}</button>
        </div>
      </div>
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">Dashboard configuration controls presentation only. Backend permission and data-scope checks still determine which records users can access. Changes are applied when users next load their dashboard.</div>
    </div>
  );
}
