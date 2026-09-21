"use client";

import {
  Building2,
  Loader2,
  Plus,
  UserRound,
  X,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { getAssignableEmployees } from "@/lib/api/employees";
import { createPartner } from "@/lib/api/partners";

import type {
  EmployeeListItem,
} from "@/types/employees";
import type {
  CreatePartnerPayload,
  PartnerDetail,
  PartnerType,
} from "@/types/partners";

interface PartnerCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (
    partner: PartnerDetail,
  ) => void;
}

const PARTNER_TYPES: Array<{
  value: PartnerType;
  label: string;
}> = [
  {
    value: "EDUCATION_CENTRE",
    label: "Education Centre",
  },
  {
    value: "CONSULTANT",
    label: "Consultant",
  },
  {
    value: "INDIVIDUAL",
    label: "Individual",
  },
  {
    value: "INSTITUTION",
    label: "Institution",
  },
  {
    value: "OTHER",
    label: "Other",
  },
];

const initialForm: CreatePartnerPayload = {
  name: "",
  phone_number: "",
  partner_type: "EDUCATION_CENTRE",
  contact_person: "",
  email: "",
  city: "",
  district: "",
  state: "",
  territory: "",
  organization_name: "",
  relationship_manager_id: null,
  notes: "",
};

function getErrorMessage(error: unknown) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return "Unable to complete the request.";
}

export function PartnerCreateDialog({
  open,
  onClose,
  onCreated,
}: PartnerCreateDialogProps) {
  const [form, setForm] =
    useState<CreatePartnerPayload>({
      ...initialForm,
    });

  const [employees, setEmployees] =
    useState<EmployeeListItem[]>([]);

  const [loadingEmployees, setLoadingEmployees] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function loadEmployees() {
      setLoadingEmployees(true);

      try {
        const result =
          await getAssignableEmployees();

        if (!cancelled) {
          setEmployees(result);
        }
      } catch {
        if (!cancelled) {
          setEmployees([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingEmployees(false);
        }
      }
    }

    void loadEmployees();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setForm({
        ...initialForm,
      });
      setError("");
      setSaving(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  function updateField<
    K extends keyof CreatePartnerPayload,
  >(
    key: K,
    value: CreatePartnerPayload[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Partner name is required.");
      return;
    }

    if (!form.phone_number.trim()) {
      setError("Phone number is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload: CreatePartnerPayload = {
        ...form,
        name: form.name.trim(),
        phone_number:
          form.phone_number.trim(),
        contact_person:
          form.contact_person?.trim() ?? "",
        email:
          form.email?.trim() ?? "",
        city:
          form.city?.trim() ?? "",
        district:
          form.district?.trim() ?? "",
        state:
          form.state?.trim() ?? "",
        territory:
          form.territory?.trim() ?? "",
        organization_name:
          form.organization_name?.trim() ?? "",
        notes:
          form.notes?.trim() ?? "",
      };

      const partner =
        await createPartner(payload);

      onCreated(partner);
    } catch (requestError) {
      setError(
        getErrorMessage(requestError),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
              <Plus className="h-4 w-4" />
              Partner Network
            </div>

            <h2 className="mt-1 text-2xl font-bold text-slate-950">
              Create New Partner
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Register an education centre,
              consultant, institution or other
              partner.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-7 p-6"
        >
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          <section>
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-700" />

              <h3 className="font-bold text-slate-950">
                Partner Information
              </h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Partner Name"
                required
              >
                <input
                  value={form.name}
                  onChange={(event) =>
                    updateField(
                      "name",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="Enter partner name"
                />
              </Field>

              <Field
                label="Partner Type"
                required
              >
                <select
                  value={form.partner_type}
                  onChange={(event) =>
                    updateField(
                      "partner_type",
                      event.target
                        .value as PartnerType,
                    )
                  }
                  className={inputClass}
                >
                  {PARTNER_TYPES.map(
                    (type) => (
                      <option
                        key={type.value}
                        value={type.value}
                      >
                        {type.label}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              <Field
                label="Organization Name"
              >
                <input
                  value={
                    form.organization_name
                  }
                  onChange={(event) =>
                    updateField(
                      "organization_name",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="Organization / centre"
                />
              </Field>

              <Field label="Contact Person">
                <input
                  value={form.contact_person}
                  onChange={(event) =>
                    updateField(
                      "contact_person",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="Primary contact"
                />
              </Field>

              <Field
                label="Phone Number"
                required
              >
                <input
                  value={form.phone_number}
                  onChange={(event) =>
                    updateField(
                      "phone_number",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="Phone number"
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateField(
                      "email",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="Email address"
                />
              </Field>
            </div>
          </section>

          <section>
            <h3 className="mb-4 font-bold text-slate-950">
              Location & Territory
            </h3>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="City">
                <input
                  value={form.city}
                  onChange={(event) =>
                    updateField(
                      "city",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="City"
                />
              </Field>

              <Field label="District">
                <input
                  value={form.district}
                  onChange={(event) =>
                    updateField(
                      "district",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="District"
                />
              </Field>

              <Field label="State">
                <input
                  value={form.state}
                  onChange={(event) =>
                    updateField(
                      "state",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="State"
                />
              </Field>

              <Field label="Territory">
                <input
                  value={form.territory}
                  onChange={(event) =>
                    updateField(
                      "territory",
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="Operational territory"
                />
              </Field>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center gap-2">
              <UserRound className="h-5 w-5 text-blue-700" />

              <h3 className="font-bold text-slate-950">
                Relationship Management
              </h3>
            </div>

            <Field label="Relationship Manager">
              <select
                value={
                  form.relationship_manager_id ??
                  ""
                }
                onChange={(event) =>
                  updateField(
                    "relationship_manager_id",
                    event.target.value ||
                      null,
                  )
                }
                disabled={loadingEmployees}
                className={inputClass}
              >
                <option value="">
                  {loadingEmployees
                    ? "Loading employees..."
                    : "Use current user / default"}
                </option>

                {employees.map(
                  (employee) => {
                    if (!employee.user) {
                      return null;
                    }

                    return (
                      <option
                        key={employee.id}
                        value={employee.user}
                      >
                        {
                          employee.employee_name
                        }
                        {employee.current_designation
                          ? ` — ${employee.current_designation}`
                          : ""}
                      </option>
                    );
                  },
                )}
              </select>
            </Field>

            <div className="mt-4">
              <Field label="Initial Notes">
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    updateField(
                      "notes",
                      event.target.value,
                    )
                  }
                  rows={4}
                  className={inputClass}
                  placeholder="Optional notes about this partner..."
                />
              </Field>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}

              {saving
                ? "Creating..."
                : "Create Partner"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500";

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}

        {required ? (
          <span className="ml-1 text-red-500">
            *
          </span>
        ) : null}
      </span>

      {children}
    </label>
  );
}