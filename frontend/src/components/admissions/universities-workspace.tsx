"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Edit3,
  GraduationCap,
  IndianRupee,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";

import {
  createFeePlan,
  createInstitution,
  createProgram,
  getManagedInstitutions,
  getPrograms,
  updateFeePlan,
  updateInstitution,
  updateProgram,
  verifyFeePlan,
  verifyProgram,
} from "@/lib/api/admissions";

import {
  useAuth,
} from "@/lib/auth/auth-context";

import type {
  Institution,
  InstitutionManagementPayload,
  Program,
  ProgramFeeInstallmentPayload,
  ProgramFeePlan,
  ProgramFeePlanManagementPayload,
  ProgramManagementPayload,
} from "@/types/admissions";

const EMPTY_FORM: InstitutionManagementPayload = {
  name: "",
  short_name: "",
  code: "",
  state: "",
  city: "",
  website: "",
  contact_person: "",
  contact_phone: "",
  contact_email: "",
  is_active: true,
  notes: "",
};

const MANAGEMENT_ROLES = [
  "SUPER_ADMIN",
  "FULL_ACCESS",
  "CHAIRMAN",
  "GENERAL_MANAGER",
  "ADMISSION",
  "MANAGER",
  "DEPARTMENT_HEAD",
];

function inputClassName() {
  return [
    "w-full rounded-xl border border-slate-200",
    "bg-white px-3 py-2.5 text-sm text-slate-900",
    "outline-none transition",
    "placeholder:text-slate-400",
    "focus:border-blue-500 focus:ring-2",
    "focus:ring-blue-500/10",
  ].join(" ");
}

function formatMoney(
  value: string | number | null | undefined,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Not specified";
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  return `₹${numeric.toLocaleString("en-IN")}`;
}

function formatDuration(
  program: Program,
) {
  const parts: string[] = [];

  if (
    program.duration_years !== null &&
    program.duration_years !== undefined
  ) {
    parts.push(
      `${program.duration_years} ${
        program.duration_years === 1
          ? "Year"
          : "Years"
      }`,
    );
  }

  if (
    program.duration_semesters !== null &&
    program.duration_semesters !== undefined
  ) {
    parts.push(
      `${program.duration_semesters} ${
        program.duration_semesters === 1
          ? "Semester"
          : "Semesters"
      }`,
    );
  }

  return parts.length > 0
    ? parts.join(" • ")
    : "Duration not specified";
}

function getActiveFeePlans(
  program: Program,
) {
  return program.fee_plans.filter(
    (plan) => plan.is_active,
  );
}

function getMinimumDisplayedFee(
  program: Program,
) {
  const plans = getActiveFeePlans(program);

  if (plans.length === 0) {
    return null;
  }

  const values = plans
    .map((plan) => Number(plan.student_total_fee))
    .filter((value) =>
      Number.isFinite(value),
    );

  if (values.length === 0) {
    return null;
  }

  return Math.min(...values);
}

function DataStatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    status.toUpperCase();

  if (normalized === "VERIFIED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
        <CheckCircle2 className="h-3 w-3" />
        Verified
      </span>
    );
  }

  if (normalized === "PARTIAL") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
        Partial
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700">
      Needs review
    </span>
  );
}

function FeePlanCard({
  plan,
  expanded,
  onToggle,
  canManage,
  onEdit,
  onVerify,
}: {
  plan: ProgramFeePlan;
  expanded: boolean;
  onToggle: () => void;
  canManage: boolean;
  onEdit: () => void;
  onVerify: (status: string) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-slate-50"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900">
              {plan.name || "Fee Plan"}
            </span>

            <DataStatusBadge
              status={plan.data_status}
            />
          </div>

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>
              Total:{" "}
              <strong className="text-slate-700">
                {formatMoney(
                  plan.student_total_fee,
                )}
              </strong>
            </span>

            <span>
              {plan.installments.length}{" "}
              {plan.installments.length === 1
                ? "installment"
                : "installments"}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {canManage && (
            <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50">
              <Edit3 className="h-3 w-3" />
              Edit
            </button>
          )}
          {canManage && (
            <select
              value={plan.data_status}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => { event.stopPropagation(); onVerify(event.target.value); }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-600"
              aria-label="Fee plan verification status"
            >
              <option value="NEEDS_REVIEW">Needs review</option>
              <option value="PARTIAL">Partial</option>
              <option value="VERIFIED">Verified</option>
            </select>
          )}
          {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Total Fee
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatMoney(
                  plan.student_total_fee,
                )}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Registration
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatMoney(
                  plan.registration_fee,
                )}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Exam Fee
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatMoney(
                  plan.exam_fee,
                )}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Other Fee
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {formatMoney(
                  plan.other_fee,
                )}
              </p>
            </div>
          </div>

          {plan.installments.length > 0 && (
            <div className="mt-5">
              <div className="mb-3 flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-blue-500" />
                <h4 className="text-sm font-semibold text-slate-900">
                  Installment Schedule
                </h4>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="grid grid-cols-[70px_minmax(150px,1fr)_120px_minmax(120px,1fr)] gap-3 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <span>No.</span>
                  <span>Installment</span>
                  <span>Amount</span>
                  <span>Due Stage</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {plan.installments
                    .slice()
                    .sort(
                      (a, b) =>
                        a.installment_number -
                        b.installment_number,
                    )
                    .map(
                      (
                        installment,
                      ) => (
                        <div
                          key={
                            installment.id
                          }
                          className="grid grid-cols-[70px_minmax(150px,1fr)_120px_minmax(120px,1fr)] gap-3 px-3 py-3 text-sm"
                        >
                          <span className="text-slate-500">
                            {
                              installment.installment_number
                            }
                          </span>

                          <span className="font-medium text-slate-800">
                            {installment.label ||
                              "Installment"}
                          </span>

                          <span className="font-semibold text-slate-900">
                            {formatMoney(
                              installment.amount,
                            )}
                          </span>

                          <span className="text-slate-600">
                            {installment.due_stage ||
                              "—"}
                          </span>
                        </div>
                      ),
                    )}
                </div>
              </div>
            </div>
          )}

          {plan.notes && (
            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
              <p className="text-xs font-medium text-blue-800">
                Fee plan notes
              </p>
              <p className="mt-1 text-xs leading-5 text-blue-700">
                {plan.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProgramCard({
  program,
  selected,
  onSelect,
  canManage,
  onEdit,
  onAddFeePlan,
  onEditFeePlan,
  onVerifyFeePlan,
  onVerify,
}: {
  program: Program;
  selected: boolean;
  onSelect: () => void;
  canManage: boolean;
  onEdit: () => void;
  onAddFeePlan: () => void;
  onEditFeePlan: (plan: ProgramFeePlan) => void;
  onVerifyFeePlan: (plan: ProgramFeePlan, status: string) => void;
  onVerify: (status: string) => void;
}) {
  const [expanded, setExpanded] =
    useState(false);

  const [expandedPlans, setExpandedPlans] =
    useState<Set<string>>(
      new Set(),
    );

  const activePlans =
    getActiveFeePlans(program);

  const minimumFee =
    getMinimumDisplayedFee(program);

  function toggleFeePlan(
    planId: string,
  ) {
    setExpandedPlans((current) => {
      const next = new Set(current);

      if (next.has(planId)) {
        next.delete(planId);
      } else {
        next.add(planId);
      }

      return next;
    });
  }

  return (
    <div
      className={[
        "rounded-2xl border bg-white transition",
        selected
          ? "border-blue-300 ring-2 ring-blue-500/10"
          : "border-slate-200",
      ].join(" ")}
    >
      <div className="flex items-start gap-3 p-4">
        <button
          type="button"
          onClick={() =>
            setExpanded(
              (current) => !current,
            )
          }
          className="mt-1 shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label={
            expanded
              ? "Collapse course"
              : "Expand course"
          }
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-semibold text-slate-950">
                  {program.name}
                </h4>

                {program.code && (
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
                    {program.code}
                  </span>
                )}

                <DataStatusBadge
                  status={
                    program.data_status
                  }
                />
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {program.level_display ||
                    program.level ||
                    "Course"}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {program.study_mode_display ||
                    program.study_mode ||
                    "Study mode not specified"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canManage && (
                <>
                  <button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"><Edit3 className="h-3.5 w-3.5" />Edit Course</button>
                  <button type="button" onClick={onAddFeePlan} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"><Plus className="h-3.5 w-3.5" />Add Fee Plan</button>
                </>
              )}
              {canManage && (
                <select
                  value={program.data_status}
                  onChange={(event) => onVerify(event.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-600"
                  aria-label="Course verification status"
                >
                  <option value="NEEDS_REVIEW">Needs review</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="VERIFIED">Verified</option>
                </select>
              )}
              <label
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={onSelect}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Compare
              </label>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Duration
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {formatDuration(
                  program,
                )}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Specialization
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {program.specialization ||
                  "Not specified"}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Fee Plans
              </p>
              <p className="mt-1 text-sm font-medium text-slate-700">
                {activePlans.length}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Listed From
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {minimumFee === null
                  ? "Not specified"
                  : formatMoney(
                      minimumFee,
                    )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 pb-5 pt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h5 className="text-sm font-semibold text-slate-900">
                Academic Details
              </h5>

              <dl className="mt-3 space-y-3">
                <div>
                  <dt className="text-xs text-slate-400">
                    Minimum Qualification
                  </dt>
                  <dd className="mt-1 text-sm text-slate-700">
                    {program.minimum_qualification_display ||
                      program.minimum_qualification ||
                      "Not specified"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-slate-400">
                    Required Stream
                  </dt>
                  <dd className="mt-1 text-sm text-slate-700">
                    {program.required_stream ||
                      "Not specified"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-slate-400">
                    Eligibility
                  </dt>
                  <dd className="mt-1 text-sm leading-6 text-slate-700">
                    {program.eligibility_text ||
                      "Not specified"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs text-slate-400">
                    Credit Transfer
                  </dt>
                  <dd className="mt-1 text-sm text-slate-700">
                    {program.is_credit_transfer_available
                      ? "Available"
                      : "Not available"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-semibold text-slate-900">
                  Fee Plans
                </h5>

                <span className="text-xs text-slate-400">
                  {activePlans.length} active
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {activePlans.length ===
                0 ? (
                  <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                    No active fee plan is
                    currently available.
                  </div>
                ) : (
                  activePlans.map(
                    (plan) => (
                      <FeePlanCard
                        key={plan.id}
                        plan={plan}
                        expanded={expandedPlans.has(
                          plan.id,
                        )}
                        onToggle={() => toggleFeePlan(plan.id)}
                        canManage={canManage}
                        onEdit={() => onEditFeePlan(plan)}
                        onVerify={(status) => onVerifyFeePlan(plan, status)}
                      />
                    ),
                  )
                )}
              </div>
            </div>
          </div>

          {program.notes && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-400">
                Course Notes
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {program.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function ProgramManagementModal({
  initial,
  institutions,
  editing,
  saving,
  onClose,
  onSave,
}: {
  initial: ProgramManagementPayload;
  institutions: Institution[];
  editing: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: ProgramManagementPayload) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);

  useEffect(() => setForm(initial), [initial]);

  function update<K extends keyof ProgramManagementPayload>(
    key: K,
    value: ProgramManagementPayload[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave({
      ...form,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      level: form.level.trim(),
      study_mode: form.study_mode.trim(),
      specialization: form.specialization.trim(),
      eligibility_text: form.eligibility_text.trim(),
      minimum_qualification: form.minimum_qualification.trim(),
      required_stream: form.required_stream.trim(),
      notes: form.notes.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              {editing ? "Edit Course / Programme" : "Add Course / Programme"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Maintain the academic master record used by admissions and telecallers.
            </p>
          </div>
          <button type="button" disabled={saving} onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6">
          <form onSubmit={submit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-slate-700">University *</span>
                <select required value={form.institution} onChange={(e) => update("institution", e.target.value)} className={inputClassName()}>
                  <option value="">Select university</option>
                  {institutions.map((institution) => (
                    <option key={institution.id} value={institution.id}>{institution.name} ({institution.code})</option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Course Name *</span>
                <input required value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClassName()} />
              </label>

              <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Course Code</span><input value={form.code} onChange={(e) => update("code", e.target.value)} className={inputClassName()} /></label>
              <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Level</span><input value={form.level} onChange={(e) => update("level", e.target.value)} className={inputClassName()} /></label>
              <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Study Mode</span><input value={form.study_mode} onChange={(e) => update("study_mode", e.target.value)} className={inputClassName()} /></label>
              <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Specialization</span><input value={form.specialization} onChange={(e) => update("specialization", e.target.value)} className={inputClassName()} /></label>
              <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Duration — Years</span><input type="number" min="0" step="0.5" value={form.duration_years ?? ""} onChange={(e) => update("duration_years", e.target.value === "" ? null : Number(e.target.value))} className={inputClassName()} /></label>
              <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Duration — Semesters</span><input type="number" min="0" step="1" value={form.duration_semesters ?? ""} onChange={(e) => update("duration_semesters", e.target.value === "" ? null : Number(e.target.value))} className={inputClassName()} /></label>
              <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Minimum Qualification</span><input value={form.minimum_qualification} onChange={(e) => update("minimum_qualification", e.target.value)} className={inputClassName()} /></label>
              <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Required Stream</span><input value={form.required_stream} onChange={(e) => update("required_stream", e.target.value)} className={inputClassName()} /></label>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input type="checkbox" checked={form.eligibility_review_required} onChange={(e) => update("eligibility_review_required", e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                <span className="text-sm font-medium text-slate-700">Eligibility review required</span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <input type="checkbox" checked={form.is_credit_transfer_available} onChange={(e) => update("is_credit_transfer_available", e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                <span className="text-sm font-medium text-slate-700">Credit transfer available</span>
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
                <input type="checkbox" checked={form.is_active} onChange={(e) => update("is_active", e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                <span className="text-sm font-medium text-slate-700">Active course</span>
              </label>

              <label className="space-y-1.5 md:col-span-2"><span className="text-sm font-medium text-slate-700">Eligibility</span><textarea rows={4} value={form.eligibility_text} onChange={(e) => update("eligibility_text", e.target.value)} className={inputClassName()} /></label>
              <label className="space-y-1.5 md:col-span-2"><span className="text-sm font-medium text-slate-700">Notes</span><textarea rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} className={inputClassName()} /></label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
              <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">
                {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {editing ? "Save Course" : "Create Course"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function FeePlanManagementModal({
  initial,
  program,
  editing,
  saving,
  onClose,
  onSave,
}: {
  initial: ProgramFeePlanManagementPayload;
  program: Program;
  editing: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: ProgramFeePlanManagementPayload) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);

  function update<K extends keyof ProgramFeePlanManagementPayload>(key: K, value: ProgramFeePlanManagementPayload[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateInstallment(index: number, key: keyof ProgramFeeInstallmentPayload, value: string) {
    setForm((current) => ({
      ...current,
      installments: current.installments.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
    }));
  }

  function addInstallment() {
    setForm((current) => ({
      ...current,
      installments: [...current.installments, { installment_number: current.installments.length + 1, label: "", amount: "", due_stage: "", notes: "" }],
    }));
  }

  function removeInstallment(index: number) {
    setForm((current) => ({
      ...current,
      installments: current.installments.filter((_, i) => i !== index).map((item, i) => ({ ...item, installment_number: i + 1 })),
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave({
      ...form,
      program: program.id,
      name: form.name.trim(),
      student_total_fee: form.student_total_fee.trim(),
      registration_fee: form.registration_fee.trim(),
      exam_fee: form.exam_fee.trim(),
      other_fee: form.other_fee.trim(),
      notes: form.notes.trim(),
      installments: form.installments.map((item, index) => ({ ...item, installment_number: index + 1, label: item.label.trim(), amount: String(item.amount).trim(), due_stage: item.due_stage.trim(), notes: item.notes.trim() })),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div><h2 className="text-lg font-semibold text-slate-950">{editing ? "Edit Fee Plan" : "Add Fee Plan"}</h2><p className="mt-1 text-sm text-slate-500">Fee structure for {program.name}.</p></div>
          <button type="button" disabled={saving} onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-6 py-6">
          <form onSubmit={submit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1.5 md:col-span-2"><span className="text-sm font-medium text-slate-700">Fee Plan Name *</span><input required value={form.name} onChange={(e) => update("name", e.target.value)} className={inputClassName()} /></label>
              <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Student Total Fee</span><input inputMode="decimal" value={form.student_total_fee} onChange={(e) => update("student_total_fee", e.target.value)} className={inputClassName()} /></label>
              <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Registration Fee</span><input inputMode="decimal" value={form.registration_fee} onChange={(e) => update("registration_fee", e.target.value)} className={inputClassName()} /></label>
              <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Exam Fee</span><input inputMode="decimal" value={form.exam_fee} onChange={(e) => update("exam_fee", e.target.value)} className={inputClassName()} /></label>
              <label className="space-y-1.5"><span className="text-sm font-medium text-slate-700">Other Fee</span><input inputMode="decimal" value={form.other_fee} onChange={(e) => update("other_fee", e.target.value)} className={inputClassName()} /></label>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2"><input type="checkbox" checked={form.is_active} onChange={(e) => update("is_active", e.target.checked)} className="h-4 w-4 rounded border-slate-300" /><span className="text-sm font-medium text-slate-700">Active fee plan</span></label>
              <label className="space-y-1.5 md:col-span-2"><span className="text-sm font-medium text-slate-700">Notes</span><textarea rows={3} value={form.notes} onChange={(e) => update("notes", e.target.value)} className={inputClassName()} /></label>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-semibold text-slate-900">Installment Schedule</h3><p className="mt-1 text-xs text-slate-500">Maintain the actual installment structure for this fee plan.</p></div><button type="button" onClick={addInstallment} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" />Add Installment</button></div>
              <div className="mt-3 space-y-3">
                {form.installments.map((item, index) => (
                  <div key={`${index}-${item.installment_number}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Installment {index + 1}</span><button type="button" onClick={() => removeInstallment(index)} className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-rose-600"><X className="h-4 w-4" /></button></div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-1"><span className="text-xs font-medium text-slate-600">Label</span><input value={item.label} onChange={(e) => updateInstallment(index, "label", e.target.value)} className={inputClassName()} /></label>
                      <label className="space-y-1"><span className="text-xs font-medium text-slate-600">Amount</span><input inputMode="decimal" value={item.amount} onChange={(e) => updateInstallment(index, "amount", e.target.value)} className={inputClassName()} /></label>
                      <label className="space-y-1"><span className="text-xs font-medium text-slate-600">Due Stage</span><input value={item.due_stage} onChange={(e) => updateInstallment(index, "due_stage", e.target.value)} className={inputClassName()} /></label>
                      <label className="space-y-1"><span className="text-xs font-medium text-slate-600">Notes</span><input value={item.notes} onChange={(e) => updateInstallment(index, "notes", e.target.value)} className={inputClassName()} /></label>
                    </div>
                  </div>
                ))}
                {form.installments.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-500">No installments added.</div>}
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-5"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">{saving && <LoaderCircle className="h-4 w-4 animate-spin" />}{editing ? "Save Fee Plan" : "Create Fee Plan"}</button></div>
          </form>
        </div>
      </div>
    </div>
  );
}

function ComparisonPanel({
  programs,
  onRemove,
  onClear,
}: {
  programs: Program[];
  onRemove: (programId: string) => void;
  onClear: () => void;
}) {
  if (programs.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">
            Course Comparison
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Compare the selected offerings using
            the information actually stored in
            the academic master data.
          </p>
        </div>

        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {programs.map((program) => {
          const minimumFee =
            getMinimumDisplayedFee(
              program,
            );

          return (
            <div
              key={program.id}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">
                    {program.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {program.institution_name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onRemove(
                      program.id,
                    )
                  }
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label={`Remove ${program.name} from comparison`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">
                    Mode
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-700">
                    {program.study_mode_display ||
                      program.study_mode ||
                      "—"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">
                    Duration
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-700">
                    {formatDuration(
                      program,
                    )}
                  </p>
                </div>

                <div className="col-span-2">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400">
                    Listed From
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {minimumFee === null
                      ? "Not specified"
                      : formatMoney(
                          minimumFee,
                        )}
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {getActiveFeePlans(
                  program,
                ).map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-lg bg-slate-50 p-3"
                  >
                    <div className="flex justify-between gap-3 text-xs">
                      <span className="text-slate-600">
                        {plan.name}
                      </span>

                      <span className="font-semibold text-slate-900">
                        {formatMoney(
                          plan.student_total_fee,
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function UniversitiesWorkspace() {
  const { hasRole } = useAuth();

  const canManage = hasRole(
    ...MANAGEMENT_ROLES,
  );

  const canView = hasRole(
    ...MANAGEMENT_ROLES,
    "TELECALLER",
    "COUNSELOR",
  );

  const [institutions, setInstitutions] =
    useState<Institution[]>([]);

  const [programs, setPrograms] =
    useState<Program[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [programLoading, setProgramLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [courseSearch, setCourseSearch] =
    useState("");

  const [activeFilter, setActiveFilter] =
    useState<
      "all" | "active" | "inactive"
    >("active");

  const [expandedInstitutions, setExpandedInstitutions] =
    useState<Set<string>>(
      new Set(),
    );

  const [selectedPrograms, setSelectedPrograms] =
    useState<Set<string>>(
      new Set(),
    );

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [showForm, setShowForm] =
    useState(false);

  const [form, setForm] =
    useState<InstitutionManagementPayload>(
      EMPTY_FORM,
    );

  const [programModal, setProgramModal] = useState<{
    mode: "create" | "edit";
    programId: string | null;
    initial: ProgramManagementPayload;
  } | null>(null);

  const [feePlanModal, setFeePlanModal] = useState<{
    mode: "create" | "edit";
    programId: string;
    feePlanId: string | null;
    initial: ProgramFeePlanManagementPayload;
  } | null>(null);

  const [managementSaving, setManagementSaving] = useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const loadInstitutions =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const data =
          await getManagedInstitutions({
            active:
              activeFilter === "all"
                ? undefined
                : activeFilter === "active",
            search:
              search.trim() || undefined,
          });

        setInstitutions(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load universities.",
        );
      } finally {
        setLoading(false);
      }
    }, [activeFilter, search]);

  const loadPrograms =
    useCallback(async () => {
      setProgramLoading(true);

      try {
        const data =
          await getPrograms(
            undefined,
            {
              active: true,
              search:
                courseSearch.trim() ||
                undefined,
            },
          );

        setPrograms(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load academic courses.",
        );
      } finally {
        setProgramLoading(false);
      }
    }, [courseSearch]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        void loadInstitutions();
      },
      250,
    );

    return () =>
      window.clearTimeout(timer);
  }, [loadInstitutions]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => {
        void loadPrograms();
      },
      250,
    );

    return () =>
      window.clearTimeout(timer);
  }, [loadPrograms]);

  const programsByInstitution =
    useMemo(() => {
      const grouped =
        new Map<
          string,
          Program[]
        >();

      programs.forEach(
        (program) => {
          const existing =
            grouped.get(
              program.institution,
            ) ?? [];

          existing.push(program);

          grouped.set(
            program.institution,
            existing,
          );
        },
      );

      return grouped;
    }, [programs]);

  const visibleInstitutions =
    useMemo(() => {
      if (!courseSearch.trim()) {
        return institutions;
      }

      const matchingInstitutionIds =
        new Set(
          programs.map(
            (program) =>
              program.institution,
          ),
        );

      return institutions.filter(
        (institution) =>
          matchingInstitutionIds.has(
            institution.id,
          ),
      );
    }, [
      courseSearch,
      institutions,
      programs,
    ]);

  const comparisonPrograms =
    useMemo(
      () =>
        programs.filter((program) =>
          selectedPrograms.has(
            program.id,
          ),
        ),
      [programs, selectedPrograms],
    );

  const totalActivePrograms =
    programs.length;

  const totalFeePlans =
    programs.reduce(
      (total, program) =>
        total +
        getActiveFeePlans(program)
          .length,
      0,
    );

  function toggleInstitution(
    institutionId: string,
  ) {
    setExpandedInstitutions(
      (current) => {
        const next = new Set(current);

        if (next.has(institutionId)) {
          next.delete(institutionId);
        } else {
          next.add(institutionId);
        }

        return next;
      },
    );
  }

  function toggleProgramSelection(
    programId: string,
  ) {
    setSelectedPrograms(
      (current) => {
        const next = new Set(current);

        if (next.has(programId)) {
          next.delete(programId);
        } else {
          if (next.size >= 6) {
            return current;
          }

          next.add(programId);
        }

        return next;
      },
    );
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(
    institution: Institution,
  ) {
    setEditingId(institution.id);

    setForm({
      name: institution.name,
      short_name: institution.short_name,
      code: institution.code,
      state: institution.state,
      city: institution.city,
      website: institution.website,
      contact_person:
        institution.contact_person,
      contact_phone:
        institution.contact_phone,
      contact_email:
        institution.contact_email,
      is_active: institution.is_active,
      notes: institution.notes,
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function updateField(
    field: keyof InstitutionManagementPayload,
    value: string | boolean,
  ) {
    setForm((current: InstitutionManagementPayload) => ({
  ...current,
  [field]: value,
  }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!canManage) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        short_name:
          form.short_name?.trim() || "",
        code: form.code
          .trim()
          .toUpperCase(),
        state: form.state?.trim() || "",
        city: form.city?.trim() || "",
        website:
          form.website?.trim() || "",
        contact_person:
          form.contact_person?.trim() ||
          "",
        contact_phone:
          form.contact_phone?.trim() ||
          "",
        contact_email:
          form.contact_email?.trim() ||
          "",
        notes: form.notes?.trim() || "",
      };

      if (editingId) {
        await updateInstitution(
          editingId,
          payload,
        );

        setSuccess(
          "University updated successfully.",
        );
      } else {
        await createInstitution(
          payload,
        );

        setSuccess(
          "University created successfully.",
        );
      }

      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);

      await loadInstitutions();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save university.",
      );
    } finally {
      setSaving(false);
    }
  }

  function openCreateProgram(institutionId: string) {
    if (!canManage) return;
    setError("");
    setSuccess("");
    setProgramModal({ mode: "create", programId: null, initial: { institution: institutionId, name: "", code: "", level: "", duration_years: null, duration_semesters: null, study_mode: "", specialization: "", eligibility_text: "", minimum_qualification: "", required_stream: "", eligibility_review_required: false, is_credit_transfer_available: false, is_active: true, notes: "" } });
  }

  function openEditProgram(program: Program) {
    if (!canManage) return;
    setError("");
    setSuccess("");
    setProgramModal({ mode: "edit", programId: program.id, initial: { institution: program.institution, name: program.name, code: program.code, level: program.level, duration_years: program.duration_years, duration_semesters: program.duration_semesters, study_mode: program.study_mode, specialization: program.specialization, eligibility_text: program.eligibility_text, minimum_qualification: program.minimum_qualification, required_stream: program.required_stream, eligibility_review_required: program.eligibility_review_required, is_credit_transfer_available: program.is_credit_transfer_available, is_active: program.is_active, notes: program.notes } });
  }

  function openCreateFeePlan(programId: string) {
    if (!canManage) return;
    setError("");
    setSuccess("");
    setFeePlanModal({ mode: "create", programId, feePlanId: null, initial: { program: programId, name: "", student_total_fee: "", registration_fee: "", exam_fee: "", other_fee: "", is_active: true, notes: "", installments: [] } });
  }

  function openEditFeePlan(program: Program, plan: ProgramFeePlan) {
    if (!canManage) return;
    setError("");
    setSuccess("");
    setFeePlanModal({ mode: "edit", programId: program.id, feePlanId: plan.id, initial: { program: program.id, name: plan.name, student_total_fee: plan.student_total_fee, registration_fee: plan.registration_fee, exam_fee: plan.exam_fee, other_fee: plan.other_fee, is_active: plan.is_active, notes: plan.notes, installments: plan.installments.map((item) => ({ installment_number: item.installment_number, label: item.label, amount: item.amount, due_stage: item.due_stage, notes: item.notes })) } });
  }

  async function saveProgram(payload: ProgramManagementPayload) {
    if (!canManage) return;
    setManagementSaving(true);
    setError("");
    setSuccess("");
    try {
      if (programModal?.mode === "edit" && programModal.programId) {
        await updateProgram(programModal.programId, payload);
        setSuccess("Course updated successfully.");
      } else {
        await createProgram(payload);
        setSuccess("Course created successfully.");
      }
      setProgramModal(null);
      await loadPrograms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save course.");
    } finally {
      setManagementSaving(false);
    }
  }

  async function saveFeePlan(payload: ProgramFeePlanManagementPayload) {
    if (!canManage) return;
    setManagementSaving(true);
    setError("");
    setSuccess("");
    try {
      if (feePlanModal?.mode === "edit" && feePlanModal.feePlanId) {
        await updateFeePlan(feePlanModal.feePlanId, payload);
        setSuccess("Fee plan updated successfully.");
      } else {
        await createFeePlan(payload);
        setSuccess("Fee plan created successfully.");
      }
      setFeePlanModal(null);
      await loadPrograms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save fee plan.");
    } finally {
      setManagementSaving(false);
    }
  }

  async function setProgramVerification(programId: string, dataStatus: string) {
    if (!canManage) return;
    setManagementSaving(true);
    setError("");
    setSuccess("");
    try {
      await verifyProgram(programId, { data_status: dataStatus });
      setSuccess("Course verification status updated.");
      await loadPrograms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update course verification.");
    } finally {
      setManagementSaving(false);
    }
  }

  async function setFeePlanVerification(feePlanId: string, dataStatus: string) {
    if (!canManage) return;
    setManagementSaving(true);
    setError("");
    setSuccess("");
    try {
      await verifyFeePlan(feePlanId, { data_status: dataStatus });
      setSuccess("Fee plan verification status updated.");
      await loadPrograms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update fee plan verification.");
    } finally {
      setManagementSaving(false);
    }
  }

  async function toggleActive(
    institution: Institution,
  ) {
    if (!canManage) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await updateInstitution(
        institution.id,
        {
          is_active:
            !institution.is_active,
        },
      );

      setSuccess(
        institution.is_active
          ? "University deactivated."
          : "University activated.",
      );

      await loadInstitutions();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update university.",
      );
    }
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <XCircle className="mx-auto h-10 w-10 text-slate-400" />

        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Access unavailable
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          You do not have permission to
          view academic master data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ============================================================
          HEADER
          ============================================================ */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-2.5">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                Universities & Academic Catalogue
              </h1>

              <p className="mt-1 max-w-3xl text-sm text-slate-500">
                Search universities, courses,
                study modes, durations, fee
                plans and installment schedules
                from the academic master data.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void loadInstitutions();
              void loadPrograms();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw
              className={[
                "h-4 w-4",
                loading ||
                programLoading
                  ? "animate-spin"
                  : "",
              ].join(" ")}
            />
            Refresh
          </button>

          {canManage && (
            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Add University
            </button>
          )}
        </div>
      </div>

      {/* ============================================================
          MESSAGES
          ============================================================ */}

      {success && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* ============================================================
          SUMMARY
          ============================================================ */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
              Universities
            </p>
            <Building2 className="h-4 w-4 text-slate-300" />
          </div>

          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {institutions.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
              Courses
            </p>
            <BookOpen className="h-4 w-4 text-blue-300" />
          </div>

          <p className="mt-3 text-3xl font-semibold text-blue-600">
            {totalActivePrograms}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
              Active Fee Plans
            </p>
            <IndianRupee className="h-4 w-4 text-emerald-300" />
          </div>

          <p className="mt-3 text-3xl font-semibold text-emerald-600">
            {totalFeePlans}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
              Access
            </p>
            <CheckCircle2 className="h-4 w-4 text-slate-300" />
          </div>

          <p className="mt-3 text-lg font-semibold text-slate-950">
            {canManage
              ? "Management"
              : "Read only"}
          </p>
        </div>
      </div>

      {/* ============================================================
          SEARCH
          ============================================================ */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search university, code, city or state..."
              className={`${inputClassName()} pl-9`}
            />
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-400" />

            <input
              value={courseSearch}
              onChange={(event) =>
                setCourseSearch(
                  event.target.value,
                )
              }
              placeholder="Search courses across all universities..."
              className={`${inputClassName()} pl-9`}
            />
          </div>

          <select
            value={activeFilter}
            onChange={(event) =>
              setActiveFilter(
                event.target.value as
                  | "all"
                  | "active"
                  | "inactive",
              )
            }
            className={`${inputClassName()} lg:w-44`}
          >
            <option value="active">
              Active
            </option>

            <option value="inactive">
              Inactive
            </option>

            <option value="all">
              All
            </option>
          </select>
        </div>

        {courseSearch.trim() && (
          <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
            Showing universities that contain
            matching courses for{" "}
            <strong>
              {courseSearch.trim()}
            </strong>
            .
          </div>
        )}
      </div>

      {/* ============================================================
          COMPARISON
          ============================================================ */}

      <ComparisonPanel
        programs={comparisonPrograms}
        onRemove={(programId) =>
          toggleProgramSelection(
            programId,
          )
        }
        onClear={() =>
          setSelectedPrograms(
            new Set(),
          )
        }
      />

      {/* ============================================================
          UNIVERSITY MANAGEMENT FORM
          ============================================================ */}

      {showForm && canManage && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-blue-100 bg-blue-50/40 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                {editingId
                  ? "Edit University"
                  : "Add University"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Enter the institution details
                used throughout BEOIS.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-white"
            >
              Cancel
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                University Name *
              </span>

              <input
                required
                value={form.name}
                onChange={(event) =>
                  updateField(
                    "name",
                    event.target.value,
                  )
                }
                className={inputClassName()}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Short Name
              </span>

              <input
                value={
                  form.short_name ?? ""
                }
                onChange={(event) =>
                  updateField(
                    "short_name",
                    event.target.value,
                  )
                }
                className={inputClassName()}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                University Code *
              </span>

              <input
                required
                value={form.code}
                onChange={(event) =>
                  updateField(
                    "code",
                    event.target.value,
                  )
                }
                className={inputClassName()}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Website
              </span>

              <input
                type="url"
                value={
                  form.website ?? ""
                }
                onChange={(event) =>
                  updateField(
                    "website",
                    event.target.value,
                  )
                }
                className={inputClassName()}
                placeholder="https://example.edu"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                State
              </span>

              <input
                value={form.state ?? ""}
                onChange={(event) =>
                  updateField(
                    "state",
                    event.target.value,
                  )
                }
                className={inputClassName()}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                City
              </span>

              <input
                value={form.city ?? ""}
                onChange={(event) =>
                  updateField(
                    "city",
                    event.target.value,
                  )
                }
                className={inputClassName()}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Contact Person
              </span>

              <input
                value={
                  form.contact_person ?? ""
                }
                onChange={(event) =>
                  updateField(
                    "contact_person",
                    event.target.value,
                  )
                }
                className={inputClassName()}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Contact Phone
              </span>

              <input
                value={
                  form.contact_phone ?? ""
                }
                onChange={(event) =>
                  updateField(
                    "contact_phone",
                    event.target.value,
                  )
                }
                className={inputClassName()}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Contact Email
              </span>

              <input
                type="email"
                value={
                  form.contact_email ?? ""
                }
                onChange={(event) =>
                  updateField(
                    "contact_email",
                    event.target.value,
                  )
                }
                className={inputClassName()}
              />
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <input
                type="checkbox"
                checked={
                  form.is_active ?? true
                }
                onChange={(event) =>
                  updateField(
                    "is_active",
                    event.target.checked,
                  )
                }
                className="h-4 w-4 rounded border-slate-300"
              />

              <span className="text-sm font-medium text-slate-700">
                Active University
              </span>
            </label>

            <label className="space-y-1.5 md:col-span-2">
              <span className="text-sm font-medium text-slate-700">
                Notes
              </span>

              <textarea
                rows={3}
                value={form.notes ?? ""}
                onChange={(event) =>
                  updateField(
                    "notes",
                    event.target.value,
                  )
                }
                className={inputClassName()}
              />
            </label>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              )}

              {editingId
                ? "Save Changes"
                : "Create University"}
            </button>
          </div>
        </form>
      )}

      {/* ============================================================
          UNIVERSITY LIST
          ============================================================ */}

      <div className="space-y-3">
        {loading ? (
          <div className="flex min-h-56 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <LoaderCircle className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : visibleInstitutions.length ===
          0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Building2 className="mx-auto h-10 w-10 text-slate-300" />

            <h3 className="mt-4 text-sm font-semibold text-slate-900">
              No universities found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Try changing your university or
              course search.
            </p>
          </div>
        ) : (
          visibleInstitutions.map(
            (institution) => {
              const institutionPrograms =
                programsByInstitution.get(
                  institution.id,
                ) ?? [];

              const expanded =
                expandedInstitutions.has(
                  institution.id,
                );

              return (
                <div
                  key={institution.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  {/* UNIVERSITY HEADER */}

                  <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          toggleInstitution(
                            institution.id,
                          )
                        }
                        className="mt-1 rounded-lg bg-slate-100 p-1.5 text-slate-500 hover:bg-slate-200"
                        aria-label={
                          expanded
                            ? "Collapse university"
                            : "Expand university"
                        }
                      >
                        {expanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-semibold text-slate-950">
                            {institution.name}
                          </h2>

                          {institution.short_name && (
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
                              {
                                institution.short_name
                              }
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="font-medium text-slate-600">
                            {institution.code}
                          </span>

                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {[
                              institution.city,
                              institution.state,
                            ]
                              .filter(
                                Boolean,
                              )
                              .join(
                                ", ",
                              ) ||
                              "Location not specified"}
                          </span>

                          <span className="inline-flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5" />
                            {
                              institutionPrograms.length
                            }{" "}
                            courses
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {institution.is_active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                          <XCircle className="h-3.5 w-3.5" />
                          Inactive
                        </span>
                      )}

                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              openEditForm(
                                institution,
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              void toggleActive(
                                institution,
                              )
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            {institution.is_active
                              ? "Deactivate"
                              : "Activate"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* COURSE AREA */}

                  {expanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-5">
                      {programLoading ? (
                        <div className="flex items-center justify-center py-10">
                          <LoaderCircle className="h-5 w-5 animate-spin text-slate-400" />
                        </div>
                      ) : institutionPrograms.length ===
                        0 ? (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
                          <GraduationCap className="mx-auto h-8 w-8 text-slate-300" />

                          <p className="mt-3 text-sm font-medium text-slate-700">
                            No matching courses
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            No active course is
                            available for this
                            university using the
                            current search.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <h3 className="text-sm font-semibold text-slate-900">
                                Academic Programmes
                              </h3>

                              <p className="mt-1 text-xs text-slate-500">
                                Expand a course to
                                view eligibility,
                                fees and installments.
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {canManage && (
                                <button type="button" onClick={() => openCreateProgram(institution.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800">
                                  <Plus className="h-3.5 w-3.5" />
                                  Add Course
                                </button>
                              )}
                              <span className="text-xs font-medium text-slate-400">
                                {institutionPrograms.length} course{institutionPrograms.length === 1 ? "" : "s"}
                              </span>
                            </div>
                          </div>

                          {institutionPrograms.map(
                            (program) => (
                              <ProgramCard
                                key={program.id}
                                program={program}
                                selected={selectedPrograms.has(program.id)}
                                onSelect={() => toggleProgramSelection(program.id)}
                                canManage={canManage}
                                onEdit={() => openEditProgram(program)}
                                onAddFeePlan={() => openCreateFeePlan(program.id)}
                                onEditFeePlan={(plan) => openEditFeePlan(program, plan)}
                                onVerify={(status) => void setProgramVerification(program.id, status)}
                                onVerifyFeePlan={(plan, status) => void setFeePlanVerification(plan.id, status)}
                              />
                            ),
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            },
          )
        )}
      </div>

      {programModal && canManage && (
        <ProgramManagementModal
          initial={programModal.initial}
          institutions={institutions}
          editing={programModal.mode === "edit"}
          saving={managementSaving}
          onClose={() => { if (!managementSaving) setProgramModal(null); }}
          onSave={saveProgram}
        />
      )}

      {feePlanModal && canManage && (() => {
        const modalProgram = programs.find((program) => program.id === feePlanModal.programId);
        if (!modalProgram) return null;
        return (
          <FeePlanManagementModal
            initial={feePlanModal.initial}
            program={modalProgram}
            editing={feePlanModal.mode === "edit"}
            saving={managementSaving}
            onClose={() => { if (!managementSaving) setFeePlanModal(null); }}
            onSave={saveFeePlan}
          />
        );
      })()}

      {/* ============================================================
          COMPARISON LIMIT
          ============================================================ */}

      {selectedPrograms.size >= 6 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          You can compare up to 6 course
          offerings at a time. Remove one from
          the comparison panel to select another.
        </div>
      )}
    </div>
  );
}