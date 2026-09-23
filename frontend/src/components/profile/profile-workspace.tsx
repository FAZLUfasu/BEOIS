"use client";

import {
  Building2,
  Camera,
  CheckCircle2,
  Fingerprint,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  removeMyProfilePicture,
  uploadMyProfilePicture,
} from "@/lib/api/user-management";

import { updateCurrentUser } from "@/lib/auth/auth-api";
import { useAuth } from "@/lib/auth/auth-context";

interface ProfileForm {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
}

function getInitials(name: string, username: string) {
  const source = name.trim() || username;

  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${
    parts[parts.length - 1][0]
  }`.toUpperCase();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to update your profile. Please try again.";
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon size={18} />
      </div>

      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          {label}
        </div>

        <div className="mt-1 break-words text-sm font-semibold text-slate-800">
          {value?.trim() || "Not provided"}
        </div>
      </div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </span>

      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
      />
    </label>
  );
}

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-lg font-bold text-slate-950">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>

        {action && (
          <div className="shrink-0">{action}</div>
        )}
      </div>

      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

export function ProfileWorkspace() {
  const {
    user,
    loading,
    refreshUser,
  } = useAuth();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [photoSaving, setPhotoSaving] =
    useState(false);

  const photoInputRef =
    useRef<HTMLInputElement>(null);

  const [form, setForm] =
    useState<ProfileForm>({
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
    });

  useEffect(() => {
    if (!user) {
      return;
    }

    setForm({
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      email: user.email ?? "",
      phone_number: user.phone_number ?? "",
    });
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto size-9 animate-spin text-blue-600" />

          <p className="mt-3 text-sm text-slate-500">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        User profile information is not available.
      </div>
    );
  }

  const displayName =
    user.full_name ||
    [user.first_name, user.last_name]
      .filter(Boolean)
      .join(" ") ||
    user.username;

  const initials = getInitials(
    displayName,
    user.username,
  );

  const primaryRole = user.is_superuser
    ? "Super Administrator"
    : user.roles[0]?.name ?? "BEOIS User";

  const uniqueBusinessUnits = Array.from(
    new Map(
      user.roles
        .filter((role) => role.business_unit)
        .map((role) => [
          role.business_unit!.id,
          role.business_unit!,
        ]),
    ).values(),
  );

  const uniqueBranches = Array.from(
    new Map(
      user.roles
        .filter((role) => role.branch)
        .map((role) => [
          role.branch!.id,
          role.branch!,
        ]),
    ).values(),
  );

  const uniqueDepartments = Array.from(
    new Map(
      user.roles
        .filter((role) => role.department)
        .map((role) => [
          role.department!.id,
          role.department!,
        ]),
    ).values(),
  );

  function startEditing() {
    if (!user) {
      return;
    }

    setForm({
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      email: user.email ?? "",
      phone_number: user.phone_number ?? "",
    });

    setError("");
    setSuccess("");
    setEditing(true);
  }

  function cancelEditing() {
    if (!user) {
      return;
    }

    setForm({
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      email: user.email ?? "",
      phone_number: user.phone_number ?? "",
    });

    setError("");
    setSuccess("");
    setEditing(false);
  }

  function updateField(
    field: keyof ProfileForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!user) {
      setError(
        "User profile information is not available.",
      );
      return;
    }

    const email = form.email
      .trim()
      .toLowerCase();

    if (!email) {
      setError("Email address is required.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await updateCurrentUser({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email,
        phone_number:
          form.phone_number.trim(),
      });

      await refreshUser();

      setEditing(false);

      setSuccess(
        "Your profile has been updated successfully.",
      );
    } catch (updateError: unknown) {
      setError(getErrorMessage(updateError));
    } finally {
      setSaving(false);
    }
  }

  async function handleProfilePictureChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Please select a JPG, PNG or WEBP image.",
      );

      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Profile picture must not exceed 5 MB.",
      );

      event.target.value = "";
      return;
    }

    setPhotoSaving(true);
    setError("");
    setSuccess("");

    try {
      await uploadMyProfilePicture(file);

      await refreshUser();

      setSuccess(
        "Your profile picture has been updated successfully.",
      );
    } catch (uploadError: unknown) {
      setError(getErrorMessage(uploadError));
    } finally {
      setPhotoSaving(false);
      event.target.value = "";
    }
  }

  async function handleRemoveProfilePicture() {
    if (!user?.profile_picture) {
      return;
    }

    const confirmed = window.confirm(
      "Remove your current profile picture?",
    );

    if (!confirmed) {
      return;
    }

    setPhotoSaving(true);
    setError("");
    setSuccess("");

    try {
      await removeMyProfilePicture();

      await refreshUser();

      setSuccess(
        "Your profile picture has been removed.",
      );
    } catch (removeError: unknown) {
      setError(getErrorMessage(removeError));
    } finally {
      setPhotoSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
          My Account
        </div>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          My Profile
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Manage your personal information and review
          your BEOIS organizational access and
          permissions.
        </p>
      </div>

      {/* Success */}
      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" />

          <div>
            <div className="font-semibold">
              Profile updated
            </div>

            <div className="mt-0.5">
              {success}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="font-semibold">
            Unable to save profile
          </div>

          <div className="mt-1 break-words">
            {error}
          </div>
        </div>
      )}

      {/* Profile Hero */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 px-5 py-7 text-white sm:px-7 sm:py-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {/* Profile Picture */}
            <div className="relative w-fit shrink-0">
              <div className="flex size-24 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 text-2xl font-bold shadow-lg backdrop-blur">
                {user.profile_picture ? (
                  <img
                    src={user.profile_picture}
                    alt={`${displayName} profile`}
                    className="size-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>

              {/* Camera: Upload / Change */}
              <button
                type="button"
                disabled={photoSaving}
                onClick={() =>
                  photoInputRef.current?.click()
                }
                title={
                  user.profile_picture
                    ? "Change profile picture"
                    : "Upload profile picture"
                }
                aria-label={
                  user.profile_picture
                    ? "Change profile picture"
                    : "Upload profile picture"
                }
                className="absolute -bottom-2 -right-2 flex size-9 items-center justify-center rounded-xl border-2 border-blue-950 bg-white text-blue-700 shadow-lg transition hover:scale-105 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {photoSaving ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Camera size={16} />
                )}
              </button>

              {/* Trash: Remove */}
              {user.profile_picture &&
                !photoSaving && (
                  <button
                    type="button"
                    onClick={
                      handleRemoveProfilePicture
                    }
                    title="Remove profile picture"
                    aria-label="Remove profile picture"
                    className="absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-lg border-2 border-blue-950 bg-white text-red-600 shadow-lg transition hover:scale-105 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                )}

              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={
                  handleProfilePictureChange
                }
                className="hidden"
              />
            </div>

            {/* User Information */}
            <div className="min-w-0 flex-1">
              <h2 className="break-words text-2xl font-bold">
                {displayName}
              </h2>

              <div className="mt-1 text-sm text-blue-100/80">
                @{user.username}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold">
                  <ShieldCheck size={14} />
                  {primaryRole}
                </span>

                {user.is_superuser && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-100">
                    <CheckCircle2 size={14} />
                    Full System Access
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
          <InfoRow
            icon={UserRound}
            label="Username"
            value={user.username}
          />

          <InfoRow
            icon={Mail}
            label="Email"
            value={user.email}
          />

          <InfoRow
            icon={Phone}
            label="Phone Number"
            value={user.phone_number}
          />

          <InfoRow
            icon={ShieldCheck}
            label="Primary Role"
            value={primaryRole}
          />
        </div>
      </section>

      {/* Personal Info + Security */}
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="Personal & Account Information"
          description={
            editing
              ? "Update the personal information associated with your BEOIS account."
              : "Personal information associated with your authenticated BEOIS account."
          }
          action={
            !editing ? (
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700"
              >
                <Pencil size={15} />
                Edit Profile
              </button>
            ) : undefined
          }
        >
          {editing ? (
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label="First Name"
                  value={form.first_name}
                  onChange={(value) =>
                    updateField(
                      "first_name",
                      value,
                    )
                  }
                  placeholder="Enter first name"
                />

                <FormField
                  label="Last Name"
                  value={form.last_name}
                  onChange={(value) =>
                    updateField(
                      "last_name",
                      value,
                    )
                  }
                  placeholder="Enter last name"
                />

                <FormField
                  label="Email Address"
                  type="email"
                  required
                  value={form.email}
                  onChange={(value) =>
                    updateField("email", value)
                  }
                  placeholder="Enter email address"
                />

                <FormField
                  label="Phone Number"
                  type="tel"
                  value={form.phone_number}
                  onChange={(value) =>
                    updateField(
                      "phone_number",
                      value,
                    )
                  }
                  placeholder="Enter phone number"
                />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
                Your username, roles, permissions,
                business unit, branch and department
                cannot be changed from this page.
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={cancelEditing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X size={15} />
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={15}
                        className="animate-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoRow
                  icon={UserRound}
                  label="First Name"
                  value={user.first_name}
                />

                <InfoRow
                  icon={UserRound}
                  label="Last Name"
                  value={user.last_name}
                />

                <InfoRow
                  icon={Mail}
                  label="Email Address"
                  value={user.email}
                />

                <InfoRow
                  icon={Phone}
                  label="Phone Number"
                  value={user.phone_number}
                />
              </div>

              <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-800">
                You can update your personal contact
                information here. Administrative account
                fields and employment assignments remain
                controlled by authorized BEOIS
                administrators.
              </div>
            </>
          )}
        </SectionCard>

        <SectionCard
          title="Account & Security"
          description="Authentication and access status for your account."
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={18} />
                </div>

                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800">
                    Account Status
                  </div>

                  <div className="mt-0.5 text-xs text-slate-500">
                    Authenticated BEOIS account
                  </div>
                </div>
              </div>

              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                ACTIVE
              </span>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <KeyRound size={18} />
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-800">
                  Password & Authentication
                </div>

                <div className="mt-0.5 text-xs leading-5 text-slate-500">
                  Password changes are kept separate
                  from ordinary profile editing for
                  account security.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Fingerprint size={18} />
              </div>

              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800">
                  User ID
                </div>

                <div className="mt-0.5 break-all font-mono text-xs text-slate-500">
                  {user.id}
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Roles */}
      <SectionCard
        title="Roles & Access"
        description="Roles assigned to your account and the organizational scope of each role."
      >
        {user.roles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
            <ShieldCheck className="mx-auto size-8 text-slate-300" />

            <div className="mt-3 text-sm font-semibold text-slate-700">
              No explicit roles assigned
            </div>

            {user.is_superuser && (
              <div className="mt-1 text-xs text-slate-500">
                This account receives access through
                super administrator privileges.
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {user.roles.map((role) => (
              <div
                key={role.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <ShieldCheck size={18} />
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900">
                        {role.name}
                      </div>

                      <div className="mt-0.5 text-xs font-medium text-slate-400">
                        {role.code}
                      </div>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {role.scope_type || "Access"}
                  </span>
                </div>

                <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                  <span className="font-semibold">
                    Scope:
                  </span>{" "}
                  {role.scope_display ||
                    "Authorized access"}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Organization Scope */}
      <SectionCard
        title="Organization Scope"
        description="Business units, branches and departments available through your assigned roles."
      >
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Building2
                size={17}
                className="text-blue-600"
              />
              Business Units
            </div>

            <div className="mt-4 space-y-2">
              {uniqueBusinessUnits.length ? (
                uniqueBusinessUnits.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  >
                    {item.name}
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400">
                  No specific business unit scope
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <MapPin
                size={17}
                className="text-blue-600"
              />
              Branches
            </div>

            <div className="mt-4 space-y-2">
              {uniqueBranches.length ? (
                uniqueBranches.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  >
                    {item.name}
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400">
                  No specific branch scope
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <UsersRound
                size={17}
                className="text-blue-600"
              />
              Departments
            </div>

            <div className="mt-4 space-y-2">
              {uniqueDepartments.length ? (
                uniqueDepartments.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  >
                    {item.name}
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400">
                  No specific department scope
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Permissions */}
      <SectionCard
        title="Permissions"
        description="System permissions currently returned for your authenticated account."
      >
        {user.is_superuser ? (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />

            <div>
              <div className="text-sm font-bold text-emerald-800">
                Super Administrator
              </div>

              <div className="mt-1 text-xs leading-5 text-emerald-700">
                This account has full system access.
              </div>
            </div>
          </div>
        ) : user.permissions.length ? (
          <div className="flex flex-wrap gap-2">
            {user.permissions.map((permission) => (
              <span
                key={permission}
                className="max-w-full break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600"
              >
                {permission}
              </span>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-7 text-center text-sm text-slate-500">
            No individual permissions are listed for
            this account.
          </div>
        )}
      </SectionCard>
    </div>
  );
}