"use client";

import {
  Building2,
  Network,
  UsersRound,
} from "lucide-react";

import type {
  InstitutionIntelligenceRow,
  PartnerIntelligenceRow,
  StaffIntelligenceRow,
} from "@/types/dashboard";

function formatNumber(value: number) {
  return new Intl.NumberFormat(
    "en-IN",
  ).format(Number(value || 0));
}

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

function EmptyRow({
  message,
  columns,
}: {
  message: string;
  columns: number;
}) {
  return (
    <tr>
      <td
        colSpan={columns}
        className="px-5 py-12 text-center text-sm text-slate-400"
      >
        {message}
      </td>
    </tr>
  );
}

export function InstitutionPerformanceTable({
  institutions,
}: {
  institutions: InstitutionIntelligenceRow[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-[var(--brand)]">
          <Building2 size={19} />
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Institution Performance
          </h2>

          <p className="mt-0.5 text-[11px] text-slate-400">
            Admissions, collections and outstanding balances
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] text-left">
          <thead className="bg-slate-50">
            <tr className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3">
                Institution
              </th>
              <th className="px-4 py-3">
                Admissions
              </th>
              <th className="px-4 py-3">
                Completed
              </th>
              <th className="px-4 py-3">
                Period Collections
              </th>
              <th className="px-4 py-3">
                Student Receivable
              </th>
              <th className="px-4 py-3">
                University Outstanding
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {institutions.length === 0 ? (
              <EmptyRow
                columns={6}
                message="No institution activity in this period."
              />
            ) : (
              institutions.map(
                (institution) => (
                  <tr
                    key={
                      institution.institution_id
                    }
                    className="text-xs text-slate-600 hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">
                        {
                          institution.institution_name
                        }
                      </div>

                      <div className="mt-1 text-[10px] text-slate-400">
                        {
                          institution.institution_code
                        }
                      </div>
                    </td>

                    <td className="px-4 py-4 font-semibold">
                      {formatNumber(
                        institution.admissions_in_period,
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {formatNumber(
                        institution.completed_in_period,
                      )}
                    </td>

                    <td className="px-4 py-4 font-semibold">
                      {formatCurrency(
                        institution.collections_in_period,
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {formatCurrency(
                        institution.student_receivable,
                      )}
                    </td>

                    <td className="px-4 py-4">
                      {formatCurrency(
                        institution.university_outstanding,
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
  );
}

export function PartnerPerformanceTable({
  partners,
}: {
  partners: PartnerIntelligenceRow[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-[var(--brand)]">
          <Network size={19} />
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Partner Performance
          </h2>

          <p className="mt-0.5 text-[11px] text-slate-400">
            Cases, admissions, collections and commissions
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-left">
          <thead className="bg-slate-50">
            <tr className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3">
                Partner
              </th>
              <th className="px-4 py-3">
                Cases
              </th>
              <th className="px-4 py-3">
                Admissions
              </th>
              <th className="px-4 py-3">
                Collections
              </th>
              <th className="px-4 py-3">
                Commission Earned
              </th>
              <th className="px-4 py-3">
                Payable
              </th>
              <th className="px-4 py-3">
                Issues
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {partners.length === 0 ? (
              <EmptyRow
                columns={7}
                message="No partner performance data available."
              />
            ) : (
              partners.map((partner) => (
                <tr
                  key={partner.partner_id}
                  className="text-xs text-slate-600 hover:bg-slate-50/70"
                >
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">
                      {partner.name}
                    </div>

                    <div className="mt-1 text-[10px] text-slate-400">
                      {partner.partner_id} ·{" "}
                      {partner.status}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    {formatNumber(
                      partner.cases_in_period,
                    )}
                  </td>

                  <td className="px-4 py-4 font-semibold">
                    {formatNumber(
                      partner.admissions_in_period,
                    )}
                  </td>

                  <td className="px-4 py-4 font-semibold">
                    {formatCurrency(
                      partner.collections_in_period,
                    )}
                  </td>

                  <td className="px-4 py-4">
                    {formatCurrency(
                      partner.commission_earned,
                    )}
                  </td>

                  <td className="px-4 py-4">
                    {formatCurrency(
                      partner.commission_payable,
                    )}
                  </td>

                  <td className="px-4 py-4">
                    {partner.open_issues}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function StaffPerformanceTable({
  staff,
}: {
  staff: StaffIntelligenceRow[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-[var(--brand)]">
          <UsersRound size={19} />
        </div>

        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Staff Performance
          </h2>

          <p className="mt-0.5 text-[11px] text-slate-400">
            Operational activity only — no payroll or private HR data
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] text-left">
          <thead className="bg-slate-50">
            <tr className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3">
                Employee
              </th>
              <th className="px-4 py-3">
                Department
              </th>
              <th className="px-4 py-3">
                Leads
              </th>
              <th className="px-4 py-3">
                Calls
              </th>
              <th className="px-4 py-3">
                Converted
              </th>
              <th className="px-4 py-3">
                Conversion
              </th>
              <th className="px-4 py-3">
                Admissions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {staff.length === 0 ? (
              <EmptyRow
                columns={7}
                message="No staff performance activity in this period."
              />
            ) : (
              staff.map((employee) => (
                <tr
                  key={employee.employee_id}
                  className="text-xs text-slate-600 hover:bg-slate-50/70"
                >
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">
                      {employee.name}
                    </div>

                    <div className="mt-1 text-[10px] text-slate-400">
                      {employee.employee_id}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    {employee.department ??
                      "—"}
                  </td>

                  <td className="px-4 py-4">
                    {employee.leads_assigned}
                  </td>

                  <td className="px-4 py-4">
                    {employee.calls}
                  </td>

                  <td className="px-4 py-4 font-semibold">
                    {
                      employee.converted_leads
                    }
                  </td>

                  <td className="px-4 py-4">
                    {employee.conversion_rate.toFixed(
                      1,
                    )}
                    %
                  </td>

                  <td className="px-4 py-4 font-semibold">
                    {employee.admissions}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}