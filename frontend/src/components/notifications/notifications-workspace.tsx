"use client";

import {
  Bell,
  BellRing,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock3,
  Info,
  Loader2,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";

import type {
  BeoisNotification,
  NotificationSourceModule,
  NotificationType,
} from "@/types/notifications";


type NotificationTab = "ALL" | "UNREAD";


const SOURCE_LABELS: Record<
  NotificationSourceModule,
  string
> = {
  GENERAL: "General",
  LEADS: "Leads",
  ADMISSIONS: "Admissions",
  STUDENTS: "Students",
  PARTNERS: "Partner Network",
  FINANCE: "Finance",
  HR: "HR & Payroll",
  EDUCATION: "Education Process",
};


function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load notifications.";
}


function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}


function notificationIcon(type: NotificationType) {
  switch (type) {
    case "SUCCESS":
      return CheckCircle2;

    case "WARNING":
      return TriangleAlert;

    case "REMINDER":
      return Clock3;

    case "TASK":
      return BellRing;

    case "SYSTEM":
      return Bell;

    case "INFO":
    default:
      return Info;
  }
}


function notificationIconClass(
  type: NotificationType,
) {
  switch (type) {
    case "SUCCESS":
      return "bg-emerald-50 text-emerald-600";

    case "WARNING":
      return "bg-amber-50 text-amber-600";

    case "REMINDER":
      return "bg-violet-50 text-violet-600";

    case "TASK":
      return "bg-blue-50 text-blue-600";

    case "SYSTEM":
      return "bg-slate-100 text-slate-600";

    case "INFO":
    default:
      return "bg-sky-50 text-sky-600";
  }
}


export function NotificationsWorkspace() {
  const router = useRouter();

  const [tab, setTab] =
    useState<NotificationTab>("ALL");

  const [notifications, setNotifications] =
    useState<BeoisNotification[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const [markingAll, setMarkingAll] =
    useState(false);


  async function loadNotifications(
    showRefresh = false,
  ) {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const data = await getNotifications({
        unreadOnly: tab === "UNREAD",
      });

      setNotifications(data);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }


  useEffect(() => {
    void loadNotifications();
  }, [tab]);


  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          !notification.is_read,
      ).length,
    [notifications],
  );


  async function handleMarkRead(
    notification: BeoisNotification,
  ) {
    if (notification.is_read) {
      if (notification.action_url) {
        router.push(notification.action_url);
      }

      return;
    }

    setProcessingId(notification.id);
    setError("");

    try {
      const updated =
        await markNotificationRead(
          notification.id,
        );

      if (tab === "UNREAD") {
        setNotifications((current) =>
          current.filter(
            (item) =>
              item.id !== notification.id,
          ),
        );
      } else {
        setNotifications((current) =>
          current.map((item) =>
            item.id === updated.id
              ? updated
              : item,
          ),
        );
      }

      if (notification.action_url) {
        router.push(notification.action_url);
      }
    } catch (markError: unknown) {
      setError(getErrorMessage(markError));
    } finally {
      setProcessingId(null);
    }
  }


  async function handleMarkAllRead() {
    setMarkingAll(true);
    setError("");

    try {
      await markAllNotificationsRead();

      if (tab === "UNREAD") {
        setNotifications([]);
      } else {
        const now =
          new Date().toISOString();

        setNotifications((current) =>
          current.map((item) => ({
            ...item,
            is_read: true,
            read_at: item.read_at ?? now,
          })),
        );
      }
    } catch (markError: unknown) {
      setError(getErrorMessage(markError));
    } finally {
      setMarkingAll(false);
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            Activity Center
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Notifications
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Review task assignments, reminders,
            operational alerts and system activity
            associated with your BEOIS account.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={
              refreshing || loading
            }
            onClick={() =>
              void loadNotifications(true)
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={15}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

          <button
            type="button"
            disabled={
              markingAll ||
              unreadCount === 0
            }
            onClick={() =>
              void handleMarkAllRead()
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {markingAll ? (
              <Loader2
                size={15}
                className="animate-spin"
              />
            ) : (
              <CheckCheck size={15} />
            )}

            Mark all as read
          </button>
        </div>
      </div>


      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="font-semibold">
            Unable to complete request
          </div>

          <div className="mt-1 break-words">
            {error}
          </div>
        </div>
      )}


      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-1">
            {(
              [
                ["ALL", "All"],
                ["UNREAD", "Unread"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setTab(value)
                }
                className={`relative px-4 py-4 text-xs font-bold transition ${
                  tab === value
                    ? "text-blue-700"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {label}

                {tab === value && (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-blue-600" />
                )}
              </button>
            ))}
          </div>

          {!loading && (
            <div className="hidden text-xs font-medium text-slate-400 sm:block">
              {notifications.length}{" "}
              {notifications.length === 1
                ? "notification"
                : "notifications"}
            </div>
          )}
        </div>


        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center p-6">
            <div className="text-center">
              <Loader2 className="mx-auto size-9 animate-spin text-blue-600" />

              <p className="mt-3 text-sm text-slate-500">
                Loading notifications...
              </p>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex min-h-[360px] items-center justify-center p-6">
            <div className="max-w-sm text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                {tab === "UNREAD" ? (
                  <CheckCheck size={25} />
                ) : (
                  <Bell size={25} />
                )}
              </div>

              <h2 className="mt-4 text-base font-bold text-slate-800">
                {tab === "UNREAD"
                  ? "You're all caught up"
                  : "No notifications yet"}
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                {tab === "UNREAD"
                  ? "There are no unread notifications for your account."
                  : "Task assignments, reminders and operational alerts will appear here."}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map(
              (notification) => {
                const Icon =
                  notificationIcon(
                    notification.notification_type,
                  );

                const processing =
                  processingId ===
                  notification.id;

                return (
                  <article
                    key={notification.id}
                    className={`relative flex gap-3 p-4 transition sm:gap-4 sm:p-5 ${
                      notification.is_read
                        ? "bg-white"
                        : "bg-blue-50/35"
                    }`}
                  >
                    {!notification.is_read && (
                      <span className="absolute left-0 top-0 h-full w-1 bg-blue-500" />
                    )}

                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${notificationIconClass(
                        notification.notification_type,
                      )}`}
                    >
                      <Icon size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2
                              className={`break-words text-sm ${
                                notification.is_read
                                  ? "font-semibold text-slate-800"
                                  : "font-bold text-slate-950"
                              }`}
                            >
                              {
                                notification.title
                              }
                            </h2>

                            {!notification.is_read && (
                              <span className="size-2 shrink-0 rounded-full bg-blue-500" />
                            )}
                          </div>

                          {notification.message && (
                            <p className="mt-1 break-words text-sm leading-6 text-slate-500">
                              {
                                notification.message
                              }
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 text-[11px] font-medium text-slate-400">
                          {formatDateTime(
                            notification.created_at,
                          )}
                        </div>
                      </div>


                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          {
                            SOURCE_LABELS[
                              notification
                                .source_module
                            ]
                          }
                        </span>

                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          {
                            notification.notification_type
                          }
                        </span>

                        {notification.task_title && (
                          <span className="max-w-full truncate rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
                            {
                              notification.task_title
                            }
                          </span>
                        )}
                      </div>


                      <div className="mt-4 flex flex-wrap gap-2">
                        {!notification.is_read && (
                          <button
                            type="button"
                            disabled={processing}
                            onClick={() =>
                              void handleMarkRead(
                                notification,
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {processing ? (
                              <Loader2
                                size={13}
                                className="animate-spin"
                              />
                            ) : (
                              <Check size={13} />
                            )}

                            Mark as read
                          </button>
                        )}

                        {notification.action_url && (
                          <button
                            type="button"
                            disabled={processing}
                            onClick={() =>
                              void handleMarkRead(
                                notification,
                              )
                            }
                            className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Open related item
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        )}
      </section>
    </div>
  );
}