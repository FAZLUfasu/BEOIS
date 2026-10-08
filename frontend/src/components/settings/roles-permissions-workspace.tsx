"use client";

import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  createAdminRole,
  deleteAdminRole,
  getAdminPermissions,
  getAdminRole,
  getAdminRoles,
  updateAdminRole,
} from "@/lib/api/roles";

import type {
  AdminPermission,
  AdminRole,
  CreateAdminRolePayload,
} from "@/types/roles";

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function dateText(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function displayModuleName(value: string) {
  const names: Record<string, string> = {
    accounts: "Accounts",
    admissions: "Admissions",
    finance: "Finance",
    hr: "Human Resources",
    leads: "Leads",
    notifications: "Notifications",
    organization: "Organization",
    partners: "Partners",
    students: "Students",
    core: "Core System",
    admin: "Django Admin",
    auth: "Authentication",
    contenttypes: "Content Types",
    sessions: "Sessions",
  };

  if (names[value]) return names[value];

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayModelName(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayPermissionName(permission: AdminPermission) {
  if (permission.name) {
    return permission.name;
  }

  return permission.codename
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isTechnicalModule(appLabel: string) {
  return ["admin", "auth", "contenttypes", "sessions"].includes(appLabel);
}

export function RolesPermissionsWorkspace() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);

  const [loading, setLoading] = useState(true);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [permissionEditorOpen, setPermissionEditorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [deletingRole, setDeletingRole] = useState<AdminRole | null>(null);

  const [search, setSearch] = useState("");
  const [permissionSearch, setPermissionSearch] = useState("");

  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(
    new Set(),
  );

  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(),
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);

  const loadRoles = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

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

  const loadPermissions = useCallback(async () => {
    setPermissionsLoading(true);

    try {
      const result = await getAdminPermissions();
      setPermissions(Array.isArray(result) ? result : []);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPermissionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoles();
    void loadPermissions();
  }, [loadPermissions, loadRoles]);

  const filteredRoles = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return roles;

    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(query) ||
        role.code.toLowerCase().includes(query) ||
        (role.description ?? "").toLowerCase().includes(query),
    );
  }, [roles, search]);

  const groupedPermissions = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase();

    const filtered = permissions.filter((permission) => {
      if (!query) return true;

      return (
        permission.app_label.toLowerCase().includes(query) ||
        permission.model.toLowerCase().includes(query) ||
        permission.codename.toLowerCase().includes(query) ||
        permission.name.toLowerCase().includes(query)
      );
    });

    const modules = new Map<string, AdminPermission[]>();

    for (const permission of filtered) {
      const current = modules.get(permission.app_label) ?? [];
      current.push(permission);
      modules.set(permission.app_label, current);
    }

    return Array.from(modules.entries())
      .sort(([a], [b]) => {
        const technicalA = isTechnicalModule(a);
        const technicalB = isTechnicalModule(b);

        if (technicalA !== technicalB) {
          return technicalA ? 1 : -1;
        }

        return a.localeCompare(b);
      })
      .map(([appLabel, modulePermissions]) => {
        const models = new Map<string, AdminPermission[]>();

        for (const permission of modulePermissions) {
          const current = models.get(permission.model) ?? [];
          current.push(permission);
          models.set(permission.model, current);
        }

        return {
          appLabel,
          permissions: modulePermissions,
          models: Array.from(models.entries()).sort(([a], [b]) =>
            a.localeCompare(b),
          ),
        };
      });
  }, [permissions, permissionSearch]);

  const selectedPermissionCount = selectedPermissions.size;

  const allPermissionsSelected =
    permissions.length > 0 &&
    permissions.every((permission) => selectedPermissions.has(permission.id));

  function resetCreateForm() {
    setName("");
    setCode("");
    setDescription("");
    setActive(true);
  }

  function openCreate() {
    setError("");
    setSuccess("");
    resetCreateForm();
    setCreateOpen(true);
  }

  async function submitCreate(event: FormEvent) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const roleName = name.trim();
    const roleCode = code.trim().toUpperCase();

    if (!roleName) {
      setError("Role name is required.");
      return;
    }

    if (!roleCode) {
      setError("Role code is required.");
      return;
    }

    if (!/^[A-Z0-9_]+$/.test(roleCode)) {
      setError(
        "Role code may contain only letters, numbers and underscores.",
      );
      return;
    }

    const payload: CreateAdminRolePayload = {
      name: roleName,
      code: roleCode,
      description: description.trim(),
      is_active: active,
      permissions: [],
    };

    setSaving(true);

    try {
      const created = await createAdminRole(payload);

      setCreateOpen(false);
      resetCreateForm();

      await loadRoles(true);

      setSuccess(
        `Role "${created.name}" was created successfully. You can now edit its permissions.`,
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function openPermissionEditor(role: AdminRole) {
    setError("");
    setSuccess("");
    setPermissionSearch("");

    try {
      const detail = await getAdminRole(role.id);

      setEditingRole(detail);

      setSelectedPermissions(new Set(detail.permissions ?? []));

      const initialModules = new Set(
        permissions
          .filter((permission) =>
            (detail.permissions ?? []).includes(permission.id),
          )
          .map((permission) => permission.app_label),
      );

      setExpandedModules(initialModules);
      setPermissionEditorOpen(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  function closePermissionEditor() {
    if (saving) return;

    setPermissionEditorOpen(false);
    setEditingRole(null);
    setSelectedPermissions(new Set());
    setPermissionSearch("");
  }

  function togglePermission(permissionId: number) {
    setSelectedPermissions((current) => {
      const next = new Set(current);

      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }

      return next;
    });
  }

  function setModulePermissions(
    modulePermissions: AdminPermission[],
    selected: boolean,
  ) {
    setSelectedPermissions((current) => {
      const next = new Set(current);

      for (const permission of modulePermissions) {
        if (selected) {
          next.add(permission.id);
        } else {
          next.delete(permission.id);
        }
      }

      return next;
    });
  }

  function setAllPermissions(selected: boolean) {
    if (!selected) {
      setSelectedPermissions(new Set());
      return;
    }

    setSelectedPermissions(new Set(permissions.map((permission) => permission.id)));
  }

  function toggleModule(appLabel: string) {
    setExpandedModules((current) => {
      const next = new Set(current);

      if (next.has(appLabel)) {
        next.delete(appLabel);
      } else {
        next.add(appLabel);
      }

      return next;
    });
  }

  function moduleSelectedCount(modulePermissions: AdminPermission[]) {
    return modulePermissions.filter((permission) =>
      selectedPermissions.has(permission.id),
    ).length;
  }

  async function savePermissions() {
    if (!editingRole) return;

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const updated = await updateAdminRole(editingRole.id, {
        permissions: Array.from(selectedPermissions).sort((a, b) => a - b),
      });

      setRoles((current) =>
        current.map((role) =>
          role.id === updated.id ? updated : role,
        ),
      );

      setEditingRole(updated);

      setPermissionEditorOpen(false);
      setEditingRole(null);

      setSuccess(
        `Permissions for "${updated.name}" were saved successfully.`,
      );

      await loadRoles(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  function requestDelete(role: AdminRole) {
    setError("");
    setSuccess("");
    setDeletingRole(role);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deletingRole) return;

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      await deleteAdminRole(deletingRole.id);

      setRoles((current) =>
        current.filter((role) => role.id !== deletingRole.id),
      );

      setDeleteOpen(false);

      setSuccess(
        `Role "${deletingRole.name}" was deleted successfully.`,
      );

      setDeletingRole(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Super Administration
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Roles &amp; Permissions
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Create roles and control exactly which BEOIS permissions each role
            can use.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadRoles(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90"
          >
            <Plus size={17} />
            Create Role
          </button>
        </div>
      </div>

      {/* ALERTS */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <X size={18} className="mt-0.5 shrink-0" />

          <div>
            <div className="font-semibold">
              Unable to complete request
            </div>

            <div className="mt-1">{error}</div>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />

          <div>
            <div className="font-semibold">Success</div>

            <div className="mt-1">{success}</div>
          </div>
        </div>
      )}

      {/* SUMMARY */}

      <div className="grid gap-4 md:grid-cols-3">
        <Summary
          title="Total Roles"
          value={roles.length}
          icon={<ShieldCheck size={22} />}
        />

        <Summary
          title="Active Roles"
          value={roles.filter((role) => role.is_active !== false).length}
          icon={<CheckCircle2 size={22} />}
        />

        <Summary
          title="Total Permissions"
          value={permissions.length}
          icon={<KeyRound size={22} />}
        />
      </div>

      {/* SEARCH */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative max-w-xl">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search roles by name, code or description..."
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* ROLE TABLE */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">
            Role Directory
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Manage role permissions and assignments from the Super
            Administrator workspace.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Loading roles...
            </div>
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
            <ShieldCheck size={34} className="text-slate-300" />

            <div className="mt-3 text-sm font-semibold text-slate-700">
              No roles found
            </div>

            <p className="mt-1 text-xs text-slate-400">
              {search
                ? "Try a different search term."
                : "Create your first role."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  {[
                    "Role",
                    "Code",
                    "Description",
                    "Permissions",
                    "Status",
                    "Updated",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredRoles.map((role) => {
                  const protectedRole =
                    role.code.toUpperCase() === "SUPER_ADMINISTRATOR";

                  return (
                    <tr
                      key={role.id}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <ShieldCheck size={18} />
                          </div>

                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {role.name}
                            </div>

                            <div className="mt-0.5 text-[11px] text-slate-400">
                              ID: {role.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">
                          {role.code}
                        </span>
                      </td>

                      <td className="max-w-[280px] px-5 py-4">
                        <div className="truncate text-sm text-slate-600">
                          {role.description || "No description provided."}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                          <KeyRound size={13} />
                          {role.permissions?.length ?? 0}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {role.is_active !== false ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                            <span className="size-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs text-slate-500">
                        {dateText(role.updated_at)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void openPermissionEditor(role)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            <KeyRound size={14} />
                            Edit Permissions
                          </button>

                          <button
                            type="button"
                            onClick={() => requestDelete(role)}
                            disabled={protectedRole}
                            title={
                              protectedRole
                                ? "SUPER_ADMINISTRATOR is a protected system role."
                                : "Delete role"
                            }
                            className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-35"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INFORMATION */}

      <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4">
        <ShieldCheck size={19} className="mt-0.5 shrink-0 text-blue-600" />

        <div>
          <div className="text-sm font-semibold text-blue-900">
            Permission management
          </div>

          <p className="mt-1 text-xs leading-5 text-blue-700">
            Permissions are loaded directly from Django. New permissions
            created by future migrations will automatically appear here.
          </p>
        </div>
      </div>

      {/* CREATE ROLE MODAL */}

      {createOpen && (
        <ModalOverlay>
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                  Super Administration
                </div>

                <h2 className="mt-1 text-xl font-bold text-slate-950">
                  Create Role
                </h2>
              </div>

              <button
                type="button"
                onClick={() => !saving && setCreateOpen(false)}
                disabled={saving}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={submitCreate} className="space-y-5 p-5">
              <Field label="Role Name">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Example: Finance Manager"
                  disabled={saving}
                  className="input"
                />
              </Field>

              <Field label="Role Code">
                <input
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.toUpperCase())
                  }
                  placeholder="FINANCE_MANAGER"
                  disabled={saving}
                  className="input font-mono"
                />

                <p className="mt-1 text-[11px] text-slate-400">
                  Letters, numbers and underscores only.
                </p>
              </Field>

              <Field label="Description">
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  placeholder="Describe this role..."
                  disabled={saving}
                  className="input resize-none"
                />
              </Field>

              <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => setActive(event.target.checked)}
                  disabled={saving}
                  className="mt-0.5 size-4"
                />

                <span>
                  <span className="block text-sm font-semibold text-slate-700">
                    Active role
                  </span>

                  <span className="mt-1 block text-xs text-slate-400">
                    Active roles can be assigned to BEOIS users.
                  </span>
                </span>
              </label>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <KeyRound
                    size={18}
                    className="mt-0.5 text-blue-600"
                  />

                  <div>
                    <div className="text-sm font-semibold text-blue-900">
                      Permissions
                    </div>

                    <p className="mt-1 text-xs leading-5 text-blue-700">
                      The new role will initially have no permissions. After
                      creation, use <strong>Edit Permissions</strong> to select
                      the required modules and actions.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Plus size={17} />
                  )}

                  {saving ? "Creating..." : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* PERMISSION EDITOR */}

      {permissionEditorOpen && editingRole && (
        <ModalOverlay>
          <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            {/* EDITOR HEADER */}

            <div className="shrink-0 border-b border-slate-100 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                    Permission Editor
                  </div>

                  <h2 className="mt-1 text-xl font-bold text-slate-950">
                    {editingRole.name}
                  </h2>

                  <div className="mt-1 font-mono text-xs text-slate-400">
                    {editingRole.code}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closePermissionEditor}
                  disabled={saving}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="relative w-full lg:max-w-xl">
                  <Search
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={permissionSearch}
                    onChange={(event) =>
                      setPermissionSearch(event.target.value)
                    }
                    placeholder="Search module, model or permission..."
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-xl bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700">
                    {selectedPermissionCount} selected
                  </span>

                  <button
                    type="button"
                    onClick={() => setAllPermissions(true)}
                    disabled={permissionsLoading || saving}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Select All
                  </button>

                  <button
                    type="button"
                    onClick={() => setAllPermissions(false)}
                    disabled={permissionsLoading || saving}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            {/* PERMISSION LIST */}

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-4">
              {permissionsLoading ? (
                <div className="flex min-h-[400px] items-center justify-center">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Loader2 size={18} className="animate-spin" />
                    Loading permissions...
                  </div>
                </div>
              ) : groupedPermissions.length === 0 ? (
                <div className="flex min-h-[400px] items-center justify-center">
                  <div className="text-center">
                    <KeyRound
                      size={36}
                      className="mx-auto text-slate-300"
                    />

                    <div className="mt-3 text-sm font-semibold text-slate-700">
                      No permissions found
                    </div>

                    <p className="mt-1 text-xs text-slate-400">
                      Try a different search term.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedPermissions.map((module) => {
                    const selectedCount = moduleSelectedCount(
                      module.permissions,
                    );

                    const allSelected =
                      selectedCount === module.permissions.length;

                    const someSelected =
                      selectedCount > 0 && !allSelected;

                    const expanded = expandedModules.has(module.appLabel);

                    return (
                      <div
                        key={module.appLabel}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                      >
                        {/* MODULE HEADER */}

                        <div className="flex items-center gap-3 px-4 py-3">
                          <button
                            type="button"
                            onClick={() => toggleModule(module.appLabel)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            {expanded ? (
                              <ChevronDown
                                size={18}
                                className="shrink-0 text-slate-400"
                              />
                            ) : (
                              <ChevronRight
                                size={18}
                                className="shrink-0 text-slate-400"
                              />
                            )}

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-slate-900">
                                  {displayModuleName(module.appLabel)}
                                </span>

                                {isTechnicalModule(module.appLabel) && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                    Technical
                                  </span>
                                )}
                              </div>

                              <div className="mt-0.5 text-[11px] text-slate-400">
                                {selectedCount} of{" "}
                                {module.permissions.length} selected
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setModulePermissions(
                                module.permissions,
                                !allSelected,
                              )
                            }
                            disabled={saving}
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                              allSelected
                                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                            }`}
                          >
                            {allSelected ? (
                              <>
                                <Check size={14} />
                                Clear All
                              </>
                            ) : (
                              <>
                                <CheckCircle2 size={14} />
                                Select All
                              </>
                            )}
                          </button>
                        </div>

                        {/* MODULE CONTENT */}

                        {expanded && (
                          <div className="border-t border-slate-100 px-4 py-3">
                            <div className="space-y-3">
                              {module.models.map(
                                ([model, modelPermissions]) => (
                                  <div
                                    key={model}
                                    className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/70"
                                  >
                                    <div className="border-b border-slate-100 px-3 py-2">
                                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                        {displayModelName(model)}
                                      </span>
                                    </div>

                                    <div className="grid gap-1 p-2 sm:grid-cols-2 lg:grid-cols-4">
                                      {modelPermissions
                                        .sort((a, b) =>
                                          actionOrder(a.codename) -
                                          actionOrder(b.codename),
                                        )
                                        .map((permission) => {
                                          const checked =
                                            selectedPermissions.has(
                                              permission.id,
                                            );

                                          return (
                                            <label
                                              key={permission.id}
                                              className={`flex cursor-pointer items-start gap-2 rounded-lg px-3 py-2.5 transition ${
                                                checked
                                                  ? "bg-white shadow-sm ring-1 ring-blue-100"
                                                  : "hover:bg-white"
                                              }`}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() =>
                                                  togglePermission(
                                                    permission.id,
                                                  )
                                                }
                                                disabled={saving}
                                                className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                              />

                                              <span className="min-w-0">
                                                <span className="block text-xs font-semibold text-slate-700">
                                                  {displayPermissionName(
                                                    permission,
                                                  )}
                                                </span>

                                                <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-400">
                                                  {permission.codename}
                                                </span>
                                              </span>
                                            </label>
                                          );
                                        })}
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* EDITOR FOOTER */}

            <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-500">
                {allPermissionsSelected
                  ? "All available permissions are selected."
                  : `${selectedPermissionCount} of ${permissions.length} permissions selected.`}
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={closePermissionEditor}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void savePermissions()}
                  disabled={saving || permissionsLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <Check size={17} />
                  )}

                  {saving ? "Saving..." : "Save Permissions"}
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* DELETE CONFIRMATION */}

      {deleteOpen && deletingRole && (
        <ModalOverlay>
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Trash2 size={22} />
            </div>

            <h2 className="mt-4 text-xl font-bold text-slate-950">
              Delete role?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              You are about to delete{" "}
              <strong className="text-slate-800">
                {deletingRole.name}
              </strong>
              . This action cannot be undone.
            </p>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
              If this role is assigned to users, the backend will prevent
              deletion and return the assigned-user count.
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Trash2 size={17} />
                )}

                {deleting ? "Deleting..." : "Delete Role"}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

function actionOrder(codename: string) {
  if (codename.startsWith("add_")) return 1;
  if (codename.startsWith("view_")) return 2;
  if (codename.startsWith("change_")) return 3;
  if (codename.startsWith("delete_")) return 4;

  return 5;
}

function ModalOverlay({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      {children}
    </div>
  );
}

function Summary({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {title}
          </div>

          <div className="mt-2 text-3xl font-bold text-slate-950">
            {value}
          </div>
        </div>

        <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-slate-700">
        {label}
      </label>

      {children}
    </div>
  );
}