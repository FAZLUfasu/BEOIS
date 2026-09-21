"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ArrowRight,
  BriefcaseBusiness,
  Loader2,
  Plus,
  RefreshCw,
  UserPlus,
} from "lucide-react";

import {
  getAdmissions,
  getInstitutions,
  getPrograms,
} from "@/lib/api/admissions";

import {
  changePartnerCaseStatus,
  createLeadFromPartnerCase,
  createPartnerCase,
  getPartnerCases,
  linkPartnerCaseAdmission,
} from "@/lib/api/partners";

import {
  getAssignableEmployees,
} from "@/lib/api/employees";

import type {
  AdmissionListItem,
  Institution,
  Program,
} from "@/types/admissions";

import type {
  EmployeeListItem,
} from "@/types/employees";

import type {
  PartnerCase,
  PartnerCaseStatus,
} from "@/types/partners";

interface PartnerCasesProps {
  partnerId: string;
  onChanged?: () => void;
}

const CASE_STATUSES: {
  value: PartnerCaseStatus;
  label: string;
}[] = [
  {
    value: "RECEIVED",
    label: "Received",
  },
  {
    value: "UNDER_REVIEW",
    label: "Under Review",
  },
  {
    value: "ADMISSION_CREATED",
    label: "Admission Created",
  },
  {
    value: "ENROLLED",
    label: "Enrolled",
  },
  {
    value: "COMPLETED",
    label: "Completed",
  },
  {
    value: "REJECTED",
    label: "Rejected",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
  },
];

export function PartnerCasesPanel({
  partnerId,
  onChanged,
}: PartnerCasesProps) {
  const [cases, setCases] = useState<
    PartnerCase[]
  >([]);

  const [institutions, setInstitutions] =
    useState<Institution[]>([]);

  const [programs, setPrograms] = useState<
    Program[]
  >([]);

  const [employees, setEmployees] = useState<
    EmployeeListItem[]
  >([]);

  const [admissions, setAdmissions] =
    useState<AdmissionListItem[]>([]);

  const [applicantName, setApplicantName] =
    useState("");

  const [phoneNumber, setPhoneNumber] =
    useState("");

  const [institutionId, setInstitutionId] =
    useState("");

  const [programId, setProgramId] =
    useState("");

  const [vertical, setVertical] = useState<
    "REGULAR" | "CREDIT_TRANSFER"
  >("REGULAR");

  const [
    partnerReferenceNumber,
    setPartnerReferenceNumber,
  ] = useState("");

  const [assignedToId, setAssignedToId] =
    useState("");

  const [notes, setNotes] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [programLoading, setProgramLoading] =
    useState(false);

  const [actionId, setActionId] = useState<
    string | null
  >(null);

  const [error, setError] = useState("");

  const loadCases = useCallback(async () => {
    try {
      setError("");

      const data =
        await getPartnerCases(partnerId);

      setCases(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load partner cases.",
      );
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  const loadReferenceData =
    useCallback(async () => {
      try {
        const [
          institutionData,
          employeeData,
          admissionData,
        ] = await Promise.all([
          getInstitutions(true),
          getAssignableEmployees(),
          getAdmissions({
            partner: partnerId,
            channel: "PARTNER",
          }),
        ]);

        setInstitutions(institutionData);
        setEmployees(employeeData);
        setAdmissions(admissionData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load case reference data.",
        );
      }
    }, [partnerId]);

  useEffect(() => {
    setLoading(true);
    void loadCases();
    void loadReferenceData();
  }, [loadCases, loadReferenceData]);

  useEffect(() => {
    if (!institutionId) {
      setPrograms([]);
      setProgramId("");
      return;
    }

    let active = true;

    async function loadPrograms() {
      try {
        setProgramLoading(true);
        setProgramId("");

        const data = await getPrograms(
          institutionId,
          {
            active: true,
          },
        );

        if (active) {
          setPrograms(data);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load programs.",
          );
        }
      } finally {
        if (active) {
          setProgramLoading(false);
        }
      }
    }

    void loadPrograms();

    return () => {
      active = false;
    };
  }, [institutionId]);

  async function handleCreate(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (
      !applicantName.trim() ||
      !phoneNumber.trim()
    ) {
      setError(
        "Applicant name and phone number are required.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      await createPartnerCase(partnerId, {
        applicant_name:
          applicantName.trim(),
        phone_number: phoneNumber.trim(),
        institution_id:
          institutionId || null,
        program_id: programId || null,
        vertical,
        partner_reference_number:
          partnerReferenceNumber.trim(),
        assigned_to_id:
          assignedToId || null,
        notes: notes.trim(),
      });

      setApplicantName("");
      setPhoneNumber("");
      setInstitutionId("");
      setProgramId("");
      setPrograms([]);
      setVertical("REGULAR");
      setPartnerReferenceNumber("");
      setAssignedToId("");
      setNotes("");

      await loadCases();
      onChanged?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create partner case.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(
    item: PartnerCase,
    status: PartnerCaseStatus,
  ) {
    if (status === item.status) {
      return;
    }

    try {
      setActionId(item.id);
      setError("");

      await changePartnerCaseStatus(
        partnerId,
        item.id,
        {
          status,
        },
      );

      await loadCases();
      onChanged?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to change case status.",
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleCreateLead(
    item: PartnerCase,
  ) {
    try {
      setActionId(item.id);
      setError("");

      const result =
        await createLeadFromPartnerCase(
          partnerId,
          item.id,
        );

      window.alert(
        `Lead created successfully: ${result.lead_id}`,
      );

      await loadCases();
      onChanged?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create lead from case.",
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleLinkAdmission(
    item: PartnerCase,
  ) {
    if (admissions.length === 0) {
      window.alert(
        "No partner admissions are currently available to link.",
      );
      return;
    }

    const options = admissions
      .map(
        (admission, index) =>
          `${index + 1}. ${admission.admission_id} - ${admission.applicant_name}`,
      )
      .join("\n");

    const answer = window.prompt(
      `Enter the number of the admission to link:\n\n${options}`,
    );

    if (!answer) {
      return;
    }

    const selectedIndex =
      Number(answer) - 1;

    const admission =
      admissions[selectedIndex];

    if (!admission) {
      window.alert(
        "Invalid admission selection.",
      );
      return;
    }

    try {
      setActionId(item.id);
      setError("");

      await linkPartnerCaseAdmission(
        partnerId,
        item.id,
        {
          admission_id: admission.id,
        },
      );

      await loadCases();
      await loadReferenceData();

      onChanged?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to link admission.",
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
            <BriefcaseBusiness className="h-5 w-5 text-blue-600" />

            <h3 className="font-semibold text-slate-950">
              Create Partner Case
            </h3>
          </div>

          <p className="mt-1 text-sm text-slate-500">
            Register a student enquiry or
            admission case received through
            this partner.
          </p>
        </div>

        <form
          onSubmit={handleCreate}
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Applicant Name">
              <input
                value={applicantName}
                onChange={(event) =>
                  setApplicantName(
                    event.target.value,
                  )
                }
                className={inputClass}
                placeholder="Student name"
              />
            </Field>

            <Field label="Phone Number">
              <input
                value={phoneNumber}
                onChange={(event) =>
                  setPhoneNumber(
                    event.target.value,
                  )
                }
                className={inputClass}
                placeholder="Phone number"
              />
            </Field>

            <Field label="Institution">
              <select
                value={institutionId}
                onChange={(event) =>
                  setInstitutionId(
                    event.target.value,
                  )
                }
                className={inputClass}
              >
                <option value="">
                  Not selected
                </option>

                {institutions.map(
                  (institution) => (
                    <option
                      key={institution.id}
                      value={institution.id}
                    >
                      {institution.name}
                    </option>
                  ),
                )}
              </select>
            </Field>

            <Field label="Program">
              <select
                value={programId}
                onChange={(event) =>
                  setProgramId(
                    event.target.value,
                  )
                }
                disabled={
                  !institutionId ||
                  programLoading
                }
                className={inputClass}
              >
                <option value="">
                  {programLoading
                    ? "Loading..."
                    : "Not selected"}
                </option>

                {programs.map((program) => (
                  <option
                    key={program.id}
                    value={program.id}
                  >
                    {program.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Vertical">
              <select
                value={vertical}
                onChange={(event) =>
                  setVertical(
                    event.target.value as
                      | "REGULAR"
                      | "CREDIT_TRANSFER",
                  )
                }
                className={inputClass}
              >
                <option value="REGULAR">
                  Regular
                </option>

                <option value="CREDIT_TRANSFER">
                  Credit Transfer
                </option>
              </select>
            </Field>

            <Field label="Partner Reference">
              <input
                value={
                  partnerReferenceNumber
                }
                onChange={(event) =>
                  setPartnerReferenceNumber(
                    event.target.value,
                  )
                }
                className={inputClass}
                placeholder="Optional reference"
              />
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

          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              rows={3}
              className={inputClass}
              placeholder="Case notes..."
            />
          </Field>

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

              Create Case
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h3 className="font-semibold text-slate-950">
              Partner Cases
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {cases.length} case
              {cases.length === 1 ? "" : "s"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadCases();
            }}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <LoadingState />
        ) : cases.length === 0 ? (
          <EmptyState text="No partner cases yet." />
        ) : (
          <div className="divide-y divide-slate-100">
            {cases.map((item) => (
              <div
                key={item.id}
                className="space-y-4 p-5"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-950">
                        {item.case_id}
                      </span>

                      <StatusBadge
                        text={
                          item.status_display
                        }
                      />
                    </div>

                    <div className="mt-2 font-medium text-slate-900">
                      {item.applicant_name}
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      {item.phone_number}
                    </div>

                    <div className="mt-2 text-sm text-slate-600">
                      {item.institution_name ||
                        "No institution"}
                      {" · "}
                      {item.program_name ||
                        "No program"}
                    </div>

                    <div className="mt-1 text-xs font-medium text-slate-500">
                      {item.vertical ===
                      "CREDIT_TRANSFER"
                        ? "Credit Transfer"
                        : "Regular"}
                    </div>

                    {item.admission ? (
                      <div className="mt-2 text-xs font-medium text-emerald-700">
                        Admission linked
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 sm:min-w-52">
                    <select
                      value={item.status}
                      disabled={
                        actionId === item.id
                      }
                      onChange={(event) =>
                        void handleStatus(
                          item,
                          event.target
                            .value as PartnerCaseStatus,
                        )
                      }
                      className={inputClass}
                    >
                      {CASE_STATUSES.map(
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

                    <button
                      type="button"
                      disabled={
                        actionId === item.id
                      }
                      onClick={() =>
                        void handleCreateLead(
                          item,
                        )
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <UserPlus className="h-4 w-4" />
                      Create Lead
                    </button>

                    {!item.admission ? (
                      <button
                        type="button"
                        disabled={
                          actionId === item.id
                        }
                        onClick={() =>
                          void handleLinkAdmission(
                            item,
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        <ArrowRight className="h-4 w-4" />
                        Link Admission
                      </button>
                    ) : null}
                  </div>
                </div>

                {item.notes ? (
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                    {item.notes}
                  </div>
                ) : null}
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
      Loading cases...
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

function StatusBadge({
  text,
}: {
  text: string;
}) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
      {text}
    </span>
  );
}