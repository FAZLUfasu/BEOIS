"use client";

import {
  LoaderCircle,
  Search,
  UserRoundCheck,
  X,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getAssignableEmployees,
} from "@/lib/api/employees";
import {
  assignLead,
} from "@/lib/api/leads";

import type {
  EmployeeListItem,
} from "@/types/employees";
import type {
  LeadDetail,
} from "@/types/leads";

interface Props {
  open: boolean;
  lead: LeadDetail | null;
  onClose: () => void;
  onAssigned: (
    lead: LeadDetail,
  ) => void;
}

export function LeadAssignmentModal({
  open,
  lead,
  onClose,
  onAssigned,
}: Props) {
  const [employees, setEmployees] =
    useState<EmployeeListItem[]>([]);

  const [selectedUser, setSelectedUser] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    setSearch("");
    setSelectedUser(
      lead?.assigned_to?.id || "",
    );
    setError("");
    setLoading(true);

    async function load() {
      try {
        const response =
          await getAssignableEmployees();

        if (!cancelled) {
          setEmployees(response);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Unable to load assignable employees.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, lead]);

  const visibleEmployees =
    useMemo(() => {
      const term =
        search.trim().toLowerCase();

      if (!term) {
        return employees;
      }

      return employees.filter(
        (employee) =>
          employee.employee_name
            .toLowerCase()
            .includes(term) ||
          employee.employee_id
            .toLowerCase()
            .includes(term) ||
          (
            employee.department_name ||
            ""
          )
            .toLowerCase()
            .includes(term) ||
          (
            employee.current_designation ||
            ""
          )
            .toLowerCase()
            .includes(term),
      );
    }, [employees, search]);

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!lead || !selectedUser) {
      setError(
        "Select an employee.",
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const updated =
        await assignLead(
          lead.id,
          {
            user_id:
              selectedUser,
          },
        );

      onAssigned(updated);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Lead assignment failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open || !lead) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">
              Lead Assignment
            </div>

            <h2 className="mt-1 text-lg font-bold text-slate-950">
              Assign {lead.lead_id}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {lead.name}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500"
          >
            <X size={17} />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="p-5">
            {error && (
              <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
                {error}
              </div>
            )}

            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-3.5 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search employee..."
                className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-blue-400"
              />
            </div>

            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-xs text-slate-500">
                  <LoaderCircle
                    size={16}
                    className="animate-spin"
                  />
                  Loading employees...
                </div>
              ) : visibleEmployees.length ===
                0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  No assignable employees found.
                </div>
              ) : (
                visibleEmployees.map(
                  (employee) => {
                    if (!employee.user) {
                      return null;
                    }

                    const active =
                      selectedUser ===
                      employee.user;

                    return (
                      <button
                        key={
                          employee.id
                        }
                        type="button"
                        onClick={() =>
                          setSelectedUser(
                            employee.user!,
                          )
                        }
                        className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                          active
                            ? "border-blue-300 bg-blue-50"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                          <UserRoundCheck
                            size={17}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {
                              employee.employee_name
                            }
                          </div>

                          <div className="mt-0.5 truncate text-[11px] text-slate-500">
                            {
                              employee.employee_id
                            }

                            {employee.department_name
                              ? ` · ${employee.department_name}`
                              : ""}

                            {employee.current_designation
                              ? ` · ${employee.current_designation}`
                              : ""}
                          </div>
                        </div>

                        <div
                          className={`size-4 rounded-full border ${
                            active
                              ? "border-blue-600 bg-blue-600 ring-4 ring-blue-100"
                              : "border-slate-300"
                          }`}
                        />
                      </button>
                    );
                  },
                )
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-slate-200 px-5 text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                saving ||
                !selectedUser
              }
              className="flex h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {saving && (
                <LoaderCircle
                  size={15}
                  className="animate-spin"
                />
              )}

              Assign Lead
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}