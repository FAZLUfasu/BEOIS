"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  CalendarDays,
  Loader2,
  X,
} from "lucide-react";

import {
  createPayrollPeriod,
} from "@/lib/api/payroll";

import type {
  PayrollPeriod,
} from "@/types/payroll";


interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (
    period: PayrollPeriod,
  ) => void;
}


const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";


export function PayrollPeriodDialog({
  open,
  onClose,
  onSaved,
}: Props) {
  const [year, setYear] =
    useState("");

  const [month, setMonth] =
    useState("");

  const [
    startDate,
    setStartDate,
  ] = useState("");

  const [
    endDate,
    setEndDate,
  ] = useState("");

  const [notes, setNotes] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");


  useEffect(() => {
    if (!open) {
      return;
    }

    const now = new Date();

    const currentYear =
      now.getFullYear();

    const currentMonth =
      now.getMonth() + 1;

    setYear(
      String(currentYear),
    );

    setMonth(
      String(currentMonth),
    );

    const range =
      getMonthDateRange(
        currentYear,
        currentMonth,
      );

    setStartDate(range.start);
    setEndDate(range.end);
    setNotes("");
    setError("");
  }, [open]);


  useEffect(() => {
    if (!open) {
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
  }, [open]);


  function handlePeriodChange(
    nextYear: string,
    nextMonth: string,
  ) {
    setYear(nextYear);
    setMonth(nextMonth);

    const numericYear =
      Number(nextYear);

    const numericMonth =
      Number(nextMonth);

    if (
      Number.isInteger(
        numericYear,
      ) &&
      numericYear >= 2000 &&
      numericYear <= 2100 &&
      numericMonth >= 1 &&
      numericMonth <= 12
    ) {
      const range =
        getMonthDateRange(
          numericYear,
          numericMonth,
        );

      setStartDate(range.start);
      setEndDate(range.end);
    }
  }


  if (!open) {
    return null;
  }


  async function submit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    const numericYear =
      Number(year);

    const numericMonth =
      Number(month);

    if (
      !Number.isInteger(
        numericYear,
      ) ||
      numericYear < 2000 ||
      numericYear > 2100
    ) {
      setError(
        "Enter a valid payroll year.",
      );
      return;
    }

    if (
      !Number.isInteger(
        numericMonth,
      ) ||
      numericMonth < 1 ||
      numericMonth > 12
    ) {
      setError(
        "Select a valid payroll month.",
      );
      return;
    }

    if (!startDate || !endDate) {
      setError(
        "Start date and end date are required.",
      );
      return;
    }

    if (endDate < startDate) {
      setError(
        "End date cannot be before start date.",
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const saved =
        await createPayrollPeriod({
          year: numericYear,
          month: numericMonth,
          start_date: startDate,
          end_date: endDate,
          notes: notes.trim(),
        });

      onSaved(saved);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create payroll period.",
      );
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/50 p-4">
      <div className="flex min-h-full items-center justify-center">
        <form
          onSubmit={submit}
          className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-blue-600" />

                <h2 className="text-lg font-bold text-slate-950">
                  Create Payroll Period
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Open a monthly payroll cycle.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>


          <div className="space-y-5 px-6 py-5">
            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}


            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Year *
                </span>

                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={year}
                  onChange={(event) =>
                    handlePeriodChange(
                      event.target.value,
                      month,
                    )
                  }
                  className={inputClass}
                />
              </label>


              <label>
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Month *
                </span>

                <select
                  value={month}
                  onChange={(event) =>
                    handlePeriodChange(
                      year,
                      event.target.value,
                    )
                  }
                  className={inputClass}
                >
                  <option value="">
                    Select month
                  </option>

                  {MONTHS.map(
                    (name, index) => (
                      <option
                        key={name}
                        value={
                          index + 1
                        }
                      >
                        {name}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>


            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Start Date *
                </span>

                <input
                  type="date"
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </label>


              <label>
                <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                  End Date *
                </span>

                <input
                  type="date"
                  value={endDate}
                  onChange={(event) =>
                    setEndDate(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                />
              </label>
            </div>


            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Selecting a month automatically fills the normal first and last day of that month. You can adjust the dates before creating the period.
            </div>


            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Notes
              </span>

              <textarea
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target.value,
                  )
                }
                rows={3}
                placeholder="Optional payroll period notes"
                className={inputClass}
              />
            </label>
          </div>


          <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarDays className="h-4 w-4" />
              )}

              Create Period
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];


function getMonthDateRange(
  year: number,
  month: number,
) {
  const lastDay =
    new Date(
      year,
      month,
      0,
    ).getDate();

  const monthText =
    String(month).padStart(
      2,
      "0",
    );

  return {
    start:
      `${year}-${monthText}-01`,

    end:
      `${year}-${monthText}-${String(
        lastDay,
      ).padStart(2, "0")}`,
  };
}