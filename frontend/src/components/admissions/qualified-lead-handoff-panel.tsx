"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ArrowRight,
  CheckCircle2,
  GraduationCap,
  LoaderCircle,
  RefreshCw,
  Search,
  UserRound,
  WalletCards,
} from "lucide-react";

import {
  convertLeadToAdmission,
  getQualifiedLeadHandoffs,
} from "@/lib/api/admissions";

import type {
  AdmissionChannel,
  AdmissionDetail,
  AdmissionVertical,
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

function formatMoney(
  value: string | null | undefined,
) {
  if (!value) {
    return "Not recorded";
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return value;
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    },
  ).format(parsed);
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
    academicSession,
    setAcademicSession,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

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

        setSelectedLead(
          (current) => {
            if (!current) {
              return null;
            }

            return (
              data.find(
                (item) =>
                  item.id === current.id,
              ) ?? null
            );
          },
        );
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
    ]);

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        void loadLeads();
      }, 250);

    return () =>
      window.clearTimeout(timer);
  }, [loadLeads]);

  function chooseLead(
    lead: QualifiedLeadHandoff,
  ) {
    setSelectedLead(lead);
    setAcademicSession("");
    setError("");
    setSuccess("");
  }

  async function handleConvert() {
    if (!selectedLead) {
      return;
    }

    const qualification =
      selectedLead.qualification;

    if (
      !qualification
      || qualification.eligibility_status
        !== "ELIGIBLE"
      || !qualification.selected_institution
      || !qualification.selected_program
    ) {
      setError(
        "This handoff does not contain a complete eligible counselling selection.",
      );
      return;
    }

    const confirmed =
      window.confirm(
        [
          `Convert ${selectedLead.lead_id} to an admission?`,
          "",
          `Applicant: ${selectedLead.name}`,
          `Institution: ${qualification.selected_institution_name || "—"}`,
          `Program: ${qualification.selected_program_name || "—"}`,
          `Quoted fee: ${formatMoney(qualification.quoted_fee)}`,
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
          academic_session:
            academicSession.trim(),
        });

      setSuccess(
        `${selectedLead.lead_id} converted successfully to ${admission.admission_id}.`,
      );

      setSelectedLead(null);
      setAcademicSession("");

      await loadLeads();
      await onConverted(admission);
    } catch {
      setError(
        "Lead conversion failed. Confirm that the counselling selection is still eligible and that you have permission to perform the handoff.",
      );
    } finally {
      setConverting(false);
    }
  }

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
            Review the Telecaller&apos;s
            qualified counselling selection.
            Institution and program carry
            forward automatically.
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
                  No qualified leads waiting
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  New handoffs will appear
                  here after Telecaller
                  qualification.
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
                    {lead.qualification
                      ?.selected_program_name
                      || lead.interested_course
                      || "Course not specified"}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {lead.vertical_display}
                    </span>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                      {lead.channel_display}
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
                The institution, program and
                qualification selected during
                Telecalling will be carried
                into Admissions automatically.
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
                  {selectedLead.phone_number}
                </p>
              </div>

              <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs text-slate-400">
                    Qualification
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {selectedLead.qualification
                      ?.highest_qualification_display
                      || "—"}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400">
                    Stream
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {selectedLead.qualification
                      ?.stream
                      || "—"}
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
                    Eligibility
                  </div>
                  <div className="mt-1 text-sm font-medium text-emerald-700">
                    {selectedLead.qualification
                      ?.eligibility_status_display
                      || "—"}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-700">
                  <GraduationCap size={16} />
                  Telecaller Selection
                </div>

                <div className="mt-3 text-sm font-semibold text-slate-950">
                  {selectedLead.qualification
                    ?.selected_program_name
                    || "No program selected"}
                </div>

                <div className="mt-1 text-xs text-slate-600">
                  {selectedLead.qualification
                    ?.selected_institution_name
                    || "No institution selected"}
                </div>

                {selectedLead.qualification
                  ?.selected_program_code && (
                  <div className="mt-1 text-[11px] text-slate-500">
                    Program code: {selectedLead.qualification.selected_program_code}
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-blue-800">
                  <WalletCards size={16} />
                  Quoted fee: {formatMoney(
                    selectedLead.qualification
                      ?.quoted_fee,
                  )}
                </div>
              </div>

              {selectedLead.qualification
                ?.eligibility_notes && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-xs leading-5 text-emerald-800">
                  {selectedLead.qualification.eligibility_notes}
                </div>
              )}

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
                  No course re-entry required
                </div>

                <div className="mt-2 text-xs leading-5 text-blue-700">
                  Admissions will use the
                  institution and program
                  already approved during
                  Telecaller counselling.
                </div>
              </div>

              <button
                type="button"
                disabled={
                  converting
                  || !selectedLead.qualification
                  || selectedLead.qualification
                    .eligibility_status
                    !== "ELIGIBLE"
                  || !selectedLead.qualification
                    .selected_institution
                  || !selectedLead.qualification
                    .selected_program
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
