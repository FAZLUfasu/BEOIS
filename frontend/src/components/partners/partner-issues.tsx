"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  CircleAlert,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";

import {
  changePartnerIssueStatus,
  createPartnerIssue,
  getPartnerCases,
  getPartnerIssues,
} from "@/lib/api/partners";

import {
  getAssignableEmployees,
} from "@/lib/api/employees";

import type {
  EmployeeListItem,
} from "@/types/employees";

import type {
  PartnerCase,
  PartnerIssue,
  PartnerIssuePriority,
  PartnerIssueStatus,
} from "@/types/partners";

interface PartnerIssuesProps {
  partnerId: string;
  onChanged?: () => void;
}

const ISSUE_STATUSES: {
  value: PartnerIssueStatus;
  label: string;
}[] = [
  {
    value: "OPEN",
    label: "Open",
  },
  {
    value: "IN_PROGRESS",
    label: "In Progress",
  },
  {
    value: "WAITING",
    label: "Waiting",
  },
  {
    value: "RESOLVED",
    label: "Resolved",
  },
  {
    value: "CLOSED",
    label: "Closed",
  },
];

export function PartnerIssuesPanel({
  partnerId,
  onChanged,
}: PartnerIssuesProps) {
  const [issues, setIssues] = useState<
    PartnerIssue[]
  >([]);

  const [cases, setCases] = useState<
    PartnerCase[]
  >([]);

  const [employees, setEmployees] = useState<
    EmployeeListItem[]
  >([]);

  const [subject, setSubject] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [priority, setPriority] =
    useState<PartnerIssuePriority>(
      "MEDIUM",
    );

  const [caseId, setCaseId] =
    useState("");

  const [assignedToId, setAssignedToId] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [actionId, setActionId] = useState<
    string | null
  >(null);

  const [error, setError] = useState("");

  const loadIssues = useCallback(async () => {
    try {
      setError("");

      const data =
        await getPartnerIssues(partnerId);

      setIssues(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load partner issues.",
      );
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  const loadReferenceData =
    useCallback(async () => {
      try {
        const [caseData, employeeData] =
          await Promise.all([
            getPartnerCases(partnerId),
            getAssignableEmployees(),
          ]);

        setCases(caseData);
        setEmployees(employeeData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load issue reference data.",
        );
      }
    }, [partnerId]);

  useEffect(() => {
    setLoading(true);
    void loadIssues();
    void loadReferenceData();
  }, [loadIssues, loadReferenceData]);

  async function handleCreate(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (
      !subject.trim() ||
      !description.trim()
    ) {
      setError(
        "Subject and description are required.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      await createPartnerIssue(
        partnerId,
        {
          subject: subject.trim(),
          description:
            description.trim(),
          priority,
          partner_case_id:
            caseId || null,
          assigned_to_id:
            assignedToId || null,
        },
      );

      setSubject("");
      setDescription("");
      setPriority("MEDIUM");
      setCaseId("");
      setAssignedToId("");

      await loadIssues();
      onChanged?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create partner issue.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(
    issue: PartnerIssue,
    status: PartnerIssueStatus,
  ) {
    if (status === issue.status) {
      return;
    }

    try {
      setActionId(issue.id);
      setError("");

      await changePartnerIssueStatus(
        partnerId,
        issue.id,
        {
          status,
        },
      );

      await loadIssues();
      onChanged?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to change issue status.",
      );
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-5">
          <div className="flex items-center gap-2">
            <CircleAlert className="h-5 w-5 text-amber-600" />

            <h3 className="font-semibold text-slate-950">
              Create Partner Issue
            </h3>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Record operational problems,
            partner requests or cases that
            require staff follow-up.
          </p>
        </div>

        <form
          onSubmit={handleCreate}
          className="space-y-4"
        >
          <Field label="Subject">
            <input
              value={subject}
              onChange={(event) =>
                setSubject(
                  event.target.value,
                )
              }
              className={inputClass}
              placeholder="Issue subject"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value,
                )
              }
              rows={4}
              className={inputClass}
              placeholder="Describe the issue..."
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Priority">
              <select
                value={priority}
                onChange={(event) =>
                  setPriority(
                    event.target
                      .value as PartnerIssuePriority,
                  )
                }
                className={inputClass}
              >
                <option value="LOW">
                  Low
                </option>

                <option value="MEDIUM">
                  Medium
                </option>

                <option value="HIGH">
                  High
                </option>

                <option value="URGENT">
                  Urgent
                </option>
              </select>
            </Field>

            <Field label="Related Case">
              <select
                value={caseId}
                onChange={(event) =>
                  setCaseId(
                    event.target.value,
                  )
                }
                className={inputClass}
              >
                <option value="">
                  No related case
                </option>

                {cases.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.case_id} -{" "}
                    {item.applicant_name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Assigned Staff">
              <select
                value={assignedToId}
                onChange={(event) =>
                  setAssignedToId(
                    event.target.value,
                  )
                }
                className={inputClass}
              >
                <option value="">
                  Unassigned
                </option>

                {employees.map((employee) =>
                  employee.user ? (
                    <option
                      key={employee.id}
                      value={employee.user}
                    >
                      {
                        employee.employee_name
                      }
                    </option>
                  ) : null,
                )}
              </select>
            </Field>
          </div>

          {error ? (
            <ErrorBox message={error} />
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}

              Create Issue
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h3 className="font-semibold text-slate-950">
              Partner Issues
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {issues.length} issue
              {issues.length === 1 ? "" : "s"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadIssues();
            }}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <LoadingState />
        ) : issues.length === 0 ? (
          <EmptyState text="No partner issues recorded." />
        ) : (
          <div className="divide-y divide-slate-100">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="space-y-4 p-5"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-medium text-slate-950">
                        {issue.subject}
                      </h4>

                      <PriorityBadge
                        priority={
                          issue.priority
                        }
                        text={
                          issue.priority_display
                        }
                      />

                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {
                          issue.status_display
                        }
                      </span>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {issue.description}
                    </p>

                    {issue.assigned_to ? (
                      <p className="mt-2 text-xs text-slate-500">
                        Assigned to{" "}
                        {
                          issue.assigned_to
                            .username
                        }
                      </p>
                    ) : null}

                    {issue.resolved_at ? (
                      <p className="mt-1 text-xs text-emerald-700">
                        Resolved{" "}
                        {formatDateTime(
                          issue.resolved_at,
                        )}
                      </p>
                    ) : null}
                  </div>

                  <div className="sm:min-w-48">
                    <select
                      value={issue.status}
                      disabled={
                        actionId === issue.id
                      }
                      onChange={(event) =>
                        void handleStatus(
                          issue,
                          event.target
                            .value as PartnerIssueStatus,
                        )
                      }
                      className={inputClass}
                    >
                      {ISSUE_STATUSES.map(
                        (status) => (
                          <option
                            key={
                              status.value
                            }
                            value={
                              status.value
                            }
                          >
                            {status.label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>

      {children}
    </label>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading issues...
    </div>
  );
}

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="p-8 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}

function ErrorBox({
  message,
}: {
  message: string;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

function PriorityBadge({
  priority,
  text,
}: {
  priority: PartnerIssuePriority;
  text: string;
}) {
  const className =
    priority === "URGENT"
      ? "bg-red-50 text-red-700"
      : priority === "HIGH"
        ? "bg-orange-50 text-orange-700"
        : priority === "MEDIUM"
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-600";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {text}
    </span>
  );
}

function formatDateTime(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}