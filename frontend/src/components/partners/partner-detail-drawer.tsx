"use client";

import {
  Activity,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileText,
  Loader2,
  MapPin,
  MessageSquarePlus,
  Phone,
  RefreshCw,
  ShieldCheck,
  Upload,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  addPartnerDocument,
  addPartnerNote,
  changePartnerStatus,
  getPartner,
  getPartnerActivities,
  getPartnerDocuments,
  rejectPartnerDocument,
  verifyPartnerDocument,
} from "@/lib/api/partners";

import type {
  PartnerActivity,
  PartnerDetail,
  PartnerDocument,
  PartnerDocumentType,
  PartnerStatus,
} from "@/types/partners";
import { PartnerCommissionsPanel } from "@/components/partners/partner-commissions";
import {
  PartnerProgramAccessPanel,
} from "@/components/partners/partner-program-access";

import {
  PartnerCasesPanel,
} from "@/components/partners/partner-cases";

import {
  PartnerIssuesPanel,
} from "@/components/partners/partner-issues";

interface PartnerDetailDrawerProps {
  partnerId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}

type DetailTab =
  | "OVERVIEW"
  | "ACTIVITY"
  | "DOCUMENTS"
  | "PROGRAM_ACCESS"
  | "CASES"
  | "ISSUES"
  | "COMMISSIONS";

const STATUS_OPTIONS: Array<{
  value: PartnerStatus;
  label: string;
}> = [
  {
    value: "PROSPECT",
    label: "Prospect",
  },
  {
    value: "ONBOARDING",
    label: "Onboarding",
  },
  {
    value: "ACTIVE",
    label: "Active",
  },
  {
    value: "ON_HOLD",
    label: "On Hold",
  },
  {
    value: "SUSPENDED",
    label: "Suspended",
  },
  {
    value: "INACTIVE",
    label: "Inactive",
  },
  {
    value: "TERMINATED",
    label: "Terminated",
  },
];

const DOCUMENT_TYPES: Array<{
  value: PartnerDocumentType;
  label: string;
}> = [
  {
    value: "AADHAAR",
    label: "Aadhaar",
  },
  {
    value: "PAN",
    label: "PAN",
  },
  {
    value: "GST",
    label: "GST",
  },
  {
    value: "BUSINESS_PROOF",
    label: "Business Proof",
  },
  {
    value: "ADDRESS_PROOF",
    label: "Address Proof",
  },
  {
    value: "BANK_PROOF",
    label: "Bank Proof",
  },
  {
    value: "AGREEMENT",
    label: "Agreement",
  },
  {
    value: "PHOTO",
    label: "Photo",
  },
  {
    value: "OTHER",
    label: "Other",
  },
];

function errorMessage(error: unknown) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return "Unable to complete the request.";
}

function formatDateTime(
  value: string | null | undefined,
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

function statusClass(status: string) {
  if (
    status === "ACTIVE" ||
    status === "VERIFIED"
  ) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (
    status === "REJECTED" ||
    status === "SUSPENDED" ||
    status === "TERMINATED"
  ) {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (
    status === "ONBOARDING" ||
    status === "RECEIVED"
  ) {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  return "bg-amber-50 text-amber-700 ring-amber-200";
}

export function PartnerDetailDrawer({
  partnerId,
  onClose,
  onChanged,
}: PartnerDetailDrawerProps) {
  const [partner, setPartner] =
    useState<PartnerDetail | null>(null);

  const [activities, setActivities] =
    useState<PartnerActivity[]>([]);

  const [documents, setDocuments] =
    useState<PartnerDocument[]>([]);

  const [tab, setTab] =
    useState<DetailTab>("OVERVIEW");

  const [loading, setLoading] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [selectedStatus, setSelectedStatus] =
    useState<PartnerStatus>("PROSPECT");

  const [statusNotes, setStatusNotes] =
    useState("");

  const [savingStatus, setSavingStatus] =
    useState(false);

  const [note, setNote] =
    useState("");

  const [savingNote, setSavingNote] =
    useState(false);

  const [documentType, setDocumentType] =
    useState<PartnerDocumentType>("AGREEMENT");

  const [documentTitle, setDocumentTitle] =
    useState("");

  const [documentNotes, setDocumentNotes] =
    useState("");

  const [documentFile, setDocumentFile] =
    useState<File | null>(null);

  const [uploading, setUploading] =
    useState(false);

  const [documentActionId, setDocumentActionId] =
    useState<string | null>(null);

  const loadPartner = useCallback(
    async (background = false) => {
      if (!partnerId) {
        return;
      }

      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const [
          partnerResult,
          activityResult,
          documentResult,
        ] = await Promise.all([
          getPartner(partnerId),
          getPartnerActivities(partnerId),
          getPartnerDocuments(partnerId),
        ]);

        setPartner(partnerResult);
        setSelectedStatus(
          partnerResult.status,
        );
        setActivities(activityResult);
        setDocuments(documentResult);
      } catch (requestError) {
        setError(
          errorMessage(requestError),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [partnerId],
  );

  useEffect(() => {
    if (!partnerId) {
      setPartner(null);
      setActivities([]);
      setDocuments([]);
      setTab("OVERVIEW");
      setError("");
      return;
    }

    void loadPartner();
  }, [partnerId, loadPartner]);

  if (!partnerId) {
    return null;
  }

  async function handleStatus(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!partner) {
      return;
    }

    setSavingStatus(true);
    setError("");

    try {
      const result =
        await changePartnerStatus(
          partner.id,
          {
            status: selectedStatus,
            notes: statusNotes.trim(),
          },
        );

      setPartner(result);
      setStatusNotes("");

      await loadPartner(true);

      onChanged?.();
    } catch (requestError) {
      setError(
        errorMessage(requestError),
      );
    } finally {
      setSavingStatus(false);
    }
  }

  async function handleNote(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (
      !partner ||
      !note.trim()
    ) {
      return;
    }

    setSavingNote(true);
    setError("");

    try {
      await addPartnerNote(
        partner.id,
        {
          description: note.trim(),
        },
      );

      setNote("");

      const result =
        await getPartnerActivities(
          partner.id,
        );

      setActivities(result);

      onChanged?.();
    } catch (requestError) {
      setError(
        errorMessage(requestError),
      );
    } finally {
      setSavingNote(false);
    }
  }

  async function handleDocumentUpload(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!partner) {
      return;
    }

    setUploading(true);
    setError("");

    try {
      await addPartnerDocument(
        partner.id,
        {
          document_type:
            documentType,
          title:
            documentTitle.trim(),
          file: documentFile,
          notes:
            documentNotes.trim(),
        },
      );

      setDocumentTitle("");
      setDocumentNotes("");
      setDocumentFile(null);

      const result =
        await getPartnerDocuments(
          partner.id,
        );

      setDocuments(result);

      const activityResult =
        await getPartnerActivities(
          partner.id,
        );

      setActivities(activityResult);

      onChanged?.();
    } catch (requestError) {
      setError(
        errorMessage(requestError),
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleVerify(
    document: PartnerDocument,
  ) {
    if (!partner) {
      return;
    }

    const notes =
      window.prompt(
        "Verification notes (optional):",
        "",
      );

    if (notes === null) {
      return;
    }

    setDocumentActionId(document.id);
    setError("");

    try {
      await verifyPartnerDocument(
        partner.id,
        document.id,
        notes,
      );

      await loadPartner(true);
      onChanged?.();
    } catch (requestError) {
      setError(
        errorMessage(requestError),
      );
    } finally {
      setDocumentActionId(null);
    }
  }

  async function handleReject(
    document: PartnerDocument,
  ) {
    if (!partner) {
      return;
    }

    const reason =
      window.prompt(
        "Enter rejection reason:",
        "",
      );

    if (
      reason === null ||
      !reason.trim()
    ) {
      return;
    }

    setDocumentActionId(document.id);
    setError("");

    try {
      await rejectPartnerDocument(
        partner.id,
        document.id,
        reason.trim(),
      );

      await loadPartner(true);
      onChanged?.();
    } catch (requestError) {
      setError(
        errorMessage(requestError),
      );
    } finally {
      setDocumentActionId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35">
      <div className="h-full w-full max-w-5xl overflow-y-auto bg-slate-50 shadow-2xl">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
          <div className="flex items-start justify-between gap-4 px-6 py-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-blue-700">
                  {partner?.partner_id ??
                    "Partner"}
                </p>

                {partner ? (
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusClass(
                      partner.status,
                    )}`}
                  >
                    {
                      partner.status_display
                    }
                  </span>
                ) : null}
              </div>

              <h2 className="mt-1 text-2xl font-bold text-slate-950">
                {partner?.name ??
                  "Loading partner..."}
              </h2>

              {partner ? (
                <p className="mt-1 text-sm text-slate-500">
                  {
                    partner.partner_type_display
                  }
                  {partner.organization_name
                    ? ` · ${partner.organization_name}`
                    : ""}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  void loadPartner(true)
                }
                disabled={refreshing}
                className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing
                      ? "animate-spin"
                      : ""
                  }`}
                />
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

          <nav className="flex overflow-x-auto px-6">
            <TabButton
              active={tab === "OVERVIEW"}
              onClick={() =>
                setTab("OVERVIEW")
              }
              icon={
                <Building2 className="h-4 w-4" />
              }
            >
              Overview
            </TabButton>

            <TabButton
              active={tab === "ACTIVITY"}
              onClick={() =>
                setTab("ACTIVITY")
              }
              icon={
                <Activity className="h-4 w-4" />
              }
            >
              Activity
            </TabButton>

            <TabButton
              active={tab === "DOCUMENTS"}
              onClick={() =>
                setTab("DOCUMENTS")
              }
              icon={
                <FileText className="h-4 w-4" />
              }
            >
              Documents
            </TabButton>
            <TabButton
              active={tab === "PROGRAM_ACCESS"}
              onClick={() =>
                setTab("PROGRAM_ACCESS")
              }
              icon={
                <BookOpen className="h-4 w-4" />
              }
            >
              Program Access
            </TabButton>

            <TabButton
              active={tab === "CASES"}
              onClick={() =>
                setTab("CASES")
              }
              icon={
                <BriefcaseBusiness className="h-4 w-4" />
              }
            >
              Cases
            </TabButton>
            <button
                type="button"
                onClick={() => setTab("COMMISSIONS")}
                className={
                  tab === "COMMISSIONS"
                    ? "rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white"
                    : "rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                }
              >
                Commissions
              </button>
            <TabButton
              active={tab === "ISSUES"}
              onClick={() =>
                setTab("ISSUES")
              }
              icon={
                <CircleAlert className="h-4 w-4" />
              }
            >
              Issues
            </TabButton>
          </nav>
        </header>

        <main className="p-6">
          {error ? (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          {loading && !partner ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-blue-700" />
            </div>
          ) : null}

          {partner &&
          tab === "OVERVIEW" ? (
            <div className="space-y-6">
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <InfoCard
                  icon={
                    <Phone className="h-5 w-5" />
                  }
                  label="Phone"
                  value={
                    partner.phone_number ||
                    "—"
                  }
                />

                <InfoCard
                  icon={
                    <UserRound className="h-5 w-5" />
                  }
                  label="Contact"
                  value={
                    partner.contact_person ||
                    "—"
                  }
                />

                <InfoCard
                  icon={
                    <MapPin className="h-5 w-5" />
                  }
                  label="Location"
                  value={
                    [
                      partner.city,
                      partner.district,
                      partner.state,
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"
                  }
                />

                <InfoCard
                  icon={
                    <ShieldCheck className="h-5 w-5" />
                  }
                  label="Manager"
                  value={
                    partner
                      .relationship_manager
                      ?.username ?? "—"
                  }
                />
              </section>

              <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="text-lg font-bold text-slate-950">
                    Partner Profile
                  </h3>

                  <div className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
                    <Detail
                      label="Partner ID"
                      value={
                        partner.partner_id
                      }
                    />

                    <Detail
                      label="Type"
                      value={
                        partner.partner_type_display
                      }
                    />

                    <Detail
                      label="Organization"
                      value={
                        partner.organization_name ||
                        "—"
                      }
                    />

                    <Detail
                      label="Email"
                      value={
                        partner.email || "—"
                      }
                    />

                    <Detail
                      label="Alternate Phone"
                      value={
                        partner.alternate_phone ||
                        "—"
                      }
                    />

                    <Detail
                      label="Territory"
                      value={
                        partner.territory ||
                        "—"
                      }
                    />

                    <Detail
                      label="Postal Code"
                      value={
                        partner.postal_code ||
                        "—"
                      }
                    />

                    <Detail
                      label="Created"
                      value={formatDateTime(
                        partner.created_at,
                      )}
                    />
                  </div>

                  <div className="mt-5 border-t border-slate-100 pt-5">
                    <Detail
                      label="Address"
                      value={
                        partner.address || "—"
                      }
                    />
                  </div>

                  <div className="mt-5 border-t border-slate-100 pt-5">
                    <Detail
                      label="Existing Notes"
                      value={
                        partner.notes || "—"
                      }
                    />
                  </div>
                </div>

                <form
                  onSubmit={handleStatus}
                  className="rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <h3 className="text-lg font-bold text-slate-950">
                    Status Management
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Update the operational
                    lifecycle of this partner.
                  </p>

                  <label className="mt-5 block">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Partner Status
                    </span>

                    <select
                      value={selectedStatus}
                      onChange={(event) =>
                        setSelectedStatus(
                          event.target
                            .value as PartnerStatus,
                        )
                      }
                      className={inputClass}
                    >
                      {STATUS_OPTIONS.map(
                        (option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label className="mt-4 block">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Change Notes
                    </span>

                    <textarea
                      value={statusNotes}
                      onChange={(event) =>
                        setStatusNotes(
                          event.target.value,
                        )
                      }
                      rows={4}
                      className={inputClass}
                      placeholder="Reason or context for this status change..."
                    />
                  </label>

                  <button
                    type="submit"
                    disabled={
                      savingStatus ||
                      selectedStatus ===
                        partner.status
                    }
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingStatus ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}

                    Update Status
                  </button>
                </form>
              </section>

              <form
                onSubmit={handleNote}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-center gap-2">
                  <MessageSquarePlus className="h-5 w-5 text-blue-700" />

                  <h3 className="text-lg font-bold text-slate-950">
                    Add Operational Note
                  </h3>
                </div>

                <textarea
                  value={note}
                  onChange={(event) =>
                    setNote(
                      event.target.value,
                    )
                  }
                  rows={3}
                  className={`${inputClass} mt-4`}
                  placeholder="Add a follow-up, discussion or operational note..."
                />

                <div className="mt-3 flex justify-end">
                  <button
                    type="submit"
                    disabled={
                      savingNote ||
                      !note.trim()
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
                  >
                    {savingNote ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquarePlus className="h-4 w-4" />
                    )}

                    Add Note
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {partner &&
          tab === "ACTIVITY" ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-bold text-slate-950">
                Partner Activity Timeline
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Operational changes and
                actions recorded for this
                partner.
              </p>

              <div className="mt-6 space-y-4">
                {activities.length === 0 ? (
                  <EmptyState
                    title="No activity yet"
                    description="Partner activity will appear here as actions are recorded."
                  />
                ) : (
                  activities.map(
                    (activity) => (
                      <div
                        key={activity.id}
                        className="flex gap-4 rounded-2xl border border-slate-100 p-4"
                      >
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                          <Activity className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold text-slate-900">
                              {
                                activity.activity_type_display
                              }
                            </p>

                            <span className="text-xs text-slate-500">
                              {formatDateTime(
                                activity.created_at,
                              )}
                            </span>
                          </div>

                          <p className="mt-1 text-sm text-slate-600">
                            {
                              activity.description
                            }
                          </p>

                          {activity.performed_by ? (
                            <p className="mt-2 text-xs font-medium text-slate-500">
                              By{" "}
                              {
                                activity
                                  .performed_by
                                  .username
                              }
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ),
                  )
                )}
              </div>
            </section>
          ) : null}

          {partner &&
          tab === "DOCUMENTS" ? (
            <div className="space-y-6">
              <form
                onSubmit={
                  handleDocumentUpload
                }
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-blue-700" />

                  <h3 className="text-lg font-bold text-slate-950">
                    Add Partner Document
                  </h3>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Document Type
                    </span>

                    <select
                      value={documentType}
                      onChange={(event) =>
                        setDocumentType(
                          event.target
                            .value as PartnerDocumentType,
                        )
                      }
                      className={inputClass}
                    >
                      {DOCUMENT_TYPES.map(
                        (option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Title
                    </span>

                    <input
                      value={documentTitle}
                      onChange={(event) =>
                        setDocumentTitle(
                          event.target.value,
                        )
                      }
                      className={inputClass}
                      placeholder="Document title"
                    />
                  </label>

                  <label className="md:col-span-2">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      File
                    </span>

                    <input
                      type="file"
                      onChange={(event) =>
                        setDocumentFile(
                          event.target
                            .files?.[0] ??
                            null,
                        )
                      }
                      className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700"
                    />
                  </label>

                  <label className="md:col-span-2">
                    <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                      Notes
                    </span>

                    <textarea
                      value={documentNotes}
                      onChange={(event) =>
                        setDocumentNotes(
                          event.target.value,
                        )
                      }
                      rows={3}
                      className={inputClass}
                      placeholder="Optional document notes..."
                    />
                  </label>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}

                    Add Document
                  </button>
                </div>
              </form>

              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h3 className="text-lg font-bold text-slate-950">
                  Partner Documents
                </h3>

                <div className="mt-5 space-y-3">
                  {documents.length === 0 ? (
                    <EmptyState
                      title="No documents"
                      description="Documents added for this partner will appear here."
                    />
                  ) : (
                    documents.map(
                      (document) => (
                        <div
                          key={document.id}
                          className="rounded-2xl border border-slate-200 p-4"
                        >
                          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-bold text-slate-900">
                                  {document.title ||
                                    document.document_type_display}
                                </p>

                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusClass(
                                    document.status,
                                  )}`}
                                >
                                  {
                                    document.status_display
                                  }
                                </span>
                              </div>

                              <p className="mt-1 text-sm text-slate-500">
                                {
                                  document.document_type_display
                                }{" "}
                                ·{" "}
                                {formatDateTime(
                                  document.created_at,
                                )}
                              </p>

                              {document.rejection_reason ? (
                                <p className="mt-2 text-sm font-medium text-red-600">
                                  Rejection:{" "}
                                  {
                                    document.rejection_reason
                                  }
                                </p>
                              ) : null}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {document.file ? (
                                <a
                                  href={
                                    document.file
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                  Open File
                                </a>
                              ) : null}

                              {document.status !==
                              "VERIFIED" ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleVerify(
                                      document,
                                    )
                                  }
                                  disabled={
                                    documentActionId ===
                                    document.id
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Verify
                                </button>
                              ) : null}

                              {document.status !==
                              "REJECTED" ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleReject(
                                      document,
                                    )
                                  }
                                  disabled={
                                    documentActionId ===
                                    document.id
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Reject
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ),
                    )
                  )}
                </div>
              </section>
            </div>
            ) : null}

              {partner &&
              tab === "PROGRAM_ACCESS" ? (
                <PartnerProgramAccessPanel
                  partnerId={partner.id}
                  onChanged={() => {
                    void loadPartner(true);
                    onChanged?.();
                  }}
                />
              ) : null}

              {partner &&
              tab === "CASES" ? (
                <PartnerCasesPanel
                  partnerId={partner.id}
                  onChanged={() => {
                    void loadPartner(true);
                    onChanged?.();
                  }}
                />
              ) : null}

              {partner &&
              tab === "ISSUES" ? (
                <PartnerIssuesPanel
                  partnerId={partner.id}
                  onChanged={() => {
                    void loadPartner(true);
                    onChanged?.();
                  }}
                />
              ) : null}
              {partner && tab === "COMMISSIONS" ? (
                <PartnerCommissionsPanel
                  partnerId={partner.id}
                  onChanged={() => {
                    void loadPartner(true);
                    onChanged?.();
                  }}
                />
              ) : null}
        </main>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
        active
          ? "border-blue-700 text-blue-700"
          : "border-transparent text-slate-500 hover:text-slate-900"
      }`}
    >
      {icon}
      {children}
    </button>
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

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center">
      <Clock3 className="mx-auto h-7 w-7 text-slate-400" />

      <p className="mt-3 font-semibold text-slate-800">
        {title}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}