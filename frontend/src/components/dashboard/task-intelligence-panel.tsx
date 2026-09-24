"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Layers3,
  ListTodo,
  UserRound,
} from "lucide-react";

import type {
  TaskIntelligence,
  TaskIntelligenceItem,
} from "@/types/dashboard";

function formatNumber(value: number) {
  return new Intl.NumberFormat(
    "en-IN",
  ).format(Number(value || 0));
}

function formatPercent(value: number) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatDateTime(
  value: string | null,
) {
  if (!value) {
    return "No due date";
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
  ).format(new Date(value));
}

function MetricCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: "default" | "danger" | "warning";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-100 bg-red-50/40"
      : tone === "warning"
        ? "border-amber-100 bg-amber-50/40"
        : "border-slate-200 bg-white";

  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}
    >
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </div>

      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </div>

      {helper && (
        <div className="mt-1 text-[10px] leading-4 text-slate-400">
          {helper}
        </div>
      )}
    </div>
  );
}

function PriorityBadge({
  priority,
}: {
  priority: string;
}) {
  const className =
    priority === "URGENT"
      ? "bg-red-50 text-red-600"
      : priority === "HIGH"
        ? "bg-amber-50 text-amber-700"
        : priority === "LOW"
          ? "bg-slate-100 text-slate-500"
          : "bg-blue-50 text-[var(--brand)]";

  return (
    <span
      className={`rounded-full px-2 py-1 text-[9px] font-bold ${className}`}
    >
      {priority.replaceAll("_", " ")}
    </span>
  );
}

function TaskQueue({
  title,
  subtitle,
  tasks,
  overdue = false,
}: {
  title: string;
  subtitle: string;
  tasks: TaskIntelligenceItem[];
  overdue?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          {overdue ? (
            <AlertTriangle
              size={17}
              className="text-red-500"
            />
          ) : (
            <CalendarClock
              size={17}
              className="text-[var(--brand)]"
            />
          )}

          <h3 className="text-sm font-bold text-slate-900">
            {title}
          </h3>
        </div>

        <p className="mt-1 text-[11px] text-slate-400">
          {subtitle}
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="px-5 py-10 text-center text-xs text-slate-400">
          No tasks in this queue.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {tasks.map((task) => (
            <Link
              key={task.task_id}
              href={task.action_url}
              className="block px-5 py-4 transition hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate text-xs font-bold text-slate-900">
                    {task.title}
                  </div>

                  <div className="mt-1 text-[10px] text-slate-400">
                    {task.assigned_to.name}
                    {" · "}
                    {task.source_label ||
                      task.source_module_label}
                  </div>
                </div>

                <PriorityBadge
                  priority={task.priority}
                />
              </div>

              <div
                className={
                  overdue
                    ? "mt-2 text-[10px] font-semibold text-red-500"
                    : "mt-2 text-[10px] font-medium text-slate-500"
                }
              >
                {formatDateTime(task.due_at)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function TaskIntelligencePanel({
  data,
}: {
  data: TaskIntelligence;
}) {
  const activity =
    data.period_activity;

  const agingRows = [
    {
      label: "0–2d",
      value: data.aging["0_2_days"],
    },
    {
      label: "3–7d",
      value: data.aging["3_7_days"],
    },
    {
      label: "8–14d",
      value: data.aging["8_14_days"],
    },
    {
      label: "15–30d",
      value: data.aging["15_30_days"],
    },
    {
      label: "31+d",
      value: data.aging["31_plus_days"],
    },
  ];

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2">
            <ListTodo
              size={19}
              className="text-[var(--brand)]"
            />

            <h2 className="text-lg font-bold text-slate-950">
              Task & Workload Intelligence
            </h2>
          </div>

          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">
            Live workload, overdue pressure,
            team capacity and completion activity
            across the management scope.
          </p>
        </div>

        <div className="text-[10px] text-slate-400">
          Period created{" "}
          <span className="font-bold text-slate-600">
            {formatNumber(activity.created)}
          </span>
          {" · "}
          completed{" "}
          <span className="font-bold text-slate-600">
            {formatNumber(activity.completed)}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Open Tasks"
          value={formatNumber(
            data.summary.open_tasks,
          )}
          helper="Pending + in progress"
        />

        <MetricCard
          label="Overdue"
          value={formatNumber(
            data.summary.overdue_tasks,
          )}
          helper="Past due and still open"
          tone="danger"
        />

        <MetricCard
          label="Urgent"
          value={formatNumber(
            data.summary.urgent_open,
          )}
          helper={`${formatNumber(
            data.summary.high_open,
          )} high-priority open`}
          tone="warning"
        />

        <MetricCard
          label="Due Next 7 Days"
          value={formatNumber(
            data.summary.due_next_7_days,
          )}
          helper={`${formatNumber(
            data.summary.due_today,
          )} due today`}
        />

        <MetricCard
          label="Completion Rate"
          value={formatPercent(
            activity.created_cohort_completion_rate,
          )}
          helper="Selected-period created cohort"
        />

        <MetricCard
          label="No Due Date"
          value={formatNumber(
            data.summary.without_due_date,
          )}
          helper="Open tasks needing scheduling"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-[var(--brand)]">
              <Clock3 size={17} />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Open Task Aging
              </h3>
              <p className="text-[10px] text-slate-400">
                Age since task creation
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-2">
            {agingRows.map((row) => (
              <div
                key={row.label}
                className="rounded-xl bg-slate-50 px-2 py-3 text-center"
              >
                <div className="text-sm font-bold text-slate-800">
                  {formatNumber(row.value)}
                </div>
                <div className="mt-1 text-[9px] font-semibold text-slate-400">
                  {row.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle size={17} />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Management Attention
              </h3>
              <p className="text-[10px] text-slate-400">
                Immediate workload signals
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs text-slate-500">
                Urgent overdue
              </span>
              <span className="text-sm font-bold text-red-600">
                {formatNumber(
                  data.attention.urgent_overdue,
                )}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs text-slate-500">
                Overdue 7+ days
              </span>
              <span className="text-sm font-bold text-amber-700">
                {formatNumber(
                  data.attention
                    .overdue_7_plus_days,
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Due next 24 hours
              </span>
              <span className="text-sm font-bold text-slate-800">
                {formatNumber(
                  data.attention
                    .due_next_24_hours,
                )}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={17} />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Period Activity
              </h3>
              <p className="text-[10px] text-slate-400">
                Selected reporting period
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <MetricCard
              label="Created"
              value={formatNumber(
                activity.created,
              )}
            />

            <MetricCard
              label="Completed"
              value={formatNumber(
                activity.completed,
              )}
            />

            <MetricCard
              label="Cohort Complete"
              value={formatNumber(
                activity
                  .created_cohort_completed,
              )}
            />

            <MetricCard
              label="Cohort Total"
              value={formatNumber(
                activity
                  .created_cohort_total,
              )}
            />
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-[var(--brand)]">
              <Layers3 size={17} />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Module Workload
              </h3>
              <p className="text-[10px] text-slate-400">
                Current open tasks by business module
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead className="bg-slate-50 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3">Module</th>
                  <th className="px-3 py-3">Open</th>
                  <th className="px-3 py-3">Overdue</th>
                  <th className="px-3 py-3">High</th>
                  <th className="px-3 py-3">Urgent</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {data.module_workload.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-xs text-slate-400"
                    >
                      No open task workload.
                    </td>
                  </tr>
                ) : (
                  data.module_workload.map(
                    (row) => (
                      <tr
                        key={row.module}
                        className="text-xs text-slate-600"
                      >
                        <td className="px-5 py-3 font-semibold text-slate-800">
                          {row.label}
                        </td>
                        <td className="px-3 py-3">
                          {row.open_tasks}
                        </td>
                        <td className="px-3 py-3 font-semibold text-red-500">
                          {row.overdue_tasks}
                        </td>
                        <td className="px-3 py-3">
                          {row.high_tasks}
                        </td>
                        <td className="px-3 py-3">
                          {row.urgent_tasks}
                        </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-[var(--brand)]">
              <Building2 size={17} />
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Department Workload
              </h3>
              <p className="text-[10px] text-slate-400">
                Current open tasks by department
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead className="bg-slate-50 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-3 py-3">Open</th>
                  <th className="px-3 py-3">Overdue</th>
                  <th className="px-3 py-3">High</th>
                  <th className="px-3 py-3">Urgent</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {data.department_workload
                  .length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-10 text-center text-xs text-slate-400"
                    >
                      No department task workload.
                    </td>
                  </tr>
                ) : (
                  data.department_workload.map(
                    (row) => (
                      <tr
                        key={row.department}
                        className="text-xs text-slate-600"
                      >
                        <td className="px-5 py-3 font-semibold text-slate-800">
                          {row.department}
                        </td>
                        <td className="px-3 py-3">
                          {row.open_tasks}
                        </td>
                        <td className="px-3 py-3 font-semibold text-red-500">
                          {row.overdue_tasks}
                        </td>
                        <td className="px-3 py-3">
                          {row.high_tasks}
                        </td>
                        <td className="px-3 py-3">
                          {row.urgent_tasks}
                        </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-[var(--brand)]">
            <UserRound size={17} />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Staff Workload
            </h3>
            <p className="text-[10px] text-slate-400">
              Current task pressure and selected-period completion
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="bg-slate-50 text-[9px] font-bold uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3">Employee</th>
                <th className="px-3 py-3">Department</th>
                <th className="px-3 py-3">Open</th>
                <th className="px-3 py-3">Overdue</th>
                <th className="px-3 py-3">Urgent</th>
                <th className="px-3 py-3">Completed</th>
                <th className="px-3 py-3">Cohort Rate</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {data.staff_workload.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-xs text-slate-400"
                  >
                    No staff task activity for this scope.
                  </td>
                </tr>
              ) : (
                data.staff_workload.map(
                  (row) => (
                    <tr
                      key={row.user_id}
                      className="text-xs text-slate-600 hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">
                          {row.name}
                        </div>
                        <div className="mt-1 text-[10px] text-slate-400">
                          {row.employee_id ||
                            row.user_id}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        {row.department || "—"}
                      </td>
                      <td className="px-3 py-4 font-semibold">
                        {row.open_tasks}
                      </td>
                      <td className="px-3 py-4 font-semibold text-red-500">
                        {row.overdue_tasks}
                      </td>
                      <td className="px-3 py-4">
                        {row.urgent_open}
                      </td>
                      <td className="px-3 py-4">
                        {row.completed_in_period}
                      </td>
                      <td className="px-3 py-4">
                        {formatPercent(
                          row.created_cohort_completion_rate,
                        )}
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <TaskQueue
          title="Upcoming Deadlines"
          subtitle="Nearest open task due dates"
          tasks={data.upcoming_deadlines}
        />

        <TaskQueue
          title="Oldest Overdue"
          subtitle="Longest outstanding overdue tasks"
          tasks={data.oldest_overdue}
          overdue
        />
      </div>
    </section>
  );
}
