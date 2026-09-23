"use client";

import {
  Building2,
  CheckCircle2,
  Fingerprint,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";

function getInitials(
  name: string,
  username: string,
) {
  const source = name.trim() || username;

  const parts = source
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0]}${
    parts[parts.length - 1][0]
  }`.toUpperCase();
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
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <h2 className="text-lg font-bold text-slate-950">
          {title}
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>

      <div className="p-5 sm:p-6">
        {children}
      </div>
    </section>
  );
}

export function ProfileWorkspace() {
  const {
    user,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto size-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

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

  const primaryRole =
    user.is_superuser
      ? "Super Administrator"
      : user.roles[0]?.name ??
        "BEOIS User";

  const uniqueBusinessUnits = Array.from(
    new Map(
      user.roles
        .filter(
          (role) => role.business_unit,
        )
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
        .filter(
          (role) => role.department,
        )
        .map((role) => [
          role.department!.id,
          role.department!,
        ]),
    ).values(),
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
          My Account
        </div>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          My Profile
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          View your BEOIS account information,
          organizational access and assigned
          permissions.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 px-5 py-7 text-white sm:px-7 sm:py-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-2xl font-bold shadow-sm backdrop-blur">
              {initials}
            </div>

            <div className="min-w-0">
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

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title="Personal & Account Information"
          description="Basic information associated with your authenticated BEOIS account."
        >
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
            Administrative account fields and
            employment assignments are managed by
            authorized BEOIS administrators. This
            prevents users from changing their own
            roles, branch, department or system
            access.
          </div>
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
                  Password changes and advanced
                  authentication controls will be
                  handled through the dedicated
                  security workflow.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Fingerprint size={18} />
              </div>

              <div>
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
                    {role.scope_type ||
                      "Access"}
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
                uniqueBusinessUnits.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                    >
                      {item.name}
                    </div>
                  ),
                )
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
                uniqueDepartments.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700"
                    >
                      {item.name}
                    </div>
                  ),
                )
              ) : (
                <div className="text-xs text-slate-400">
                  No specific department scope
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

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
            {user.permissions.map(
              (permission) => (
                <span
                  key={permission}
                  className="max-w-full break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600"
                >
                  {permission}
                </span>
              ),
            )}
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