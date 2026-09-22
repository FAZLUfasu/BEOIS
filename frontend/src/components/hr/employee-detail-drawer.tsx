"use client";

import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Mail,
  MapPin,
  Phone,
  UserRound,
  Users,
  X,
} from "lucide-react";

import type {
  EmployeeListItem,
  EmploymentStatus,
} from "@/types/employees";


interface EmployeeDetailDrawerProps {
  employee:
    | EmployeeListItem
    | null;

  onClose: () => void;

  onEdit: (
    employee: EmployeeListItem,
  ) => void;
}


function formatDate(
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

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(date);
}


function statusLabel(
  status: EmploymentStatus,
) {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(
      /\b\w/g,
      (character) =>
        character.toUpperCase(),
    );
}


function statusClass(
  status: EmploymentStatus,
) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "ON_LEAVE":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "RESIGNED":
    case "TERMINATED":
      return "bg-red-50 text-red-700 ring-red-200";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}


export function EmployeeDetailDrawer({
  employee,
  onClose,
  onEdit,
}: EmployeeDetailDrawerProps) {
  if (!employee) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35">
      <div className="h-full w-full max-w-4xl overflow-y-auto bg-slate-50 shadow-2xl">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
          <div className="flex items-start justify-between gap-4 px-6 py-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-blue-700">
                  {
                    employee.employee_id
                  }
                </p>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusClass(
                    employee.employment_status,
                  )}`}
                >
                  {statusLabel(
                    employee.employment_status,
                  )}
                </span>
              </div>

              <h2 className="mt-1 text-2xl font-bold text-slate-950">
                {employee.employee_name ||
                  "Unnamed Employee"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {employee.current_designation ||
                  "No designation assigned"}
              </p>
            </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() =>
                            onEdit(employee)
                            }
                            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                            Edit Employee
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        </div>

          </div>
        </header>


        <main className="space-y-6 p-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InfoCard
              icon={
                <Building2 className="h-5 w-5" />
              }
              label="Branch"
              value={
                employee.branch_name ||
                "—"
              }
            />

            <InfoCard
              icon={
                <Users className="h-5 w-5" />
              }
              label="Department"
              value={
                employee.department_name ||
                "—"
              }
            />

            <InfoCard
              icon={
                <BriefcaseBusiness className="h-5 w-5" />
              }
              label="Employment"
              value={employee.employment_type.replaceAll(
                "_",
                " ",
              )}
            />

            <InfoCard
              icon={
                <CalendarDays className="h-5 w-5" />
              }
              label="Joined"
              value={formatDate(
                employee.date_of_joining,
              )}
            />
          </section>


          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-bold text-slate-950">
              Employment Profile
            </h3>

            <div className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <Detail
                label="Employee ID"
                value={
                  employee.employee_id
                }
              />

              <Detail
                label="Designation"
                value={
                  employee.current_designation ||
                  "—"
                }
              />

              <Detail
                label="Branch"
                value={
                  employee.branch_name ||
                  "—"
                }
              />

              <Detail
                label="Department"
                value={
                  employee.department_name ||
                  "—"
                }
              />

              <Detail
                label="Employment Type"
                value={employee.employment_type.replaceAll(
                  "_",
                  " ",
                )}
              />

              <Detail
                label="Employment Status"
                value={statusLabel(
                  employee.employment_status,
                )}
              />

              <Detail
                label="Date of Joining"
                value={formatDate(
                  employee.date_of_joining,
                )}
              />

              <Detail
                label="Date of Exit"
                value={formatDate(
                  employee.date_of_exit,
                )}
              />

              <Detail
                label="Reporting Manager"
                value={
                  employee.reporting_manager_employee_id ||
                  "—"
                }
              />

              <Detail
                label="Linked Account"
                value={
                  employee.user
                    ? "Linked"
                    : "Not linked"
                }
              />
            </div>
          </section>


          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-blue-700" />

              <h3 className="text-lg font-bold text-slate-950">
                Contact Information
              </h3>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <ContactCard
                icon={
                  <Phone className="h-4 w-4" />
                }
                label="Phone"
                value={
                  employee.phone_number ||
                  "—"
                }
              />

              <ContactCard
                icon={
                  <Phone className="h-4 w-4" />
                }
                label="Alternate Phone"
                value={
                  employee.alternate_phone_number ||
                  "—"
                }
              />

              <ContactCard
                icon={
                  <Mail className="h-4 w-4" />
                }
                label="Personal Email"
                value={
                  employee.personal_email ||
                  "—"
                }
              />

              <ContactCard
                icon={
                  <UserRound className="h-4 w-4" />
                }
                label="Emergency Contact"
                value={
                  [
                    employee.emergency_contact_name,
                    employee.emergency_contact_number,
                  ]
                    .filter(Boolean)
                    .join(" · ") ||
                  "—"
                }
              />
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-4">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Address
                  </p>

                  <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-700">
                    {employee.address ||
                      "—"}
                  </p>
                </div>
              </div>
            </div>
          </section>


          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-bold text-slate-950">
              Internal Notes
            </h3>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {employee.notes ||
                "No internal notes recorded."}
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}


function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-blue-700">
        {icon}
      </div>

      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}


function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  );
}


function ContactCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex gap-3">
        <div className="mt-0.5 text-slate-500">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-1 break-words text-sm font-medium text-slate-800">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}