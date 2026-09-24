"use client";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  LoaderCircle,
  Search,
  WalletCards,
} from "lucide-react";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getLeadCourseOptions,
  getVisitBranches,
  qualifyLead,
  saveLeadQualification,
  scheduleLeadAppointment,
  updateLeadAppointmentStatus,
} from "@/lib/api/leads";

import type {
  EligibilityStatus,
  LeadAppointment,
  LeadAppointmentPurpose,
  LeadCourseOption,
  LeadDetail,
  LeadQualification,
  ProgramStudyMode,
  QualificationLevel,
  RequiredProgramLevel,
  SaveLeadQualificationPayload,
  VisitBranch,
} from "@/types/leads";


function formatMoney(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value;
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    },
  ).format(amount);
}


function formatDateTime(
  value: string,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
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
  ).format(date);
}


function eligibilityClass(
  status: EligibilityStatus,
) {
  switch (status) {
    case "ELIGIBLE":
      return (
        "bg-emerald-50 text-emerald-700 "
        + "border-emerald-200"
      );

    case "NOT_ELIGIBLE":
      return (
        "bg-red-50 text-red-700 "
        + "border-red-200"
      );

    case "REVIEW_REQUIRED":
      return (
        "bg-amber-50 text-amber-700 "
        + "border-amber-200"
      );

    default:
      return (
        "bg-slate-50 text-slate-600 "
        + "border-slate-200"
      );
  }
}


interface Props {
  lead: LeadDetail;
  onLeadChanged: (
    lead: LeadDetail,
  ) => Promise<void> | void;
}


export function LeadCounsellingPanel({
  lead,
  onLeadChanged,
}: Props) {
  const initial =
    lead.qualification;

  const [
    qualification,
    setQualification,
  ] = useState<
    LeadQualification | null
  >(initial);

  const [
    highestQualification,
    setHighestQualification,
  ] = useState<QualificationLevel>(
    initial?.highest_qualification
      ?? "UNSPECIFIED",
  );

  const [stream, setStream] =
    useState(initial?.stream ?? "");

  const [
    boardOrUniversity,
    setBoardOrUniversity,
  ] = useState(
    initial?.board_or_university
      ?? "",
  );

  const [
    yearOfPassing,
    setYearOfPassing,
  ] = useState(
    initial?.year_of_passing
      ? String(
          initial.year_of_passing,
        )
      : "",
  );

  const [
    percentageOrGrade,
    setPercentageOrGrade,
  ] = useState(
    initial?.percentage_or_grade
      ?? "",
  );

  const [
    requiredLevel,
    setRequiredLevel,
  ] = useState<RequiredProgramLevel>(
    initial?.required_level
      ?? "UG",
  );

  const [
    interestArea,
    setInterestArea,
  ] = useState(
    initial?.interest_area
      ?? lead.interested_course
      ?? "",
  );

  const [
    customerBudget,
    setCustomerBudget,
  ] = useState(
    initial?.customer_budget
      ?? "",
  );

  const [
    quotedFee,
    setQuotedFee,
  ] = useState(
    initial?.quoted_fee
      ?? "",
  );

  const [
    courseSearch,
    setCourseSearch,
  ] = useState("");

  const [
    studyMode,
    setStudyMode,
  ] = useState<
    ProgramStudyMode | ""
  >("");

  const [
    courses,
    setCourses,
  ] = useState<LeadCourseOption[]>(
    [],
  );

  const [
    findingCourses,
    setFindingCourses,
  ] = useState(false);

  const [
    savingQualification,
    setSavingQualification,
  ] = useState(false);

  const [
    qualificationError,
    setQualificationError,
  ] = useState("");

  const [
    qualificationSuccess,
    setQualificationSuccess,
  ] = useState("");

  const [
    branches,
    setBranches,
  ] = useState<VisitBranch[]>([]);

  const [
    appointments,
    setAppointments,
  ] = useState<LeadAppointment[]>(
    lead.appointments ?? [],
  );

  const [
    visitDateTime,
    setVisitDateTime,
  ] = useState("");

  const [
    visitBranch,
    setVisitBranch,
  ] = useState("");

  const [
    visitPurpose,
    setVisitPurpose,
  ] = useState<LeadAppointmentPurpose>(
    "COUNSELLING",
  );

  const [
    visitCount,
    setVisitCount,
  ] = useState("1");

  const [
    visitNotes,
    setVisitNotes,
  ] = useState("");

  const [
    appointmentBusy,
    setAppointmentBusy,
  ] = useState(false);

  const [
    appointmentError,
    setAppointmentError,
  ] = useState("");

  const [
    appointmentSuccess,
    setAppointmentSuccess,
  ] = useState("");

  const [
    rescheduleValues,
    setRescheduleValues,
  ] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    let active = true;

    async function loadBranches() {
      try {
        const response =
          await getVisitBranches();

        if (!active) {
          return;
        }

        setBranches(response);

        if (
          response.length > 0
        ) {
          setVisitBranch(
            (current) =>
              current
              || response[0].id,
          );
        }
      } catch {
        if (active) {
          setBranches([]);
        }
      }
    }

    void loadBranches();

    return () => {
      active = false;
    };
  }, []);

  const canScheduleVisit =
    lead.status === "QUALIFIED"
    || lead.status === "CONVERTED";

  const selectedCourseLabel =
    useMemo(() => {
      if (
        !qualification
        ?.selected_program
      ) {
        return "";
      }

      return [
        qualification
          .selected_program_name,
        qualification
          .selected_institution_name,
      ]
        .filter(Boolean)
        .join(" · ");
    }, [qualification]);

  function buildQualificationPayload(
    selectedProgram:
      | string
      | null
      | undefined = undefined,
  ): SaveLeadQualificationPayload {
    const parsedYear =
      yearOfPassing.trim()
        ? Number(yearOfPassing)
        : null;

    return {
      highest_qualification:
        highestQualification,

      stream: stream.trim(),

      board_or_university:
        boardOrUniversity.trim(),

      year_of_passing:
        parsedYear !== null
        && Number.isFinite(
          parsedYear,
        )
          ? parsedYear
          : null,

      percentage_or_grade:
        percentageOrGrade.trim(),

      required_level:
        requiredLevel,

      interest_area:
        interestArea.trim(),

      customer_budget:
        customerBudget.trim()
          || null,

      quoted_fee:
        quotedFee.trim()
          || null,

      ...(selectedProgram
        !== undefined
        ? {
            selected_program:
              selectedProgram,
          }
        : {}),
    };
  }

  async function saveQualification(
    selectedProgram:
      | string
      | null
      | undefined = undefined,
  ) {
    const saved =
      await saveLeadQualification(
        lead.id,
        buildQualificationPayload(
          selectedProgram,
        ),
      );

    setQualification(saved);

    return saved;
  }

  async function submitQualification(
    event: FormEvent,
  ) {
    event.preventDefault();

    setSavingQualification(true);
    setQualificationError("");
    setQualificationSuccess("");

    try {
      await saveQualification();

      setQualificationSuccess(
        "Qualification details saved.",
      );
    } catch (caught) {
      setQualificationError(
        caught instanceof Error
          ? caught.message
          : (
              "Qualification details "
              + "could not be saved."
            ),
      );
    } finally {
      setSavingQualification(false);
    }
  }

  async function findCourses() {
    setFindingCourses(true);
    setQualificationError("");
    setQualificationSuccess("");

    try {
      await saveQualification();

      const response =
        await getLeadCourseOptions(
          lead.id,
          {
            level: requiredLevel,
            study_mode:
              studyMode || undefined,
            search:
              courseSearch.trim()
              || undefined,
          },
        );

      setCourses(response);

      setQualificationSuccess(
        response.length > 0
          ? (
              `${response.length} course `
              + "option(s) found."
            )
          : (
              "No active matching "
              + "programs found."
            ),
      );
    } catch (caught) {
      setQualificationError(
        caught instanceof Error
          ? caught.message
          : (
              "Course options could "
              + "not be loaded."
            ),
      );
    } finally {
      setFindingCourses(false);
    }
  }

  async function selectCourse(
    course: LeadCourseOption,
  ) {
    setSavingQualification(true);
    setQualificationError("");
    setQualificationSuccess("");

    try {
      const saved =
        await saveQualification(
          course.id,
        );

      setQualification(saved);

      setQualificationSuccess(
        saved.eligibility_status
        === "ELIGIBLE"
          ? (
              "Program selected and "
              + "eligibility confirmed."
            )
          : (
              "Program selected. "
              + saved.eligibility_notes
            ),
      );
    } catch (caught) {
      setQualificationError(
        caught instanceof Error
          ? caught.message
          : (
              "The program could "
              + "not be selected."
            ),
      );
    } finally {
      setSavingQualification(false);
    }
  }

  async function markQualified() {
    setSavingQualification(true);
    setQualificationError("");
    setQualificationSuccess("");

    try {
      const updated =
        await qualifyLead(
          lead.id,
        );

      setQualificationSuccess(
        "Lead marked as qualified.",
      );

      await onLeadChanged(
        updated,
      );
    } catch (caught) {
      setQualificationError(
        caught instanceof Error
          ? caught.message
          : (
              "The lead could not "
              + "be marked qualified."
            ),
      );
    } finally {
      setSavingQualification(false);
    }
  }

  async function submitAppointment(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !visitDateTime
      || !visitBranch
    ) {
      return;
    }

    setAppointmentBusy(true);
    setAppointmentError("");
    setAppointmentSuccess("");

    try {
      const appointment =
        await scheduleLeadAppointment(
          lead.id,
          {
            purpose:
              visitPurpose,
            scheduled_at:
              new Date(
                visitDateTime,
              ).toISOString(),
            branch:
              visitBranch,
            number_of_visitors:
              Math.max(
                1,
                Number(
                  visitCount,
                )
                || 1,
              ),
            notes:
              visitNotes.trim(),
          },
        );

      setAppointments(
        (current) =>
          [
            ...current,
            appointment,
          ].sort(
            (a, b) =>
              new Date(
                a.scheduled_at,
              ).getTime()
              - new Date(
                b.scheduled_at,
              ).getTime(),
          ),
      );

      setVisitDateTime("");
      setVisitNotes("");
      setVisitCount("1");

      setAppointmentSuccess(
        "College visit scheduled.",
      );
    } catch (caught) {
      setAppointmentError(
        caught instanceof Error
          ? caught.message
          : (
              "The appointment could "
              + "not be scheduled."
            ),
      );
    } finally {
      setAppointmentBusy(false);
    }
  }

  async function updateAppointment(
    appointment: LeadAppointment,
    status:
      | "ARRIVED"
      | "COMPLETED"
      | "CANCELLED"
      | "NO_SHOW"
      | "RESCHEDULED",
  ) {
    setAppointmentBusy(true);
    setAppointmentError("");
    setAppointmentSuccess("");

    try {
      const rescheduleValue =
        rescheduleValues[
          appointment.id
        ];

      const updated =
        await updateLeadAppointmentStatus(
          lead.id,
          appointment.id,
          {
            status,
            ...(status
              === "RESCHEDULED"
              ? {
                  scheduled_at:
                    rescheduleValue
                      ? new Date(
                          rescheduleValue,
                        ).toISOString()
                      : null,
                }
              : {}),
          },
        );

      setAppointments(
        (current) =>
          current.map(
            (item) =>
              item.id
              === updated.id
                ? updated
                : item,
          ),
      );

      setAppointmentSuccess(
        "Appointment updated.",
      );
    } catch (caught) {
      setAppointmentError(
        caught instanceof Error
          ? caught.message
          : (
              "The appointment could "
              + "not be updated."
            ),
      );
    } finally {
      setAppointmentBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[var(--brand)]">
            <GraduationCap
              size={20}
            />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-950">
              Qualification & Counselling
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Save the student&apos;s academic profile,
              find matching programs, confirm
              eligibility, and then qualify the lead.
            </p>
          </div>
        </div>

        {qualificationError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
            {qualificationError}
          </div>
        )}

        {qualificationSuccess && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700">
            {qualificationSuccess}
          </div>
        )}

        <form
          onSubmit={
            submitQualification
          }
          className="mt-5 grid gap-3 sm:grid-cols-2"
        >
          <label className="grid gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Highest Qualification

            <select
              value={
                highestQualification
              }
              onChange={(
                event,
              ) =>
                setHighestQualification(
                  event.target
                    .value as QualificationLevel,
                )
              }
              className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700 outline-none focus:border-[var(--brand)]"
            >
              <option value="UNSPECIFIED">
                Select qualification
              </option>
              <option value="SSLC">
                SSLC / 10th
              </option>
              <option value="PLUS_TWO">
                Plus Two / 12th
              </option>
              <option value="DIPLOMA">
                Diploma
              </option>
              <option value="UG">
                Undergraduate Degree
              </option>
              <option value="PG">
                Postgraduate Degree
              </option>
              <option value="OTHER">
                Other
              </option>
            </select>
          </label>

          <label className="grid gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Required Course Level

            <select
              value={
                requiredLevel
              }
              onChange={(
                event,
              ) =>
                setRequiredLevel(
                  event.target
                    .value as RequiredProgramLevel,
                )
              }
              className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700 outline-none focus:border-[var(--brand)]"
            >
              <option value="UG">
                Undergraduate
              </option>
              <option value="PG">
                Postgraduate
              </option>
              <option value="DIPLOMA">
                Diploma
              </option>
              <option value="CERTIFICATE">
                Certificate
              </option>
              <option value="OTHER">
                Other
              </option>
            </select>
          </label>

          <input
            value={stream}
            onChange={(
              event,
            ) =>
              setStream(
                event.target.value,
              )
            }
            placeholder="Stream / subject group"
            className="h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-[var(--brand)]"
          />

          <input
            value={
              boardOrUniversity
            }
            onChange={(
              event,
            ) =>
              setBoardOrUniversity(
                event.target.value,
              )
            }
            placeholder="Board / University"
            className="h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-[var(--brand)]"
          />

          <input
            type="number"
            min="1950"
            max="2200"
            value={
              yearOfPassing
            }
            onChange={(
              event,
            ) =>
              setYearOfPassing(
                event.target.value,
              )
            }
            placeholder="Year of passing"
            className="h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-[var(--brand)]"
          />

          <input
            value={
              percentageOrGrade
            }
            onChange={(
              event,
            ) =>
              setPercentageOrGrade(
                event.target.value,
              )
            }
            placeholder="Percentage / grade"
            className="h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-[var(--brand)]"
          />

          <input
            value={
              interestArea
            }
            onChange={(
              event,
            ) =>
              setInterestArea(
                event.target.value,
              )
            }
            placeholder="Course / interest area"
            className="h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-[var(--brand)] sm:col-span-2"
          />

          <input
            type="number"
            min="0"
            value={
              customerBudget
            }
            onChange={(
              event,
            ) =>
              setCustomerBudget(
                event.target.value,
              )
            }
            placeholder="Customer budget (₹)"
            className="h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-[var(--brand)]"
          />

          <input
            type="number"
            min="0"
            value={
              quotedFee
            }
            onChange={(
              event,
            ) =>
              setQuotedFee(
                event.target.value,
              )
            }
            placeholder="Quoted fee (₹)"
            className="h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-[var(--brand)]"
          />

          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={
                savingQualification
              }
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {savingQualification
                ? "Saving..."
                : "Save Qualification"}
            </button>
          </div>
        </form>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <div className="flex items-center gap-2">
            <Search
              size={16}
              className="text-[var(--brand)]"
            />

            <div className="text-xs font-bold text-slate-800">
              Find Eligible Courses
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_150px_auto]">
            <input
              value={
                courseSearch
              }
              onChange={(
                event,
              ) =>
                setCourseSearch(
                  event.target.value,
                )
              }
              placeholder="Course or university"
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[var(--brand)]"
            />

            <select
              value={studyMode}
              onChange={(
                event,
              ) =>
                setStudyMode(
                  event.target
                    .value as
                    | ProgramStudyMode
                    | "",
                )
              }
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-[var(--brand)]"
            >
              <option value="">
                Any mode
              </option>
              <option value="DISTANCE">
                Distance
              </option>
              <option value="ONLINE">
                Online
              </option>
              <option value="REGULAR">
                Regular
              </option>
              <option value="HYBRID">
                Hybrid
              </option>
            </select>

            <button
              type="button"
              onClick={() =>
                void findCourses()
              }
              disabled={
                findingCourses
              }
              className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-xs font-bold text-white disabled:opacity-60"
            >
              {findingCourses ? (
                <LoaderCircle
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <Search
                  size={14}
                />
              )}

              Find
            </button>
          </div>
        </div>

        {qualification && (
          <div className="mt-4 rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Selected Program
                </div>

                <div className="mt-1 text-sm font-bold text-slate-900">
                  {selectedCourseLabel
                    || "No program selected"}
                </div>
              </div>

              <div
                className={
                  "rounded-full border px-3 py-1.5 text-[10px] font-bold "
                  + eligibilityClass(
                    qualification
                      .eligibility_status,
                  )
                }
              >
                {
                  qualification
                    .eligibility_status_display
                }
              </div>
            </div>

            {qualification
              .eligibility_notes && (
              <p className="mt-3 text-xs leading-5 text-slate-600">
                {
                  qualification
                    .eligibility_notes
                }
              </p>
            )}

            {qualification
              .eligibility_status
              === "ELIGIBLE"
              && lead.status
              !== "QUALIFIED"
              && lead.status
              !== "CONVERTED" && (
              <button
                type="button"
                onClick={() =>
                  void markQualified()
                }
                disabled={
                  savingQualification
                }
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
              >
                <CheckCircle2
                  size={15}
                />
                Mark as Qualified
              </button>
            )}

            {qualification
              .eligibility_status
              === "REVIEW_REQUIRED" && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
                <AlertTriangle
                  size={15}
                  className="mt-0.5 shrink-0"
                />

                Eligibility confirmation
                is required before this
                lead can be qualified.
              </div>
            )}
          </div>
        )}

        {courses.length > 0 && (
          <div className="mt-5 space-y-3">
            {courses.map(
              (course) => {
                const primaryPlan =
                  course.fee_plans[0];

                return (
                  <div
                    key={
                      course.id
                    }
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-slate-950">
                          {course.name}
                        </div>

                        <div className="mt-1 text-xs font-medium text-[var(--brand)]">
                          {
                            course
                              .institution_name
                          }
                        </div>

                        <div className="mt-2 text-[11px] text-slate-500">
                          {
                            course
                              .level_display
                          }
                          {" · "}
                          {
                            course
                              .study_mode_display
                          }
                          {course
                            .duration_years
                            ? (
                                ` · ${course.duration_years} year(s)`
                              )
                            : ""}
                          {course
                            .duration_semesters
                            ? (
                                ` · ${course.duration_semesters} semester(s)`
                              )
                            : ""}
                        </div>
                      </div>

                      <span
                        className={
                          "rounded-full border px-3 py-1.5 text-[10px] font-bold "
                          + eligibilityClass(
                            course
                              .eligibility_result,
                          )
                        }
                      >
                        {
                          course
                            .eligibility_result
                            .replaceAll(
                              "_",
                              " ",
                            )
                        }
                      </span>
                    </div>

                    <div className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
                      <div>
                        <div className="text-[10px] font-bold uppercase text-slate-400">
                          Eligibility
                        </div>

                        <div className="mt-1 text-xs leading-5 text-slate-700">
                          {course
                            .eligibility_text
                            || course
                              .minimum_qualification_display}
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] font-bold uppercase text-slate-400">
                          Student Fee
                        </div>

                        <div className="mt-1 flex items-center gap-2 text-xs font-bold text-slate-800">
                          <WalletCards
                            size={14}
                          />

                          {formatMoney(
                            primaryPlan
                              ?.student_total_fee
                              ?? null,
                          )}
                        </div>
                      </div>
                    </div>

                    {primaryPlan
                      ?.installments
                      .length > 0 && (
                      <div className="mt-3 text-[11px] text-slate-500">
                        Installments:{" "}
                        {primaryPlan
                          .installments
                          .map(
                            (
                              item,
                            ) =>
                              `${item.label || `#${item.installment_number}`} ${formatMoney(item.amount)}`,
                          )
                          .join(
                            " · ",
                          )}
                      </div>
                    )}

                    <p className="mt-3 text-xs leading-5 text-slate-500">
                      {
                        course
                          .eligibility_reason
                      }
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        void selectCourse(
                          course,
                        )
                      }
                      disabled={
                        savingQualification
                      }
                      className="mt-3 rounded-xl border border-[var(--brand)] px-3 py-2 text-[11px] font-bold text-[var(--brand)] hover:bg-blue-50 disabled:opacity-60"
                    >
                      Select Program
                    </button>
                  </div>
                );
              },
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <CalendarDays
              size={20}
            />
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-950">
              Optional College Visit
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Visits are optional. Remote
              admission can continue without
              scheduling an appointment.
            </p>
          </div>
        </div>

        {appointmentError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
            {appointmentError}
          </div>
        )}

        {appointmentSuccess && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700">
            {appointmentSuccess}
          </div>
        )}

        {!canScheduleVisit ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Qualify the lead first to
            enable visit scheduling.
          </div>
        ) : (
          <form
            onSubmit={
              submitAppointment
            }
            className="mt-5 grid gap-3 sm:grid-cols-2"
          >
            <label className="grid gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Visit Date & Time

              <input
                type="datetime-local"
                required
                value={
                  visitDateTime
                }
                onChange={(
                  event,
                ) =>
                  setVisitDateTime(
                    event.target.value,
                  )
                }
                className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700 outline-none focus:border-[var(--brand)]"
              />
            </label>

            <label className="grid gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Branch

              <select
                required
                value={
                  visitBranch
                }
                onChange={(
                  event,
                ) =>
                  setVisitBranch(
                    event.target.value,
                  )
                }
                className="h-10 rounded-xl border border-slate-200 px-3 text-xs font-medium text-slate-700 outline-none focus:border-[var(--brand)]"
              >
                <option value="">
                  Select branch
                </option>

                {branches.map(
                  (branch) => (
                    <option
                      key={
                        branch.id
                      }
                      value={
                        branch.id
                      }
                    >
                      {branch.name}
                      {branch.city
                        ? ` · ${branch.city}`
                        : ""}
                    </option>
                  ),
                )}
              </select>
            </label>

            <select
              value={
                visitPurpose
              }
              onChange={(
                event,
              ) =>
                setVisitPurpose(
                  event.target
                    .value as LeadAppointmentPurpose,
                )
              }
              className="h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-[var(--brand)]"
            >
              <option value="COUNSELLING">
                Counselling
              </option>
              <option value="DOCUMENTS">
                Document Submission
              </option>
              <option value="ADMISSION">
                Admission
              </option>
              <option value="OTHER">
                Other
              </option>
            </select>

            <input
              type="number"
              min="1"
              max="20"
              value={
                visitCount
              }
              onChange={(
                event,
              ) =>
                setVisitCount(
                  event.target.value,
                )
              }
              placeholder="Number of visitors"
              className="h-10 rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-[var(--brand)]"
            />

            <textarea
              rows={2}
              value={
                visitNotes
              }
              onChange={(
                event,
              ) =>
                setVisitNotes(
                  event.target.value,
                )
              }
              placeholder="Visit notes"
              className="rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-[var(--brand)] sm:col-span-2"
            />

            <button
              type="submit"
              disabled={
                appointmentBusy
                || !visitDateTime
                || !visitBranch
              }
              className="w-fit rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60 sm:col-span-2"
            >
              {appointmentBusy
                ? "Saving..."
                : "Schedule Visit"}
            </button>
          </form>
        )}

        {appointments.length > 0 && (
          <div className="mt-5 space-y-3">
            {appointments.map(
              (appointment) => {
                const active =
                  [
                    "SCHEDULED",
                    "CONFIRMED",
                    "RESCHEDULED",
                  ].includes(
                    appointment.status,
                  );

                return (
                  <div
                    key={
                      appointment.id
                    }
                    className="rounded-xl bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {
                            appointment
                              .purpose_display
                          }
                        </div>

                        <div className="mt-1 text-[11px] text-slate-500">
                          {formatDateTime(
                            appointment
                              .scheduled_at,
                          )}
                          {" · "}
                          {
                            appointment
                              .branch_name
                          }
                        </div>
                      </div>

                      <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold text-slate-600">
                        {
                          appointment
                            .status_display
                        }
                      </span>
                    </div>

                    {appointment.notes && (
                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        {
                          appointment
                            .notes
                        }
                      </p>
                    )}

                    {active && (
                      <>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void updateAppointment(
                                appointment,
                                "ARRIVED",
                              )
                            }
                            disabled={
                              appointmentBusy
                            }
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700"
                          >
                            Arrived
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void updateAppointment(
                                appointment,
                                "COMPLETED",
                              )
                            }
                            disabled={
                              appointmentBusy
                            }
                            className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-700"
                          >
                            Complete
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void updateAppointment(
                                appointment,
                                "NO_SHOW",
                              )
                            }
                            disabled={
                              appointmentBusy
                            }
                            className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[10px] font-bold text-amber-700"
                          >
                            No Show
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void updateAppointment(
                                appointment,
                                "CANCELLED",
                              )
                            }
                            disabled={
                              appointmentBusy
                            }
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600"
                          >
                            Cancel
                          </button>
                        </div>

                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <input
                            type="datetime-local"
                            value={
                              rescheduleValues[
                                appointment.id
                              ] || ""
                            }
                            onChange={(
                              event,
                            ) =>
                              setRescheduleValues(
                                (
                                  current,
                                ) => ({
                                  ...current,
                                  [appointment.id]:
                                    event
                                      .target
                                      .value,
                                }),
                              )
                            }
                            className="h-9 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-[11px] outline-none focus:border-[var(--brand)]"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              void updateAppointment(
                                appointment,
                                "RESCHEDULED",
                              )
                            }
                            disabled={
                              appointmentBusy
                              || !rescheduleValues[
                                appointment.id
                              ]
                            }
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-700 disabled:opacity-50"
                          >
                            Reschedule
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              },
            )}
          </div>
        )}
      </section>
    </div>
  );
}
