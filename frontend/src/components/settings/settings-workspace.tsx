"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Bell,
  CalendarDays,
  Check,
  Clock3,
  FileArchive,
  Fingerprint,
  History,
  Loader2,
  LockKeyhole,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";

import {
  getSystemSettings,
  getSystemSettingsAudit,
  updateSystemSettings,
} from "@/lib/api/settings";
import { useAuth } from "@/lib/auth/auth-context";

import type {
  SystemSettings,
  SystemSettingsAudit,
  SystemSettingsUpdate,
} from "@/types/settings";

const MANAGEMENT_ROLES = [
  "SUPER_ADMIN",
  "CHAIRMAN",
  "GENERAL_MANAGER",
];

const sections = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "financial", label: "Financial Year", icon: CalendarDays },
  { id: "numbering", label: "ID & Numbering", icon: Fingerprint },
  { id: "workflow", label: "Workflow Defaults", icon: SlidersHorizontal },
  { id: "admissions", label: "Admissions", icon: Users },
  { id: "hr", label: "HR & Payroll", icon: Clock3 },
  { id: "documents", label: "Documents", icon: FileArchive },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: LockKeyhole },
  { id: "audit", label: "Audit History", icon: History },
] as const;

type SectionId = (typeof sections)[number]["id"];

function fieldClass(readOnly = false) {
  return [
    "w-full rounded-xl border border-slate-200 px-3.5 py-2.5",
    "text-sm text-slate-900 outline-none transition",
    "focus:border-blue-400 focus:ring-4 focus:ring-blue-50",
    readOnly
      ? "cursor-not-allowed bg-slate-50 text-slate-500"
      : "bg-white",
  ].join(" ");
}

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-800">
        {label}
      </span>

      {description && (
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      )}

      <div className="mt-2">
        {children}
      </div>
    </label>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <h2 className="text-lg font-bold text-slate-950">
          {title}
        </h2>

        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>

      <div className="p-5 sm:p-6">
        {children}
      </div>
    </section>
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-5 rounded-xl border border-slate-200 p-4">
      <div>
        <div className="text-sm font-semibold text-slate-900">
          {label}
        </div>

        <div className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </div>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition",
          checked
            ? "bg-blue-600"
            : "bg-slate-300",
          disabled
            ? "cursor-not-allowed opacity-50"
            : "",
        ].join(" ")}
        aria-pressed={checked}
      >
        <span
          className={[
            "absolute top-1 size-4 rounded-full bg-white shadow transition",
            checked
              ? "left-6"
              : "left-1",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

export function SettingsWorkspace() {
  const { hasRole } = useAuth();

  const [settings, setSettings] =
    useState<SystemSettings | null>(null);

  const [original, setOriginal] =
    useState<SystemSettings | null>(null);

  const [audit, setAudit] =
    useState<SystemSettingsAudit[]>([]);

  const [activeSection, setActiveSection] =
    useState<SectionId>("general");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const canEdit = hasRole(
    ...MANAGEMENT_ROLES,
  );

  const loadData = useCallback(
    async () => {
      setLoading(true);
      setError(null);

      try {
        const [
          settingsResponse,
          auditResponse,
        ] = await Promise.all([
          getSystemSettings(),
          getSystemSettingsAudit(),
        ]);

        setSettings(settingsResponse);
        setOriginal(settingsResponse);
        setAudit(auditResponse);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load system settings.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const hasChanges = useMemo(() => {
    if (!settings || !original) {
      return false;
    }

    return (
      JSON.stringify(settings) !==
      JSON.stringify(original)
    );
  }, [settings, original]);

  function updateField<K extends keyof SystemSettings>(
    field: K,
    value: SystemSettings[K],
  ) {
    setSettings((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [field]: value,
      };
    });

    setSuccess(null);
  }

  function numberValue(
    value: string,
    fallback = 0,
  ) {
    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }

  async function handleSave() {
    if (
      !settings ||
      !original ||
      !canEdit ||
      !hasChanges
    ) {
      return;
    }

    const payload: SystemSettingsUpdate = {};

    (
      Object.keys(settings) as Array<
        keyof SystemSettings
      >
    ).forEach((key) => {
      if (
        key === "id" ||
        key === "updated_at" ||
        key === "updated_by"
      ) {
        return;
      }

      if (
        JSON.stringify(settings[key]) !==
        JSON.stringify(original[key])
      ) {
        (
          payload as Record<string, unknown>
        )[key] = settings[key];
      }
    });

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated =
        await updateSystemSettings(payload);

      setSettings(updated);
      setOriginal(updated);

      const refreshedAudit =
        await getSystemSettingsAudit();

      setAudit(refreshedAudit);

      setSuccess(
        "System settings saved successfully.",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save system settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto size-8 animate-spin text-blue-600" />
          <p className="mt-3 text-sm text-slate-500">
            Loading system settings...
          </p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error ??
          "System settings could not be loaded."}

        <button
          type="button"
          onClick={() => void loadData()}
          className="ml-3 font-semibold underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Administration
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            System Settings
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Configure BEOIS-wide operational defaults,
            numbering, reminders, security policies and
            administrative preferences.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!canEdit && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-700">
              Read-only access
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={
              !canEdit ||
              !hasChanges ||
              saving
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}

            {saving
              ? "Saving..."
              : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <Check className="size-4" />
          {success}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="flex gap-1 overflow-x-auto">
          {sections.map((section) => {
            const Icon = section.icon;
            const active =
              activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() =>
                  setActiveSection(section.id)
                }
                className={[
                  "flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-xs font-semibold transition",
                  active
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                ].join(" ")}
              >
                <Icon className="size-4" />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeSection === "general" && (
        <SectionCard
          title="General Configuration"
          description="Core identity and regional defaults used throughout BEOIS."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="System Name">
              <input
                className={fieldClass(!canEdit)}
                disabled={!canEdit}
                value={settings.system_name}
                onChange={(event) =>
                  updateField(
                    "system_name",
                    event.target.value,
                  )
                }
              />
            </Field>

            <Field label="System Short Name">
              <input
                className={fieldClass(!canEdit)}
                disabled={!canEdit}
                value={settings.system_short_name}
                onChange={(event) =>
                  updateField(
                    "system_short_name",
                    event.target.value,
                  )
                }
              />
            </Field>

            <Field label="Timezone">
              <input
                className={fieldClass(!canEdit)}
                disabled={!canEdit}
                value={settings.timezone}
                onChange={(event) =>
                  updateField(
                    "timezone",
                    event.target.value,
                  )
                }
              />
            </Field>

            <Field label="Date Format">
              <select
                className={fieldClass(!canEdit)}
                disabled={!canEdit}
                value={settings.date_format}
                onChange={(event) =>
                  updateField(
                    "date_format",
                    event.target.value,
                  )
                }
              >
                <option value="DD-MM-YYYY">
                  DD-MM-YYYY
                </option>
                <option value="DD/MM/YYYY">
                  DD/MM/YYYY
                </option>
                <option value="YYYY-MM-DD">
                  YYYY-MM-DD
                </option>
              </select>
            </Field>

            <Field label="Currency Code">
              <input
                className={fieldClass(!canEdit)}
                disabled={!canEdit}
                value={settings.currency_code}
                onChange={(event) =>
                  updateField(
                    "currency_code",
                    event.target.value.toUpperCase(),
                  )
                }
              />
            </Field>

            <Field label="Currency Symbol">
              <input
                className={fieldClass(!canEdit)}
                disabled={!canEdit}
                value={settings.currency_symbol}
                onChange={(event) =>
                  updateField(
                    "currency_symbol",
                    event.target.value,
                  )
                }
              />
            </Field>
          </div>
        </SectionCard>
      )}

      {activeSection === "financial" && (
        <SectionCard
          title="Financial Year"
          description="Define the month from which the organization's financial year begins."
        >
          <div className="max-w-md">
            <Field label="Financial Year Start Month">
              <select
                className={fieldClass(!canEdit)}
                disabled={!canEdit}
                value={
                  settings.financial_year_start_month
                }
                onChange={(event) =>
                  updateField(
                    "financial_year_start_month",
                    numberValue(
                      event.target.value,
                      4,
                    ),
                  )
                }
              >
                {[
                  "January",
                  "February",
                  "March",
                  "April",
                  "May",
                  "June",
                  "July",
                  "August",
                  "September",
                  "October",
                  "November",
                  "December",
                ].map((month, index) => (
                  <option
                    key={month}
                    value={index + 1}
                  >
                    {month}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </SectionCard>
      )}

      {activeSection === "numbering" && (
        <SectionCard
          title="ID & Numbering"
          description="Prefixes apply only to newly created records. Existing identifiers remain unchanged."
        >
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[
              ["lead_prefix", "Lead ID", "LD"],
              [
                "admission_prefix",
                "Admission ID",
                "AD",
              ],
              [
                "student_prefix",
                "Student ID",
                "ST",
              ],
              [
                "partner_prefix",
                "Partner ID",
                "BPT",
              ],
              [
                "partner_case_prefix",
                "Partner Case ID",
                "PC",
              ],
              [
                "employee_prefix",
                "Employee ID",
                "EMP",
              ],
            ].map(([key, label, example]) => (
              <Field
                key={key}
                label={label}
                description={`Example prefix: ${example}`}
              >
                <input
                  className={fieldClass(!canEdit)}
                  disabled={!canEdit}
                  value={
                    settings[
                      key as keyof SystemSettings
                    ] as string
                  }
                  onChange={(event) =>
                    updateField(
                      key as keyof SystemSettings,
                      event.target.value
                        .toUpperCase()
                        .replace(
                          /[^A-Z0-9_]/g,
                          "",
                        ) as never,
                    )
                  }
                />
              </Field>
            ))}

            <Field
              label="Credit Transfer ID"
              description="Reserved for a future dedicated Credit Transfer record. Not currently assigned to operational records."
            >
              <input
                className={fieldClass(!canEdit)}
                disabled={!canEdit}
                value={
                  settings.credit_transfer_prefix
                }
                onChange={(event) =>
                  updateField(
                    "credit_transfer_prefix",
                    event.target.value
                      .toUpperCase()
                      .replace(
                        /[^A-Z0-9_]/g,
                        "",
                      ),
                  )
                }
              />
            </Field>

            <Field
              label="Number Padding"
              description="Controls the number of digits after each prefix."
            >
              <input
                type="number"
                min={3}
                max={10}
                className={fieldClass(!canEdit)}
                disabled={!canEdit}
                value={settings.identifier_padding}
                onChange={(event) =>
                  updateField(
                    "identifier_padding",
                    numberValue(
                      event.target.value,
                      5,
                    ),
                  )
                }
              />
            </Field>
          </div>

          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
            Changing a prefix does not restart its
            numeric sequence. For example, if the last
            Lead ID is LD-00027 and the prefix becomes
            LEAD, the next ID will continue as
            LEAD-00028.
          </div>
        </SectionCard>
      )}

      {activeSection === "workflow" && (
        <SectionCard
          title="Workflow Defaults"
          description="Default timings used by the manual telecalling and follow-up workflow."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Default Callback Minutes">
              <input
                type="number"
                min={1}
                className={fieldClass(!canEdit)}
                disabled={!canEdit}
                value={
                  settings.default_callback_minutes
                }
                onChange={(event) =>
                  updateField(
                    "default_callback_minutes",
                    numberValue(
                      event.target.value,
                    ),
                  )
                }
              />
            </Field>

            <Field label="Default Follow-up Days">
              <input
                type="number"
                min={1}
                className={fieldClass(!canEdit)}
                disabled={!canEdit}
                value={
                  settings.default_followup_days
                }
                onChange={(event) =>
                  updateField(
                    "default_followup_days",
                    numberValue(
                      event.target.value,
                    ),
                  )
                }
              />
            </Field>
          </div>
        </SectionCard>
      )}

      {activeSection === "admissions" && (
        <SectionCard
          title="Admissions"
          description="Default academic session and reminder intervals for admission operations."
        >
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Default Academic Session">
              <input
                className={fieldClass(!canEdit)}
                disabled={!canEdit}
                value={
                  settings.default_academic_session
                }
                onChange={(event) =>
                  updateField(
                    "default_academic_session",
                    event.target.value,
                  )
                }
                placeholder="2026-27"
              />
            </Field>

            <Field label="Document Reminder Days">
              <input
                type="number"
                min={1}
                className={fieldClass(!canEdit)}
                disabled={!canEdit}
                value={
                  settings.admission_document_reminder_days
                }
                onChange={(event) =>
                  updateField(
                    "admission_document_reminder_days",
                    numberValue(
                      event.target.value,
                    ),
                  )
                }
              />
            </Field>

            <Field label="Fee Reminder Days">
              <input
                type="number"
                min={1}
                className={fieldClass(!canEdit)}
                disabled={!canEdit}
                value={
                  settings.admission_fee_reminder_days
                }
                onChange={(event) =>
                  updateField(
                    "admission_fee_reminder_days",
                    numberValue(
                      event.target.value,
                    ),
                  )
                }
              />
            </Field>
          </div>
        </SectionCard>
      )}

      {activeSection === "hr" && (
        <SectionCard
          title="HR & Payroll"
          description="Organization-wide attendance and payroll defaults."
        >
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Standard Working Minutes">
              <input
                type="number"
                min={1}
                max={1440}
                className={fieldClass(!canEdit)}
                disabled={!canEdit}
                value={
                  settings.standard_working_minutes
                }
                onChange={(event) =>
                  updateField(
                    "standard_working_minutes",
                    numberValue(
                      event.target.value,
                    ),
                  )
                }
              />
            </Field>

            <Field label="Attendance Grace Minutes">
              <input
                type="number"
                min={0}
                className={fieldClass(!canEdit)}
                disabled={!canEdit}
                value={
                  settings.attendance_grace_minutes
                }
                onChange={(event) =>
                  updateField(
                    "attendance_grace_minutes",
                    numberValue(
                      event.target.value,
                    ),
                  )
                }
              />
            </Field>

            <Field label="Default Payroll Payment Method">
              <input
                className={fieldClass(!canEdit)}
                disabled={!canEdit}
                value={
                  settings.payroll_default_payment_method
                }
                onChange={(event) =>
                  updateField(
                    "payroll_default_payment_method",
                    event.target.value,
                  )
                }
              />
            </Field>
          </div>
        </SectionCard>
      )}

      {activeSection === "documents" && (
        <SectionCard
          title="Documents"
          description="Global upload and document-retention limits."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Maximum Upload Size (MB)">
              <input
                type="number"
                min={1}
                className={fieldClass(!canEdit)}
                disabled={!canEdit}
                value={
                  settings.max_upload_size_mb
                }
                onChange={(event) =>
                  updateField(
                    "max_upload_size_mb",
                    numberValue(
                      event.target.value,
                    ),
                  )
                }
              />
            </Field>

            <Field label="Document Retention Days">
              <input
                type="number"
                min={1}
                className={fieldClass(!canEdit)}
                disabled={!canEdit}
                value={
                  settings.document_retention_days
                }
                onChange={(event) =>
                  updateField(
                    "document_retention_days",
                    numberValue(
                      event.target.value,
                    ),
                  )
                }
              />
            </Field>
          </div>
        </SectionCard>
      )}

      {activeSection === "notifications" && (
        <SectionCard
          title="Notifications"
          description="Global reminder and notification preferences."
        >
          <div className="space-y-5">
            <Toggle
              checked={
                settings.notifications_enabled
              }
              disabled={!canEdit}
              onChange={(value) =>
                updateField(
                  "notifications_enabled",
                  value,
                )
              }
              label="Enable Notifications"
              description="Allow BEOIS operational reminder notifications."
            />

            <div className="max-w-md">
              <Field label="Reminder Notification Days">
                <input
                  type="number"
                  min={1}
                  className={fieldClass(!canEdit)}
                  disabled={!canEdit}
                  value={
                    settings.reminder_notification_days
                  }
                  onChange={(event) =>
                    updateField(
                      "reminder_notification_days",
                      numberValue(
                        event.target.value,
                      ),
                    )
                  }
                />
              </Field>
            </div>
          </div>
        </SectionCard>
      )}

      {activeSection === "security" && (
        <SectionCard
          title="Security"
          description="Administrative security policy configuration. MFA enforcement is a policy setting; authentication integration can be enabled separately."
        >
          <div className="space-y-5">
            <div className="max-w-md">
              <Field label="Session Timeout (Minutes)">
                <input
                  type="number"
                  min={1}
                  className={fieldClass(!canEdit)}
                  disabled={!canEdit}
                  value={
                    settings.session_timeout_minutes
                  }
                  onChange={(event) =>
                    updateField(
                      "session_timeout_minutes",
                      numberValue(
                        event.target.value,
                      ),
                    )
                  }
                />
              </Field>
            </div>

            <Toggle
              checked={
                settings.require_mfa_for_management
              }
              disabled={!canEdit}
              onChange={(value) =>
                updateField(
                  "require_mfa_for_management",
                  value,
                )
              }
              label="Require MFA for Management"
              description="Store the management MFA policy centrally. Actual MFA authentication enforcement should only be enabled after the authentication flow supports it."
            />
          </div>
        </SectionCard>
      )}

      {activeSection === "audit" && (
        <SectionCard
          title="Audit History"
          description="Recent System Settings changes recorded by the backend."
        >
          {audit.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <History className="mx-auto size-8 text-slate-300" />

              <p className="mt-3 text-sm font-semibold text-slate-700">
                No settings changes recorded yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {audit.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-semibold text-slate-900">
                      {entry.changed_by_name ??
                        entry.changed_by ??
                        "System"}
                    </div>

                    <div className="text-xs text-slate-500">
                      {new Date(
                        entry.created_at,
                      ).toLocaleString()}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.keys(
                      entry.changed_fields ?? {},
                    ).map((field) => (
                      <span
                        key={field}
                        className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                      >
                        {field.replace(
                          /_/g,
                          " ",
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-blue-600" />
          BEOIS System Configuration
        </div>

        <div>
          Last updated:{" "}
          {settings.updated_at
            ? new Date(
                settings.updated_at,
              ).toLocaleString()
            : "Not available"}
        </div>
      </div>
    </div>
  );
}