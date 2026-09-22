"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  BadgeCheck,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  X,
} from "lucide-react";

import {
  createDesignation,
  getDesignations,
  updateDesignation,
} from "@/lib/api/hr";

import type {
  Designation,
  DesignationPayload,
} from "@/types/hr";


interface FormState {
  name: string;
  code: string;
  description: string;
  is_active: boolean;
}


const EMPTY_FORM: FormState = {
  name: "",
  code: "",
  description: "",
  is_active: true,
};


function getErrorMessage(
  error: unknown,
) {
  return error instanceof Error
    ? error.message
    : "Unable to complete the request.";
}


export function DesignationsPanel() {
  const [
    designations,
    setDesignations,
  ] = useState<Designation[]>([]);

  const [
    editing,
    setEditing,
  ] = useState<Designation | null>(
    null,
  );

  const [
    formOpen,
    setFormOpen,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState<FormState>(
    EMPTY_FORM,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    actionId,
    setActionId,
  ] = useState<string | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState("");


  const loadDesignations =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const data =
          await getDesignations();

        setDesignations(
          data.sort(
            (a, b) =>
              a.name.localeCompare(
                b.name,
              ),
          ),
        );
      } catch (
        requestError
      ) {
        setError(
          getErrorMessage(
            requestError,
          ),
        );
      } finally {
        setLoading(false);
      }
    }, []);


  useEffect(() => {
    void loadDesignations();
  }, [loadDesignations]);


  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setFormOpen(true);
  }


  function openEdit(
    designation: Designation,
  ) {
    setEditing(designation);

    setForm({
      name: designation.name,
      code: designation.code,
      description:
        designation.description,
      is_active:
        designation.is_active,
    });

    setError("");
    setFormOpen(true);
  }


  function closeForm() {
    if (saving) {
      return;
    }

    setFormOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
  }


  async function handleSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError(
        "Designation name is required.",
      );
      return;
    }

    if (!form.code.trim()) {
      setError(
        "Designation code is required.",
      );
      return;
    }

    const payload: DesignationPayload =
      {
        name: form.name.trim(),
        code: form.code
          .trim()
          .toUpperCase(),
        description:
          form.description.trim(),
        is_active:
          form.is_active,
      };

    try {
      setSaving(true);
      setError("");

      if (editing) {
        await updateDesignation(
          editing.id,
          payload,
        );
      } else {
        await createDesignation(
          payload,
        );
      }

      setFormOpen(false);
        setEditing(null);
        setForm(EMPTY_FORM);

        await loadDesignations();
    } catch (
      requestError
    ) {
      setError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      setSaving(false);
    }
  }


  async function toggleStatus(
    designation: Designation,
  ) {
    try {
      setActionId(
        designation.id,
      );

      setError("");

      await updateDesignation(
        designation.id,
        {
          is_active:
            !designation.is_active,
        },
      );

      await loadDesignations();
    } catch (
      requestError
    ) {
      setError(
        getErrorMessage(
          requestError,
        ),
      );
    } finally {
      setActionId(null);
    }
  }


  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              Designation Management
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Maintain standardized job
              titles used across employee
              records.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                void loadDesignations()
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              New Designation
            </button>
          </div>
        </div>

        {error && !formOpen ? (
          <div className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="p-5">
          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
            </div>
          ) : designations.length ===
            0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center">
              <BadgeCheck className="h-10 w-10 text-slate-300" />

              <h3 className="mt-4 font-semibold text-slate-800">
                No designations
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Create the first
                designation to begin.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] border-separate border-spacing-0">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="border-b border-slate-200 px-4 py-3">
                      Designation
                    </th>

                    <th className="border-b border-slate-200 px-4 py-3">
                      Code
                    </th>

                    <th className="border-b border-slate-200 px-4 py-3">
                      Description
                    </th>

                    <th className="border-b border-slate-200 px-4 py-3">
                      Status
                    </th>

                    <th className="border-b border-slate-200 px-4 py-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {designations.map(
                    (designation) => (
                      <tr
                        key={
                          designation.id
                        }
                        className="hover:bg-slate-50"
                      >
                        <td className="border-b border-slate-100 px-4 py-4 font-semibold text-slate-900">
                          {
                            designation.name
                          }
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                          {
                            designation.code
                          }
                        </td>

                        <td className="max-w-md border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                          {designation.description ||
                            "—"}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          <span
                            className={[
                              "rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                              designation.is_active
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : "bg-slate-100 text-slate-600 ring-slate-200",
                            ].join(
                              " ",
                            )}
                          >
                            {designation.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEdit(
                                  designation,
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>

                            <button
                              type="button"
                              disabled={
                                actionId ===
                                designation.id
                              }
                              onClick={() =>
                                void toggleStatus(
                                  designation,
                                )
                              }
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                              {actionId ===
                              designation.id
                                ? "Updating..."
                                : designation.is_active
                                  ? "Disable"
                                  : "Enable"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>


      {formOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-blue-600">
                  HR Configuration
                </p>

                <h3 className="mt-1 text-xl font-bold text-slate-950">
                  {editing
                    ? "Edit Designation"
                    : "New Designation"}
                </h3>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-4 p-5"
            >
              <Field label="Name">
                <input
                  value={form.name}
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (current) => ({
                        ...current,
                        name:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  className={
                    inputClass
                  }
                  placeholder="Example: Admission Manager"
                />
              </Field>

              <Field label="Code">
                <input
                  value={form.code}
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (current) => ({
                        ...current,
                        code:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  className={
                    inputClass
                  }
                  placeholder="ADM-MGR"
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={
                    form.description
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (current) => ({
                        ...current,
                        description:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                  rows={3}
                  className={
                    inputClass
                  }
                  placeholder="Optional description"
                />
              </Field>

              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={
                    form.is_active
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (current) => ({
                        ...current,
                        is_active:
                          event
                            .target
                            .checked,
                      }),
                    )
                  }
                  className="h-4 w-4"
                />

                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Active
                  </p>

                  <p className="text-xs text-slate-500">
                    Available for new
                    employee assignments.
                  </p>
                </div>
              </label>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}

                  {saving
                    ? "Saving..."
                    : "Save Designation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}


const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";


function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      {children}
    </label>
  );
}