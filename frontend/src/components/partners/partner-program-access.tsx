"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  BookOpen,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import {
  getInstitutions,
  getPrograms,
} from "@/lib/api/admissions";

import {
  changePartnerProgramAccessStatus,
  getPartnerProgramAccess,
  grantPartnerProgramAccess,
} from "@/lib/api/partners";

import type {
  Institution,
  Program,
} from "@/types/admissions";

import type {
  PartnerProgramAccess,
} from "@/types/partners";

interface PartnerProgramAccessProps {
  partnerId: string;
  onChanged?: () => void;
}

export function PartnerProgramAccessPanel({
  partnerId,
  onChanged,
}: PartnerProgramAccessProps) {
  const [items, setItems] = useState<
    PartnerProgramAccess[]
  >([]);

  const [institutions, setInstitutions] =
    useState<Institution[]>([]);

  const [programs, setPrograms] = useState<
    Program[]
  >([]);

  const [institutionId, setInstitutionId] =
    useState("");

  const [programId, setProgramId] =
    useState("");

  const [effectiveFrom, setEffectiveFrom] =
    useState("");

  const [effectiveTo, setEffectiveTo] =
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

  const loadAccess = useCallback(async () => {
    try {
      setError("");

      const data =
        await getPartnerProgramAccess(
          partnerId,
        );

      setItems(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load program access.",
      );
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  const loadInstitutions =
    useCallback(async () => {
      try {
        const data =
          await getInstitutions(true);

        setInstitutions(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load institutions.",
        );
      }
    }, []);

  useEffect(() => {
    setLoading(true);
    void loadAccess();
    void loadInstitutions();
  }, [loadAccess, loadInstitutions]);

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

  async function handleGrantAccess(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!institutionId || !programId) {
      setError(
        "Select both an institution and a program.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      await grantPartnerProgramAccess(
        partnerId,
        {
          institution_id: institutionId,
          program_id: programId,
          effective_from:
            effectiveFrom || null,
          effective_to:
            effectiveTo || null,
          notes: notes.trim(),
        },
      );

      setInstitutionId("");
      setProgramId("");
      setPrograms([]);
      setEffectiveFrom("");
      setEffectiveTo("");
      setNotes("");

      await loadAccess();
      onChanged?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to grant program access.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(
    item: PartnerProgramAccess,
  ) {
    try {
      setActionId(item.id);
      setError("");

      await changePartnerProgramAccessStatus(
        partnerId,
        item.id,
        {
          is_active: !item.is_active,
        },
      );

      await loadAccess();
      onChanged?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update program access.",
      );
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />

              <h3 className="text-base font-semibold text-slate-950">
                Grant Program Access
              </h3>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Control which institution and
              program this partner can submit
              cases for.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleGrantAccess}
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
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
                  Select institution
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
                    ? "Loading programs..."
                    : "Select program"}
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

            <Field label="Effective From">
              <input
                type="date"
                value={effectiveFrom}
                onChange={(event) =>
                  setEffectiveFrom(
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Effective To">
              <input
                type="date"
                value={effectiveTo}
                onChange={(event) =>
                  setEffectiveTo(
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              rows={3}
              placeholder="Optional notes..."
              className={inputClass}
            />
          </Field>

          {error ? (
            <ErrorBox message={error} />
          ) : null}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={
                saving ||
                !institutionId ||
                !programId
              }
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}

              Grant Access
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-slate-700" />

              <h3 className="font-semibold text-slate-950">
                Current Program Access
              </h3>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              {items.length} access record
              {items.length === 1 ? "" : "s"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadAccess();
            }}
            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState text="No program access has been granted yet." />
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <div className="font-medium text-slate-950">
                    {item.program_name}
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    {item.institution_name}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    {item.effective_from ? (
                      <span>
                        From{" "}
                        {formatDate(
                          item.effective_from,
                        )}
                      </span>
                    ) : null}

                    {item.effective_to ? (
                      <span>
                        Until{" "}
                        {formatDate(
                          item.effective_to,
                        )}
                      </span>
                    ) : null}
                  </div>

                  {item.notes ? (
                    <p className="mt-2 text-sm text-slate-600">
                      {item.notes}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      item.is_active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.is_active
                      ? "Active"
                      : "Inactive"}
                  </span>

                  <button
                    type="button"
                    disabled={
                      actionId === item.id
                    }
                    onClick={() =>
                      void handleToggle(item)
                    }
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {actionId === item.id
                      ? "Updating..."
                      : item.is_active
                        ? "Disable"
                        : "Enable"}
                  </button>
                </div>
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
      Loading...
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(new Date(value));
}