"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";

import {
  convertLeadToAdmission,
  getInstitutions,
  getPrograms,
  getQualifiedLeadHandoffs,
} from "@/lib/api/admissions";

import type {
  AdmissionChannel,
  AdmissionDetail,
  AdmissionVertical,
  Institution,
  Program,
  QualifiedLeadHandoff,
} from "@/types/admissions";

function getUserName(
  user:
    | QualifiedLeadHandoff["assigned_to"],
) {
  if (!user) {
    return "Unassigned";
  }

  const name = [
    user.first_name,
    user.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || user.email;
}

export function QualifiedLeadHandoffPanel({
  onConverted,
}: {
  onConverted: (
    admission: AdmissionDetail,
  ) => Promise<void> | void;
}) {
  const [
    leads,
    setLeads,
  ] = useState<QualifiedLeadHandoff[]>(
    [],
  );

  const [
    institutions,
    setInstitutions,
  ] = useState<Institution[]>([]);

  const [
    programs,
    setPrograms,
  ] = useState<Program[]>([]);

  const [
    selectedLead,
    setSelectedLead,
  ] = useState<QualifiedLeadHandoff | null>(
    null,
  );

  const [search, setSearch] =
    useState("");

  const [
    vertical,
    setVertical,
  ] = useState<AdmissionVertical | "">(
    "",
  );

  const [
    channel,
    setChannel,
  ] = useState<AdmissionChannel | "">(
    "",
  );

  const [
    institutionId,
    setInstitutionId,
  ] = useState("");

  const [
    programId,
    setProgramId,
  ] = useState("");

  const [
    academicSession,
    setAcademicSession,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    programsLoading,
    setProgramsLoading,
  ] = useState(false);

  const [
    converting,
    setConverting,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const loadLeads =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const data =
          await getQualifiedLeadHandoffs({
            search: search.trim(),
            vertical,
            channel,
          });

        setLeads(data);

        if (selectedLead) {
          const stillAvailable =
            data.find(
              (item) =>
                item.id ===
                selectedLead.id,
            );

          if (!stillAvailable) {
            setSelectedLead(null);
          }
        }
      } catch {
        setError(
          "Unable to load qualified lead handoffs.",
        );
      } finally {
        setLoading(false);
      }
    }, [
      search,
      vertical,
      channel,
      selectedLead,
    ]);

  const loadInstitutions =
    useCallback(async () => {
      try {
        const data =
          await getInstitutions(true);

        setInstitutions(data);
      } catch {
        setError(
          "Unable to load institutions.",
        );
      }
    }, []);

  useEffect(() => {
    void loadInstitutions();
  }, [loadInstitutions]);

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        void loadLeads();
      }, 250);

    return () =>
      window.clearTimeout(timer);
  }, [loadLeads]);

  useEffect(() => {
    if (!institutionId) {
      setPrograms([]);
      setProgramId("");
      return;
    }

    let cancelled = false;

    async function loadPrograms() {
      setProgramsLoading(true);
      setProgramId("");

      try {
        const data =
          await getPrograms(
            institutionId,
            {
              active: true,

              creditTransfer:
                selectedLead?.vertical ===
                "CREDIT_TRANSFER"
                  ? true
                  : undefined,
            },
          );

        if (!cancelled) {
          setPrograms(data);
        }
      } catch {
        if (!cancelled) {
          setPrograms([]);
          setError(
            "Unable to load programs for the selected institution.",
          );
        }
      } finally {
        if (!cancelled) {
          setProgramsLoading(false);
        }
      }
    }

    void loadPrograms();

    return () => {
      cancelled = true;
    };
  }, [
    institutionId,
    selectedLead?.vertical,
  ]);

  function chooseLead(
    lead: QualifiedLeadHandoff,
  ) {
    setSelectedLead(lead);
    setInstitutionId("");
    setProgramId("");
    setAcademicSession("");
    setPrograms([]);
    setError("");
    setSuccess("");
  }

  async function handleConvert() {
    if (!selectedLead) {
      return;
    }

    if (!institutionId) {
      setError(
        "Select an institution before conversion.",
      );
      return;
    }

    if (!programId) {
      setError(
        "Select a program before conversion.",
      );
      return;
    }

    const institution =
      institutions.find(
        (item) =>
          item.id === institutionId,
      );

    const program =
      programs.find(
        (item) =>
          item.id === programId,
      );

    const confirmed =
      window.confirm(
        [
          `Convert ${selectedLead.lead_id} to an admission?`,
          "",
          `Applicant: ${selectedLead.name}`,
          `Institution: ${
            institution?.name ||
            "Selected institution"
          }`,
          `Program: ${
            program?.name ||
            "Selected program"
          }`,
        ].join("\n"),
      );

    if (!confirmed) {
      return;
    }

    setConverting(true);
    setError("");
    setSuccess("");

    try {
      const admission =
        await convertLeadToAdmission({
          lead_id: selectedLead.id,
          institution_id:
            institutionId,
          program_id: programId,
          academic_session:
            academicSession.trim(),
        });

      setSuccess(
        `${selectedLead.lead_id} converted successfully to ${admission.admission_id}.`,
      );

      setSelectedLead(null);
      setInstitutionId("");
      setProgramId("");
      setAcademicSession("");
      setPrograms([]);

      await loadLeads();
      await onConverted(admission);
    } catch {
      setError(
        "Lead conversion failed. Confirm that the lead is still qualified, the institution/program are valid, and you have permission to perform the handoff.",
      );
    } finally {
      setConverting(false);
    }
  }

  const selectedInstitution =
    useMemo(
      () =>
        institutions.find(
          (item) =>
            item.id === institutionId,
        ),
      [
        institutions,
        institutionId,
      ],
    );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
            Admissions Handoff
          </div>

          <h2 className="mt-1 text-xl font-semibold text-slate-950">
            Qualified Leads
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Review qualified telecalling
            leads and convert approved
            handoffs into admissions.
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() =>
            void loadLeads()
          }
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />
          Refresh Handoffs
        </button>
      </div>

      {error && (
        <div className="mx-5 mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mx-5 mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={17} />
          {success}
        </div>
      )}

      <div className="grid gap-3 border-b border-slate-200 p-5 md:grid-cols-3">
        <div className="relative">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search lead..."
            className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
          />
        </div>

        <select
          value={vertical}
          onChange={(event) =>
            setVertical(
              event.target.value as
                | AdmissionVertical
                | "",
            )
          }
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">
            All Verticals
          </option>
          <option value="REGULAR">
            Regular
          </option>
          <option value="CREDIT_TRANSFER">
            Credit Transfer
          </option>
        </select>

        <select
          value={channel}
          onChange={(event) =>
            setChannel(
              event.target.value as
                | AdmissionChannel
                | "",
            )
          }
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
        >
          <option value="">
            All Channels
          </option>
          <option value="DIRECT">
            Direct
          </option>
          <option value="PARTNER">
            Partner
          </option>
        </select>
      </div>

      <div className="grid xl:grid-cols-[1.15fr_0.85fr]">
        <div className="border-b border-slate-200 xl:border-b-0 xl:border-r">
          <div className="max-h-[620px] overflow-y-auto">
            {loading ? (
              <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500">
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
                Loading qualified leads...
              </div>
            ) : leads.length === 0 ? (
              <div className="p-10 text-center">
                <CheckCircle2
                  size={34}
                  className="mx-auto text-emerald-400"
                />

                <p className="mt-3 font-medium text-slate-800">
                  No qualified leads
                  waiting
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  New handoffs will appear
                  here when leads become
                  qualified.
                </p>
              </div>
            ) : (
              leads.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() =>
                    chooseLead(lead)
                  }
                  className={`block w-full border-b border-slate-100 p-5 text-left transition hover:bg-slate-50 ${
                    selectedLead?.id ===
                    lead.id
                      ? "bg-blue-50/70"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">
                        {lead.name}
                      </div>

                      <div className="mt-1 text-xs font-medium text-blue-700">
                        {lead.lead_id}
                      </div>
                    </div>

                    <ArrowRight
                      size={17}
                      className="mt-1 text-slate-400"
                    />
                  </div>

                  <div className="mt-3 text-sm text-slate-600">
                    {lead.phone_number}
                  </div>

                  <div className="mt-1 text-xs text-slate-500">
                    {lead.interested_course ||
                      "Course not specified"}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {
                        lead.vertical_display
                      }
                    </span>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {
                        lead.channel_display
                      }
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="p-5">
          {!selectedLead ? (
            <div className="flex min-h-80 flex-col items-center justify-center text-center">
              <UserRound
                size={38}
                className="text-slate-300"
              />

              <p className="mt-4 font-medium text-slate-700">
                Select a qualified lead
              </p>

              <p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">
                Review the handoff and
                choose the institution and
                program before creating the
                admission.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Handoff Review
                </div>

                <h3 className="mt-1 text-lg font-semibold text-slate-950">
                  {selectedLead.name}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedLead.lead_id}
                  {" • "}
                  {
                    selectedLead.phone_number
                  }
                </p>
              </div>

              <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-400">
                    Interested Course
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {selectedLead.interested_course ||
                      "—"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400">
                    Assigned Telecaller
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {getUserName(
                      selectedLead.assigned_to,
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400">
                    Source
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {selectedLead.source ||
                      "—"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400">
                    Campaign
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {selectedLead.campaign ||
                      "—"}
                  </div>
                </div>

                {selectedLead.channel ===
                  "PARTNER" && (
                  <div className="sm:col-span-2">
                    <div className="text-xs text-slate-400">
                      Partner
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-800">
                      {selectedLead.partner_name ||
                        selectedLead.partner_id ||
                        "—"}
                    </div>
                  </div>
                )}

                {selectedLead.vertical ===
                  "CREDIT_TRANSFER" && (
                  <div className="sm:col-span-2">
                    <div className="text-xs text-slate-400">
                      Previous Course
                    </div>
                    <div className="mt-1 text-sm font-medium text-slate-800">
                      {selectedLead.previous_course ||
                        "—"}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Institution
                </label>

                <select
                  value={institutionId}
                  onChange={(event) =>
                    setInstitutionId(
                      event.target.value,
                    )
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="">
                    Select institution
                  </option>

                  {institutions.map(
                    (item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Program
                </label>

                <select
                  value={programId}
                  disabled={
                    !institutionId ||
                    programsLoading
                  }
                  onChange={(event) =>
                    setProgramId(
                      event.target.value,
                    )
                  }
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50"
                >
                  <option value="">
                    {programsLoading
                      ? "Loading programs..."
                      : "Select program"}
                  </option>

                  {programs.map(
                    (item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                        {item.code
                          ? ` (${item.code})`
                          : ""}
                      </option>
                    ),
                  )}
                </select>

                {selectedLead.vertical ===
                  "CREDIT_TRANSFER" &&
                  institutionId &&
                  !programsLoading &&
                  programs.length === 0 && (
                    <p className="mt-2 text-xs text-amber-700">
                      No active
                      credit-transfer-enabled
                      programs are available
                      for this institution.
                    </p>
                  )}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Academic Session
                </label>

                <input
                  value={academicSession}
                  onChange={(event) =>
                    setAcademicSession(
                      event.target.value,
                    )
                  }
                  placeholder="Example: 2026-27"
                  maxLength={50}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                />
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                <div className="font-medium">
                  Conversion summary
                </div>

                <div className="mt-2 text-xs leading-5 text-blue-700">
                  {selectedInstitution
                    ? selectedInstitution.name
                    : "Choose an institution"}
                  {" • "}
                  {programs.find(
                    (item) =>
                      item.id === programId,
                  )?.name ||
                    "Choose a program"}
                </div>
              </div>

              <button
                type="button"
                disabled={
                  converting ||
                  !institutionId ||
                  !programId
                }
                onClick={() =>
                  void handleConvert()
                }
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {converting ? (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <ArrowRight size={17} />
                )}

                {converting
                  ? "Converting..."
                  : "Convert to Admission"}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}