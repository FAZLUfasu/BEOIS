"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  BarChart3,
  BookOpenCheck,
  Building2,
  CheckSquare2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Network,
  PhoneCall,
  Settings,
  UserRoundCog,
  UsersRound,
  X,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];

  /*
   * Used for sensitive system-level pages that
   * must only be visible to a real Django
   * superuser.
   */
  superuserOnly?: boolean;
}

interface NavigationSection {
  label: string;
  items: NavigationItem[];
}

const managementRoles = [
  "SUPER_ADMIN",
  "CHAIRMAN",
  "GENERAL_MANAGER",
];

const navigation: NavigationSection[] = [
  {
    label: "Overview",
    items: [
      {
        name: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
      },
      {
        name: "Intelligence",
        href: "/intelligence",
        icon: BarChart3,
        roles: managementRoles,
      },
    ],
  },

  {
    label: "Operations",
    items: [
      {
        name: "Marketing",
        href: "/marketing/lead-imports",
        icon: Megaphone,
        roles: [
          ...managementRoles,
          "MARKETING",
          "MANAGER",
          "DEPARTMENT_HEAD",
        ],
      },
      {
        name: "Leads & Telecalling",
        href: "/leads",
        icon: PhoneCall,
        roles: [
          ...managementRoles,
          "TELECALLER",
          "MARKETING",
          "MANAGER",
          "DEPARTMENT_HEAD",
        ],
      },
      {
        name: "Admissions",
        href: "/admissions",
        icon: GraduationCap,
        roles: [
          ...managementRoles,
          "ADMISSION",
          "MANAGER",
          "DEPARTMENT_HEAD",
        ],
      },
      {
        name: "Education Process",
        href: "/students",
        icon: BookOpenCheck,
        roles: [
          ...managementRoles,
          "EDUCATION_PROCESS",
          "MANAGER",
          "DEPARTMENT_HEAD",
        ],
      },
      {
        name: "Partner Network",
        href: "/partners",
        icon: Network,
        roles: [
          ...managementRoles,
          "PARTNER_NETWORK",
          "MANAGER",
          "DEPARTMENT_HEAD",
        ],
      },

      /*
       * Tasks & Reminders is intentionally available
       * to every authenticated BEOIS user.
       *
       * Managers can create and manage assignments.
       * Employees can view and update their own tasks.
       *
       * The backend remains responsible for enforcing
       * the actual permissions.
       */
      {
        name: "Tasks & Reminders",
        href: "/tasks",
        icon: CheckSquare2,
      },
    ],
  },

  {
    label: "Administration",
    items: [
      {
        name: "HR & Payroll",
        href: "/hr",
        icon: UserRoundCog,
        roles: [
          ...managementRoles,
          "HR",
        ],
      },
      {
        name: "Finance",
        href: "/finance",
        icon: CircleDollarSign,
        roles: [
          ...managementRoles,
          "FINANCE",
        ],
      },
      {
        name: "Organization",
        href: "/organization",
        icon: Building2,
        roles: [
          "SUPER_ADMIN",
          "GENERAL_MANAGER",
        ],
      },
      {
        name: "User Management",
        href: "/settings/users",
        icon: UsersRound,
        superuserOnly: true,
      },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
}

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggle,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();

  const { user } = useAuth();

  const roleCodes = new Set(
    user?.roles.map(
      (role) => role.code,
    ) ?? [],
  );

  function canSee(
    item: NavigationItem,
  ) {
    /*
     * A superuser-only item must never become
     * visible merely because somebody has the
     * SUPER_ADMIN role code.
     *
     * It requires Django's actual
     * user.is_superuser flag.
     */
    if (item.superuserOnly) {
      return Boolean(
        user?.is_superuser,
      );
    }

    /*
     * A real Django superuser can access all
     * ordinary BEOIS navigation modules.
     */
    if (user?.is_superuser) {
      return true;
    }

    /*
     * Navigation entries without role
     * restrictions are available to any
     * authenticated user.
     */
    if (
      !item.roles ||
      item.roles.length === 0
    ) {
      return true;
    }

    return item.roles.some(
      (role) =>
        roleCodes.has(role),
    );
  }

  const visibleNavigation =
    navigation
      .map((section) => ({
        ...section,
        items:
          section.items.filter(
            canSee,
          ),
      }))
      .filter(
        (section) =>
          section.items.length > 0,
      );

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={onMobileClose}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-[var(--sidebar)] text-white transition-all duration-300",
          collapsed
            ? "lg:w-[84px]"
            : "lg:w-[270px]",
          "w-[270px]",
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0",
        )}
      >
       <div className="flex h-[78px] items-center border-b border-white/10 px-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <img
              src="/best-college-logo.png"
              alt=""
              className="h-10 w-10 shrink-0 object-contain"
            />

            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="whitespace-nowrap text-[17px] font-bold tracking-[0.04em] text-white">
                  BEST COLLEGE
                </div>

                <div className="whitespace-nowrap text-[8px] font-medium tracking-[0.025em] text-blue-200/75">
                  BRAINSTORM EDUCATIONAL SOLUTIONS TRUST
                </div>
              </div>
            )}
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {visibleNavigation.map(
            (section) => (
              <div
                key={section.label}
                className="mb-6"
              >
                {!collapsed && (
                  <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/45">
                    {section.label}
                  </div>
                )}

                <div className="space-y-1">
                  {section.items.map(
                    (item) => {
                      const Icon =
                        item.icon;

                      const active =
                        item.href === "/"
                          ? pathname === "/"
                          : pathname.startsWith(
                              item.href,
                            );

                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={
                            onMobileClose
                          }
                          title={
                            collapsed
                              ? item.name
                              : undefined
                          }
                          className={cn(
                            "group flex h-11 items-center rounded-xl text-[13px] font-medium transition-all",
                            collapsed
                              ? "justify-center px-0"
                              : "gap-3 px-3",
                            active
                              ? "bg-white text-[var(--sidebar)] shadow-sm"
                              : "text-blue-50/75 hover:bg-white/8 hover:text-white",
                          )}
                        >
                          <Icon
                            size={19}
                            strokeWidth={
                              active
                                ? 2.3
                                : 1.9
                            }
                            className="shrink-0"
                          />

                          {!collapsed && (
                            <span className="truncate">
                              {item.name}
                            </span>
                          )}
                        </Link>
                      );
                    },
                  )}
                </div>
              </div>
            ),
          )}
        </nav>

        <div className="border-t border-white/10 p-3">
          <Link
            href="/settings"
            onClick={onMobileClose}
            className={cn(
              "mb-2 flex h-11 items-center rounded-xl text-[13px] font-medium text-blue-50/70 transition hover:bg-white/8 hover:text-white",
              collapsed
                ? "justify-center"
                : "gap-3 px-3",
              pathname === "/settings"
                ? "bg-white text-[var(--sidebar)] shadow-sm"
                : "",
            )}
            title={
              collapsed
                ? "Settings"
                : undefined
            }
          >
            <Settings size={19} />

            {!collapsed && (
              <span>
                Settings
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "hidden h-10 w-full items-center rounded-xl bg-white/6 text-xs font-medium text-blue-100/70 transition hover:bg-white/10 hover:text-white lg:flex",
              collapsed
                ? "justify-center"
                : "justify-between px-3",
            )}
          >
            {!collapsed && (
              <span>
                Collapse menu
              </span>
            )}

            {collapsed ? (
              <ChevronRight
                size={18}
              />
            ) : (
              <ChevronLeft
                size={18}
              />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}