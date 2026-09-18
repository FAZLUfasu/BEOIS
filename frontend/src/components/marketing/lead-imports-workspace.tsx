"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  FileSpreadsheet,
  History,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  Upload,
  UsersRound,
  X,
} from "lucide-react";

import {
  confirmLeadImport,
  getLeadImportBatch,
  getLeadImportBatches,
  previewLeadImport,
} from "@/lib/api/lead-imports";

import type {
  LeadImportBatch,
  LeadImportBatchDetail,
  LeadImportRow,
  LeadImportRowStatus,
} from "@/types/lead-imports";

import type {
  LeadChannel,
  LeadVertical,
} from "@/types/leads";

type RowFilter =
  | "ALL"
  | LeadImportRowStatus;

function formatDateTime(
  value: string | null,
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function getErrorMessage(
  error: unknown,
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function statusClass(
  status: LeadImportRowStatus,
) {
  switch (status) {
    case "VALID":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "IMPORTED":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "DUPLICATE":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "INVALID":
      return "bg-red-50 text-red-700 ring-red-200";

    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
}

function batchStatusClass(
  status: string,
) {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";

    case "VALIDATED":
      return "bg-blue-50 text-blue-700 ring-blue-200";

    case "IMPORTING":
      return "bg-amber-50 text-amber-700 ring-amber-200";

    case "FAILED":
      return "bg-red-50 text-red-700 ring-red-200";

    default:
      return "bg-slate-50 text-slate-700 ring-slate-200";
  }
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?:
    | "default"
    | "success"
    | "warning"
    | "danger"
    | "info";
}) {
  const toneClass = {
    default:
      "bg-white border-slate-200",
    success:
      "bg-emerald-50/60 border-emerald-100",
    warning:
      "bg-amber-50/60 border-amber-100",
    danger:
      "bg-red-50/60 border-red-100",
    info:
      "bg-blue-50/60 border-blue-100",
  }[tone];

  return (
    <div
      className={`rounded-2xl border p-4 ${toneClass}`}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </div>
    </div>
  );
}

function RowStatusBadge({
  status,
}: {
  status: LeadImportRowStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${statusClass(
        status,
      )}`}
    >
      {status}
    </span>
  );
}

function BatchStatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${batchStatusClass(
        status,
      )}`}
    >
      {label || status}
    </span>
  );
}

export function LeadImportsWorkspace() {
  const [file, setFile] =
    useState<File | null>(null);

  const [source, setSource] =
    useState("");

  const [campaign, setCampaign] =
    useState("");

  const [
    defaultVertical,
    setDefaultVertical,
  ] = useState<LeadVertical>(
    "REGULAR",
  );

  const [
    defaultChannel,
    setDefaultChannel,
  ] = useState<LeadChannel>(
    "DIRECT",
  );

  const [
    preview,
    setPreview,
  ] =
    useState<LeadImportBatchDetail | null>(
      null,
    );

  const [
    history,
    setHistory,
  ] = useState<LeadImportBatch[]>([]);

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(true);

  const [
    previewLoading,
    setPreviewLoading,
  ] = useState(false);

  const [
    confirmLoading,
    setConfirmLoading,
  ] = useState(false);

  const [
    detailLoading,
    setDetailLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    success,
    setSuccess,
  ] = useState<string | null>(null);

  const [
    rowFilter,
    setRowFilter,
  ] = useState<RowFilter>("ALL");

  const [
    rowSearch,
    setRowSearch,
  ] = useState("");

  const loadHistory =
    useCallback(async () => {
      setHistoryLoading(true);

      try {
        const data =
          await getLeadImportBatches();

        setHistory(data);
      } catch (loadError) {
        setError(
          getErrorMessage(loadError),
        );
      } finally {
        setHistoryLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const filteredRows =
    useMemo(() => {
      if (!preview) {
        return [];
      }

      const query =
        rowSearch
          .trim()
          .toLowerCase();

      return preview.rows.filter(
        (row) => {
          if (
            rowFilter !== "ALL" &&
            row.status !== rowFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            row.name,
            row.phone_number,
            row.email,
            row.city,
            row.state,
            row.interested_course,
            row.error_message,
            row.existing_lead_id ?? "",
            row.imported_lead_id ?? "",
          ].some((value) =>
            value
              .toLowerCase()
              .includes(query),
          );
        },
      );
    }, [
      preview,
      rowFilter,
      rowSearch,
    ]);

  function resetImportForm() {
    setFile(null);
    setSource("");
    setCampaign("");
    setDefaultVertical("REGULAR");
    setDefaultChannel("DIRECT");
    setPreview(null);
    setRowFilter("ALL");
    setRowSearch("");
    setError(null);
    setSuccess(null);

    const input =
      document.getElementById(
        "marketing-lead-file",
      ) as HTMLInputElement | null;

    if (input) {
      input.value = "";
    }
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    setError(null);
    setSuccess(null);
    setPreview(null);

    const selectedFile =
      event.target.files?.[0] ??
      null;

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const extension =
      selectedFile.name
        .split(".")
        .pop()
        ?.toLowerCase();

    if (
      extension !== "csv" &&
      extension !== "xlsx"
    ) {
      setFile(null);

      setError(
        "Only CSV and XLSX files are supported.",
      );

      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  }

  async function handlePreview(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    if (!file) {
      setError(
        "Select a CSV or XLSX file first.",
      );
      return;
    }

    if (!source.trim()) {
      setError(
        "Source is required. Example: Meta Ads.",
      );
      return;
    }

    setPreviewLoading(true);

    try {
      const result =
        await previewLeadImport({
          file,
          source: source.trim(),
          campaign:
            campaign.trim(),
          default_vertical:
            defaultVertical,
          default_channel:
            defaultChannel,
        });

      setPreview(result);
      setRowFilter("ALL");
      setRowSearch("");

      setSuccess(
        "File validated successfully. Review the rows before confirming the import.",
      );

      await loadHistory();
    } catch (previewError) {
      setError(
        getErrorMessage(
          previewError,
        ),
      );
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleConfirm() {
    if (!preview) {
      return;
    }

    if (
      preview.status ===
      "COMPLETED"
    ) {
      return;
    }

    setError(null);
    setSuccess(null);
    setConfirmLoading(true);

    try {
      const result =
        await confirmLeadImport(
          preview.id,
        );

      setPreview(result);

      setSuccess(
        `${result.imported_rows} lead${
          result.imported_rows === 1
            ? ""
            : "s"
        } imported successfully into Leads & Telecalling.`,
      );

      await loadHistory();
    } catch (confirmError) {
      setError(
        getErrorMessage(
          confirmError,
        ),
      );
    } finally {
      setConfirmLoading(false);
    }
  }

  async function openBatch(
    batch: LeadImportBatch,
  ) {
    setError(null);
    setSuccess(null);
    setDetailLoading(true);

    try {
      const detail =
        await getLeadImportBatch(
          batch.id,
        );

      setPreview(detail);
      setRowFilter("ALL");
      setRowSearch("");
    } catch (detailError) {
      setError(
        getErrorMessage(
          detailError,
        ),
      );
    } finally {
      setDetailLoading(false);
    }
  }

  const canConfirm =
    Boolean(preview) &&
    preview?.status ===
      "VALIDATED" &&
    !confirmLoading;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-br from-slate-950 via-blue-950 to-blue-900 px-5 py-7 text-white sm:px-7 lg:px-8">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50">
                <MegaphoneIcon />
                Marketing Operations
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Marketing Lead Imports
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100/80">
                Upload marketing leads from
                Meta, Google, campaigns,
                events or other sources.
                Validate the file before
                adding leads to the
                telecalling workflow.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/leads"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-blue-50"
              >
                <UsersRound size={17} />
                Leads & Telecalling
                <ArrowRight size={16} />
              </Link>

              <button
                type="button"
                onClick={resetImportForm}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <RotateCcw size={16} />
                New Import
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
          <form
            onSubmit={handlePreview}
            className="space-y-6 p-5 sm:p-7 lg:p-8"
          >
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Upload lead file
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Minimum required columns:
                Name and Phone Number.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <CircleAlert
                  className="mt-0.5 shrink-0"
                  size={18}
                />

                <div className="flex-1">
                  {error}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setError(null)
                  }
                  aria-label="Dismiss error"
                >
                  <X size={17} />
                </button>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <CheckCircle2
                  className="mt-0.5 shrink-0"
                  size={18}
                />

                <div className="flex-1">
                  {success}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSuccess(null)
                  }
                  aria-label="Dismiss success message"
                >
                  <X size={17} />
                </button>
              </div>
            )}

            <label
              htmlFor="marketing-lead-file"
              className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center transition hover:border-blue-300 hover:bg-blue-50/40"
            >
              <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <Upload size={22} />
              </div>

              <div className="mt-4 text-sm font-semibold text-slate-900">
                {file
                  ? file.name
                  : "Choose CSV or Excel file"}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                CSV or XLSX • Maximum
                backend upload size 10 MB
              </div>

              <input
                id="marketing-lead-file"
                type="file"
                accept=".csv,.xlsx"
                onChange={
                  handleFileChange
                }
                className="hidden"
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  Source *
                </span>

                <input
                  value={source}
                  onChange={(event) =>
                    setSource(
                      event.target.value,
                    )
                  }
                  placeholder="Meta Ads"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  Campaign
                </span>

                <input
                  value={campaign}
                  onChange={(event) =>
                    setCampaign(
                      event.target.value,
                    )
                  }
                  placeholder="September Admission Campaign"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  Default vertical
                </span>

                <select
                  value={
                    defaultVertical
                  }
                  onChange={(event) =>
                    setDefaultVertical(
                      event.target
                        .value as LeadVertical,
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="REGULAR">
                    Regular Distance
                    Education
                  </option>

                  <option value="CREDIT_TRANSFER">
                    Credit Transfer
                  </option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">
                  Default channel
                </span>

                <select
                  value={
                    defaultChannel
                  }
                  onChange={(event) =>
                    setDefaultChannel(
                      event.target
                        .value as LeadChannel,
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="DIRECT">
                    BEST Direct
                  </option>
                </select>

                <div className="text-xs text-slate-500">
                  Partner imports will be
                  enabled after partner
                  selection is added.
                </div>
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs leading-5 text-slate-500">
                Uploading only creates a
                validation batch. No Lead
                record is created until
                you confirm the import.
              </div>

              <button
                type="submit"
                disabled={
                  previewLoading
                }
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {previewLoading ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <FileSpreadsheet
                    size={17}
                  />
                )}

                {previewLoading
                  ? "Validating..."
                  : "Upload & Validate"}
              </button>
            </div>
          </form>

          <aside className="border-t border-slate-100 bg-slate-50/70 p-5 sm:p-7 lg:border-l lg:border-t-0 lg:p-8">
            <div className="flex items-center gap-2">
              <History
                size={18}
                className="text-blue-700"
              />

              <h2 className="font-bold text-slate-950">
                Import History
              </h2>

              <button
                type="button"
                onClick={() =>
                  void loadHistory()
                }
                disabled={
                  historyLoading
                }
                className="ml-auto flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:text-blue-700 disabled:opacity-50"
                aria-label="Refresh import history"
              >
                <RefreshCw
                  size={15}
                  className={
                    historyLoading
                      ? "animate-spin"
                      : ""
                  }
                />
              </button>
            </div>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Recent upload and import
              batches available to your
              account.
            </p>

            <div className="mt-5 space-y-3">
              {historyLoading &&
                history.length ===
                  0 && (
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Loading imports...
                  </div>
                )}

              {!historyLoading &&
                history.length ===
                  0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center text-sm text-slate-500">
                    No import batches yet.
                  </div>
                )}

              {history.map(
                (batch) => (
                  <button
                    type="button"
                    key={batch.id}
                    onClick={() =>
                      void openBatch(
                        batch,
                      )
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {
                            batch.file_name
                          }
                        </div>

                        <div className="mt-1 truncate text-xs text-slate-500">
                          {batch.source}
                          {batch.campaign
                            ? ` • ${batch.campaign}`
                            : ""}
                        </div>
                      </div>

                      <BatchStatusBadge
                        status={
                          batch.status
                        }
                        label={
                          batch.status_display
                        }
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {
                          batch.total_rows
                        }{" "}
                        rows
                      </span>

                      <span>
                        {formatDateTime(
                          batch.created_at,
                        )}
                      </span>
                    </div>
                  </button>
                ),
              )}
            </div>
          </aside>
        </div>
      </section>

      {detailLoading && (
        <section className="flex min-h-40 items-center justify-center rounded-3xl border border-slate-200 bg-white">
          <Loader2
            size={24}
            className="animate-spin text-blue-700"
          />
        </section>
      )}

      {preview &&
        !detailLoading && (
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-7">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-950">
                      Import Preview
                    </h2>

                    <BatchStatusBadge
                      status={
                        preview.status
                      }
                      label={
                        preview.status_display
                      }
                    />
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    {
                      preview.file_name
                    }{" "}
                    • {preview.source}
                    {preview.campaign
                      ? ` • ${preview.campaign}`
                      : ""}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {preview.status ===
                    "COMPLETED" && (
                    <Link
                      href="/leads"
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
                    >
                      View Leads
                      <ArrowRight
                        size={16}
                      />
                    </Link>
                  )}

                  <button
                    type="button"
                    disabled={
                      !canConfirm
                    }
                    onClick={() =>
                      void handleConfirm()
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {confirmLoading ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <CheckCircle2
                        size={16}
                      />
                    )}

                    {preview.status ===
                    "COMPLETED"
                      ? "Import Completed"
                      : confirmLoading
                        ? "Importing..."
                        : "Confirm Import"}
                  </button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
                <MetricCard
                  label="Total"
                  value={
                    preview.total_rows
                  }
                />

                <MetricCard
                  label="Valid"
                  value={
                    preview.valid_rows
                  }
                  tone="success"
                />

                <MetricCard
                  label="Duplicates"
                  value={
                    preview.duplicate_rows
                  }
                  tone="warning"
                />

                <MetricCard
                  label="Invalid"
                  value={
                    preview.invalid_rows
                  }
                  tone="danger"
                />

                <MetricCard
                  label="Imported"
                  value={
                    preview.imported_rows
                  }
                  tone="info"
                />
              </div>
            </div>

            {preview.status ===
              "VALIDATED" && (
              <div className="border-b border-blue-100 bg-blue-50/60 px-5 py-4 text-sm text-blue-900 sm:px-7">
                <div className="flex items-start gap-2">
                  <AlertCircle
                    size={17}
                    className="mt-0.5 shrink-0"
                  />

                  <span>
                    Review duplicate and
                    invalid rows before
                    confirming. Only rows
                    marked{" "}
                    <strong>
                      VALID
                    </strong>{" "}
                    will become leads.
                  </span>
                </div>
              </div>
            )}

            <div className="border-b border-slate-100 px-5 py-4 sm:px-7">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "ALL",
                      "VALID",
                      "DUPLICATE",
                      "INVALID",
                      "IMPORTED",
                    ] as RowFilter[]
                  ).map(
                    (filter) => (
                      <button
                        type="button"
                        key={filter}
                        onClick={() =>
                          setRowFilter(
                            filter,
                          )
                        }
                        className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          rowFilter ===
                          filter
                            ? "bg-slate-950 text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {filter}
                      </button>
                    ),
                  )}
                </div>

                <div className="relative w-full xl:w-80">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={rowSearch}
                    onChange={(event) =>
                      setRowSearch(
                        event.target
                          .value,
                      )
                    }
                    placeholder="Search preview rows"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-left">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-7">
                      Row
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Student
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Phone
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Location
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Course
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Result
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map(
                    (row) => (
                      <PreviewRow
                        key={row.id}
                        row={row}
                      />
                    ),
                  )}

                  {filteredRows.length ===
                    0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-12 text-center text-sm text-slate-500"
                      >
                        No rows match the
                        current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <span>
                Showing{" "}
                {filteredRows.length} of{" "}
                {preview.rows.length} rows
              </span>

              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={14} />
                Created{" "}
                {formatDateTime(
                  preview.created_at,
                )}
              </span>
            </div>
          </section>
        )}
    </div>
  );
}

function PreviewRow({
  row,
}: {
  row: LeadImportRow;
}) {
  const leadReference =
    row.imported_lead_id ??
    row.existing_lead_id;

  return (
    <tr className="border-b border-slate-100 align-top transition hover:bg-slate-50/70">
      <td className="px-5 py-4 text-sm text-slate-500 sm:px-7">
        {row.row_number}
      </td>

      <td className="px-4 py-4">
        <div className="text-sm font-semibold text-slate-900">
          {row.name || "—"}
        </div>

        <div className="mt-1 text-xs text-slate-500">
          {row.email || "No email"}
        </div>
      </td>

      <td className="px-4 py-4 text-sm font-medium text-slate-700">
        {row.phone_number || "—"}
      </td>

      <td className="px-4 py-4 text-sm text-slate-600">
        {[row.city, row.state]
          .filter(Boolean)
          .join(", ") || "—"}
      </td>

      <td className="px-4 py-4 text-sm text-slate-600">
        {row.interested_course ||
          "—"}
      </td>

      <td className="px-4 py-4">
        <RowStatusBadge
          status={row.status}
        />
      </td>

      <td className="px-4 py-4">
        {row.error_message ? (
          <div className="max-w-xs text-xs leading-5 text-red-700">
            {row.error_message}
          </div>
        ) : leadReference ? (
          <div className="text-xs font-semibold text-blue-700">
            {leadReference}
          </div>
        ) : (
          <div className="text-xs text-slate-400">
            Ready
          </div>
        )}
      </td>
    </tr>
  );
}

function MegaphoneIcon() {
  return (
    <span className="flex size-5 items-center justify-center">
      <FileSpreadsheet
        size={15}
      />
    </span>
  );
}