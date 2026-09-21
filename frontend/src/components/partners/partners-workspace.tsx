"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  BadgeIndianRupee,
  BriefcaseBusiness,
  CircleAlert,
  Handshake,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

import {
  getActivePartners,
  getCommissionQueue,
  getOpenPartnerCases,
  getOpenPartnerIssues,
  getPartners,
  getPartnerSummary,
} from "@/lib/api/partners";

import {
  PartnerCreateDialog,
} from "@/components/partners/partner-create-dialog";

import {
  PartnerDetailDrawer,
} from "@/components/partners/partner-detail-drawer";

import type {
  CommissionTransaction,
  PartnerCase,
  PartnerIssue,
  PartnerListItem,
  PartnerSummary,
  PartnerWorkspaceView,
} from "@/types/partners";

// ============================================================
// CONFIG
// ============================================================

const TABS: Array<{
  key: PartnerWorkspaceView;
  label: string;
  icon: React.ElementType;
}> = [
  {
    key: "PARTNERS",
    label: "Partners",
    icon: Handshake,
  },
  {
    key: "ACTIVE",
    label: "Active",
    icon: ShieldCheck,
  },
  {
    key: "CASES",
    label: "Open Cases",
    icon: BriefcaseBusiness,
  },
  {
    key: "ISSUES",
    label: "Open Issues",
    icon: CircleAlert,
  },
  {
    key: "COMMISSIONS",
    label: "Commissions",
    icon: BadgeIndianRupee,
  },
];

// ============================================================
// HELPERS
// ============================================================

function getErrorMessage(
  error: unknown,
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return "Something went wrong.";
}

function formatMoney(
  value: string | number,
) {
  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return String(value);
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    },
  ).format(amount);
}

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

function statusClass(
  status: string,
) {
  switch (status) {
    case "ACTIVE":
    case "COMPLETED":
    case "PAID":
    case "RESOLVED":
    case "VERIFIED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "ONBOARDING":
    case "IN_PROGRESS":
    case "UNDER_REVIEW":
    case "APPROVED":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "PROSPECT":
    case "RECEIVED":
    case "EARNED":
    case "PAYABLE":
    case "WAITING":
    case "ON_HOLD":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "URGENT":
    case "HIGH":
    case "SUSPENDED":
    case "REJECTED":
      return "bg-red-50 text-red-700 ring-red-200";

    case "INACTIVE":
    case "TERMINATED":
    case "CANCELLED":
    case "CLOSED":
      return "bg-slate-100 text-slate-600 ring-slate-200";

    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
}

// ============================================================
// SMALL UI
// ============================================================

function StatusBadge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-1",
        "text-xs font-semibold ring-1 ring-inset",
        statusClass(status),
      ].join(" ")}
    >
      {label ??
        status.replaceAll("_", " ")}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[280px] items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 text-center">
      <Handshake className="mb-4 h-10 w-10 text-slate-300" />

      <h3 className="text-base font-semibold text-slate-800">
        {title}
      </h3>

      <p className="mt-1 max-w-md text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {helper}
          </p>
        </div>

        <div className="rounded-xl bg-slate-100 p-3 text-slate-700">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN WORKSPACE
// ============================================================

export function PartnersWorkspace() {
  const [view, setView] =
    useState<PartnerWorkspaceView>(
      "PARTNERS",
    );

  const [createOpen, setCreateOpen] =
    useState(false);

  const [
    selectedPartnerId,
    setSelectedPartnerId,
  ] = useState<string | null>(null);

  const [search, setSearch] =
    useState("");

  const [summary, setSummary] =
    useState<PartnerSummary | null>(
      null,
    );

  const [partners, setPartners] =
    useState<PartnerListItem[]>([]);

  const [cases, setCases] =
    useState<PartnerCase[]>([]);

  const [issues, setIssues] =
    useState<PartnerIssue[]>([]);

  const [
    commissions,
    setCommissions,
  ] = useState<
    CommissionTransaction[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [
    summaryLoading,
    setSummaryLoading,
  ] = useState(true);

  const [error, setError] =
    useState("");

  const [
    commissionUnavailable,
    setCommissionUnavailable,
  ] = useState(false);

  // ==========================================================
  // SUMMARY
  // ==========================================================

  const loadSummary =
    useCallback(async () => {
      setSummaryLoading(true);

      try {
        const data =
          await getPartnerSummary();

        setSummary(data);
      } catch (err) {
        setError(
          getErrorMessage(err),
        );
      } finally {
        setSummaryLoading(false);
      }
    }, []);

  // ==========================================================
  // CURRENT VIEW
  // ==========================================================

  const loadCurrentView =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        if (view === "PARTNERS") {
          const data =
            await getPartners({
              search:
                search.trim() ||
                undefined,
            });

          setPartners(data);
          return;
        }

        if (view === "ACTIVE") {
          const data =
            await getActivePartners();

          const normalized =
            search
              .trim()
              .toLowerCase();

          setPartners(
            normalized
              ? data.filter(
                  (partner) =>
                    partner.name
                      .toLowerCase()
                      .includes(
                        normalized,
                      ) ||
                    partner.partner_id
                      .toLowerCase()
                      .includes(
                        normalized,
                      ) ||
                    partner.phone_number
                      .toLowerCase()
                      .includes(
                        normalized,
                      ) ||
                    partner.organization_name
                      .toLowerCase()
                      .includes(
                        normalized,
                      ),
                )
              : data,
          );

          return;
        }

        if (view === "CASES") {
          const data =
            await getOpenPartnerCases();

          setCases(data);
          return;
        }

        if (view === "ISSUES") {
          const data =
            await getOpenPartnerIssues();

          setIssues(data);
          return;
        }

        if (
          view === "COMMISSIONS"
        ) {
          try {
            const data =
                await getCommissionQueue();

            setCommissions(data);
            setCommissionUnavailable(
              false,
            );
          } catch (err) {
            setCommissions([]);
            setCommissionUnavailable(
              true,
            );

            const message =
              getErrorMessage(err);

            if (
              !message.includes("403")
            ) {
              setError(message);
            }
          }
        }
      } catch (err) {
        setError(
          getErrorMessage(err),
        );
      } finally {
        setLoading(false);
      }
    }, [view, search]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    const timeout =
      window.setTimeout(
        () => {
          void loadCurrentView();
        },
        search ? 300 : 0,
      );

    return () =>
      window.clearTimeout(
        timeout,
      );
  }, [
    loadCurrentView,
    search,
  ]);

  const refreshAll =
    useCallback(async () => {
      await Promise.all([
        loadSummary(),
        loadCurrentView(),
      ]);
    }, [
      loadSummary,
      loadCurrentView,
    ]);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
              Partner Network Management
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Partner Operations
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Manage education centres,
              consultants, referred student
              cases, operational issues and
              partner commissions from one
              workspace.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                setCreateOpen(true)
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              New Partner
            </button>

            <button
              type="button"
              onClick={() =>
                void refreshAll()
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </header>

        {summaryLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map(
              (item) => (
                <div
                  key={item}
                  className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white"
                />
              ),
            )}
          </div>
        ) : summary ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Partners"
              value={
                summary.partners.total
              }
              helper={`${summary.partners.active} active`}
              icon={Users}
            />

            <SummaryCard
              label="Open Cases"
              value={
                summary.cases.open
              }
              helper={`${summary.cases.total} total cases`}
              icon={
                BriefcaseBusiness
              }
            />

            <SummaryCard
              label="Open Issues"
              value={
                summary.issues.open
              }
              helper={`${summary.issues.urgent_open} urgent`}
              icon={AlertCircle}
            />

            <SummaryCard
              label="Pending Commission"
              value={formatMoney(
                summary.commissions
                  .pending_amount,
              )}
              helper={`${summary.commissions.pending} transactions`}
              icon={
                BadgeIndianRupee
              }
            />
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex min-w-max gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;

              const active =
                view === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setView(tab.key);
                  }}
                  className={[
                    "inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition",
                    active
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                {
                  TABS.find(
                    (tab) =>
                      tab.key ===
                      view,
                  )?.label
                }
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Operational records
                available within your
                current access scope.
              </p>
            </div>

            {(view ===
              "PARTNERS" ||
              view === "ACTIVE") && (
              <div className="relative w-full lg:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(
                    event,
                  ) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Search partners..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="mx-5 mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

              <span>
                {error}
              </span>
            </div>
          )}

          <div className="p-5">
            {loading ? (
              <LoadingState />
            ) : view ===
                "PARTNERS" ||
              view ===
                "ACTIVE" ? (
              <PartnersTable
                partners={
                  partners
                }
                onOpenPartner={(
                  partnerId,
                ) =>
                  setSelectedPartnerId(
                    partnerId,
                  )
                }
              />
            ) : view ===
              "CASES" ? (
              <CasesTable
                cases={cases}
              />
            ) : view ===
              "ISSUES" ? (
              <IssuesTable
                issues={issues}
              />
            ) : commissionUnavailable ? (
              <EmptyState
                title="Commission access restricted"
                description="Commission information is available only to users with the required finance or commission permission."
              />
            ) : (
              <CommissionsTable
                commissions={
                  commissions
                }
              />
            )}
          </div>
        </section>
      </div>

      <PartnerCreateDialog
        open={createOpen}
        onClose={() =>
          setCreateOpen(false)
        }
        onCreated={(
          partner,
        ) => {
          setCreateOpen(false);

          setSelectedPartnerId(
            partner.id,
          );

          void refreshAll();
        }}
      />

      <PartnerDetailDrawer
        partnerId={
          selectedPartnerId
        }
        onClose={() =>
          setSelectedPartnerId(
            null,
          )
        }
        onChanged={() => {
          void refreshAll();
        }}
      />
    </>
  );
}

// ============================================================
// PARTNERS
// ============================================================

function PartnersTable({
  partners,
  onOpenPartner,
}: {
  partners: PartnerListItem[];
  onOpenPartner: (
    partnerId: string,
  ) => void;
}) {
  if (partners.length === 0) {
    return (
      <EmptyState
        title="No partners found"
        description="No partner records match this view or your access scope."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px] border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
            <th className="border-b border-slate-200 px-4 py-3">
              Partner
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Type
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Location
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Contact
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Manager
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Status
            </th>
          </tr>
        </thead>

        <tbody>
          {partners.map(
            (partner) => (
              <tr
                key={partner.id}
                className="transition hover:bg-slate-50"
              >
                <td className="border-b border-slate-100 px-4 py-4">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenPartner(
                        partner.id,
                      )
                    }
                    className="text-left font-semibold text-slate-900 transition hover:text-blue-700"
                  >
                    {
                      partner.name
                    }
                  </button>

                  <p className="mt-1 text-xs text-slate-500">
                    {
                      partner.partner_id
                    }
                  </p>
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                  {
                    partner.partner_type_display
                  }
                </td>

                <td className="border-b border-slate-100 px-4 py-4">
                  <p className="text-sm text-slate-700">
                    {partner.city ||
                      "—"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {partner.state ||
                      partner.territory ||
                      "—"}
                  </p>
                </td>

                <td className="border-b border-slate-100 px-4 py-4">
                  <p className="text-sm text-slate-700">
                    {partner.contact_person ||
                      "—"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {
                      partner.phone_number
                    }
                  </p>
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                  {partner
                    .relationship_manager
                    ?.username ??
                    "—"}
                </td>

                <td className="border-b border-slate-100 px-4 py-4">
                  <StatusBadge
                    status={
                      partner.status
                    }
                    label={
                      partner.status_display
                    }
                  />
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// CASES
// ============================================================

function CasesTable({
  cases,
}: {
  cases: PartnerCase[];
}) {
  if (cases.length === 0) {
    return (
      <EmptyState
        title="No open cases"
        description="There are currently no open partner student cases in your scope."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[950px] border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
            <th className="border-b border-slate-200 px-4 py-3">
              Case
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Applicant
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Institution /
              Program
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Vertical
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Status
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Assigned
            </th>
          </tr>
        </thead>

        <tbody>
          {cases.map(
            (item) => (
              <tr
                key={item.id}
                className="hover:bg-slate-50"
              >
                <td className="border-b border-slate-100 px-4 py-4">
                  <p className="font-semibold text-slate-900">
                    {
                      item.case_id
                    }
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Partner case
                  </p>
                </td>

                <td className="border-b border-slate-100 px-4 py-4">
                  <p className="text-sm font-medium text-slate-800">
                    {
                      item.applicant_name
                    }
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {
                      item.phone_number
                    }
                  </p>
                </td>

                <td className="border-b border-slate-100 px-4 py-4">
                  <p className="text-sm text-slate-700">
                    {item.institution_name ||
                      "—"}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {item.program_name ||
                      "—"}
                  </p>
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                  {item.vertical.replaceAll(
                    "_",
                    " ",
                  )}
                </td>

                <td className="border-b border-slate-100 px-4 py-4">
                  <StatusBadge
                    status={
                      item.status
                    }
                    label={
                      item.status_display
                    }
                  />
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                  {item.assigned_to
                    ?.username ??
                    "—"}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// ISSUES
// ============================================================

function IssuesTable({
  issues,
}: {
  issues: PartnerIssue[];
}) {
  if (issues.length === 0) {
    return (
      <EmptyState
        title="No open issues"
        description="There are currently no unresolved partner issues in your scope."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
            <th className="border-b border-slate-200 px-4 py-3">
              Issue
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Priority
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Status
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Assigned
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Created
            </th>
          </tr>
        </thead>

        <tbody>
          {issues.map(
            (issue) => (
              <tr
                key={issue.id}
                className="hover:bg-slate-50"
              >
                <td className="border-b border-slate-100 px-4 py-4">
                  <p className="font-semibold text-slate-900">
                    {
                      issue.subject
                    }
                  </p>

                  <p className="mt-1 max-w-md truncate text-xs text-slate-500">
                    {
                      issue.description
                    }
                  </p>
                </td>

                <td className="border-b border-slate-100 px-4 py-4">
                  <StatusBadge
                    status={
                      issue.priority
                    }
                    label={
                      issue.priority_display
                    }
                  />
                </td>

                <td className="border-b border-slate-100 px-4 py-4">
                  <StatusBadge
                    status={
                      issue.status
                    }
                    label={
                      issue.status_display
                    }
                  />
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                  {issue.assigned_to
                    ?.username ??
                    "—"}
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                  {formatDate(
                    issue.created_at,
                  )}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// COMMISSIONS
// ============================================================

function CommissionsTable({
  commissions,
}: {
  commissions:
    CommissionTransaction[];
}) {
  if (
    commissions.length === 0
  ) {
    return (
      <EmptyState
        title="No pending commissions"
        description="There are currently no earned, approved or payable partner commissions."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-separate border-spacing-0">
        <thead>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
            <th className="border-b border-slate-200 px-4 py-3">
              Transaction
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Base Amount
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Commission
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Status
            </th>

            <th className="border-b border-slate-200 px-4 py-3">
              Created
            </th>
          </tr>
        </thead>

        <tbody>
          {commissions.map(
            (commission) => (
              <tr
                key={
                  commission.id
                }
                className="hover:bg-slate-50"
              >
                <td className="border-b border-slate-100 px-4 py-4">
                  <p className="font-semibold text-slate-900">
                    Partner
                    Commission
                  </p>

                  {commission.payment_reference ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Ref:{" "}
                      {
                        commission.payment_reference
                      }
                    </p>
                  ) : null}
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                  {formatMoney(
                    commission.base_amount,
                  )}
                </td>

                <td className="border-b border-slate-100 px-4 py-4 font-semibold text-slate-900">
                  {formatMoney(
                    commission.commission_amount,
                  )}
                </td>

                <td className="border-b border-slate-100 px-4 py-4">
                  <StatusBadge
                    status={
                      commission.status
                    }
                    label={
                      commission.status_display
                    }
                  />
                </td>

                <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                  {formatDate(
                    commission.created_at,
                  )}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}