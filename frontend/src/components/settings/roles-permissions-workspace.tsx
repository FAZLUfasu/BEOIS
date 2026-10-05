"use client";

import {
  CheckCircle2,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createAdminRole, getAdminRoles } from "@/lib/api/roles";
import type { AdminRole, CreateAdminRolePayload } from "@/types/roles";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function dateText(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function RolesPermissionsWorkspace() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [permissionIds, setPermissionIds] = useState("");

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try {
      const result = await getAdminRoles();
      setRoles(Array.isArray(result) ? result : []);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q) ||
      (r.description ?? "").toLowerCase().includes(q)
    );
  }, [roles, search]);

  function reset() {
    setName("");
    setCode("");
    setDescription("");
    setActive(true);
    setPermissionIds("");
  }

  function parsePermissions() {
    if (!permissionIds.trim()) return [];
    const values = permissionIds.split(/[,\s]+/).filter(Boolean).map(Number);
    if (values.some((n) => !Number.isInteger(n) || n <= 0)) {
      throw new Error("Permission IDs must be positive integers.");
    }
    return [...new Set(values)];
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const roleName = name.trim();
    const roleCode = code.trim().toUpperCase();

    if (!roleName) return setError("Role name is required.");
    if (!roleCode) return setError("Role code is required.");
    if (!/^[A-Z0-9_]+$/.test(roleCode)) {
      return setError("Role code may contain only letters, numbers and underscores.");
    }

    let permissions: number[];
    try {
      permissions = parsePermissions();
    } catch (e) {
      return setError(errorMessage(e));
    }

    const payload: CreateAdminRolePayload = {
      name: roleName,
      code: roleCode,
      description: description.trim(),
      is_active: active,
      permissions,
    };

    setSaving(true);
    try {
      const created = await createAdminRole(payload);
      setRoles((current) => [...current, created]);
      setSuccess(`Role "${created.name}" was created successfully.`);
      setOpen(false);
      reset();
      await load(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Super Administration
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Roles &amp; Permissions
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Create and manage BEOIS roles and their Django permissions.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => { setError(""); setSuccess(""); reset(); setOpen(true); }}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            <Plus size={17} />
            Create Role
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <X size={18} className="mt-0.5 shrink-0" />
          <div><div className="font-semibold">Unable to complete request</div><div className="mt-1">{error}</div></div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <div><div className="font-semibold">Success</div><div className="mt-1">{success}</div></div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Summary title="Total Roles" value={roles.length} icon={<ShieldCheck size={22} />} />
        <Summary title="Active Roles" value={roles.filter((r) => r.is_active !== false).length} icon={<CheckCircle2 size={22} />} />
        <Summary title="Roles With Permissions" value={roles.filter((r) => (r.permissions?.length ?? 0) > 0).length} icon={<KeyRound size={22} />} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative max-w-xl">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roles by name, code or description..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">Role Directory</h2>
          <p className="mt-1 text-xs text-slate-500">BEOIS roles available to the Super Administrator.</p>
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" /> Loading roles...
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
            <ShieldCheck size={34} className="text-slate-300" />
            <div className="mt-3 text-sm font-semibold text-slate-700">No roles found</div>
            <p className="mt-1 text-xs text-slate-400">
              {search ? "Try a different search term." : "Create your first role."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  {["Role", "Code", "Description", "Permissions", "Status", "Updated"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((role) => (
                  <tr key={role.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                          <ShieldCheck size={18} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{role.name}</div>
                          <div className="mt-0.5 text-[11px] text-slate-400">ID: {role.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">{role.code}</span>
                    </td>
                    <td className="max-w-[320px] px-5 py-4">
                      <div className="truncate text-sm text-slate-600">{role.description || "No description provided."}</div>
                    </td>
                    <td className="px-5 py-4 text-left">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                        <KeyRound size={13} /> {role.permissions?.length ?? 0}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {role.is_active !== false ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          <span className="size-1.5 rounded-full bg-emerald-500" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                          <span className="size-1.5 rounded-full bg-slate-400" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">{dateText(role.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4">
        <ShieldCheck size={19} className="mt-0.5 shrink-0 text-blue-600" />
        <div>
          <div className="text-sm font-semibold text-blue-900">Super Administrator access</div>
          <p className="mt-1 text-xs leading-5 text-blue-700">
            Backend authorization remains the source of truth. The frontend check only controls the UI.
          </p>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Super Administration</div>
                <h2 className="mt-1 text-xl font-bold text-slate-950">Create Role</h2>
              </div>
              <button type="button" onClick={() => !saving && setOpen(false)} disabled={saving} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100">
                <X size={19} />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-5 p-5">
              <Field label="Role Name">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Example: Finance Manager" disabled={saving} className="input" />
              </Field>

              <Field label="Role Code">
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="FINANCE_MANAGER" disabled={saving} className="input font-mono" />
                <p className="mt-1 text-[11px] text-slate-400">Letters, numbers and underscores only.</p>
              </Field>

              <Field label="Description">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe this role..." disabled={saving} className="input resize-none" />
              </Field>

              <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4">
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={saving} className="mt-0.5 size-4" />
                <span>
                  <span className="block text-sm font-semibold text-slate-700">Active role</span>
                  <span className="mt-1 block text-xs text-slate-400">Active roles can be assigned to BEOIS users.</span>
                </span>
              </label>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <KeyRound size={18} className="mt-0.5 text-amber-600" />
                  <div>
                    <div className="text-sm font-semibold text-amber-900">Django Permission IDs</div>
                    <p className="mt-1 text-xs leading-5 text-amber-700">
                      Enter real Django Permission primary keys separated by commas or spaces.
                    </p>
                  </div>
                </div>
                <textarea value={permissionIds} onChange={(e) => setPermissionIds(e.target.value)} rows={3} disabled={saving} placeholder="Example: 1, 2, 5, 9" className="input mt-4 resize-none font-mono" />
                <p className="mt-2 text-[11px] text-amber-700">Do not guess permission IDs.</p>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setOpen(false)} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
                  {saving ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} />}
                  {saving ? "Creating..." : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Summary({ title, value, icon }: { title: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</div>
          <div className="mt-2 text-3xl font-bold text-slate-950">{value}</div>
        </div>
        <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">{icon}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">{label}</label>
      {children}
    </div>
  );
}