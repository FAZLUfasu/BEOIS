"use client";

import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth/auth-context";

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

  const menuRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent,
    ) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node,
        )
      ) {
        setMenuOpen(false);
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
    logout();
    router.replace("/login");
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
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
        >
          <Bell size={18} />

          <span className="absolute right-2 top-2 size-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <div className="hidden h-8 w-px bg-slate-200 sm:block" />

        <div
          ref={menuRef}
          className="relative"
        >
          <button
            type="button"
            onClick={() =>
              setMenuOpen(
                (value) => !value,
              )
            }
            className="flex items-center gap-2 rounded-xl px-1.5 py-1 transition hover:bg-slate-50 sm:gap-3"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand)]">
              {initials}
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
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand)]">
                    {initials}
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