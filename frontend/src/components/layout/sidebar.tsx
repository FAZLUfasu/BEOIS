"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpenCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Network,
  PhoneCall,
  Settings,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
  X,
} from "lucide-react";
import type {
  LucideIcon,
} from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
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
        name: "Students",
        href: "/students",
        icon: UsersRound,
        roles: [
          ...managementRoles,
          "ADMISSION",
          "EDUCATION_PROCESS",
          "MANAGER",
          "DEPARTMENT_HEAD",
        ],
      },
      {
        name: "Education Process",
        href: "/education",
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

  const {
    user,
  } = useAuth();

  const roleCodes = new Set(
    user?.roles.map(
      (role) => role.code,
    ) ?? [],
  );

  function canSee(
    item: NavigationItem,
  ) {
    if (user?.is_superuser) {
      return true;
    }

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
        <div className="flex h-[78px] items-center border-b border-white/10 px-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[var(--brand)] shadow-sm">
              <ShieldCheck
                size={23}
                strokeWidth={2.2}
              />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <div className="text-[17px] font-bold tracking-[0.08em]">
                  BEOIS
                </div>

                <div className="truncate text-[10px] font-medium tracking-wide text-blue-100/65">
                  BEST EDUCATION OPERATIONS
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            aria-label="Close navigation"
            onClick={onMobileClose}
            className="flex size-9 items-center justify-center rounded-lg text-blue-100 hover:bg-white/10 lg:hidden"
          >
            <X size={20} />
          </button>
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
            className={cn(
              "mb-2 flex h-11 items-center rounded-xl text-[13px] font-medium text-blue-50/70 transition hover:bg-white/8 hover:text-white",
              collapsed
                ? "justify-center"
                : "gap-3 px-3",
            )}
          >
            <Settings size={19} />

            {!collapsed && (
              <span>Settings</span>
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