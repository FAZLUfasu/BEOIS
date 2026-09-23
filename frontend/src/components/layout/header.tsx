"use client";

import {
  Bell,
  BellRing,
  CheckCheck,
  ChevronDown,
  Clock3,
  Info,
  Loader2,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";

import { useAuth } from "@/lib/auth/auth-context";

import type {
  BeoisNotification,
  NotificationType,
} from "@/types/notifications";


interface HeaderProps {
  onMenuClick: () => void;
}


function getInitials(
  name: string,
  username: string,
) {
  const source = name.trim() || username;

  const parts = source
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0]}${
    parts[parts.length - 1][0]
  }`.toUpperCase();
}


function notificationIcon(
  type: NotificationType,
) {
  switch (type) {
    case "WARNING":
      return TriangleAlert;

    case "REMINDER":
      return Clock3;

    case "TASK":
      return BellRing;

    default:
      return Info;
  }
}


function timeAgo(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const seconds = Math.floor(
    (Date.now() - date.getTime()) / 1000,
  );

  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(
    seconds / 60,
  );

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(
    minutes / 60,
  );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(
    hours / 24,
  );

  if (days < 7) {
    return `${days}d ago`;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "numeric",
      month: "short",
    },
  ).format(date);
}


export function Header({
  onMenuClick,
}: HeaderProps) {
  const router = useRouter();

  const {
    user,
    logout,
  } = useAuth();

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [notificationOpen, setNotificationOpen] =
    useState(false);

  const [notificationLoading, setNotificationLoading] =
    useState(false);

  const [notifications, setNotifications] =
    useState<BeoisNotification[]>([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const menuRef =
    useRef<HTMLDivElement>(null);

  const notificationRef =
    useRef<HTMLDivElement>(null);


  async function loadUnreadCount() {
    try {
      const data =
        await getUnreadNotificationCount();

      setUnreadCount(
        data.unread_count,
      );
    } catch {
      // Header notifications should never break
      // the rest of the application shell.
    }
  }


  async function loadRecentNotifications() {
    setNotificationLoading(true);

    try {
      const data =
        await getNotifications();

      setNotifications(
        data.slice(0, 6),
      );
    } catch {
      setNotifications([]);
    } finally {
      setNotificationLoading(false);
    }
  }


  useEffect(() => {
    if (!user) {
      return;
    }

    void loadUnreadCount();

    const interval = window.setInterval(
      () => {
        void loadUnreadCount();
      },
      60000,
    );

    return () => {
      window.clearInterval(interval);
    };
  }, [user?.id]);


  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent,
    ) {
      const target =
        event.target as Node;

      if (
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(
          target,
        )
      ) {
        setNotificationOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, []);


  const primaryRole =
    user?.is_superuser
      ? "Super Administrator"
      : user?.roles[0]?.name ??
        "BEOIS User";

  const displayName =
    user?.full_name ||
    user?.username ||
    "BEOIS User";

  const initials = getInitials(
    displayName,
    user?.username ?? "",
  );


  function handleLogout() {
    setMenuOpen(false);
    setNotificationOpen(false);

    logout();

    router.replace("/login");
  }


  async function toggleNotifications() {
    const next =
      !notificationOpen;

    setNotificationOpen(next);
    setMenuOpen(false);

    if (next) {
      await Promise.all([
        loadRecentNotifications(),
        loadUnreadCount(),
      ]);
    }
  }


  async function handleNotification(
    notification: BeoisNotification,
  ) {
    try {
      if (!notification.is_read) {
        await markNotificationRead(
          notification.id,
        );

        setUnreadCount((current) =>
          Math.max(0, current - 1),
        );

        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  is_read: true,
                  read_at:
                    new Date().toISOString(),
                }
              : item,
          ),
        );
      }
    } catch {
      return;
    }

    setNotificationOpen(false);

    if (notification.action_url) {
      router.push(
        notification.action_url,
      );
    } else {
      router.push("/notifications");
    }
  }


  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead();

      const now =
        new Date().toISOString();

      setUnreadCount(0);

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
          read_at:
            item.read_at ?? now,
        })),
      );
    } catch {
      // Keep header operational even if the
      // notification request fails.
    }
  }


  return (
    <header className="sticky top-0 z-30 flex h-[78px] items-center border-b border-[var(--border)] bg-white/95 px-4 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 flex-1 items-center">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="mr-3 flex size-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 lg:hidden"
        >
          <Menu size={20} />
        </button>

        <div className="hidden max-w-md flex-1 items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 md:flex">
          <Search
            size={17}
            className="shrink-0 text-slate-400"
          />

          <input
            type="search"
            placeholder="Search students, leads, admissions..."
            className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
          />

          <kbd className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400">
            ⌘K
          </kbd>
        </div>
      </div>


      <div className="ml-4 flex items-center gap-2 sm:gap-3">
        <div
          ref={notificationRef}
          className="relative"
        >
          <button
            type="button"
            aria-label={
              unreadCount
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
            onClick={() =>
              void toggleNotifications()
            }
            className="relative flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          >
            <Bell size={18} />

            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold leading-4 text-white ring-2 ring-white">
                {unreadCount > 99
                  ? "99+"
                  : unreadCount}
              </span>
            )}
          </button>


          {notificationOpen && (
            <div className="absolute right-0 top-[52px] w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Notifications
                  </div>

                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {unreadCount > 0
                      ? `${unreadCount} unread`
                      : "You're all caught up"}
                  </div>
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      void handleMarkAllRead()
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-bold text-blue-600 transition hover:bg-blue-50"
                  >
                    <CheckCheck size={14} />
                    Read all
                  </button>
                )}
              </div>


              <div className="max-h-[390px] overflow-y-auto">
                {notificationLoading ? (
                  <div className="flex min-h-[180px] items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-blue-600" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-6 py-10 text-center">
                    <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <Bell size={20} />
                    </div>

                    <div className="mt-3 text-xs font-bold text-slate-700">
                      No notifications
                    </div>

                    <div className="mt-1 text-[11px] leading-5 text-slate-400">
                      New tasks and operational
                      alerts will appear here.
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

                        return (
                          <button
                            key={
                              notification.id
                            }
                            type="button"
                            onClick={() =>
                              void handleNotification(
                                notification,
                              )
                            }
                            className={`flex w-full gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50 ${
                              notification.is_read
                                ? "bg-white"
                                : "bg-blue-50/40"
                            }`}
                          >
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                              <Icon size={16} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-2">
                                <div
                                  className={`min-w-0 flex-1 truncate text-xs ${
                                    notification.is_read
                                      ? "font-semibold text-slate-700"
                                      : "font-bold text-slate-900"
                                  }`}
                                >
                                  {
                                    notification.title
                                  }
                                </div>

                                {!notification.is_read && (
                                  <span className="mt-1 size-2 shrink-0 rounded-full bg-blue-500" />
                                )}
                              </div>

                              {notification.message && (
                                <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">
                                  {
                                    notification.message
                                  }
                                </div>
                              )}

                              <div className="mt-1.5 text-[10px] font-medium text-slate-400">
                                {timeAgo(
                                  notification.created_at,
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      },
                    )}
                  </div>
                )}
              </div>


              <div className="border-t border-slate-100 p-2">
                <button
                  type="button"
                  onClick={() => {
                    setNotificationOpen(
                      false,
                    );

                    router.push(
                      "/notifications",
                    );
                  }}
                  className="w-full rounded-xl px-3 py-2.5 text-xs font-bold text-blue-600 transition hover:bg-blue-50"
                >
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>


        <div className="hidden h-8 w-px bg-slate-200 sm:block" />


        <div
          ref={menuRef}
          className="relative"
        >
          <button
            type="button"
            onClick={() => {
              setMenuOpen(
                (value) => !value,
              );

              setNotificationOpen(false);
            }}
            className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition hover:bg-slate-50 sm:gap-3"
          >
            <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand)]">
              {user?.profile_picture ? (
                <img
                  src={user.profile_picture}
                  alt={`${displayName} profile`}
                  className="size-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            <div className="hidden text-left md:block">
              <div className="max-w-[180px] truncate text-[13px] font-semibold text-slate-800">
                {displayName}
              </div>

              <div className="max-w-[180px] truncate text-[11px] text-slate-400">
                {primaryRole}
              </div>
            </div>

            <ChevronDown
              size={15}
              className="hidden text-slate-400 md:block"
            />
          </button>


          {menuOpen && (
            <div className="absolute right-0 top-[52px] w-[260px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
              <div className="border-b border-slate-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand)]">
                    {user?.profile_picture ? (
                      <img
                        src={user.profile_picture}
                        alt={`${displayName} profile`}
                        className="size-full object-cover"
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-800">
                      {displayName}
                    </div>

                    <div className="truncate text-[11px] text-slate-400">
                      {user?.email ||
                        user?.username}
                    </div>
                  </div>
                </div>
              </div>


              <div className="p-2">
                <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                  <ShieldCheck
                    size={17}
                    className="text-[var(--brand)]"
                  />

                  <div>
                    <div className="text-xs font-semibold text-slate-700">
                      {primaryRole}
                    </div>

                    <div className="mt-0.5 text-[10px] text-slate-400">
                      {user?.is_superuser
                        ? "Full system access"
                        : user?.roles[0]
                            ?.scope_display ??
                          "Authorized access"}
                    </div>
                  </div>
                </div>


                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    router.push("/profile");
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  <UserRound size={17} />
                  My profile
                </button>


                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <LogOut size={17} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}