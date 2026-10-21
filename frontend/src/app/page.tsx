"use client";

import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileCheck2,
  GraduationCap,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { AppShell } from "@/components/layout/app-shell";
import { ExecutiveDashboard } from "@/components/dashboard/executive-dashboard";
import { DynamicDashboard } from "@/components/dashboard/dynamic-dashboard";
import { TelecallingDashboard } from "@/components/dashboard/telecalling-dashboard";
import { useAuth } from "@/lib/auth/auth-context";
import { getAdmissions } from "@/lib/api/admissions";

import type {
  AdmissionListItem,
  AdmissionStatus,
} from "@/types/admissions";

const STATUS_LABELS: Record<AdmissionStatus, string> = {
  DRAFT: "Draft",
  DOCUMENT_PENDING: "Document Pending",
  DOCUMENT_VERIFICATION: "Document Verification",
  ELIGIBILITY_PENDING: "Eligibility Pending",
  ELIGIBLE: "Eligible",
  NOT_ELIGIBLE: "Not Eligible",
  FEE_PENDING: "Fee Pending",
  READY_TO_APPLY: "Ready to Apply",
  APPLIED: "Applied",
  ENROLLMENT_PENDING: "Enrollment Pending",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_STYLES: Record<AdmissionStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  DOCUMENT_PENDING: "bg-amber-50 text-amber-700",
  DOCUMENT_VERIFICATION: "bg-orange-50 text-orange-700",
  ELIGIBILITY_PENDING: "bg-violet-50 text-violet-700",
  ELIGIBLE: "bg-emerald-50 text-emerald-700",
  NOT_ELIGIBLE: "bg-red-50 text-red-700",
  FEE_PENDING: "bg-rose-50 text-rose-700",
  READY_TO_APPLY: "bg-sky-50 text-sky-700",
  APPLIED: "bg-blue-50 text-blue-700",
  ENROLLMENT_PENDING: "bg-indigo-50 text-indigo-700",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-slate-200 text-slate-600",
};

const PENDING_STATUSES: AdmissionStatus[] = [
  "DRAFT",
  "DOCUMENT_PENDING",
  "DOCUMENT_VERIFICATION",
  "ELIGIBILITY_PENDING",
  "ELIGIBLE",
  "FEE_PENDING",
  "READY_TO_APPLY",
  "APPLIED",
  "ENROLLMENT_PENDING",
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getDisplayName(user: {
  first_name?: string;
  full_name?: string;
  username?: string;
} | null) {
  return (
    user?.first_name ||
    user?.full_name ||
    user?.username ||
    "Administrator"
  );
}

function AdmissionsAdministratorDashboard({
  canViewAdmissions,
  canViewAcademicMaster,
  canImportAcademicMaster,
}: {
  canViewAdmissions: boolean;
  canViewAcademicMaster: boolean;
  canImportAcademicMaster: boolean;
}) {
  const { user } = useAuth();

  const [admissions, setAdmissions] = useState<AdmissionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAdmissions = useCallback(async (isRefresh = false) => {
    if (!canViewAdmissions) {
      setAdmissions([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const data = await getAdmissions();
      setAdmissions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load admission dashboard data.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canViewAdmissions]);

  useEffect(() => {
    void loadAdmissions();
  }, [loadAdmissions]);

  const total = admissions.length;
  const active = admissions.filter((item) =>
    PENDING_STATUSES.includes(item.status),
  ).length;
  const documentPending = admissions.filter((item) =>
    ["DOCUMENT_PENDING", "DOCUMENT_VERIFICATION"].includes(item.status),
  ).length;
  const eligibilityPending = admissions.filter(
    (item) => item.status === "ELIGIBILITY_PENDING",
  ).length;
  const feePending = admissions.filter(
    (item) => item.status === "FEE_PENDING",
  ).length;
  const enrollmentPending = admissions.filter(
    (item) => item.status === "ENROLLMENT_PENDING",
  ).length;
  const completed = admissions.filter(
    (item) => item.status === "COMPLETED",
  ).length;

  const statusCounts = Object.entries(STATUS_LABELS)
    .map(([status, label]) => ({
      status: status as AdmissionStatus,
      label,
      count: admissions.filter((item) => item.status === status).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  const recentAdmissions = [...admissions]
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() -
        new Date(a.updated_at).getTime(),
    )
    .slice(0, 8);

  const summaryCards = [
    {
      label: "Total Admissions",
      value: total,
      icon: GraduationCap,
      style: "bg-blue-50 text-blue-700",
      description: "Records in your accessible scope",
    },
    {
      label: "Active Work",
      value: active,
      icon: Activity,
      style: "bg-violet-50 text-violet-700",
      description: "Admissions still in progress",
    },
    {
      label: "Documents Pending",
      value: documentPending,
      icon: FileCheck2,
      style: "bg-amber-50 text-amber-700",
      description: "Awaiting receipt or verification",
    },
    {
      label: "Eligibility Pending",
      value: eligibilityPending,
      icon: Clock3,
      style: "bg-orange-50 text-orange-700",
      description: "Awaiting eligibility review",
    },
    {
      label: "Fee Pending",
      value: feePending,
      icon: AlertCircle,
      style: "bg-rose-50 text-rose-700",
      description: "Admissions awaiting fee action",
    },
    {
      label: "Enrollment Pending",
      value: enrollmentPending,
      icon: Users,
      style: "bg-indigo-50 text-indigo-700",
      description: "Awaiting enrollment completion",
    },
    {
      label: "Completed",
      value: completed,
      icon: CheckCircle2,
      style: "bg-emerald-50 text-emerald-700",
      description: "Successfully completed admissions",
    },
  ];

  const workspaceCard =
    "group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md";

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-7 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            BEOIS · Admissions Operations
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Welcome, {getDisplayName(user)}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Your live overview of admissions, pending work and recent activity.
          </p>
        </div>

        {canViewAdmissions && (
          <button
            type="button"
            onClick={() => void loadAdmissions(true)}
            disabled={loading || refreshing}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh data"}
          </button>
        )}
      </header>

      {canViewAdmissions && (
        <>
          {error && (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 shrink-0 text-red-600" size={20} />
                <div>
                  <p className="font-semibold text-red-800">
                    Dashboard data could not be loaded
                  </p>
                  <p className="mt-1 break-words text-sm text-red-700">
                    {error}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void loadAdmissions(true)}
                className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                Try again
              </button>
            </div>
          )}

          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Admissions Overview
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Counts are based on records returned by your permitted admissions API.
                </p>
              </div>
              {!loading && !error && (
                <span className="text-xs text-slate-500">
                  {formatNumber(total)} records loaded
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-500">
                          {card.label}
                        </p>
                        <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                          {loading ? "—" : error ? "—" : formatNumber(card.value)}
                        </p>
                      </div>
                      <span className={`rounded-xl p-3 ${card.style}`}>
                        <Icon size={21} />
                      </span>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      {card.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">
                  Status Breakdown
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Distribution across admission stages.
                </p>
              </div>

              {loading ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Loading status summary...
                </p>
              ) : error ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Status summary unavailable.
                </p>
              ) : statusCounts.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No admission records found.
                </p>
              ) : (
                <div className="space-y-4">
                  {statusCounts.map((item) => {
                    const percentage =
                      total > 0 ? (item.count / total) * 100 : 0;

                    return (
                      <div key={item.status}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-sm text-slate-700">
                            {item.label}
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-slate-900">
                            {formatNumber(item.count)}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Recent Admissions
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Recently updated applicant records.
                  </p>
                </div>
                <Link
                  href="/admissions"
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900"
                >
                  View all <ArrowRight size={15} />
                </Link>
              </div>

              {loading ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  Loading recent admissions...
                </p>
              ) : error ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  Recent admissions unavailable.
                </p>
              ) : recentAdmissions.length === 0 ? (
                <div className="py-10 text-center">
                  <GraduationCap className="mx-auto text-slate-300" size={32} />
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No admissions to display
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Records will appear here when available to your account.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-2 py-3 font-semibold">Applicant</th>
                        <th className="px-2 py-3 font-semibold">Programme</th>
                        <th className="px-2 py-3 font-semibold">Status</th>
                        <th className="px-2 py-3 font-semibold">Assigned To</th>
                        <th className="px-2 py-3 font-semibold">Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAdmissions.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-50 last:border-0 hover:bg-slate-50"
                        >
                          <td className="px-2 py-4">
                            <p className="font-semibold text-slate-900">
                              {item.applicant_name || "Unnamed applicant"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.admission_id}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.institution_name || "Institution not specified"}
                            </p>
                          </td>
                          <td className="px-2 py-4 text-sm text-slate-600">
                            {item.program_name || "—"}
                          </td>
                          <td className="px-2 py-4">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[item.status]}`}
                            >
                              {item.status_display || STATUS_LABELS[item.status]}
                            </span>
                          </td>
                          <td className="px-2 py-4 text-sm text-slate-600">
                            {item.assigned_to
                              ? `${item.assigned_to.first_name} ${item.assigned_to.last_name}`.trim()
                              : "Unassigned"}
                          </td>
                          <td className="whitespace-nowrap px-2 py-4 text-xs text-slate-500">
                            {formatDate(item.updated_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {!canViewAdmissions && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-600">
            Your account does not have permission to view admission summaries.
            You can still access the workspaces listed below.
          </p>
        </section>
      )}

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-900">
            Your Workspaces
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Open the operational area you need.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {canViewAdmissions && (
            <Link href="/admissions" className={workspaceCard}>
              <span className="inline-flex rounded-xl bg-blue-50 p-3 text-blue-700">
                <GraduationCap size={22} />
              </span>
              <h3 className="mt-4 font-bold text-slate-900 group-hover:text-blue-700">
                Admissions Workspace
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Review applicant records and perform the actions permitted for your account.
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
                Open admissions <ArrowRight size={15} />
              </span>
            </Link>
          )}

          {canViewAcademicMaster && (
            <Link href="/admissions/universities" className={workspaceCard}>
              <span className="inline-flex rounded-xl bg-indigo-50 p-3 text-indigo-700">
                <BookOpen size={22} />
              </span>
              <h3 className="mt-4 font-bold text-slate-900 group-hover:text-blue-700">
                Academic Master Data
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Access institutions, programmes and related academic records.
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
                Open academic data <ArrowRight size={15} />
              </span>
            </Link>
          )}

          {canImportAcademicMaster && (
            <Link href="/admissions/import" className={workspaceCard}>
              <span className="inline-flex rounded-xl bg-emerald-50 p-3 text-emerald-700">
                <BookOpen size={22} />
              </span>
              <h3 className="mt-4 font-bold text-slate-900 group-hover:text-emerald-700">
                Academic Master Import
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Import academic master data using the authorized import workflow.
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                Open import <ArrowRight size={15} />
              </span>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}

export default function HomePage() {
  const {
    user,
    loading,
    hasRole,
    hasPermission,
  } = useAuth();

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[360px] items-center justify-center">
          <div className="text-sm font-medium text-slate-500">
            Loading dashboard...
          </div>
        </div>
      </AppShell>
    );
  }

  const isFullAccess =
    Boolean(user?.is_superuser) ||
    hasRole("FULL_ACCESS");

  const isTelecaller =
    !isFullAccess &&
    hasRole("TELECALLER");

  const academicMasterViewPermissions = [
    "admissions.view_institution",
    "admissions.view_program",
    "admissions.view_programfeeplan",
    "admissions.view_programfeeinstallment",
    "admissions.view_programinternalfinance",
  ];

  const academicMasterManagePermissions = [
    "admissions.add_institution",
    "admissions.change_institution",
    "admissions.add_program",
    "admissions.change_program",
    "admissions.add_programfeeplan",
    "admissions.change_programfeeplan",
    "admissions.add_programfeeinstallment",
    "admissions.change_programfeeinstallment",
    "admissions.add_programinternalfinance",
    "admissions.change_programinternalfinance",
  ];

  const canViewAdmissions =
    hasPermission("admissions.view_admission");

  const canViewAcademicMaster =
    hasPermission(...academicMasterViewPermissions);

  const canImportAcademicMaster =
    Boolean(user?.is_superuser) ||
    academicMasterManagePermissions.every(
      (permission) => user?.permissions.includes(permission),
    );

  const isAcademicCoordinator =
    !isFullAccess &&
    hasRole("ACADEMIC_COORDINATOR") &&
    (canViewAdmissions || canViewAcademicMaster);

  const isAdmissionsAdministrator =
    !isFullAccess &&
    hasRole("ADMINISTRATOR") &&
    (canViewAdmissions || canViewAcademicMaster);

  return (
    <AppShell>
      {isTelecaller ? (
        <TelecallingDashboard />
      ) : isAcademicCoordinator || isAdmissionsAdministrator ? (
        <AdmissionsAdministratorDashboard
          canViewAdmissions={canViewAdmissions}
          canViewAcademicMaster={canViewAcademicMaster}
          canImportAcademicMaster={canImportAcademicMaster}
        />
      ) : (
        <DynamicDashboard />
      )}
    </AppShell>
  );
}
