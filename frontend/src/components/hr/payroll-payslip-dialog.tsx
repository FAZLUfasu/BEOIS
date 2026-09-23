"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Loader2,
  Printer,
  X,
} from "lucide-react";

import {
  getPayrollPayslip,
} from "@/lib/api/payroll-reporting";

import type {
  Payroll,
} from "@/types/payroll";

import type {
  PayrollPayslip,
  PayrollPayslipLine,
} from "@/types/payroll-reporting";

export function PayrollPayslipDialog({
  payroll,
  onClose,
}: {
  payroll: Payroll | null;
  onClose: () => void;
}) {
  const [data, setData] =
    useState<PayrollPayslip | null>(null);
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");
  const printRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!payroll) {
      setData(null);
      setError("");
      return;
    }

    let active = true;
    const activePayroll = payroll;

    async function loadPayslip() {
      setLoading(true);
      setError("");

      try {
        const result =
          await getPayrollPayslip(
            activePayroll.id,
          );

        if (active) {
          setData(result);
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load payslip.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPayslip();

    return () => {
      active = false;
    };
  }, [payroll]);

  useEffect(() => {
    if (!payroll) {
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
  }, [payroll]);

  if (!payroll) {
    return null;
  }

  function handlePrint() {
    if (!data || !printRef.current) {
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=1000,height=800",
    );

    if (!printWindow) {
      setError(
        "The print window was blocked. Allow pop-ups and try again.",
      );
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Payslip - ${escapeHtml(
            data.employee.employee_id,
          )}</title>
          <meta charset="utf-8" />
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              font-family: Arial, Helvetica, sans-serif;
              color: #0f172a;
              background: white;
            }
            .payslip {
              max-width: 900px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 18px;
              margin-bottom: 20px;
            }
            .brand {
              font-size: 24px;
              font-weight: 800;
            }
            .muted { color: #64748b; }
            .title {
              font-size: 18px;
              font-weight: 700;
              text-align: right;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px 28px;
              margin: 18px 0;
            }
            .item {
              border-bottom: 1px solid #e2e8f0;
              padding: 8px 0;
            }
            .label {
              font-size: 11px;
              text-transform: uppercase;
              color: #64748b;
              font-weight: 700;
            }
            .value {
              margin-top: 3px;
              font-size: 14px;
              font-weight: 600;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }
            th, td {
              padding: 10px;
              border: 1px solid #e2e8f0;
              font-size: 13px;
              text-align: left;
            }
            th { background: #f8fafc; }
            .amount { text-align: right; }
            .totals {
              margin-left: auto;
              margin-top: 20px;
              width: 360px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .net {
              margin-top: 8px;
              padding: 12px;
              background: #0f172a;
              color: white;
              font-weight: 800;
            }
            .footer {
              margin-top: 36px;
              padding-top: 16px;
              border-top: 1px solid #e2e8f0;
              font-size: 11px;
              color: #64748b;
              text-align: center;
            }
            @page { size: A4; margin: 16mm; }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4">
      <button
        type="button"
        aria-label="Close payslip"
        onClick={onClose}
        className="absolute inset-0"
      />

      <div className="relative z-10 max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
              Payroll Document
            </p>
            <h3 className="mt-1 text-xl font-bold text-slate-950">
              Employee Payslip
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!data || loading}
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {error ? (
          <div className="m-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex min-h-[480px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : data ? (
          <div className="p-6">
            <div
              ref={printRef}
              className="payslip rounded-2xl border border-slate-200 bg-white p-6"
            >
              <div className="header flex flex-col gap-4 border-b-2 border-slate-900 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="brand text-2xl font-extrabold text-slate-950">
                    BEST College
                  </div>
                  <p className="muted mt-1 text-sm text-slate-500">
                    Brainstorm Educational Service Trust
                  </p>
                </div>

                <div className="sm:text-right">
                  <div className="title text-lg font-bold text-slate-950">
                    Salary Payslip
                  </div>
                  <p className="muted mt-1 text-sm text-slate-500">
                    {formatPeriod(
                      data.period.year,
                      data.period.month,
                    )}
                  </p>
                </div>
              </div>

              <div className="grid mt-5 grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                <Info
                  label="Employee"
                  value={data.employee.name}
                />
                <Info
                  label="Employee ID"
                  value={data.employee.employee_id}
                />
                <Info
                  label="Designation"
                  value={
                    data.employee.designation || "—"
                  }
                />
                <Info
                  label="Department"
                  value={
                    data.employee.department || "—"
                  }
                />
                <Info
                  label="Branch"
                  value={
                    data.employee.branch || "—"
                  }
                />
                <Info
                  label="Pay Period"
                  value={`${formatDate(
                    data.period.start_date,
                  )} – ${formatDate(
                    data.period.end_date,
                  )}`}
                />
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <PayslipTable
                  title="Earnings"
                  rows={data.earnings}
                />
                <PayslipTable
                  title="Deductions"
                  rows={data.deductions}
                />
              </div>

              <div className="totals ml-auto mt-6 max-w-md">
                <TotalRow
                  label="Gross Earnings"
                  value={
                    data.summary.gross_earnings
                  }
                />
                <TotalRow
                  label="Total Deductions"
                  value={
                    data.summary.total_deductions
                  }
                />
                <TotalRow
                  label="LOP Deduction"
                  value={
                    data.summary.lop_deduction
                  }
                />
                <TotalRow
                  label="Advance Recovery"
                  value={
                    data.summary.advance_recovery
                  }
                />

                <div className="net mt-3 flex items-center justify-between rounded-xl bg-slate-900 p-4 text-white">
                  <span className="font-semibold">
                    Net Salary
                  </span>
                  <span className="text-lg font-extrabold">
                    ₹
                    {formatMoney(
                      data.summary.net_salary,
                    )}
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <AttendanceItem
                  label="Calendar Days"
                  value={
                    data.attendance.calendar_days
                  }
                />
                <AttendanceItem
                  label="Payable Days"
                  value={
                    data.attendance.payable_days
                  }
                />
                <AttendanceItem
                  label="Present Days"
                  value={
                    data.attendance.present_days
                  }
                />
                <AttendanceItem
                  label="Paid Leave"
                  value={
                    data.attendance.paid_leave_days
                  }
                />
                <AttendanceItem
                  label="Unpaid Leave"
                  value={
                    data.attendance.unpaid_leave_days
                  }
                />
                <AttendanceItem
                  label="LOP Days"
                  value={data.attendance.lop_days}
                />
              </div>

              <div className="mt-6 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Payment
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Info
                    label="Status"
                    value={data.payment.status}
                  />
                  <Info
                    label="Paid At"
                    value={
                      data.payment.paid_at
                        ? formatDateTime(
                            data.payment.paid_at,
                          )
                        : "—"
                    }
                  />
                  <Info
                    label="Payment Method"
                    value={
                      data.payment.payment_method ||
                      "—"
                    }
                  />
                  <Info
                    label="Payment Reference"
                    value={
                      data.payment
                        .payment_reference || "—"
                    }
                  />
                </div>
              </div>

              <div className="footer mt-8 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
                Computer-generated salary payslip.
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PayslipTable({
  title,
  rows,
}: {
  title: string;
  rows: PayrollPayslipLine[];
}) {
  return (
    <div>
      <h4 className="font-bold text-slate-950">
        {title}
      </h4>

      <div className="mt-2 overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-bold uppercase text-slate-500">
                Component
              </th>
              <th className="px-3 py-2 text-right text-xs font-bold uppercase text-slate-500">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={2}
                  className="px-3 py-4 text-center text-sm text-slate-400"
                >
                  No components
                </td>
              </tr>
            ) : (
              rows.map((item) => (
                <tr key={`${item.code}-${item.name}`}>
                  <td className="px-3 py-2">
                    <p className="text-sm font-semibold text-slate-800">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {item.code}
                    </p>
                  </td>
                  <td className="amount whitespace-nowrap px-3 py-2 text-right text-sm font-semibold text-slate-900">
                    ₹{formatMoney(item.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="item border-b border-slate-100 py-2">
      <p className="label text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="value mt-1 break-words text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function AttendanceItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function TotalRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="total-row flex items-center justify-between border-b border-slate-100 py-2 text-sm">
      <span className="text-slate-500">
        {label}
      </span>
      <span className="font-bold text-slate-900">
        ₹{formatMoney(value)}
      </span>
    </div>
  );
}

function formatMoney(value: string | number) {
  return Number(value || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}

function formatPeriod(
  year: number,
  month: number,
) {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      month: "long",
      year: "numeric",
    },
  ).format(
    new Date(year, month - 1, 1),
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN");
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
