"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Clock3,
  LoaderCircle,
  MessageSquarePlus,
} from "lucide-react";

import {
  addAdmissionNote,
  getAdmissionActivities,
} from "@/lib/api/admissions";

import type {
  AdmissionActivity,
} from "@/types/admissions";

interface Props {
  admissionId: string;
  canManage: boolean;
}

function formatDateTime(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}

export function AdmissionActivityPanel({
  admissionId,
  canManage,
}: Props) {
  const [activities, setActivities] =
    useState<AdmissionActivity[]>([]);

  const [note, setNote] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  async function loadActivities() {
    setLoading(true);

    try {
      const data =
        await getAdmissionActivities(
          admissionId,
        );

      setActivities(data);
    } catch {
      setError(
        "Unable to load admission activity.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadActivities();
  }, [admissionId]);

  async function handleAddNote() {
    if (!note.trim()) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await addAdmissionNote(
        admissionId,
        {
          description: note.trim(),
        },
      );

      setNote("");
      await loadActivities();
    } catch {
      setError(
        "Unable to add admission note.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
          <Clock3 size={19} />
        </div>

        <div>
          <h3 className="font-semibold text-slate-950">
            Activity Timeline
          </h3>

          <p className="text-xs text-slate-500">
            Admission history and internal notes.
          </p>
        </div>
      </div>

      {canManage && (
        <div className="mt-5 flex gap-2">
          <input
            value={note}
            onChange={(event) =>
              setNote(
                event.target.value,
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter"
              ) {
                void handleAddNote();
              }
            }}
            placeholder="Add an internal note..."
            className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm"
          />

          <button
            type="button"
            disabled={
              saving || !note.trim()
            }
            onClick={() =>
              void handleAddNote()
            }
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? (
              <LoaderCircle
                size={15}
                className="animate-spin"
              />
            ) : (
              <MessageSquarePlus
                size={15}
              />
            )}

            Add Note
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 text-sm text-rose-600">
          {error}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <LoaderCircle
              size={16}
              className="animate-spin"
            />
            Loading timeline...
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-slate-400">
            No activity recorded.
          </p>
        ) : (
          activities.map(
            (activity) => (
              <div
                key={activity.id}
                className="border-l-2 border-slate-200 pl-4"
              >
                <div className="text-sm font-medium text-slate-800">
                  {
                    activity.activity_type_display
                  }
                </div>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {
                    activity.description
                  }
                </p>

                <div className="mt-1 text-xs text-slate-400">
                  {formatDateTime(
                    activity.created_at,
                  )}
                </div>
              </div>
            ),
          )
        )}
      </div>
    </section>
  );
}