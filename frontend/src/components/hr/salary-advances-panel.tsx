"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  WalletCards,
  X,
} from "lucide-react";

import {
  SalaryAdvanceApproveDialog,
} from "@/components/hr/salary-advance-approve-dialog";

import {
  SalaryAdvanceDisburseDialog,
} from "@/components/hr/salary-advance-disburse-dialog";

import {
  SalaryAdvanceRequestDialog,
} from "@/components/hr/salary-advance-request-dialog";

import {
  getEmployees,
} from "@/lib/api/employees";

import {
  getSalaryAdvances,
} from "@/lib/api/payroll";

import {
  useAuth,
} from "@/lib/auth/auth-context";

import type {
  EmployeeListItem,
} from "@/types/employees";

import type {
  SalaryAdvance,
  SalaryAdvanceStatus,
} from "@/types/payroll";


type StatusFilter =
  | "ALL"
  | SalaryAdvanceStatus;


export function SalaryAdvancesPanel() {
  const {
    hasRole,
  } = useAuth();

  const [
    advances,
    setAdvances,
  ] = useState<SalaryAdvance[]>([]);

  const [
    employees,
    setEmployees,
  ] = useState<EmployeeListItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<StatusFilter>("ALL");

  const [
    requestOpen,
    setRequestOpen,
  ] = useState(false);

  const [
    approvalTarget,
    setApprovalTarget,
  ] = useState<SalaryAdvance | null>(
    null,
  );

  const [
    disbursementTarget,
    setDisbursementTarget,
  ] = useState<SalaryAdvance | null>(
    null,
  );

  const [
    detailTarget,
    setDetailTarget,
  ] = useState<SalaryAdvance | null>(
    null,
  );


  const canApprove = hasRole(
    "SUPER_ADMIN",
    "CHAIRMAN",
    "GENERAL_MANAGER",
    "HR",
  );

  const canDisburse = hasRole(
    "SUPER_ADMIN",
    "CHAIRMAN",
    "GENERAL_MANAGER",
  );


  const loadData =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const [
          advanceData,
          employeeData,
        ] = await Promise.all([
          getSalaryAdvances(),
          getEmployees(),
        ]);

        setAdvances(advanceData);
        setEmployees(employeeData);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load salary advances.",
        );
      } finally {
        setLoading(false);
      }
    }, []);


  useEffect(() => {
    void loadData();
  }, [loadData]);


  const filtered =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return advances.filter(
        (advance) => {
          if (
            statusFilter !== "ALL" &&
            advance.status !==
              statusFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            advance.employee_id,
            advance.employee_name,
            advance.reason,
            advance.payment_reference,
            advance.status,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        },
      );
    }, [
      advances,
      search,
      statusFilter,
    ]);


  const metrics =
    useMemo(() => {
      return {
        total: advances.length,

        requested:
          advances.filter(
            (item) =>
              item.status ===
              "REQUESTED",
          ).length,

        approved:
          advances.filter(
            (item) =>
              item.status ===
              "APPROVED",
          ).length,

        outstanding:
          advances
            .filter((item) =>
              [
                "DISBURSED",
                "PARTIALLY_RECOVERED",
              ].includes(
                item.status,
              ),
            )
            .reduce(
              (sum, item) =>
                sum +
                Number(
                  item.outstanding_amount ||
                    0,
                ),
              0,
            ),
      };
    }, [advances]);


  function updateAdvance(
    saved: SalaryAdvance,
  ) {
    setAdvances((current) => {
      const exists =
        current.some(
          (item) =>
            item.id === saved.id,
        );

      if (!exists) {
        return [
          saved,
          ...current,
        ];
      }

      return current.map(
        (item) =>
          item.id === saved.id
            ? saved
            : item,
      );
    });

    if (
      detailTarget?.id === saved.id
    ) {
      setDetailTarget(saved);
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Employee Advances
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-950">
            Salary Advance Management
          </h2>

          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Manage employee salary advance requests, approvals,
            disbursement and recovery balances.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void loadData()
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          <button
            type="button"
            onClick={() =>
              setRequestOpen(true)
            }
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            New Advance
          </button>
        </div>
      </div>


      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Advances"
          value={String(
            metrics.total,
          )}
          helper="All advance records"
          icon={WalletCards}
        />

        <MetricCard
          label="Awaiting Approval"
          value={String(
            metrics.requested,
          )}
          helper="Requested advances"
          icon={Clock3}
        />

        <MetricCard
          label="Approved"
          value={String(
            metrics.approved,
          )}
          helper="Ready for disbursement"
          icon={CheckCircle2}
        />

        <MetricCard
          label="Outstanding"
          value={`₹${formatMoney(
            metrics.outstanding,
          )}`}
          helper="Remaining recoverable amount"
          icon={CircleDollarSign}
        />
      </div>


      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
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
                placeholder="Search employee, reason or payment reference..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as StatusFilter,
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none"
            >
              <option value="ALL">
                All statuses
              </option>
              <option value="REQUESTED">
                Requested
              </option>
              <option value="APPROVED">
                Approved
              </option>
              <option value="DISBURSED">
                Disbursed
              </option>
              <option value="PARTIALLY_RECOVERED">
                Partially Recovered
              </option>
              <option value="RECOVERED">
                Recovered
              </option>
              <option value="REJECTED">
                Rejected
              </option>
              <option value="CANCELLED">
                Cancelled
              </option>
            </select>
          </div>
        </div>


        {error ? (
          <div className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}


        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
            <Banknote className="mb-3 h-10 w-10 text-slate-300" />

            <h3 className="font-semibold text-slate-800">
              No salary advances found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Create an advance request or change the current filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <TableHead>
                    Employee
                  </TableHead>
                  <TableHead>
                    Requested
                  </TableHead>
                  <TableHead>
                    Approved
                  </TableHead>
                  <TableHead>
                    Recovered
                  </TableHead>
                  <TableHead>
                    Outstanding
                  </TableHead>
                  <TableHead>
                    Status
                  </TableHead>
                  <TableHead>
                    Actions
                  </TableHead>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filtered.map(
                  (advance) => (
                    <tr
                      key={advance.id}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="whitespace-nowrap px-5 py-4">
                        <p className="font-semibold text-slate-900">
                          {advance.employee_name ||
                            "Unnamed employee"}
                        </p>

                        <p className="text-xs text-slate-500">
                          {advance.employee_id}
                        </p>
                      </td>

                      <MoneyCell
                        value={
                          advance.requested_amount
                        }
                      />

                      <MoneyCell
                        value={
                          advance.approved_amount
                        }
                      />

                      <MoneyCell
                        value={
                          advance.recovered_amount
                        }
                      />

                      <MoneyCell
                        value={
                          advance.outstanding_amount
                        }
                        strong
                      />

                      <td className="whitespace-nowrap px-5 py-4">
                        <StatusBadge
                          status={
                            advance.status
                          }
                        />
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-2">
                          <ActionButton
                            onClick={() =>
                              setDetailTarget(
                                advance,
                              )
                            }
                            icon={Eye}
                            label="View"
                          />

                          {canApprove &&
                          advance.status ===
                            "REQUESTED" ? (
                            <ActionButton
                              onClick={() =>
                                setApprovalTarget(
                                  advance,
                                )
                              }
                              icon={
                                CheckCircle2
                              }
                              label="Approve"
                            />
                          ) : null}

                          {canDisburse &&
                          advance.status ===
                            "APPROVED" ? (
                            <ActionButton
                              onClick={() =>
                                setDisbursementTarget(
                                  advance,
                                )
                              }
                              icon={
                                CircleDollarSign
                              }
                              label="Disburse"
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>


      <SalaryAdvanceRequestDialog
        open={requestOpen}
        employees={employees}
        onClose={() =>
          setRequestOpen(false)
        }
        onSaved={(saved) => {
          updateAdvance(saved);
          setRequestOpen(false);
        }}
      />


      <SalaryAdvanceApproveDialog
        open={
          approvalTarget !== null
        }
        advance={approvalTarget}
        onClose={() =>
          setApprovalTarget(null)
        }
        onSaved={(saved) => {
          updateAdvance(saved);
          setApprovalTarget(null);
        }}
      />


      <SalaryAdvanceDisburseDialog
        open={
          disbursementTarget !==
          null
        }
        advance={
          disbursementTarget
        }
        onClose={() =>
          setDisbursementTarget(
            null,
          )
        }
        onSaved={(saved) => {
          updateAdvance(saved);
          setDisbursementTarget(
            null,
          );
        }}
      />


      <AdvanceDetailDrawer
        advance={detailTarget}
        onClose={() =>
          setDetailTarget(null)
        }
      />
    </div>
  );
}


function AdvanceDetailDrawer({
  advance,
  onClose,
}: {
  advance: SalaryAdvance | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!advance) {
      return;
    }

    const previous =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previous;
    };
  }, [advance]);


  if (!advance) {
    return null;
  }


  return (
    <div className="fixed inset-0 z-[65] bg-slate-950/40">
      <button
        type="button"
        aria-label="Close details"
        onClick={onClose}
        className="absolute inset-0"
      />

      <aside className="absolute right-0 top-0 z-10 h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              Salary Advance
            </p>

            <h3 className="mt-1 text-xl font-bold text-slate-950">
              {advance.employee_name ||
                "Unnamed employee"}
            </h3>

            <p className="text-sm text-slate-500">
              {advance.employee_id}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>


        <div className="space-y-6 p-6">
          <StatusBadge
            status={advance.status}
          />

          <div className="grid grid-cols-2 gap-3">
            <DetailAmount
              label="Requested"
              value={
                advance.requested_amount
              }
            />

            <DetailAmount
              label="Approved"
              value={
                advance.approved_amount
              }
            />

            <DetailAmount
              label="Recovered"
              value={
                advance.recovered_amount
              }
            />

            <DetailAmount
              label="Outstanding"
              value={
                advance.outstanding_amount
              }
            />
          </div>


          <DetailRow
            label="Monthly Recovery"
            value={`₹${formatMoney(
              advance.monthly_recovery_amount,
            )}`}
          />

          <DetailRow
            label="Reason"
            value={
              advance.reason || "—"
            }
          />

          <DetailRow
            label="Payment Reference"
            value={
              advance.payment_reference ||
              "—"
            }
          />

          <DetailRow
            label="Requested"
            value={formatDateTime(
              advance.created_at,
            )}
          />

          <DetailRow
            label="Approved"
            value={formatDateTime(
              advance.approved_at,
            )}
          />

          <DetailRow
            label="Disbursed"
            value={formatDateTime(
              advance.disbursed_at,
            )}
          />
        </div>
      </aside>
    </div>
  );
}


function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-950">
            {value}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {helper}
          </p>
        </div>

        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}


function TableHead({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
      {children}
    </th>
  );
}


function MoneyCell({
  value,
  strong = false,
}: {
  value: string;
  strong?: boolean;
}) {
  return (
    <td
      className={[
        "whitespace-nowrap px-5 py-4 text-sm",
        strong
          ? "font-bold text-slate-950"
          : "font-medium text-slate-700",
      ].join(" ")}
    >
      ₹{formatMoney(value)}
    </td>
  );
}


function StatusBadge({
  status,
}: {
  status: SalaryAdvanceStatus;
}) {
  const classes: Record<
    SalaryAdvanceStatus,
    string
  > = {
    REQUESTED:
      "bg-amber-50 text-amber-700 ring-amber-200",

    APPROVED:
      "bg-blue-50 text-blue-700 ring-blue-200",

    DISBURSED:
      "bg-indigo-50 text-indigo-700 ring-indigo-200",

    PARTIALLY_RECOVERED:
      "bg-violet-50 text-violet-700 ring-violet-200",

    RECOVERED:
      "bg-emerald-50 text-emerald-700 ring-emerald-200",

    REJECTED:
      "bg-red-50 text-red-700 ring-red-200",

    CANCELLED:
      "bg-slate-100 text-slate-600 ring-slate-200",
  };


  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset",
        classes[status],
      ].join(" ")}
    >
      {status
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (value) =>
          value.toUpperCase(),
        )}
    </span>
  );
}


function ActionButton({
  onClick,
  icon: Icon,
  label,
}: {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}


function DetailAmount({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold text-slate-950">
        ₹{formatMoney(value)}
      </p>
    </div>
  );
}


function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-slate-100 pb-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  );
}


function formatMoney(
  value: string | number,
) {
  return Number(value || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}


function formatDateTime(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "en-IN",
  );
}