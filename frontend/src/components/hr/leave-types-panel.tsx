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
} from "lucide-react";

import {
  getLeaveTypes,
} from "@/lib/api/leave";

import {
  LeaveTypeDialog,
} from "@/components/hr/leave-type-dialog";

import type {
  LeaveType,
} from "@/types/leave";


function getErrorMessage(
  error: unknown,
) {
  return error instanceof Error
    ? error.message
    : "Unable to load leave types.";
}


export function LeaveTypesPanel() {
  const [
    leaveTypes,
    setLeaveTypes,
  ] = useState<
    LeaveType[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    dialogOpen,
    setDialogOpen,
  ] = useState(false);

  const [
    selected,
    setSelected,
  ] = useState<
    LeaveType | null
  >(null);


  const loadData =
    useCallback(
      async (
        background = false,
      ) => {
        if (background) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        try {
          const data =
            await getLeaveTypes();

          setLeaveTypes(
            data,
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
          setRefreshing(false);
        }
      },
      [],
    );


  useEffect(() => {
    void loadData();
  }, [loadData]);


  function openCreate() {
    setSelected(null);
    setDialogOpen(true);
  }


  function openEdit(
    leaveType:
      LeaveType,
  ) {
    setSelected(
      leaveType,
    );

    setDialogOpen(true);
  }


  function handleSaved() {
    setDialogOpen(false);
    setSelected(null);

    void loadData(true);
  }


  return (
    <>
      <div className="space-y-6">

        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-600">
              Leave Configuration
            </p>

            <h3 className="mt-1 text-xl font-bold text-slate-950">
              Leave Types
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Configure annual leave
              entitlements and policy
              rules.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                void loadData(
                  true,
                )
              }
              disabled={
                refreshing
              }
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

              Refresh
            </button>

            <button
              type="button"
              onClick={
                openCreate
              }
              className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />

              New Leave Type
            </button>
          </div>
        </div>


        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}


        {loading ? (
          <div className="flex min-h-72 items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : leaveTypes.length ===
          0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <BadgeCheck className="mx-auto h-10 w-10 text-slate-300" />

            <p className="mt-3 font-semibold text-slate-700">
              No leave types configured
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Create the first leave
              policy to begin.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {leaveTypes.map(
              (leaveType) => (
                <div
                  key={
                    leaveType.id
                  }
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-bold text-slate-950">
                          {
                            leaveType.name
                          }
                        </h4>

                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                          {
                            leaveType.code
                          }
                        </span>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {leaveType.description ||
                          "No description provided."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        openEdit(
                          leaveType,
                        )
                      }
                      className="rounded-xl border border-slate-200 p-2.5 text-slate-600 transition hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>


                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <PolicyValue
                      label="Annual Days"
                      value={
                        leaveType.default_days_per_year
                      }
                    />

                    <PolicyValue
                      label="Payment"
                      value={
                        leaveType.is_paid
                          ? "Paid"
                          : "Unpaid"
                      }
                    />

                    <PolicyValue
                      label="Carry Forward"
                      value={
                        leaveType.carry_forward_allowed
                          ? "Yes"
                          : "No"
                      }
                    />

                    <PolicyValue
                      label="Status"
                      value={
                        leaveType.is_active
                          ? "Active"
                          : "Inactive"
                      }
                    />
                  </div>


                  <div className="mt-4 flex flex-wrap gap-2">
                    {leaveType.requires_approval ? (
                      <Badge>
                        Approval Required
                      </Badge>
                    ) : (
                      <Badge>
                        Auto Approval Policy
                      </Badge>
                    )}

                    {leaveType.carry_forward_allowed ? (
                      <Badge>
                        Max Carry:{" "}
                        {
                          leaveType.maximum_carry_forward
                        }
                      </Badge>
                    ) : null}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>


      <LeaveTypeDialog
        open={
          dialogOpen
        }
        leaveType={
          selected
        }
        onClose={() => {
          setDialogOpen(
            false,
          );

          setSelected(
            null,
          );
        }}
        onSaved={
          handleSaved
        }
      />
    </>
  );
}


function PolicyValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}


function Badge({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
      {children}
    </span>
  );
}