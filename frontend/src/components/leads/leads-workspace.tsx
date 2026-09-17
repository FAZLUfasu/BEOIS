"use client";

import {
  AlertCircle,
  CalendarClock,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  addLeadNote,
  changeLeadStatus,
  getFollowUps,
  getLead,
  getLeads,
  getOverdueLeads,
  recordLeadCall,
} from "@/lib/api/leads";

import {
  LeadAssignmentModal,
} from "@/components/leads/lead-assignment-modal";

import {
  LeadFormModal,
} from "@/components/leads/lead-form-modal";

import type {
  CallOutcome,
  LeadChannel,
  LeadDetail,
  LeadListItem,
  LeadStatus,
  LeadVertical,
} from "@/types/leads";

/* ============================================================
   HELPERS
============================================================ */

function formatDateTime(
  value: string | null,
) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    },
  ).format(date);
}

function statusClasses(
  status: LeadStatus,
) {
  switch (status) {
    case "NEW":
      return "bg-blue-50 text-blue-700";

    case "ASSIGNED":
      return "bg-indigo-50 text-indigo-700";

    case "CONTACTED":
      return "bg-cyan-50 text-cyan-700";

    case "FOLLOW_UP":
      return "bg-amber-50 text-amber-700";

    case "QUALIFIED":
      return "bg-violet-50 text-violet-700";

    case "CONVERTED":
      return "bg-emerald-50 text-emerald-700";

    case "NOT_INTERESTED":
      return "bg-slate-100 text-slate-600";

    case "CLOSED":
      return "bg-red-50 text-red-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function MetricCard({
  title,
  value,
  icon,
  active = false,
  onClick,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-[var(--brand)]">
        {icon}
      </div>

      <div className="mt-4 text-2xl font-bold text-slate-950">
        {value}
      </div>

      <div className="mt-1 text-xs font-medium text-slate-500">
        {title}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`w-full rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
          active
            ? "border-blue-300 ring-4 ring-blue-50"
            : "border-slate-200"
        }`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {content}
    </div>
  );
}

/* ============================================================
   MAIN
============================================================ */

export function LeadsWorkspace() {
  const [leads, setLeads] =
    useState<LeadListItem[]>([]);

  const [followUps, setFollowUps] =
    useState<LeadListItem[]>([]);

  const [overdue, setOverdue] =
    useState<LeadListItem[]>([]);

  const [selected, setSelected] =
    useState<LeadDetail | null>(null);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<LeadStatus | "">("");

  const [verticalFilter, setVerticalFilter] =
    useState<LeadVertical | "">("");

  const [channelFilter, setChannelFilter] =
    useState<LeadChannel | "">("");

  const [deskMode, setDeskMode] =
    useState<
      "ALL" | "FOLLOW_UP" | "OVERDUE"
    >("ALL");

  const [loading, setLoading] =
    useState(true);

  const [
    detailLoading,
    setDetailLoading,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [
    createModalOpen,
    setCreateModalOpen,
  ] = useState(false);

  const [
    editModalOpen,
    setEditModalOpen,
  ] = useState(false);

  const [
    assignmentModalOpen,
    setAssignmentModalOpen,
  ] = useState(false);

  const [callOutcome, setCallOutcome] =
    useState<CallOutcome | "">("");

  const [callNotes, setCallNotes] =
    useState("");

  const [followUpAt, setFollowUpAt] =
    useState("");

  const [duration, setDuration] =
    useState("");

  const [note, setNote] =
    useState("");

  const [newStatus, setNewStatus] =
    useState<LeadStatus>("NEW");

  const [statusNote, setStatusNote] =
    useState("");

  /* ==========================================================
     LOAD
  ========================================================== */

  const loadWorkspace =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const [
          leadResponse,
          followUpResponse,
          overdueResponse,
        ] = await Promise.all([
          getLeads({
            search:
              search.trim() ||
              undefined,

            status:
              statusFilter ||
              undefined,

            vertical:
              verticalFilter ||
              undefined,

            channel:
              channelFilter ||
              undefined,
          }),

          getFollowUps(),
          getOverdueLeads(),
        ]);

        setLeads(leadResponse);
        setFollowUps(followUpResponse);
        setOverdue(overdueResponse);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load Leads & Telecalling data.",
        );
      } finally {
        setLoading(false);
      }
    }, [
      search,
      statusFilter,
      verticalFilter,
      channelFilter,
    ]);

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        void loadWorkspace();
      }, 250);

    return () =>
      window.clearTimeout(timer);
  }, [loadWorkspace]);

  const displayedLeads =
    useMemo(() => {
      if (deskMode === "FOLLOW_UP") {
        return followUps;
      }

      if (deskMode === "OVERDUE") {
        return overdue;
      }

      return leads;
    }, [
      deskMode,
      followUps,
      overdue,
      leads,
    ]);

  const converted = useMemo(
    () =>
      leads.filter(
        (lead) =>
          lead.status ===
          "CONVERTED",
      ).length,
    [leads],
  );

  async function openLead(
    id: string,
  ) {
    setDetailLoading(true);
    setError("");
    setSuccess("");

    try {
      const detail =
        await getLead(id);

      setSelected(detail);
      setNewStatus(
        detail.status,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load the selected lead.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function refreshSelected() {
    if (!selected) return;

    const detail =
      await getLead(
        selected.id,
      );

    setSelected(detail);
    setNewStatus(
      detail.status,
    );
  }

  async function refreshAfterMutation(
    lead?: LeadDetail,
  ) {
    if (lead) {
      setSelected(lead);
      setNewStatus(
        lead.status,
      );
    } else if (selected) {
      await refreshSelected();
    }

    await loadWorkspace();
  }

  /* ==========================================================
     CALL
  ========================================================== */

  async function submitCall(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !selected ||
      !callOutcome
    ) {
      return;
    }

    if (
      callOutcome === "CALLBACK" &&
      !followUpAt
    ) {
      setError(
        "Follow-up date/time is required for Call Back.",
      );
      return;
    }

    const parsedDuration =
      duration.trim()
        ? Number(duration)
        : null;

    if (
      parsedDuration !== null &&
      (!Number.isFinite(
        parsedDuration,
      ) ||
        parsedDuration < 0)
    ) {
      setError(
        "Call duration must be zero or a positive number.",
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await recordLeadCall(
          selected.id,
          {
            outcome:
              callOutcome,

            notes:
              callNotes.trim(),

            follow_up_at:
              followUpAt
                ? new Date(
                    followUpAt,
                  ).toISOString()
                : null,

            duration_seconds:
              parsedDuration,
          },
        );

      setCallOutcome("");
      setCallNotes("");
      setFollowUpAt("");
      setDuration("");

      await refreshAfterMutation(
        response.lead,
      );

      setSuccess(
        "Call recorded successfully.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The call could not be recorded.",
      );
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================================
     STATUS
  ========================================================== */

  async function submitStatus(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!selected) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated =
        await changeLeadStatus(
          selected.id,
          {
            status:
              newStatus,

            notes:
              statusNote.trim(),
          },
        );

      setStatusNote("");

      await refreshAfterMutation(
        updated,
      );

      setSuccess(
        "Lead status updated successfully.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The lead status could not be changed.",
      );
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================================
     NOTE
  ========================================================== */

  async function submitNote(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !selected ||
      !note.trim()
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await addLeadNote(
        selected.id,
        note.trim(),
      );

      setNote("");

      await refreshAfterMutation();

      setSuccess(
        "Note added successfully.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The note could not be added.",
      );
    } finally {
      setSaving(false);
    }
  }

  function closeDrawer() {
    setSelected(null);
    setSuccess("");
    setError("");
    setCallOutcome("");
    setCallNotes("");
    setFollowUpAt("");
    setDuration("");
    setNote("");
    setStatusNote("");
  }

  return (
    <>
      <div>
        {/* HEADER */}

        <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">
              Operations
            </div>

            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">
              Leads & Telecalling
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage enquiries,
              assignments, calls,
              follow-ups and lead
              conversions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                void loadWorkspace()
              }
              disabled={loading}
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                size={15}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => {
                setError("");
                setSuccess("");
                setCreateModalOpen(
                  true,
                );
              }}
              className="flex h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-xs font-bold text-white shadow-sm transition hover:opacity-90"
            >
              <Plus size={16} />
              New Lead
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
            <AlertCircle
              size={16}
            />
            {error}
          </div>
        )}

        {success && (
          <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700">
            {success}
          </div>
        )}

        {/* KPI / FOLLOW-UP DESK */}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Visible Leads"
            value={leads.length}
            icon={
              <UsersRound
                size={19}
              />
            }
            active={
              deskMode === "ALL"
            }
            onClick={() =>
              setDeskMode("ALL")
            }
          />

          <MetricCard
            title="Follow-ups"
            value={
              followUps.length
            }
            icon={
              <CalendarClock
                size={19}
              />
            }
            active={
              deskMode ===
              "FOLLOW_UP"
            }
            onClick={() =>
              setDeskMode(
                "FOLLOW_UP",
              )
            }
          />

          <MetricCard
            title="Overdue"
            value={overdue.length}
            icon={
              <AlertCircle
                size={19}
              />
            }
            active={
              deskMode ===
              "OVERDUE"
            }
            onClick={() =>
              setDeskMode(
                "OVERDUE",
              )
            }
          />

          <MetricCard
            title="Converted in View"
            value={converted}
            icon={
              <Phone size={19} />
            }
          />
        </div>

        {deskMode !== "ALL" && (
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3">
            <div>
              <div className="text-xs font-bold text-blue-900">
                {deskMode ===
                "FOLLOW_UP"
                  ? "Follow-up Desk"
                  : "Overdue Follow-ups"}
              </div>

              <div className="mt-0.5 text-[11px] text-blue-700">
                {displayedLeads.length}{" "}
                lead
                {displayedLeads.length ===
                1
                  ? ""
                  : "s"}{" "}
                in this queue.
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setDeskMode("ALL")
              }
              className="rounded-lg bg-white px-3 py-2 text-[11px] font-bold text-blue-700 shadow-sm"
            >
              Show All
            </button>
          </div>
        )}

        {/* TABLE */}

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px]">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Search name, phone, email or Lead ID..."
                  className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-xs outline-none transition focus:border-[var(--brand)]"
                />
              </div>

              <select
                value={
                  statusFilter
                }
                onChange={(event) =>
                  setStatusFilter(
                    event.target
                      .value as
                      | LeadStatus
                      | "",
                  )
                }
                className="h-10 rounded-xl border border-slate-200 px-3 text-xs text-slate-600 outline-none"
              >
                <option value="">
                  All statuses
                </option>
                <option value="NEW">
                  New
                </option>
                <option value="ASSIGNED">
                  Assigned
                </option>
                <option value="CONTACTED">
                  Contacted
                </option>
                <option value="FOLLOW_UP">
                  Follow Up
                </option>
                <option value="QUALIFIED">
                  Qualified
                </option>
                <option value="CONVERTED">
                  Converted
                </option>
                <option value="NOT_INTERESTED">
                  Not Interested
                </option>
                <option value="CLOSED">
                  Closed
                </option>
              </select>

              <select
                value={
                  verticalFilter
                }
                onChange={(event) =>
                  setVerticalFilter(
                    event.target
                      .value as
                      | LeadVertical
                      | "",
                  )
                }
                className="h-10 rounded-xl border border-slate-200 px-3 text-xs text-slate-600 outline-none"
              >
                <option value="">
                  All verticals
                </option>
                <option value="REGULAR">
                  Regular Distance
                  Education
                </option>
                <option value="CREDIT_TRANSFER">
                  Credit Transfer
                </option>
              </select>

              <select
                value={
                  channelFilter
                }
                onChange={(event) =>
                  setChannelFilter(
                    event.target
                      .value as
                      | LeadChannel
                      | "",
                  )
                }
                className="h-10 rounded-xl border border-slate-200 px-3 text-xs text-slate-600 outline-none"
              >
                <option value="">
                  All channels
                </option>
                <option value="DIRECT">
                  BEST Direct
                </option>
                <option value="PARTNER">
                  Partner
                </option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left">
              <thead className="bg-slate-50">
                <tr className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3">
                    Lead
                  </th>
                  <th className="px-4 py-3">
                    Contact
                  </th>
                  <th className="px-4 py-3">
                    Course
                  </th>
                  <th className="px-4 py-3">
                    Vertical
                  </th>
                  <th className="px-4 py-3">
                    Status
                  </th>
                  <th className="px-4 py-3">
                    Assigned
                  </th>
                  <th className="px-4 py-3">
                    Follow-up
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-14 text-center"
                    >
                      <LoaderCircle
                        size={23}
                        className="mx-auto animate-spin text-[var(--brand)]"
                      />
                    </td>
                  </tr>
                ) : displayedLeads.length ===
                  0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-14 text-center text-sm text-slate-400"
                    >
                      No leads found in
                      this view.
                    </td>
                  </tr>
                ) : (
                  displayedLeads.map(
                    (lead) => (
                      <tr
                        key={lead.id}
                        onClick={() =>
                          void openLead(
                            lead.id,
                          )
                        }
                        className="cursor-pointer text-xs text-slate-600 transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900">
                            {lead.name}
                          </div>
                          <div className="mt-1 text-[10px] text-slate-400">
                            {
                              lead.lead_id
                            }
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div>
                            {
                              lead.phone_number
                            }
                          </div>
                          <div className="mt-1 text-[10px] text-slate-400">
                            {lead.email ||
                              "—"}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          {lead.interested_course ||
                            "—"}
                        </td>

                        <td className="px-4 py-4">
                          {
                            lead.vertical_display
                          }
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClasses(
                              lead.status,
                            )}`}
                          >
                            {
                              lead.status_display
                            }
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          {lead
                            .assigned_to
                            ?.username ||
                            "—"}
                        </td>

                        <td className="px-4 py-4">
                          {formatDateTime(
                            lead.next_follow_up_at,
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <ChevronRight
                            size={16}
                          />
                        </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* DETAIL DRAWER */}

        {(selected ||
          detailLoading) && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/25 backdrop-blur-[1px]">
            <div className="h-full w-full max-w-[720px] overflow-y-auto bg-slate-50 shadow-2xl">
              {detailLoading &&
              !selected ? (
                <div className="flex h-full items-center justify-center">
                  <LoaderCircle
                    size={28}
                    className="animate-spin text-[var(--brand)]"
                  />
                </div>
              ) : selected ? (
                <>
                  <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]">
                          {
                            selected.lead_id
                          }
                        </div>

                        <h2 className="mt-1 text-xl font-bold text-slate-950">
                          {
                            selected.name
                          }
                        </h2>

                        <div className="mt-1 text-xs text-slate-500">
                          {
                            selected.phone_number
                          }{" "}
                          ·{" "}
                          {
                            selected.status_display
                          }
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={
                          closeDrawer
                        }
                        className="flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                      >
                        <X size={17} />
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setEditModalOpen(
                            true,
                          )
                        }
                        className="flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-[11px] font-bold text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil
                          size={14}
                        />
                        Edit Lead
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setAssignmentModalOpen(
                            true,
                          )
                        }
                        className="flex h-9 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                      >
                        <UserRoundCheck
                          size={14}
                        />
                        {selected.assigned_to
                          ? "Reassign"
                          : "Assign Lead"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-5 p-6">
                    {/* SUMMARY */}

                    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
                      {[
                        [
                          "Interested Course",
                          selected.interested_course ||
                            "—",
                        ],
                        [
                          "Previous Course",
                          selected.previous_course ||
                            "—",
                        ],
                        [
                          "Vertical",
                          selected.vertical_display,
                        ],
                        [
                          "Channel",
                          selected.channel_display,
                        ],
                        [
                          "Assigned To",
                          selected
                            .assigned_to
                            ?.username ||
                            "Unassigned",
                        ],
                        [
                          "Location",
                          [
                            selected.city,
                            selected.state,
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(", ") ||
                            "—",
                        ],
                        [
                          "Source",
                          selected.source ||
                            "—",
                        ],
                        [
                          "Campaign",
                          selected.campaign ||
                            "—",
                        ],
                        [
                          "Email",
                          selected.email ||
                            "—",
                        ],
                        [
                          "Alternate Phone",
                          selected.alternate_phone ||
                            "—",
                        ],
                        [
                          "Next Follow-up",
                          formatDateTime(
                            selected.next_follow_up_at,
                          ),
                        ],
                        [
                          "Created",
                          formatDateTime(
                            selected.created_at,
                          ),
                        ],
                      ].map(
                        ([label, value]) => (
                          <div
                            key={label}
                          >
                            <div className="text-[10px] font-bold uppercase text-slate-400">
                              {label}
                            </div>
                            <div className="mt-1 break-words text-sm font-semibold text-slate-800">
                              {value}
                            </div>
                          </div>
                        ),
                      )}

                      {selected.channel ===
                        "PARTNER" && (
                        <div className="sm:col-span-2">
                          <div className="text-[10px] font-bold uppercase text-slate-400">
                            Partner Reference
                          </div>

                          <div className="mt-1 text-sm font-semibold text-slate-800">
                            {selected.partner_reference_number ||
                              "—"}
                          </div>
                        </div>
                      )}

                      {selected.notes && (
                        <div className="sm:col-span-2">
                          <div className="text-[10px] font-bold uppercase text-slate-400">
                            Lead Notes
                          </div>

                          <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {
                              selected.notes
                            }
                          </div>
                        </div>
                      )}
                    </section>

                    {/* RECORD CALL */}

                    <form
                      onSubmit={
                        submitCall
                      }
                      className="rounded-2xl border border-slate-200 bg-white p-5"
                    >
                      <div className="flex items-center gap-2">
                        <Phone
                          size={17}
                          className="text-[var(--brand)]"
                        />

                        <h3 className="text-sm font-bold text-slate-900">
                          Record Call
                        </h3>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <select
                          value={
                            callOutcome
                          }
                          onChange={(
                            event,
                          ) =>
                            setCallOutcome(
                              event.target
                                .value as
                                | CallOutcome
                                | "",
                            )
                          }
                          required
                          className="h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-[var(--brand)]"
                        >
                          <option value="">
                            Select outcome
                          </option>
                          <option value="INTERESTED">
                            Interested
                          </option>
                          <option value="NOT_INTERESTED">
                            Not Interested
                          </option>
                          <option value="CALLBACK">
                            Call Back
                          </option>
                          <option value="NO_ANSWER">
                            No Answer
                          </option>
                          <option value="BUSY">
                            Busy
                          </option>
                          <option value="WRONG_NUMBER">
                            Wrong Number
                          </option>
                          <option value="SWITCHED_OFF">
                            Switched Off
                          </option>
                          <option value="OTHER">
                            Other
                          </option>
                        </select>

                        <input
                          type="number"
                          min="0"
                          value={
                            duration
                          }
                          onChange={(
                            event,
                          ) =>
                            setDuration(
                              event.target
                                .value,
                            )
                          }
                          placeholder="Duration (seconds)"
                          className="h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-[var(--brand)]"
                        />

                        {callOutcome ===
                          "CALLBACK" && (
                          <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Callback Date
                              & Time
                            </label>

                            <input
                              type="datetime-local"
                              required
                              value={
                                followUpAt
                              }
                              onChange={(
                                event,
                              ) =>
                                setFollowUpAt(
                                  event
                                    .target
                                    .value,
                                )
                              }
                              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-[var(--brand)]"
                            />
                          </div>
                        )}

                        <textarea
                          value={
                            callNotes
                          }
                          onChange={(
                            event,
                          ) =>
                            setCallNotes(
                              event.target
                                .value,
                            )
                          }
                          placeholder="Call notes"
                          rows={3}
                          className="rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-[var(--brand)] sm:col-span-2"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={
                          saving ||
                          !callOutcome
                        }
                        className="mt-3 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
                      >
                        {saving
                          ? "Saving..."
                          : "Record Call"}
                      </button>
                    </form>

                    {/* STATUS */}

                    <form
                      onSubmit={
                        submitStatus
                      }
                      className="rounded-2xl border border-slate-200 bg-white p-5"
                    >
                      <h3 className="text-sm font-bold text-slate-900">
                        Change Status
                      </h3>

                      <div className="mt-4 grid gap-3">
                        <select
                          value={
                            newStatus
                          }
                          onChange={(
                            event,
                          ) =>
                            setNewStatus(
                              event.target
                                .value as LeadStatus,
                            )
                          }
                          className="h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-[var(--brand)]"
                        >
                          <option value="NEW">
                            New
                          </option>
                          <option value="ASSIGNED">
                            Assigned
                          </option>
                          <option value="CONTACTED">
                            Contacted
                          </option>
                          <option value="FOLLOW_UP">
                            Follow Up
                          </option>
                          <option value="QUALIFIED">
                            Qualified
                          </option>
                          <option value="CONVERTED">
                            Converted
                          </option>
                          <option value="NOT_INTERESTED">
                            Not Interested
                          </option>
                          <option value="CLOSED">
                            Closed
                          </option>
                        </select>

                        <textarea
                          value={
                            statusNote
                          }
                          onChange={(
                            event,
                          ) =>
                            setStatusNote(
                              event.target
                                .value,
                            )
                          }
                          placeholder="Optional status note"
                          rows={2}
                          className="rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-[var(--brand)]"
                        />

                        <button
                          type="submit"
                          disabled={saving}
                          className="w-fit rounded-xl border border-[var(--brand)] px-4 py-2.5 text-xs font-bold text-[var(--brand)] disabled:opacity-60"
                        >
                          {saving
                            ? "Updating..."
                            : "Update Status"}
                        </button>
                      </div>
                    </form>

                    {/* NOTE */}

                    <form
                      onSubmit={
                        submitNote
                      }
                      className="rounded-2xl border border-slate-200 bg-white p-5"
                    >
                      <h3 className="text-sm font-bold text-slate-900">
                        Add Note
                      </h3>

                      <textarea
                        value={note}
                        onChange={(
                          event,
                        ) =>
                          setNote(
                            event.target
                              .value,
                          )
                        }
                        placeholder="Add an internal lead note..."
                        rows={3}
                        className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-[var(--brand)]"
                      />

                      <button
                        type="submit"
                        disabled={
                          saving ||
                          !note.trim()
                        }
                        className="mt-3 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
                      >
                        {saving
                          ? "Saving..."
                          : "Add Note"}
                      </button>
                    </form>

                    {/* CALL HISTORY */}

                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                      <h3 className="text-sm font-bold text-slate-900">
                        Call History
                      </h3>

                      <div className="mt-4 space-y-3">
                        {selected
                          .call_logs
                          .length ===
                        0 ? (
                          <div className="rounded-xl bg-slate-50 px-4 py-5 text-center text-xs text-slate-400">
                            No calls
                            recorded.
                          </div>
                        ) : (
                          selected.call_logs.map(
                            (call) => (
                              <div
                                key={
                                  call.id
                                }
                                className="rounded-xl bg-slate-50 p-4"
                              >
                                <div className="flex justify-between gap-4">
                                  <div className="text-xs font-bold text-slate-800">
                                    {
                                      call.outcome_display
                                    }
                                  </div>

                                  <div className="text-[10px] text-slate-400">
                                    {formatDateTime(
                                      call.called_at,
                                    )}
                                  </div>
                                </div>

                                {call.notes && (
                                  <p className="mt-2 text-xs leading-5 text-slate-600">
                                    {
                                      call.notes
                                    }
                                  </p>
                                )}

                                {call.follow_up_at && (
                                  <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[10px] font-medium text-amber-700">
                                    Follow-up:{" "}
                                    {formatDateTime(
                                      call.follow_up_at,
                                    )}
                                  </div>
                                )}

                                <div className="mt-2 text-[10px] text-slate-400">
                                  By{" "}
                                  {call
                                    .telecaller
                                    ?.username ||
                                    "—"}

                                  {call.duration_seconds !=
                                    null &&
                                    ` · ${call.duration_seconds}s`}
                                </div>
                              </div>
                            ),
                          )
                        )}
                      </div>
                    </section>

                    {/* ACTIVITY */}

                    <section className="rounded-2xl border border-slate-200 bg-white p-5">
                      <h3 className="text-sm font-bold text-slate-900">
                        Activity Timeline
                      </h3>

                      <div className="mt-4 space-y-4">
                        {selected
                          .activities
                          .length ===
                        0 ? (
                          <div className="rounded-xl bg-slate-50 px-4 py-5 text-center text-xs text-slate-400">
                            No activity yet.
                          </div>
                        ) : (
                          selected.activities.map(
                            (
                              activity,
                            ) => (
                              <div
                                key={
                                  activity.id
                                }
                                className="border-l-2 border-blue-100 pl-4"
                              >
                                <div className="text-xs font-bold text-slate-800">
                                  {
                                    activity.activity_type_display
                                  }
                                </div>

                                <p className="mt-1 text-xs leading-5 text-slate-600">
                                  {
                                    activity.description
                                  }
                                </p>

                                <div className="mt-1 text-[10px] text-slate-400">
                                  {formatDateTime(
                                    activity.created_at,
                                  )}{" "}
                                  ·{" "}
                                  {activity
                                    .performed_by
                                    ?.username ||
                                    "System"}
                                </div>
                              </div>
                            ),
                          )
                        )}
                      </div>
                    </section>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* CREATE */}

      <LeadFormModal
        open={createModalOpen}
        lead={null}
        onClose={() =>
          setCreateModalOpen(
            false,
          )
        }
        onSaved={(lead) => {
          setCreateModalOpen(
            false,
          );

          setSelected(lead);
          setNewStatus(
            lead.status,
          );

          setSuccess(
            `${lead.lead_id} created successfully.`,
          );

          void loadWorkspace();
        }}
      />

      {/* EDIT */}

      <LeadFormModal
        open={editModalOpen}
        lead={selected}
        onClose={() =>
          setEditModalOpen(
            false,
          )
        }
        onSaved={(lead) => {
          setEditModalOpen(
            false,
          );

          setSelected(lead);
          setNewStatus(
            lead.status,
          );

          setSuccess(
            "Lead updated successfully.",
          );

          void loadWorkspace();
        }}
      />

      {/* ASSIGN */}

      <LeadAssignmentModal
        open={
          assignmentModalOpen
        }
        lead={selected}
        onClose={() =>
          setAssignmentModalOpen(
            false,
          )
        }
        onAssigned={(lead) => {
          setAssignmentModalOpen(
            false,
          );

          setSelected(lead);
          setNewStatus(
            lead.status,
          );

          setSuccess(
            "Lead assigned successfully.",
          );

          void loadWorkspace();
        }}
      />
    </>
  );
}