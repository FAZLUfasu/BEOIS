"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Building2,
  CheckCircle2,
  Edit3,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

import {
  createInstitution,
  getManagedInstitutions,
  updateInstitution,
} from "@/lib/api/admissions";

import {
  useAuth,
} from "@/lib/auth/auth-context";

import type {
  Institution,
} from "@/types/admissions";

import type {
  InstitutionManagementPayload,
} from "@/lib/api/admissions";

const EMPTY_FORM: InstitutionManagementPayload = {
  name: "",
  short_name: "",
  code: "",
  state: "",
  city: "",
  website: "",
  contact_person: "",
  contact_phone: "",
  contact_email: "",
  is_active: true,
  notes: "",
};

const MANAGEMENT_ROLES = [
  "SUPER_ADMIN",
  "FULL_ACCESS",
  "CHAIRMAN",
  "GENERAL_MANAGER",
  "ADMISSION",
  "MANAGER",
  "DEPARTMENT_HEAD",
];

function inputClassName() {
  return [
    "w-full rounded-xl border border-slate-200",
    "bg-white px-3 py-2.5 text-sm text-slate-900",
    "outline-none transition",
    "placeholder:text-slate-400",
    "focus:border-blue-500 focus:ring-2",
    "focus:ring-blue-500/10",
  ].join(" ");
}

export function UniversitiesWorkspace() {
  const { hasRole } = useAuth();

  const canManage = hasRole(
    ...MANAGEMENT_ROLES,
  );

  const canView = hasRole(
    ...MANAGEMENT_ROLES,
    "TELECALLER",
    "COUNSELOR",
  );

  const [institutions, setInstitutions] =
    useState<Institution[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [activeFilter, setActiveFilter] =
    useState<"all" | "active" | "inactive">(
      "active",
    );

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [showForm, setShowForm] =
    useState(false);

  const [form, setForm] =
    useState<InstitutionManagementPayload>(
      EMPTY_FORM,
    );

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const loadInstitutions =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const data =
          await getManagedInstitutions({
            active:
              activeFilter === "all"
                ? undefined
                : activeFilter === "active",
            search: search.trim() || undefined,
          });

        setInstitutions(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load universities.",
        );
      } finally {
        setLoading(false);
      }
    }, [activeFilter, search]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        void loadInstitutions();
      },
      250,
    );

    return () =>
      window.clearTimeout(timer);
  }, [loadInstitutions]);

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(
    institution: Institution,
  ) {
    setEditingId(institution.id);

    setForm({
      name: institution.name,
      short_name: institution.short_name,
      code: institution.code,
      state: institution.state,
      city: institution.city,
      website: institution.website,
      contact_person:
        institution.contact_person,
      contact_phone:
        institution.contact_phone,
      contact_email:
        institution.contact_email,
      is_active: institution.is_active,
      notes: institution.notes,
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function updateField(
    field: keyof InstitutionManagementPayload,
    value: string | boolean,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canManage) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        short_name:
          form.short_name?.trim() || "",
        code: form.code.trim().toUpperCase(),
        state: form.state?.trim() || "",
        city: form.city?.trim() || "",
        website: form.website?.trim() || "",
        contact_person:
          form.contact_person?.trim() || "",
        contact_phone:
          form.contact_phone?.trim() || "",
        contact_email:
          form.contact_email?.trim() || "",
        notes: form.notes?.trim() || "",
      };

      if (editingId) {
        await updateInstitution(
          editingId,
          payload,
        );

        setSuccess(
          "University updated successfully.",
        );
      } else {
        await createInstitution(payload);

        setSuccess(
          "University created successfully.",
        );
      }

      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);

      await loadInstitutions();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save university.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(
    institution: Institution,
  ) {
    if (!canManage) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await updateInstitution(
        institution.id,
        {
          is_active: !institution.is_active,
        },
      );

      setSuccess(
        institution.is_active
          ? "University deactivated."
          : "University activated.",
      );

      await loadInstitutions();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update university.",
      );
    }
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <XCircle className="mx-auto h-10 w-10 text-slate-400" />

        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Access unavailable
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          You do not have permission to view
          academic master data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                Universities
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage the university and institution
                catalogue used across admissions and
                counselling.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadInstitutions()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh
          </button>

          {canManage && (
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />

              Add University
            </button>
          )}
        </div>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />

          {success}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
            Visible Universities
          </p>

          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {institutions.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
            Active
          </p>

          <p className="mt-3 text-3xl font-semibold text-emerald-600">
            {
              institutions.filter(
                (item) =>
                  item.is_active,
              ).length
            }
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
            Access
          </p>

          <p className="mt-3 text-lg font-semibold text-slate-950">
            {canManage
              ? "Management"
              : "Read only"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search university, code, city or state..."
              className={`${inputClassName()} pl-9`}
            />
          </div>

          <select
            value={activeFilter}
            onChange={(event) =>
              setActiveFilter(
                event.target.value as
                  | "all"
                  | "active"
                  | "inactive",
              )
            }
            className={`${inputClassName()} lg:w-44`}
          >
            <option value="active">
              Active
            </option>

            <option value="inactive">
              Inactive
            </option>

            <option value="all">
              All
            </option>
          </select>
        </div>
      </div>

      {showForm && canManage && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-blue-100 bg-blue-50/40 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                {editingId
                  ? "Edit University"
                  : "Add University"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Enter the institution details used
                throughout BEOIS.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-white"
            >
              Cancel
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                University Name *
              </span>

              <input
                required
                value={form.name}
                onChange={(event) =>
                  updateField(
                    "name",
                    event.target.value,
                  )
                }
                className={inputClassName()}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Short Name
              </span>

              <input
                value={
                  form.short_name ?? ""
                }
                onChange={(event) =>
                  updateField(
                    "short_name",
                    event.target.value,
                  )
                }
                className={inputClassName()}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                University Code *
              </span>

              <input
                required
                value={form.code}
                onChange={(event) =>
                  updateField(
                    "code",
                    event.target.value,
                  )
                }
                className={inputClassName()}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Website
              </span>

              <input
                type="url"
                value={
                  form.website ?? ""
                }
                onChange={(event) =>
                  updateField(
                    "website",
                    event.target.value,
                  )
                }
                className={inputClassName()}
                placeholder="https://example.edu"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                State
              </span>

              <input
                value={form.state ?? ""}
                onChange={(event) =>
                  updateField(
                    "state",
                    event.target.value,
                  )
                }
                className={inputClassName()}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                City
              </span>

              <input
                value={form.city ?? ""}
                onChange={(event) =>
                  updateField(
                    "city",
                    event.target.value,
                  )
                }
                className={inputClassName()}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Contact Person
              </span>

              <input
                value={
                  form.contact_person ?? ""
                }
                onChange={(event) =>
                  updateField(
                    "contact_person",
                    event.target.value,
                  )
                }
                className={inputClassName()}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Contact Phone
              </span>

              <input
                value={
                  form.contact_phone ?? ""
                }
                onChange={(event) =>
                  updateField(
                    "contact_phone",
                    event.target.value,
                  )
                }
                className={inputClassName()}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Contact Email
              </span>

              <input
                type="email"
                value={
                  form.contact_email ?? ""
                }
                onChange={(event) =>
                  updateField(
                    "contact_email",
                    event.target.value,
                  )
                }
                className={inputClassName()}
              />
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <input
                type="checkbox"
                checked={
                  form.is_active ?? true
                }
                onChange={(event) =>
                  updateField(
                    "is_active",
                    event.target.checked,
                  )
                }
                className="h-4 w-4 rounded border-slate-300"
              />

              <span className="text-sm font-medium text-slate-700">
                Active University
              </span>
            </label>

            <label className="space-y-1.5 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">
                Notes
              </span>

              <textarea
                rows={3}
                value={form.notes ?? ""}
                onChange={(event) =>
                  updateField(
                    "notes",
                    event.target.value,
                  )
                }
                className={inputClassName()}
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              )}

              {editingId
                ? "Save Changes"
                : "Create University"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-56 items-center justify-center">
            <LoaderCircle className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : institutions.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-slate-300" />

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No universities found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    University
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Code
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Location
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>

                  {canManage && (
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {institutions.map(
                  (institution) => (
                    <tr
                      key={institution.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900">
                          {institution.name}
                        </div>

                        {institution.short_name && (
                          <div className="mt-0.5 text-xs text-slate-400">
                            {institution.short_name}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-slate-700">
                        {institution.code}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {[
                          institution.city,
                          institution.state,
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>

                      <td className="px-5 py-4">
                        {institution.is_active ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                            <XCircle className="h-3.5 w-3.5" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {canManage && (
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditForm(
                                  institution,
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void toggleActive(
                                  institution,
                                )
                              }
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              {institution.is_active
                                ? "Deactivate"
                                : "Activate"}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
