"use client";

import {
  AlertTriangle,
  Building2,
  CircleDollarSign,
  GraduationCap,
  PhoneCall,
  UsersRound,
} from "lucide-react";

import type {
  ExceptionIntelligence,
} from "@/types/dashboard";

function formatCurrency(value: number) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    },
  ).format(Number(value || 0));
}

function formatDateTime(value: string) {
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

function formatDate(
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
    },
  ).format(
    new Date(`${value}T00:00:00`),
  );
}

function QueueHeader({
  title,
  count,
  icon,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-slate-50 text-[var(--brand)]">
          {icon}
        </div>

        <h3 className="text-sm font-bold text-slate-900">
          {title}
        </h3>
      </div>

      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
        {count}
      </span>
    </div>
  );
}

export function AttentionCentre({
  data,
}: {
  data: ExceptionIntelligence;
}) {
  return (
    <section>
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle
            size={18}
            className="text-amber-600"
          />

          <h2 className="text-lg font-bold text-slate-950">
            Attention Centre
          </h2>
        </div>

        <p className="mt-1 text-xs text-slate-400">
          Operational exceptions requiring review or action
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <QueueHeader
            title="Overdue Follow-ups"
            count={
              data.summary
                .overdue_followups
            }
            icon={<PhoneCall size={17} />}
          />

          {data.queues.overdue_followups
            .length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No overdue follow-ups.
            </div>
          ) : (
            data.queues.overdue_followups.map(
              (item) => (
                <div
                  key={item.lead_id}
                  className="border-t border-slate-100 px-5 py-4 first:border-0"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {item.name}
                      </div>

                      <div className="mt-1 text-[10px] text-slate-400">
                        {item.lead_id} ·{" "}
                        {item.status}
                      </div>
                    </div>

                    <div className="text-right text-[10px] font-medium text-red-500">
                      {formatDateTime(
                        item.next_follow_up_at,
                      )}
                    </div>
                  </div>
                </div>
              ),
            )
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <QueueHeader
            title="Education Deadlines"
            count={
              data.summary
                .overdue_education_processes
            }
            icon={
              <GraduationCap size={17} />
            }
          />

          {data.queues
            .overdue_education_processes
            .length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No overdue education processes.
            </div>
          ) : (
            data.queues.overdue_education_processes.map(
              (item, index) => (
                <div
                  key={`${item.student_id}-${item.process_type}-${index}`}
                  className="border-t border-slate-100 px-5 py-4 first:border-0"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {item.student_name}
                      </div>

                      <div className="mt-1 text-[10px] text-slate-400">
                        {item.title} ·{" "}
                        {item.status}
                      </div>
                    </div>

                    <div className="text-[10px] font-medium text-red-500">
                      {formatDate(
                        item.due_date,
                      )}
                    </div>
                  </div>
                </div>
              ),
            )
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <QueueHeader
            title="Urgent Partner Issues"
            count={
              data.summary
                .urgent_partner_issues
            }
            icon={<UsersRound size={17} />}
          />

          {data.queues
            .urgent_partner_issues
            .length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No urgent partner issues.
            </div>
          ) : (
            data.queues.urgent_partner_issues.map(
              (item, index) => (
                <div
                  key={`${item.partner_id}-${index}`}
                  className="border-t border-slate-100 px-5 py-4 first:border-0"
                >
                  <div className="text-xs font-bold text-slate-800">
                    {item.partner_name}
                  </div>

                  <div className="mt-1 text-[11px] text-slate-600">
                    {item.subject}
                  </div>

                  <div className="mt-2 text-[10px] text-slate-400">
                    {item.partner_id} ·{" "}
                    {item.status}
                  </div>
                </div>
              ),
            )
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <QueueHeader
            title="University Payables"
            count={
              data.summary
                .university_payables
            }
            icon={<Building2 size={17} />}
          />

          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
            <span className="text-[10px] text-slate-400">
              Total outstanding
            </span>

            <div className="mt-1 text-sm font-bold text-slate-800">
              {formatCurrency(
                data.summary
                  .university_outstanding,
              )}
            </div>
          </div>

          {data.queues.university_payables
            .length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No outstanding university payables.
            </div>
          ) : (
            data.queues.university_payables.map(
              (item) => (
                <div
                  key={item.payable_number}
                  className="border-t border-slate-100 px-5 py-4 first:border-0"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {item.institution}
                      </div>

                      <div className="mt-1 text-[10px] text-slate-400">
                        {
                          item.payable_number
                        }{" "}
                        · {item.admission_id}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-800">
                        {formatCurrency(
                          item.outstanding,
                        )}
                      </div>

                      <div className="mt-1 text-[10px] text-slate-400">
                        {formatDate(
                          item.due_date,
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ),
            )
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <QueueHeader
            title="Operational Expenses"
            count={
              data.summary
                .operational_expenses
            }
            icon={
              <CircleDollarSign
                size={17}
              />
            }
          />

          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
            <span className="text-[10px] text-slate-400">
              Total outstanding
            </span>

            <div className="mt-1 text-sm font-bold text-slate-800">
              {formatCurrency(
                data.summary
                  .operational_expense_outstanding,
              )}
            </div>
          </div>

          {data.queues.operational_expenses
            .length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No outstanding operational expenses.
            </div>
          ) : (
            data.queues.operational_expenses.map(
              (item) => (
                <div
                  key={item.expense_number}
                  className="flex flex-col justify-between gap-3 border-t border-slate-100 px-5 py-4 first:border-0 sm:flex-row"
                >
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      {item.vendor_name ||
                        "Operational Expense"}
                    </div>

                    <div className="mt-1 text-[11px] text-slate-500">
                      {item.description}
                    </div>

                    <div className="mt-1 text-[10px] text-slate-400">
                      {item.expense_number} ·{" "}
                      {item.status}
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <div className="text-xs font-bold text-slate-800">
                      {formatCurrency(
                        item.outstanding,
                      )}
                    </div>

                    <div className="mt-1 text-[10px] text-slate-400">
                      {formatDate(
                        item.due_date,
                      )}
                    </div>
                  </div>
                </div>
              ),
            )
          )}
        </div>
      </div>
    </section>
  );
}