"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter, useSearchParams } from "next/navigation";

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";

import {
  createTask,
  getMyTasks,
  getTaskAssignees,
  getTasks,
  updateMyTaskStatus,
  updateTask,
} from "@/lib/api/tasks";

import type {
  BeoisTask,
  CreateTaskPayload,
  TaskAssignee,
  TaskPriority,
  TaskSourceModule,
  TaskStatus,
} from "@/types/tasks";

type Tab =
  | "MY_TASKS"
  | "ALL_TASKS"
  | "ASSIGNED_BY_ME"
  | "OVERDUE"
  | "UPCOMING"
  | "COMPLETED";

const MANAGEMENT_ROLES = [
  "SUPER_ADMIN",
  "CHAIRMAN",
  "GENERAL_MANAGER",
];

const PRIORITIES: TaskPriority[] = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
];

const SOURCE_MODULES: TaskSourceModule[] = [
  "GENERAL",
  "LEADS",
  "ADMISSIONS",
  "STUDENTS",
  "PARTNERS",
  "FINANCE",
  "HR",
  "EDUCATION",
];

function formatDateTime(value: string | null) {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function priorityClasses(priority: TaskPriority) {
  switch (priority) {
    case "URGENT":
      return "bg-red-50 text-red-700 border-red-200";

    case "HIGH":
      return "bg-orange-50 text-orange-700 border-orange-200";

    case "LOW":
      return "bg-slate-50 text-slate-600 border-slate-200";

    default:
      return "bg-blue-50 text-blue-700 border-blue-200";
  }
}

function statusClasses(status: TaskStatus) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "IN_PROGRESS":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "CANCELLED":
      return "bg-slate-100 text-slate-500 border-slate-200";

    default:
      return "bg-amber-50 text-amber-700 border-amber-200";
  }
}

function toApiDateTime(value: string) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

function userName(user: TaskAssignee) {
  return (
    user.full_name?.trim() ||
    `${user.first_name} ${user.last_name}`.trim() ||
    user.username
  );
}

export function TasksWorkspace() {
  const { user, hasRole } = useAuth();

  const canManage = MANAGEMENT_ROLES.some((role) =>
    hasRole(role),
  );

  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedTaskId =
    searchParams.get("task")?.trim() || "";

  const requestedView =
    searchParams.get("view")?.trim().toLowerCase() || "";

  const requestedPriorityValue =
    searchParams.get("priority")?.trim().toUpperCase() || "";

  const requestedPriority = PRIORITIES.includes(
    requestedPriorityValue as TaskPriority,
  )
    ? (requestedPriorityValue as TaskPriority)
    : undefined;

  const requestedSourceModuleValue =
    searchParams.get("module")?.trim().toUpperCase() || "";

  const requestedSourceModule = SOURCE_MODULES.includes(
    requestedSourceModuleValue as TaskSourceModule,
  )
    ? (requestedSourceModuleValue as TaskSourceModule)
    : undefined;

  const requestedAssignedTo =
    searchParams.get("assigned_to")?.trim() || undefined;

  function initialTab(): Tab {
    if (requestedTaskId) {
      return "ALL_TASKS";
    }

    switch (requestedView) {
      case "all":
      case "open":
        return "ALL_TASKS";

      case "assigned":
        return "ASSIGNED_BY_ME";

      case "overdue":
        return "OVERDUE";

      case "upcoming":
        return "UPCOMING";

      case "completed":
        return "COMPLETED";

      default:
        return "MY_TASKS";
    }
  }

  const [tab, setTab] = useState<Tab>(initialTab);

  const [tasks, setTasks] = useState<BeoisTask[]>([]);
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);

  const [loading, setLoading] = useState(true);
  const [assigneesLoading, setAssigneesLoading] =
    useState(false);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] =
    useState<TaskPriority>("NORMAL");

  const [dueAt, setDueAt] = useState("");
  const [reminderAt, setReminderAt] = useState("");

  const [sourceModule, setSourceModule] =
    useState<TaskSourceModule>("GENERAL");

  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceObjectId, setSourceObjectId] = useState("");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      let data: BeoisTask[];

      const managementFilters = {
        priority: requestedPriority,
        sourceModule: requestedSourceModule,
        assignedTo: requestedAssignedTo,
      };

      if (
        tab === "MY_TASKS" ||
        (!canManage && tab === "ALL_TASKS")
      ) {
        data = await getMyTasks();
      } else if (tab === "OVERDUE") {
        data = await getTasks({
          ...managementFilters,
          overdue: true,
        });
      } else if (tab === "COMPLETED") {
        data = await getTasks({
          ...managementFilters,
          status: "COMPLETED",
        });
      } else {
        data = await getTasks(
          managementFilters,
        );
      }

      setTasks(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load tasks.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    tab,
    canManage,
    requestedPriority,
    requestedSourceModule,
    requestedAssignedTo,
  ]);

  const loadAssignees = useCallback(async () => {
    if (!canManage) {
      return;
    }

    setAssigneesLoading(true);

    try {
      const data = await getTaskAssignees();
      setAssignees(data.filter((item) => item.is_active));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load task assignees.",
      );
    } finally {
      setAssigneesLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (createOpen && canManage && assignees.length === 0) {
      void loadAssignees();
    }
  }, [
    createOpen,
    canManage,
    assignees.length,
    loadAssignees,
  ]);

  const visibleTasks = useMemo(() => {
    const now = new Date();

    let result = [...tasks];

    if (tab === "ASSIGNED_BY_ME") {
      result = result.filter(
        (task) => task.assigned_by === user?.id,
      );
    }

    if (requestedPriority) {
      result = result.filter(
        (task) => task.priority === requestedPriority,
      );
    }

    if (requestedSourceModule) {
      result = result.filter(
        (task) =>
          task.source_module === requestedSourceModule,
      );
    }

    if (requestedAssignedTo) {
      result = result.filter(
        (task) =>
          task.assigned_to === requestedAssignedTo,
      );
    }

    if (requestedTaskId) {
      result = result.filter(
        (task) => task.id === requestedTaskId,
      );
    }

    if (
      requestedView === "open" &&
      tab === "ALL_TASKS"
    ) {
      result = result.filter(
        (task) =>
          task.status !== "COMPLETED" &&
          task.status !== "CANCELLED",
      );
    }

    if (tab === "UPCOMING") {
      result = result.filter((task) => {
        if (
          task.status === "COMPLETED" ||
          task.status === "CANCELLED"
        ) {
          return false;
        }

        if (!task.due_at) {
          return true;
        }

        return new Date(task.due_at) >= now;
      });
    }

    if (search.trim()) {
      const query = search.toLowerCase();

      result = result.filter((task) =>
        [
          task.title,
          task.description,
          task.source_label,
          task.source_module,
          task.assigned_to_name,
          task.assigned_to_username,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
      );
    }

    return result;
  }, [
    tasks,
    tab,
    search,
    user?.id,
    requestedPriority,
    requestedSourceModule,
    requestedAssignedTo,
    requestedTaskId,
    requestedView,
  ]);

  async function changeOwnStatus(
    task: BeoisTask,
    status: "IN_PROGRESS" | "COMPLETED",
  ) {
    setError("");

    try {
      await updateMyTaskStatus(task.id, {
        status,
      });

      await loadTasks();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update task.",
      );
    }
  }

  async function cancelTask(task: BeoisTask) {
    if (!canManage) {
      return;
    }

    const confirmed = window.confirm(
      `Cancel "${task.title}"?`,
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      await updateTask(task.id, {
        status: "CANCELLED",
      });

      await loadTasks();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to cancel task.",
      );
    }
  }

  function resetCreateForm() {
    setTitle("");
    setDescription("");
    setAssignedTo("");
    setPriority("NORMAL");
    setDueAt("");
    setReminderAt("");
    setSourceModule("GENERAL");
    setSourceLabel("");
    setSourceObjectId("");
  }

  async function submitTask(event: FormEvent) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    if (!assignedTo) {
      setError("Please select an employee.");
      return;
    }

    if (
      reminderAt &&
      dueAt &&
      new Date(reminderAt) > new Date(dueAt)
    ) {
      setError(
        "Reminder date/time cannot be after the due date/time.",
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload: CreateTaskPayload = {
        title: title.trim(),
        description: description.trim(),
        assigned_to: assignedTo,
        priority,
        source_module: sourceModule,
        source_label: sourceLabel.trim(),
        source_object_id: sourceObjectId.trim(),
        due_at: toApiDateTime(dueAt),
        reminder_at: toApiDateTime(reminderAt),
      };

      await createTask(payload);

      resetCreateForm();
      setCreateOpen(false);

      setTab("ASSIGNED_BY_ME");

      await loadTasks();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create task.",
      );
    } finally {
      setSaving(false);
    }
  }

  const tabs: Array<{
    id: Tab;
    label: string;
  }> = [
    {
      id: "MY_TASKS",
      label: "My Tasks",
    },
    ...(canManage
      ? [
          {
            id: "ALL_TASKS" as Tab,
            label: "All Tasks",
          },
          {
            id: "ASSIGNED_BY_ME" as Tab,
            label: "Assigned by Me",
          },
          {
            id: "OVERDUE" as Tab,
            label: "Overdue",
          },
          {
            id: "UPCOMING" as Tab,
            label: "Upcoming",
          },
          {
            id: "COMPLETED" as Tab,
            label: "Completed",
          },
        ]
      : [
          {
            id: "UPCOMING" as Tab,
            label: "Upcoming",
          },
          {
            id: "COMPLETED" as Tab,
            label: "Completed",
          },
        ]),
  ];

  const hasDrilldown =
    Boolean(requestedTaskId) ||
    Boolean(requestedPriority) ||
    Boolean(requestedSourceModule) ||
    Boolean(requestedAssignedTo) ||
    [
      "all",
      "open",
      "assigned",
      "overdue",
      "upcoming",
      "completed",
    ].includes(requestedView);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Operations
          </p>

          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Tasks & Reminders
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Manage operational follow-ups, deadlines and staff
            assignments across BEOIS.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadTasks()}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          {canManage ? (
            <button
              type="button"
              onClick={() => {
                setError("");
                setCreateOpen(true);
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Create Task
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {hasDrilldown ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold text-blue-800">
              Intelligence drill-down active
            </div>

            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-blue-700/80">
              {requestedTaskId ? (
                <span>Focused task</span>
              ) : null}

              {requestedView ? (
                <span>
                  View: {requestedView.replaceAll("_", " ")}
                </span>
              ) : null}

              {requestedPriority ? (
                <span>Priority: {requestedPriority}</span>
              ) : null}

              {requestedSourceModule ? (
                <span>
                  Module:{" "}
                  {requestedSourceModule.replaceAll("_", " ")}
                </span>
              ) : null}

              {requestedAssignedTo ? (
                <span>Staff filter active</span>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setTab("MY_TASKS");
              router.replace("/tasks");
            }}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            Clear filters
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 pt-4 sm:px-5">
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-1">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);

                    if (hasDrilldown) {
                      router.replace("/tasks");
                    }
                  }}
                  className={`rounded-t-xl px-4 py-3 text-sm font-medium transition ${
                    tab === item.id
                      ? "border-b-2 border-blue-600 text-blue-700"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search tasks..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-72 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : visibleTasks.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
              <CheckCircle2 className="h-6 w-6 text-slate-500" />
            </div>

            <h2 className="mt-4 text-base font-semibold text-slate-900">
              No tasks found
            </h2>

            <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
              Tasks matching this view will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleTasks.map((task) => {
              const overdue =
                task.status !== "COMPLETED" &&
                task.status !== "CANCELLED" &&
                task.due_at &&
                new Date(task.due_at) < new Date();

              const ownTask =
                task.assigned_to === user?.id;

              return (
                <article
                  key={task.id}
                  className="p-4 transition hover:bg-slate-50/70 sm:p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {task.status === "COMPLETED" ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : task.status ===
                          "IN_PROGRESS" ? (
                          <Clock3 className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-slate-400" />
                        )}

                        <h2 className="min-w-0 text-base font-semibold text-slate-950">
                          {task.title}
                        </h2>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${priorityClasses(
                            task.priority,
                          )}`}
                        >
                          {task.priority}
                        </span>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClasses(
                            task.status,
                          )}`}
                        >
                          {task.status.replaceAll("_", " ")}
                        </span>

                        {overdue ? (
                          <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                            OVERDUE
                          </span>
                        ) : null}
                      </div>

                      {task.description ? (
                        <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
                          {task.description}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {formatDateTime(task.due_at)}
                        </span>

                        <span>
                          Source:{" "}
                          <strong className="font-medium text-slate-700">
                            {task.source_label ||
                              task.source_module.replaceAll(
                                "_",
                                " ",
                              )}
                          </strong>
                        </span>

                        {task.assigned_to_name ||
                        task.assigned_to_username ? (
                          <span>
                            Assigned to:{" "}
                            <strong className="font-medium text-slate-700">
                              {task.assigned_to_name ||
                                task.assigned_to_username}
                            </strong>
                          </span>
                        ) : null}

                        {task.assigned_by_name ||
                        task.assigned_by_username ? (
                          <span>
                            Assigned by:{" "}
                            <strong className="font-medium text-slate-700">
                              {task.assigned_by_name ||
                                task.assigned_by_username}
                            </strong>
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {ownTask &&
                      task.status === "PENDING" ? (
                        <button
                          type="button"
                          onClick={() =>
                            void changeOwnStatus(
                              task,
                              "IN_PROGRESS",
                            )
                          }
                          className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                        >
                          Start Task
                        </button>
                      ) : null}

                      {ownTask &&
                      (task.status === "PENDING" ||
                        task.status === "IN_PROGRESS") ? (
                        <button
                          type="button"
                          onClick={() =>
                            void changeOwnStatus(
                              task,
                              "COMPLETED",
                            )
                          }
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          Complete
                        </button>
                      ) : null}

                      {canManage &&
                      task.status !== "COMPLETED" &&
                      task.status !== "CANCELLED" ? (
                        <button
                          type="button"
                          onClick={() =>
                            void cancelTask(task)
                          }
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  Create Task
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Assign operational work to a BEOIS user.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={submitTask}
              className="space-y-5 p-5"
            >
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Task title
                </label>

                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  placeholder="Example: Follow up pending admission documents"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  rows={4}
                  placeholder="Add instructions or context..."
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Assign to
                  </label>

                  <select
                    value={assignedTo}
                    onChange={(event) =>
                      setAssignedTo(event.target.value)
                    }
                    disabled={assigneesLoading}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  >
                    <option value="">
                      {assigneesLoading
                        ? "Loading users..."
                        : "Select employee"}
                    </option>

                    {assignees.map((assignee) => (
                      <option
                        key={assignee.id}
                        value={assignee.id}
                      >
                        {userName(assignee)}
                        {assignee.primary_role
                          ? ` — ${assignee.primary_role}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Priority
                  </label>

                  <select
                    value={priority}
                    onChange={(event) =>
                      setPriority(
                        event.target.value as TaskPriority,
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  >
                    {PRIORITIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Due date & time
                  </label>

                  <input
                    type="datetime-local"
                    value={dueAt}
                    onChange={(event) =>
                      setDueAt(event.target.value)
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Reminder date & time
                  </label>

                  <input
                    type="datetime-local"
                    value={reminderAt}
                    onChange={(event) =>
                      setReminderAt(event.target.value)
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Source module
                  </label>

                  <select
                    value={sourceModule}
                    onChange={(event) =>
                      setSourceModule(
                        event.target
                          .value as TaskSourceModule,
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  >
                    {SOURCE_MODULES.map((item) => (
                      <option key={item} value={item}>
                        {item.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Source label
                  </label>

                  <input
                    value={sourceLabel}
                    onChange={(event) =>
                      setSourceLabel(event.target.value)
                    }
                    placeholder="Example: Admission Follow-up"
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Source reference
                </label>

                <input
                  value={sourceObjectId}
                  onChange={(event) =>
                    setSourceObjectId(event.target.value)
                  }
                  placeholder="Optional lead, admission, student or other reference ID"
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}

                  {saving ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
