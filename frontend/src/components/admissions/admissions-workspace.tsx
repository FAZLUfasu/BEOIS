"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileClock,
  GraduationCap,
  LoaderCircle,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";

import {
  AdmissionActivityPanel,
} from "@/components/admissions/admission-activity-panel";
import {
  AdmissionDocumentPanel,
} from "@/components/admissions/admission-document-panel";
import {
  AdmissionFinancePanel,
} from "@/components/admissions/admission-finance-panel";

import {
  completeAdmission,
  getAdmission,
  getAdmissions,
  getDocumentPendingAdmissions,
  getEnrollmentPendingAdmissions,
  getFeePendingAdmissions,
  getInstitutions,
  getPendingAdmissions,
  markAdmissionEligible,
  markAdmissionNotEligible,
  recordAdmissionEnrollment,
  submitUniversityApplication,
} from "@/lib/api/admissions";

import {
  useAuth,
} from "@/lib/auth/auth-context";

import type {
  AdmissionDetail,
  AdmissionListItem,
  AdmissionQueue,
  AdmissionStatus,
  AdmissionVertical,
  Institution,
} from "@/types/admissions";

const STATUS_OPTIONS: Array<{
  value: AdmissionStatus | "";
  label: string;
}> = [
  ["", "All Statuses"],
  ["DRAFT", "Draft"],
  ["DOCUMENT_PENDING", "Document Pending"],
  [
    "DOCUMENT_VERIFICATION",
    "Document Verification",
  ],
  [
    "ELIGIBILITY_PENDING",
    "Eligibility Pending",
  ],
  ["ELIGIBLE", "Eligible"],
  ["NOT_ELIGIBLE", "Not Eligible"],
  ["FEE_PENDING", "Fee Pending"],
  ["READY_TO_APPLY", "Ready to Apply"],
  ["APPLIED", "Applied"],
  [
    "ENROLLMENT_PENDING",
    "Enrollment Pending",
  ],
  ["COMPLETED", "Completed"],
  ["CANCELLED", "Cancelled"],
].map(([value, label]) => ({
  value: value as AdmissionStatus | "",
  label,
}));

const QUEUES: Array<{
  value: AdmissionQueue;
  label: string;
}> = [
  {
    value: "ALL",
    label: "All Admissions",
  },
  {
    value: "PENDING",
    label: "Active / Pending",
  },
  {
    value: "DOCUMENT_PENDING",
    label: "Documents",
  },
  {
    value: "FEE_PENDING",
    label: "Fees",
  },
  {
    value: "ENROLLMENT_PENDING",
    label: "Enrollment",
  },
];

function formatDate(
  value?: string | null,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}

function getUserName(
  user:
    | {
        first_name: string;
        last_name: string;
        email: string;
      }
    | null
    | undefined,
) {
  if (!user) {
    return "Unassigned";
  }

  const name = [
    user.first_name,
    user.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || user.email;
}

function statusClasses(
  status: AdmissionStatus,
) {
  switch (status) {
    case "COMPLETED":
    case "ELIGIBLE":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";

    case "NOT_ELIGIBLE":
    case "CANCELLED":
      return "bg-rose-50 text-rose-700 ring-rose-600/20";

    case "FEE_PENDING":
    case "DOCUMENT_PENDING":
    case "DOCUMENT_VERIFICATION":
    case "ELIGIBILITY_PENDING":
    case "ENROLLMENT_PENDING":
      return "bg-amber-50 text-amber-700 ring-amber-600/20";

    case "READY_TO_APPLY":
    case "APPLIED":
      return "bg-blue-50 text-blue-700 ring-blue-600/20";

    default:
      return "bg-slate-100 text-slate-700 ring-slate-500/20";
  }
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof GraduationCap;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>

          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
        </div>

        <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export function AdmissionsWorkspace() {
  const {
    user,
    hasRole,
  } = useAuth();

  const [
    admissions,
    setAdmissions,
  ] = useState<AdmissionListItem[]>([]);

  const [
    institutions,
    setInstitutions,
  ] = useState<Institution[]>([]);

  const [
    selectedAdmission,
    setSelectedAdmission,
  ] = useState<AdmissionDetail | null>(
    null,
  );

  const [
    selectedAdmissionId,
    setSelectedAdmissionId,
  ] = useState<string | null>(null);

  const [queue, setQueue] =
    useState<AdmissionQueue>("ALL");

  const [search, setSearch] =
    useState("");

  const [
    status,
    setStatus,
  ] = useState<AdmissionStatus | "">("");

  const [
    vertical,
    setVertical,
  ] = useState<AdmissionVertical | "">(
    "",
  );

  const [
    institution,
    setInstitution,
  ] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [
    detailLoading,
    setDetailLoading,
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const canManageAdmission =
  Boolean(user?.is_superuser) ||
  hasRole(
    "SUPER_ADMIN",
    "CHAIRMAN",
    "GENERAL_MANAGER",
    "ADMISSION",
    "MANAGER",
    "DEPARTMENT_HEAD",
  );

  const canManageFinance =
    Boolean(user?.is_superuser) ||
    hasRole(
      "SUPER_ADMIN",
      "GENERAL_MANAGER",
      "FINANCE",
      "MANAGER",
      "DEPARTMENT_HEAD",
      "ADMISSION",
    );

  const loadAdmissions =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        let data:
          AdmissionListItem[];

        if (queue === "PENDING") {
          data =
            await getPendingAdmissions();
        } else if (
          queue === "DOCUMENT_PENDING"
        ) {
          data =
            await getDocumentPendingAdmissions();
        } else if (
          queue === "FEE_PENDING"
        ) {
          data =
            await getFeePendingAdmissions();
        } else if (
          queue ===
          "ENROLLMENT_PENDING"
        ) {
          data =
            await getEnrollmentPendingAdmissions();
        } else {
          data = await getAdmissions({
            search: search.trim(),
            status,
            vertical,
            institution,
          });
        }

        if (queue !== "ALL") {
          const normalizedSearch =
            search
              .trim()
              .toLowerCase();

          data = data.filter(
            (item) => {
              const matchesSearch =
                !normalizedSearch ||
                item.admission_id
                  .toLowerCase()
                  .includes(
                    normalizedSearch,
                  ) ||
                item.applicant_name
                  .toLowerCase()
                  .includes(
                    normalizedSearch,
                  ) ||
                item.phone_number
                  .toLowerCase()
                  .includes(
                    normalizedSearch,
                  ) ||
                item.email
                  .toLowerCase()
                  .includes(
                    normalizedSearch,
                  );

              const matchesStatus =
                !status ||
                item.status === status;

              const matchesVertical =
                !vertical ||
                item.vertical ===
                  vertical;

              const matchesInstitution =
                !institution ||
                item.institution ===
                  institution;

              return (
                matchesSearch &&
                matchesStatus &&
                matchesVertical &&
                matchesInstitution
              );
            },
          );
        }

        setAdmissions(data);
      } catch {
        setError(
          "Unable to load admissions. Check the API connection and your permissions.",
        );
      } finally {
        setLoading(false);
      }
    }, [
      queue,
      search,
      status,
      vertical,
      institution,
    ]);

  const loadInstitutions =
    useCallback(async () => {
      try {
        const data =
          await getInstitutions(true);

        setInstitutions(data);
      } catch {
        // The admission list can remain
        // usable if master data fails.
      }
    }, []);

  const refreshSelectedAdmission =
    useCallback(async () => {
      if (!selectedAdmissionId) {
        return;
      }

      const detail =
        await getAdmission(
          selectedAdmissionId,
        );

      setSelectedAdmission(detail);
    }, [selectedAdmissionId]);

  const refreshAfterAction =
    useCallback(async () => {
      await Promise.all([
        loadAdmissions(),
        refreshSelectedAdmission(),
      ]);
    }, [
      loadAdmissions,
      refreshSelectedAdmission,
    ]);

  useEffect(() => {
    void loadInstitutions();
  }, [loadInstitutions]);

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        void loadAdmissions();
      }, 250);

    return () =>
      window.clearTimeout(timer);
  }, [loadAdmissions]);

  async function openAdmission(
    id: string,
  ) {
    setSelectedAdmissionId(id);
    setDetailLoading(true);
    setError("");
    setSuccess("");

    try {
      const detail =
        await getAdmission(id);

      setSelectedAdmission(detail);
    } catch {
      setError(
        "Unable to load admission details.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function runAction(
    action: () => Promise<unknown>,
    message: string,
  ) {
    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      await action();
      setSuccess(message);
      await refreshAfterAction();
    } catch {
      setError(
        "The admission action could not be completed. Check the required fields, current status and your permissions.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEligible() {
    if (!selectedAdmission) {
      return;
    }

    const notes =
      window.prompt(
        "Eligibility notes (optional):",
        "",
      );

    if (notes === null) {
      return;
    }

    await runAction(
      () =>
        markAdmissionEligible(
          selectedAdmission.id,
          notes,
        ),
      "Admission marked as eligible.",
    );
  }

  async function handleNotEligible() {
    if (!selectedAdmission) {
      return;
    }

    const reason =
      window.prompt(
        "Reason for marking this applicant not eligible:",
        "",
      );

    if (!reason?.trim()) {
      return;
    }

    await runAction(
      () =>
        markAdmissionNotEligible(
          selectedAdmission.id,
          reason.trim(),
        ),
      "Admission marked as not eligible.",
    );
  }

  async function handleUniversityApplication() {
    if (!selectedAdmission) {
      return;
    }

    const applicationNumber =
      window.prompt(
        "Enter university application number:",
        selectedAdmission
          .university_application_number ||
          "",
      );

    if (!applicationNumber?.trim()) {
      return;
    }

    await runAction(
      () =>
        submitUniversityApplication(
          selectedAdmission.id,
          {
            application_number:
              applicationNumber.trim(),
          },
        ),
      "University application recorded.",
    );
  }

  async function handleEnrollment() {
    if (!selectedAdmission) {
      return;
    }

    const enrollmentNumber =
      window.prompt(
        "Enter enrollment number:",
        selectedAdmission
          .enrollment_number || "",
      );

    if (!enrollmentNumber?.trim()) {
      return;
    }

    const universityAdmissionNumber =
      window.prompt(
        "University admission number (optional):",
        selectedAdmission
          .university_admission_number ||
          "",
      );

    if (
      universityAdmissionNumber ===
      null
    ) {
      return;
    }

    await runAction(
      () =>
        recordAdmissionEnrollment(
          selectedAdmission.id,
          {
            enrollment_number:
              enrollmentNumber.trim(),
            university_admission_number:
              universityAdmissionNumber.trim(),
          },
        ),
      "Enrollment information recorded.",
    );
  }

  async function handleComplete() {
    if (!selectedAdmission) {
      return;
    }

    if (
      !selectedAdmission.enrollment_number
    ) {
      setError(
        "An enrollment number is required before the admission can be completed.",
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Complete admission ${selectedAdmission.admission_id}?`,
      );

    if (!confirmed) {
      return;
    }

    await runAction(
      () =>
        completeAdmission(
          selectedAdmission.id,
          "Admission completed from BEOIS Admissions workspace.",
        ),
      "Admission completed successfully.",
    );
  }

  const stats = useMemo(
    () => ({
      total: admissions.length,

      documents:
        admissions.filter(
          (item) =>
            item.status ===
              "DOCUMENT_PENDING" ||
            item.status ===
              "DOCUMENT_VERIFICATION",
        ).length,

      fees:
        admissions.filter(
          (item) =>
            item.status ===
            "FEE_PENDING",
        ).length,

      enrollment:
        admissions.filter(
          (item) =>
            item.status ===
            "ENROLLMENT_PENDING",
        ).length,
    }),
    [admissions],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
            <GraduationCap
              size={16}
            />
            Admission Management
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Admissions Operations
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Manage applicant processing,
            documentation, eligibility,
            fees, university applications
            and enrollment.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadAdmissions()
          }
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
          />
          {success}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current View"
          value={stats.total}
          icon={GraduationCap}
        />

        <StatCard
          label="Document Pending"
          value={stats.documents}
          icon={FileClock}
        />

        <StatCard
          label="Fee Pending"
          value={stats.fees}
          icon={CircleDollarSign}
        />

        <StatCard
          label="Enrollment Pending"
          value={stats.enrollment}
          icon={ClipboardCheck}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap gap-2">
            {QUEUES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() =>
                  setQueue(item.value)
                }
                className={
                  queue === item.value
                    ? "rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white"
                    : "rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search admission..."
              className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target
                  .value as
                  | AdmissionStatus
                  | "",
              )
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            {STATUS_OPTIONS.map(
              (item) => (
                <option
                  key={
                    item.value || "ALL"
                  }
                  value={item.value}
                >
                  {item.label}
                </option>
              ),
            )}
          </select>

          <select
            value={vertical}
            onChange={(event) =>
              setVertical(
                event.target
                  .value as
                  | AdmissionVertical
                  | "",
              )
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            <option value="">
              All Verticals
            </option>
            <option value="REGULAR">
              Regular
            </option>
            <option value="CREDIT_TRANSFER">
              Credit Transfer
            </option>
          </select>

          <select
            value={institution}
            onChange={(event) =>
              setInstitution(
                event.target.value,
              )
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            <option value="">
              All Institutions
            </option>

            {institutions.map(
              (item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.short_name ||
                    item.name}
                </option>
              ),
            )}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                {[
                  "Admission",
                  "Applicant",
                  "Institution / Program",
                  "Type",
                  "Status",
                  "Assigned",
                  "Updated",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {heading}
                  </th>
                ))}

                <th className="w-14 px-5 py-3" />
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-16"
                  >
                    <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
                      <LoaderCircle
                        size={20}
                        className="animate-spin"
                      />
                      Loading admissions...
                    </div>
                  </td>
                </tr>
              ) : admissions.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-16 text-center"
                  >
                    <GraduationCap
                      size={34}
                      className="mx-auto mb-3 text-slate-300"
                    />
                    <p className="font-medium text-slate-700">
                      No admissions found
                    </p>
                  </td>
                </tr>
              ) : (
                admissions.map(
                  (item) => (
                    <tr
                      key={item.id}
                      onClick={() =>
                        void openAdmission(
                          item.id,
                        )
                      }
                      className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">
                          {
                            item.admission_id
                          }
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                          {item.academic_session ||
                            "No session"}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800">
                          {
                            item.applicant_name
                          }
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {
                            item.phone_number
                          }
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800">
                          {
                            item.institution_name
                          }
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {
                            item.program_name
                          }
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="text-sm text-slate-700">
                          {
                            item.vertical_display
                          }
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                          {
                            item.channel_display
                          }
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusClasses(
                            item.status,
                          )}`}
                        >
                          {
                            item.status_display
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <UserRound
                            size={15}
                          />
                          {getUserName(
                            item.assigned_to,
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-500">
                        {formatDate(
                          item.updated_at,
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <ChevronRight
                          size={18}
                          className="text-slate-400"
                        />
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedAdmissionId && (
        <div className="space-y-5">
          {detailLoading ? (
            <div className="flex min-h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white">
              <LoaderCircle
                size={22}
                className="animate-spin text-slate-500"
              />
            </div>
          ) : selectedAdmission ? (
            <>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 xl:flex-row">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold text-slate-950">
                        {
                          selectedAdmission.applicant_name
                        }
                      </h2>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusClasses(
                          selectedAdmission.status,
                        )}`}
                      >
                        {
                          selectedAdmission.status_display
                        }
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {
                        selectedAdmission.admission_id
                      }
                      {selectedAdmission.lead_id
                        ? ` • Lead ${selectedAdmission.lead_id}`
                        : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAdmissionId(
                        null,
                      );
                      setSelectedAdmission(
                        null,
                      );
                    }}
                    className="text-sm font-medium text-slate-500 hover:text-slate-900"
                  >
                    Close details
                  </button>
                </div>

                <div className="grid gap-6 py-5 md:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Contact
                    </p>

                    <p className="mt-2 font-medium text-slate-800">
                      {
                        selectedAdmission.phone_number
                      }
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {selectedAdmission.email ||
                        "No email"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Institution
                    </p>

                    <p className="mt-2 font-medium text-slate-800">
                      {
                        selectedAdmission
                          .institution.name
                      }
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {
                        selectedAdmission
                          .program.name
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Admission Type
                    </p>

                    <p className="mt-2 font-medium text-slate-800">
                      {
                        selectedAdmission.vertical_display
                      }
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {
                        selectedAdmission.channel_display
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      Assigned To
                    </p>

                    <p className="mt-2 font-medium text-slate-800">
                      {getUserName(
                        selectedAdmission.assigned_to,
                      )}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {
                        selectedAdmission.academic_session ||
                        "No academic session"
                      }
                    </p>
                  </div>
                </div>

                {selectedAdmission.vertical ===
                  "CREDIT_TRANSFER" && (
                  <div className="mb-5 grid gap-3 rounded-xl bg-blue-50 p-4 md:grid-cols-3">
                    <div>
                      <div className="text-xs text-blue-500">
                        Previous Institution
                      </div>
                      <div className="mt-1 text-sm font-medium text-blue-950">
                        {selectedAdmission.previous_institution ||
                          "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-blue-500">
                        Previous Program
                      </div>
                      <div className="mt-1 text-sm font-medium text-blue-950">
                        {selectedAdmission.previous_program ||
                          "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-blue-500">
                        Previous Registration
                      </div>
                      <div className="mt-1 text-sm font-medium text-blue-950">
                        {selectedAdmission.previous_registration_number ||
                          "—"}
                      </div>
                    </div>
                  </div>
                )}

                {canManageAdmission && (
                  <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() =>
                        void handleEligible()
                      }
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2
                        size={16}
                      />
                      Eligible
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() =>
                        void handleNotEligible()
                      }
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-rose-50 px-4 text-sm font-semibold text-rose-700 disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      Not Eligible
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() =>
                        void handleUniversityApplication()
                      }
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-50 px-4 text-sm font-semibold text-blue-700 disabled:opacity-50"
                    >
                      <Send size={16} />
                      University Application
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() =>
                        void handleEnrollment()
                      }
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-violet-50 px-4 text-sm font-semibold text-violet-700 disabled:opacity-50"
                    >
                      <ShieldCheck
                        size={16}
                      />
                      Record Enrollment
                    </button>

                    <button
                      type="button"
                      disabled={
                        actionLoading ||
                        selectedAdmission.status ===
                          "COMPLETED"
                      }
                      onClick={() =>
                        void handleComplete()
                      }
                      className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <LoaderCircle
                          size={16}
                          className="animate-spin"
                        />
                      ) : (
                        <GraduationCap
                          size={16}
                        />
                      )}

                      Complete Admission
                    </button>
                  </div>
                )}
              </section>

              <div className="grid gap-5 xl:grid-cols-2">
                <AdmissionDocumentPanel
                  admissionId={
                    selectedAdmission.id
                  }
                  documents={
                    selectedAdmission.documents
                  }
                  canManage={
                    canManageAdmission
                  }
                  onChanged={
                    refreshAfterAction
                  }
                />

                <AdmissionFinancePanel
                  admissionId={
                    selectedAdmission.id
                  }
                  fees={
                    selectedAdmission.fees
                  }
                  payments={
                    selectedAdmission.payments
                  }
                  canManageFinance={
                    canManageFinance
                  }
                  onChanged={
                    refreshAfterAction
                  }
                />
              </div>

              <AdmissionActivityPanel
                admissionId={
                  selectedAdmission.id
                }
                canManage={
                  canManageAdmission
                }
              />
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}