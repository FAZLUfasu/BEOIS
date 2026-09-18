"use client";

import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  Search,
  Shuffle,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  bulkAssignLeads,
  distributeLeads,
  getLeadWorkload,
  getUnassignedLeads,
} from "@/lib/api/leads";

import type {
  LeadChannel,
  LeadListItem,
  LeadVertical,
  LeadWorkloadItem,
} from "@/types/leads";

export function LeadDistributionWorkspace() {
  const [leads, setLeads] =
    useState<LeadListItem[]>([]);

  const [workload, setWorkload] =
    useState<LeadWorkloadItem[]>([]);

  const [selectedLeads, setSelectedLeads] =
    useState<string[]>([]);

  const [selectedUsers, setSelectedUsers] =
    useState<string[]>([]);

  const [search, setSearch] =
    useState("");

  const [vertical, setVertical] =
    useState<LeadVertical | "">("");

  const [channel, setChannel] =
    useState<LeadChannel | "">("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const loadData = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const [
          leadResponse,
          workloadResponse,
        ] = await Promise.all([
          getUnassignedLeads({
            search:
              search.trim() ||
              undefined,
            vertical:
              vertical ||
              undefined,
            channel:
              channel ||
              undefined,
          }),
          getLeadWorkload(),
        ]);

        setLeads(leadResponse);
        setWorkload(
          workloadResponse.employees,
        );

        const availableLeadIds =
          new Set(
            leadResponse.map(
              (lead) => lead.id,
            ),
          );

        setSelectedLeads(
          (current) =>
            current.filter((id) =>
              availableLeadIds.has(id),
            ),
        );

        const availableUserIds =
          new Set(
            workloadResponse.employees.map(
              (employee) =>
                employee.user_id,
            ),
          );

        setSelectedUsers(
          (current) =>
            current.filter((id) =>
              availableUserIds.has(id),
            ),
        );
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load lead distribution data.",
        );
      } finally {
        setLoading(false);
      }
    },
    [search, vertical, channel],
  );

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        void loadData();
      }, 250);

    return () =>
      window.clearTimeout(timer);
  }, [loadData]);

  const allSelected =
    useMemo(
      () =>
        leads.length > 0 &&
        leads.every((lead) =>
          selectedLeads.includes(
            lead.id,
          ),
        ),
      [leads, selectedLeads],
    );

  function toggleLead(
    leadId: string,
  ) {
    setSelectedLeads(
      (current) =>
        current.includes(leadId)
          ? current.filter(
              (id) =>
                id !== leadId,
            )
          : [
              ...current,
              leadId,
            ],
    );
  }

  function toggleAllLeads() {
    if (allSelected) {
      const visibleIds =
        new Set(
          leads.map(
            (lead) => lead.id,
          ),
        );

      setSelectedLeads(
        (current) =>
          current.filter(
            (id) =>
              !visibleIds.has(id),
          ),
      );

      return;
    }

    setSelectedLeads(
      (current) =>
        Array.from(
          new Set([
            ...current,
            ...leads.map(
              (lead) => lead.id,
            ),
          ]),
        ),
    );
  }

  function toggleEmployee(
    userId: string,
  ) {
    setSelectedUsers(
      (current) =>
        current.includes(userId)
          ? current.filter(
              (id) =>
                id !== userId,
            )
          : [
              ...current,
              userId,
            ],
    );
  }

  async function assignToOne() {
    if (
      selectedLeads.length === 0
    ) {
      setError(
        "Select at least one lead.",
      );
      return;
    }

    if (
      selectedUsers.length !== 1
    ) {
      setError(
        "Select exactly one employee for bulk assignment.",
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await bulkAssignLeads({
          lead_ids:
            selectedLeads,
          user_id:
            selectedUsers[0],
        });

      setSuccess(
        `${response.assigned_count} lead${
          response.assigned_count ===
          1
            ? ""
            : "s"
        } assigned successfully.`,
      );

      setSelectedLeads([]);
      setSelectedUsers([]);

      await loadData();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Bulk assignment failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function distribute() {
    if (
      selectedLeads.length === 0
    ) {
      setError(
        "Select at least one lead.",
      );
      return;
    }

    if (
      selectedUsers.length === 0
    ) {
      setError(
        "Select at least one employee.",
      );
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await distributeLeads({
          lead_ids:
            selectedLeads,
          user_ids:
            selectedUsers,
        });

      setSuccess(
        `${response.distributed_count} leads distributed across ${response.employee_count} employee${
          response.employee_count ===
          1
            ? ""
            : "s"
        }.`,
      );

      setSelectedLeads([]);
      setSelectedUsers([]);

      await loadData();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Lead distribution failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--brand)]">
            Telecalling Operations
          </div>

          <h2 className="mt-1 text-xl font-bold text-slate-950">
            Lead Distribution
          </h2>

          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            Select unassigned leads and
            allocate them to one employee,
            or distribute them evenly
            across multiple employees.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadData()
          }
          disabled={
            loading || saving
          }
          className="flex h-10 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 shadow-sm disabled:opacity-50"
        >
          <RefreshCw
            size={15}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />
          Refresh Pool
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      <div className="mt-5 grid gap-5 2xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.75fr)]">
        {/* LEAD POOL */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <UsersRound
                    size={17}
                    className="text-[var(--brand)]"
                  />
                  Unassigned Lead Pool
                </div>

                <div className="mt-1 text-[11px] text-slate-500">
                  {leads.length} visible ·{" "}
                  {
                    selectedLeads.length
                  }{" "}
                  selected
                </div>
              </div>

              <button
                type="button"
                onClick={
                  toggleAllLeads
                }
                disabled={
                  leads.length === 0
                }
                className="h-9 rounded-xl border border-slate-200 px-3 text-[11px] font-bold text-slate-600 disabled:opacity-40"
              >
                {allSelected
                  ? "Clear Visible"
                  : "Select Visible"}
              </button>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_170px_150px]">
              <div className="relative">
                <Search
                  size={15}
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
                  placeholder="Search unassigned leads..."
                  className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-[var(--brand)]"
                />
              </div>

              <select
                value={vertical}
                onChange={(event) =>
                  setVertical(
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
                  Regular
                </option>
                <option value="CREDIT_TRANSFER">
                  Credit Transfer
                </option>
              </select>

              <select
                value={channel}
                onChange={(event) =>
                  setChannel(
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
                  Direct
                </option>
                <option value="PARTNER">
                  Partner
                </option>
              </select>
            </div>
          </div>

          <div className="max-h-[620px] overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-xs text-slate-500">
                <LoaderCircle
                  size={17}
                  className="animate-spin"
                />
                Loading lead pool...
              </div>
            ) : leads.length ===
              0 ? (
              <div className="px-6 py-16 text-center">
                <CheckCircle2
                  size={28}
                  className="mx-auto text-emerald-500"
                />

                <div className="mt-3 text-sm font-bold text-slate-800">
                  No unassigned leads
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  The current pool is
                  clear.
                </p>
              </div>
            ) : (
              <table className="w-full min-w-[760px] text-left">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={
                          allSelected
                        }
                        onChange={
                          toggleAllLeads
                        }
                      />
                    </th>

                    <th className="px-3 py-3">
                      Lead
                    </th>

                    <th className="px-3 py-3">
                      Contact
                    </th>

                    <th className="px-3 py-3">
                      Course
                    </th>

                    <th className="px-3 py-3">
                      Vertical
                    </th>

                    <th className="px-3 py-3">
                      Source
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {leads.map(
                    (lead) => {
                      const checked =
                        selectedLeads.includes(
                          lead.id,
                        );

                      return (
                        <tr
                          key={
                            lead.id
                          }
                          className={
                            checked
                              ? "bg-blue-50/60"
                              : ""
                          }
                        >
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={
                                checked
                              }
                              onChange={() =>
                                toggleLead(
                                  lead.id,
                                )
                              }
                            />
                          </td>

                          <td className="px-3 py-4">
                            <div className="text-xs font-bold text-slate-900">
                              {
                                lead.name
                              }
                            </div>

                            <div className="mt-1 text-[10px] text-slate-400">
                              {
                                lead.lead_id
                              }
                            </div>
                          </td>

                          <td className="px-3 py-4 text-xs text-slate-600">
                            {
                              lead.phone_number
                            }
                          </td>

                          <td className="px-3 py-4 text-xs text-slate-600">
                            {lead.interested_course ||
                              "—"}
                          </td>

                          <td className="px-3 py-4 text-xs text-slate-600">
                            {
                              lead.vertical_display
                            }
                          </td>

                          <td className="px-3 py-4 text-xs text-slate-600">
                            {lead.source ||
                              "—"}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* WORKLOAD */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center gap-2">
              <UserRoundCheck
                size={17}
                className="text-[var(--brand)]"
              />

              <h3 className="text-sm font-bold text-slate-900">
                Employee Workload
              </h3>
            </div>

            <div className="mt-1 text-[11px] text-slate-500">
              Select one employee for
              bulk assignment or several
              for equal distribution.
            </div>
          </div>

          <div className="max-h-[445px] space-y-2 overflow-y-auto p-4">
            {loading ? (
              <div className="flex justify-center py-10">
                <LoaderCircle
                  size={18}
                  className="animate-spin text-[var(--brand)]"
                />
              </div>
            ) : workload.length ===
              0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                No eligible employees
                found.
              </div>
            ) : (
              workload.map(
                (employee) => {
                  const selected =
                    selectedUsers.includes(
                      employee.user_id,
                    );

                  return (
                    <button
                      key={
                        employee.user_id
                      }
                      type="button"
                      onClick={() =>
                        toggleEmployee(
                          employee.user_id,
                        )
                      }
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        selected
                          ? "border-blue-300 bg-blue-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-bold text-slate-900">
                            {
                              employee.name
                            }
                          </div>

                          <div className="mt-1 truncate text-[10px] text-slate-500">
                            {
                              employee.employee_code
                            }

                            {employee.department
                              ? ` · ${employee.department}`
                              : ""}
                          </div>

                          {employee.branch && (
                            <div className="mt-1 truncate text-[10px] text-slate-400">
                              {
                                employee.branch
                              }
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-lg font-bold text-slate-950">
                            {
                              employee.active_leads
                            }
                          </div>

                          <div className="text-[9px] font-bold uppercase text-slate-400">
                            Active
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                },
              )
            )}
          </div>

          <div className="border-t border-slate-100 p-4">
            <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600">
              <strong>
                {
                  selectedLeads.length
                }
              </strong>{" "}
              lead
              {selectedLeads.length ===
              1
                ? ""
                : "s"}{" "}
              and{" "}
              <strong>
                {
                  selectedUsers.length
                }
              </strong>{" "}
              employee
              {selectedUsers.length ===
              1
                ? ""
                : "s"}{" "}
              selected.
            </div>

            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={() =>
                  void assignToOne()
                }
                disabled={
                  saving ||
                  selectedLeads.length ===
                    0 ||
                  selectedUsers.length !==
                    1
                }
                className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-xs font-bold text-white disabled:opacity-40"
              >
                {saving ? (
                  <LoaderCircle
                    size={15}
                    className="animate-spin"
                  />
                ) : (
                  <UserRoundCheck
                    size={15}
                  />
                )}

                Assign to Selected Employee
              </button>

              <button
                type="button"
                onClick={() =>
                  void distribute()
                }
                disabled={
                  saving ||
                  selectedLeads.length ===
                    0 ||
                  selectedUsers.length ===
                    0
                }
                className="flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-bold text-blue-700 disabled:opacity-40"
              >
                <Shuffle
                  size={15}
                />
                Equal Distribution
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}